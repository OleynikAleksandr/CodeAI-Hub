# Codex Workflow User Turn Delivery — Contract (SSOT)

## Назначение
Зафиксировать канонический контракт доставки пользовательского сообщения из Project Manager в workflow-сессию Codex, чтобы submit не мог "тихо пропасть" между локальным UI, Core и provider runtime.

Документ покрывает две связанные задачи:
- максимально снизить вероятность потери submit до provider ACK;
- если ACK не получен, дать пользователю явный feedback и безопасный manual resend без повторного набора текста.

## Наблюдаемый сбой
- UI/Core локально принимают user submit.
- Codex transport запускает новый `codex exec --experimental-json resume <threadId>`.
- Runtime может прислать только `thread.started`, но не прислать `turn.started` и не зафиксировать `user_message` в provider rollout.
- Через idle-timeout turn падает локально, но пользователь уже видит своё сообщение как будто оно было доставлено.
- Если пользователь повторяет submit, transport может уже ожить, но UI может показывать устаревшую картину до повторной гидрации.

Ключевой вывод: `thread.started` не является доказательством того, что provider принял пользовательский turn.

## Цели
- Не считать user submit доставленным без provider ACK.
- Не писать недоставленный user submit в каноническую dialog history как обычное delivered message.
- Дать Core детерминированный способ различать:
  - `no provider ACK`;
  - `late provider ACK`;
  - `post-ack hang`.
- Сохранить текст и payload user submit для повторной отправки.
- Исключить blind resend, который может задублировать turn у провайдера.

## Не покрывается этим контрактом
- Зависание tail-refresh / stale rehydrate в PM dialog panel после уже успешной доставки сообщения.
- Полный provider-home rollback для post-ack hang; это отдельный recovery слой.

## Канонические сущности
- `dialogId` — логический диалог UI.
- `sessionId` — текущий runtime segment Core.
- `providerSessionId` — native Codex thread id.
- `outboundId` — уникальный id одной попытки доставки user submit.
- `attempt` — номер повторной попытки для одного и того же сохранённого payload.
- `deliveryJournal` — отдельное durable-хранилище pending/failed outbound submit.
- `dialogHistory` — каноническая JSONL-история только доставленных диалоговых сообщений.

## Provider ACK (канон для Codex)

### Недостаточные сигналы
Следующие события не считаются provider ACK:
- `thread.started`
- `task_started`
- локальный факт `sdk:processor.run_streamed.ready`

### Достаточные сигналы
Для Codex provider ACK считается полученным, если произошло хотя бы одно из условий:
- пришёл `turn.started`;
- в provider rollout зафиксирован `event_msg.user_message`;
- в provider rollout зафиксирован `response_item` с `role:"user"` в рамках turn, у которого уже есть `turn_context`.

`thread.started` без последующего ACK трактуется как transport-level partial start, а не как успешная доставка submit.

## Storage contract

### 1. Dialog history
`dialogHistory` остаётся SSOT только для подтверждённых сообщений диалога.

Правило:
- user message попадает в `dialogHistory` только после provider ACK;
- до ACK оно не должно сериализоваться как обычное delivered message.

### 2. Delivery journal
Pending/failed outbound submit хранятся отдельно от dialog history.

Канонический путь:
- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.outbox.jsonl`

Минимальная запись журнала:
- `outboundId`
- `dialogId`
- `sessionId`
- `providerSessionId`
- `providerId`
- `attempt`
- `text`
- `turnOptions`
- `state`
- `createdAt`
- `updatedAt`
- `ackEvidence`
- `lastError`

## Состояния доставки
- `pending_local` — Core принял submit и сохранил его в delivery journal.
- `transport_started` — child process запущен, stream открыт.
- `provider_ack_pending` — Core ждёт provider ACK.
- `provider_acknowledged` — provider ACK получен.
- `running` — turn подтверждён и продолжает выполнение.
- `failed_no_ack` — ACK не найден даже после reconciliation.
- `reconciliation_pending` — идёт проверка provider artifacts перед финальным verdict.
- `resend_requested` — пользователь запросил resend.
- `completed` — turn завершён терминально.

## Канонический flow

### Submit
1. UI передаёт Core `text + turnOptions`.
2. Core создаёт запись в `deliveryJournal` со статусом `pending_local`.
3. Core запускает Codex transport и переводит запись в `provider_ack_pending`.
4. UI сразу показывает pending bubble на основе `deliveryJournal`, а не на основе `dialogHistory`.

### ACK path
1. При получении provider ACK Core:
   - переводит запись в `provider_acknowledged`;
   - пишет user message в `dialogHistory`;
   - удаляет запись из pending overlay или помечает её как `completed`.
2. После этого дальнейший поток `assistant/thinking/tool` идёт обычным путём.

### ACK-timeout path
1. Если короткий ACK-watchdog истёк, Core не делает blind resend.
2. Core жёстко завершает зависший transport process.
3. Core запускает reconciliation по provider artifacts.
4. Если ACK доказан постфактум:
   - запись переводится в `provider_acknowledged`/`running`;
   - resend запрещён.
5. Если ACK не найден:
   - запись получает `failed_no_ack`;
   - input unlock допускается;
   - UI показывает явный failure + resend action.

## Reconciliation contract
Перед любым resend Core обязан повторно проверить provider-side evidence:
- rollout JSONL;
- provider session metadata;
- SDK trace текущей попытки.

Варианты результата:
- `ack_found` — submit уже доставлен, resend запрещён;
- `ack_missing` — submit не доставлен, resend разрешён;
- `inconclusive` — сохраняем `failed_no_ack`, но не маскируем состояние под success.

## Process management contract
- Для одного workflow turn допускается только один active Codex child process.
- ACK-watchdog короче общего idle-timeout и измеряется отдельно.
- При ACK-timeout недостаточно `events.return()`; требуется жёсткое завершение transport process с escalation policy.
- Новый resend не стартует, пока предыдущая попытка не переведена в terminal delivery verdict.

## UI contract

### Pending
- Пользователь видит своё сообщение сразу, но как `pending`, а не как доставленное.
- Pending bubble переживает reopen/reconnect, потому что читается из `deliveryJournal`.

### Failed
- При `failed_no_ack` bubble остаётся в диалоге с явным статусом "Не отправлено".
- UI обязан сохранить полный текст submit и дать действие `Повторить отправку`.
- Повторная отправка использует сохранённый payload, а не требует ручного copy/paste.

### Resend
- Клик по failed bubble или action button создаёт новую `attempt`, но сохраняет исходный текст и `turnOptions`.
- Перед resend Core повторно выполняет reconciliation.
- Успешный resend не должен приводить к двум delivered user messages в `dialogHistory`.

## Наблюдаемость
Обязательные machine-readable события:
- `outbound_enqueued`
- `transport_started`
- `provider_ack_pending`
- `provider_ack_received`
- `provider_ack_timeout`
- `reconciliation_started`
- `reconciliation_ack_found`
- `reconciliation_ack_missing`
- `outbound_failed_no_ack`
- `resend_requested`
- `resend_started`
- `resend_completed`

## Тестовый минимум
- Regression: `thread.started` без `turn.started` и без provider `user_message` должен давать `failed_no_ack`, а не delivered user message.
- Regression: late provider ACK после локального stall не должен приводить к blind resend.
- Regression: failed outbound submit должен переживать reopen PM dialog и предлагать resend.
- Regression: resend использует сохранённый текст без ручного ввода.

## Связанные контракты
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProviderSessionHome_IsolationAndRecovery.md`
- `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`
- `doc/SolidWorks-WorkFlow/CodeAI-Hub_Manual_Retry_RFC.md` (исторический RFC, не SSOT)
