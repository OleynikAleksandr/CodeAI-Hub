# Codex Workflow Submit Diagnostics — Contract (SSOT)

## Назначение
Зафиксировать минимальный, но достаточный контур логирования для случаев, когда пользовательский submit в workflow-сессии Codex "исчезает" между Project Manager, Core и Codex transport.

Цель документа не лечить доставку, а сделать источник сбоя наблюдаемым без догадок.

## Проблема
Сейчас диагностика строится по косвенным признакам:
- PM знает, что пользователь нажал `Send`;
- Core знает, что получил `dialog:send` и вызвал `handleMessage`;
- Codex processor знает, что сообщение попало в очередь и что event-stream либо пошёл, либо упал по timeout;
- но у нас нет одного сквозного идентификатора попытки и нет полного machine-readable trail по всей цепочке.

Итог: при следующем сбое мы можем сказать только "сломалось где-то между enqueue и provider ACK", но не точку смерти конкретной попытки.

## Цели
- Для каждого пользовательского submit иметь единый `outboundAttemptId`, проходящий через PM, Core и Codex transport.
- Видеть точную последнюю успешную точку в цепочке доставки.
- Отличать:
  - submit не вышел из PM;
  - submit не дошёл до Core handler;
  - submit застрял до spawn child process;
  - submit был записан в stdin child process;
  - child process стартовал, но не дал meaningful event;
  - дошёл только до `thread.started`;
  - дошёл до `turn.started`.
- Не плодить много независимых файлов с логами; точки записи должны быть предсказуемыми.

## Не цели
- Не меняем delivery semantics.
- Не добавляем retry/recovery logic.
- Не меняем UI contract для pending/failed submit.
- Не читаем provider rollout как часть этой фазы; задача только про наш внутренний trace.

## Канонический correlation key

### `outboundAttemptId`
Новый идентификатор создаётся в PM в момент клика `Send` и передаётся дальше по всей цепочке.

Он обязан присутствовать в:
- PM outbound trace;
- `dialog:send` payload;
- Core bridge trace;
- Core session handler trace;
- Codex adapter/SDK/processor trace;
- ошибках и timeout-событиях этой конкретной попытки.

Дополнительные обязательные поля контекста:
- `requestId`
- `dialogId`
- `sessionId` (если уже известен)
- `providerId`
- `providerSessionId` / `threadId` (если уже известен)
- `workspaceSlug`
- `contentLength`
- `timestampIso`
- `timestampMs`

## Куда пишутся логи

### 1. Core bridge + PM trace
Все PM- и Core-события по submit пишутся в один append-only JSONL:

- `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`

Причина:
- PM browser layer сам по себе не должен плодить отдельные локальные файлы;
- все bridge-события удобнее собирать в одном месте рядом с Core.

PM генерирует события, но запись на диск выполняет Core.

### 2. Codex transport trace
События Codex transport продолжают писаться в уже существующий session-scoped файл:

- `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`

Новый контракт требует не новый каталог, а расширение существующего формата:
- все submit-related события должны содержать `outboundAttemptId`.

### 3. Summary / human-readable error
Краткие summary-ошибки могут дублироваться в:

- `~/.codeai-hub/logs/core/core.log`

Но `core.log` не считается SSOT для диагностики submit path. SSOT для диагностики — только JSONL trace-файлы выше.

## Event map

### PM/UI layer
Пишется в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` через Core bridge:
- `pm.dialog_send.clicked`
- `pm.dialog_send.ws_dispatched`
- `pm.dialog_send.ack_received`
- `pm.dialog_send.history_refresh_requested`
- `pm.dialog_send.history_refresh_result`

### Core bridge / routing layer
Пишется в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`:
- `core.dialog_send.received`
- `core.dialog_send.scope_resolved`
- `core.dialog_send.chain_resolved`
- `core.dialog_send.session_resolved`
- `core.dialog_send.handle_message_enter`
- `core.dialog_send.handle_message_rejected`
- `core.dialog_send.history_append_started`
- `core.dialog_send.history_append_succeeded`
- `core.dialog_send.history_append_failed`
- `core.dialog_send.adapter_dispatch_started`
- `core.dialog_send.adapter_dispatch_succeeded`
- `core.dialog_send.adapter_dispatch_failed`

### Codex transport layer
Пишется в `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`:
- `outbound.enqueue`
- `outbound.dequeue`
- `outbound.turn.begin`
- `outbound.run_streamed.begin`
- `outbound.child.spawned`
- `outbound.child.stdin_write_started`
- `outbound.child.stdin_write_finished`
- `outbound.child.stdout_first_line`
- `outbound.first_event`
- `outbound.thread_started`
- `outbound.turn_started`
- `outbound.turn_completed`
- `outbound.turn_failed`
- `outbound.idle_timeout`
- `outbound.child.exit`
- `outbound.child.killed`

## Диагностические verdict rules
Минимальный контракт интерпретации:

- Если есть `pm.dialog_send.clicked`, но нет `core.dialog_send.received`:
  - проблема между PM и Core bridge.

- Если есть `core.dialog_send.received`, но нет `core.dialog_send.adapter_dispatch_started`:
  - проблема в Core routing/session resolution/history append path.

- Если есть `core.dialog_send.adapter_dispatch_started`, но нет `outbound.enqueue`:
  - проблема между Core и Codex adapter/SDK manager.

- Если есть `outbound.enqueue`, но нет `outbound.child.spawned`:
  - проблема в processor queue/runStreamed start path.

- Если есть `outbound.child.spawned`, но нет `outbound.child.stdin_write_finished`:
  - проблема на записи prompt в child stdin.

- Если есть `outbound.child.stdin_write_finished`, но нет `outbound.first_event`:
  - child process стартовал, но event stream фактически не ожил.

- Если первый meaningful event = только `thread.started`, а `turn_started` нет:
  - submit дошёл до partial transport state, но не дошёл до полноценного turn start.

## Формат записи
Каждая запись — одна JSONL строка со следующими обязательными ключами:
- `event`
- `outboundAttemptId`
- `timestampIso`
- `timestampMs`
- `providerId`
- `workspaceSlug`

Опциональные, но ожидаемые:
- `requestId`
- `dialogId`
- `sessionId`
- `providerSessionId`
- `threadId`
- `contentLength`
- `payload`
- `error`

## Ограничения
- Не создаём отдельный файл на каждую попытку submit на стороне Core.
- Не пишем PM trace в browser storage/localStorage.
- Не смешиваем structured JSONL trace с `core.log`.
- Не используем free-form строки как основной формат диагностики.

## Тестовый минимум
- PM send должен пробрасывать `outboundAttemptId` в `dialog:send`.
- Core trace должен фиксировать все граничные точки до передачи в adapter.
- Codex trace должен фиксировать spawn/stdin/first-event/timeout/exit с тем же `outboundAttemptId`.
- Для сбоя "only thread.started then timeout" по логам должен однозначно читаться последний успешный этап.

## Связанные контракты
- `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_UserTurn_Delivery.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
