# Provider Failure Recovery And Provider Switch — Contract (SSOT)

**Status:** Partially implemented SSOT / deferred cross-provider takeover baseline
**Created:** 2026-03-26
**Last metadata audit:** 2026-05-01 on `main` (`v1.2.121`)
**Owner:** Oleksandr
**Scope:** BUG-2026-03-25-01 + архитектура Core-инициируемого восстановления/переключения провайдера для live dialog continuity

---

## Current implementation status (2026-05-01)

Этот документ остаётся SSOT для целевой архитектуры provider failure recovery, но не весь контракт материализован в коде.

Реализовано на `main`:

- `ProviderFailureClassifier` классифицирует ошибки до destructive cleanup;
- transient failures сохраняют binding, переводят turn state в `idle`, расходуют retry budget и не деградируют весь provider автоматически;
- `dialog:switch:*` transport/offer scaffold существует в Core stream contracts, incoming validator/router и `SessionProviderFailureRecovery`;
- same-provider retry / `switch_model` resend идёт через `Session.modelBinding` и provider-specific model-switch handlers.

Не реализовано как рабочее product behavior:

- настоящий `switch_provider` takeover;
- provider-neutral transfer package для нового provider (`unified-dialog.prompt.md` + `provider-switch-handoff.md`);
- PM approval UX для полноценного cross-provider migration flow.

Поэтому разделы ниже нужно читать как смесь implemented baseline и target architecture. Любые утверждения о завершённом `switch_provider` относятся к deferred target, пока код не создаёт новую provider session и не передаёт ей provider-neutral transcript.

## 1. Контекст

В `Session 158` зафиксирован критический баг `BUG-2026-03-25-01`: transient ошибка провайдера (`capacity`, `rate-limit`, upstream timeout, network read failure) может привести к каскаду:

1. Core трактует ошибку как terminal provider failure.
2. Runtime binding удаляется.
3. Следующее сообщение пользователя больше не доходит до провайдера.
4. UI может застревать в `Agent is working... Please wait.`.
5. Пользователь вынужден вручную рестартить Core и пытаться продолжать сессию обходными путями.

Ключевой пользовательский requirement для этого scope:

- Если во время dialog continuity у провайдера возникает проблема, **инициатором recovery должен быть Core**, а не пользователь вручную через restart/reopen.
- После **явного согласия пользователя** Core должен уметь переключить сессию **на другого провайдера**.
- При таком переключении Core должен отправлять новому провайдеру **не provider-native JSONL / rollout / SDK log**, а **наш unified бесконечный dialog** плюс актуальный контекст workflow.

---

## 2. Подтверждённые факты и статус реализации

### 2.1. Корневая причина не в watchdog timeout

`SessionRuntime` по умолчанию не переводит running session в idle по таймеру:

- `DEFAULT_WATCHDOG_TIMEOUT_MS = Number.POSITIVE_INFINITY`
- auto-idle включается только если timeout явно задан

Файл:
- `packages/core/src/workspace-runtime/session-runtime.ts`

Следствие:
- если провайдер просто молчит без exception, Core сейчас скорее зависнет в running state, чем "убьёт" сессию по таймеру.
- bug triggered path = **exception/error path**, а не "молчание по времени".

### 2.2. Generic failure path: исходный gap закрыт частично

Исходный путь, из-за которого появился этот контракт:

- `adapter.sendMessage(...)` throws
- `SessionRequestHandler.handleMessage()` вызывает `handleProviderFailure(...)`
- `handleProviderFailure(...)`:
  - `unsubscribe()`
  - удаляет runtime binding
  - ставит `providerSessionStatus = "failed"`
  - закрывает unified-session writer
  - шлёт `session:error`

Файлы:
- исторически: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- текущая materialization: `packages/core/src/remote-bridge/handlers/session-provider-failure-recovery.ts`
- classifier: `packages/core/src/recovery/provider-failure-classifier.ts`
- retry state: `packages/core/src/remote-bridge/handlers/session-request-handler-retry-state.ts`

Текущий статус:
- transient server error и terminal runtime crash больше не обязаны проходить через одну destructive ветку;
- classifier решает, удалять ли binding и деградировать ли provider;
- retry budget и pending intent уже материализованы;
- cross-provider recovery после offer остаётся deferred.

### 2.3. После потери binding сообщение пользователя: исходный gap закрыт для stale-binding retry, но не для full provider switch

Исходно в `handleMessage()` user message уже мог быть добавлен в unified dialog history, но если `binding` или `adapter` отсутствовал, Core только логировал ситуацию и возвращал управление без retry/recover path.

Файл:
- `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
- `packages/core/src/remote-bridge/handlers/session-provider-failure-recovery.ts`

Текущий статус:
- typed stale-binding retry (`CLAUDE_*`, `CODEX_*`, `KIMI_*`) invalidates binding, rebinds and retries once;
- provider failure path emits `session:error` and may broadcast `dialog:switch:offer`;
- полноценная user-approved migration to another provider всё ещё deferred.

### 2.4. Ошибка деградирует не только session, но и весь provider

`ProviderRegistry.handleRuntimeFailure()` помечает провайдер как `degraded` и запускает retry loop на уровне всего provider descriptor.

Файл:
- `packages/core/src/provider-registry/index.ts`

Следствие:
- один transient сбой в одной session потенциально ухудшает статус провайдера глобально для других workspace/session.

### 2.5. Current continuity жёстко привязана к `last.providerId`

`handleDialogSend()` сейчас резюмирует dialog по `last.providerId` + `last.providerSessionId` из continuity chain.

Файл:
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

Следствие:
- cross-provider continuation для того же dialog сейчас архитектурно не поддержана.

### 2.6. Смена модели внутри того же провайдера уже материализована для supported providers

Текущий code path:

- `SessionRequestHandlerSessionActions.handleSwitchRequest(...)` применяет `switch_model` к текущей logical session;
- `Session.modelBinding` становится next-turn SSOT;
- Claude/Codex имеют provider-specific handlers for model/reasoning-thought switching;
- UI status panels читают runtime model updates вместо live Settings defaults.

Файлы:
- `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-claude-model-switch.ts`
- `packages/core/src/session-model-binding/`

Следствие:
- same-provider recovery со сменой модели является реализованным первым шагом;
- `switch_provider` не должен считаться выполненным по аналогии с `switch_model`.

### 2.7. Unified dialog history уже существует, но current backfill не cross-provider

Полезные существующие части:

- `DialogHistoryService` умеет читать unified dialog history как provider-agnostic список `role/content/timestamp`.
- `UnifiedSessionStorage` пинит `historySessionId` к continuity root.
- old `session-continuity` умеет создавать handoff report и новый segment.

Но gap:

- `UnifiedSessionStorage.backfillHistory(...)` читает source только из **того же `providerId`**.
- old `session-continuity` handoff создаёт next session с **тем же `providerId`**.

Файлы:
- `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`
- `packages/core/src/unified-session/storage.ts`
- `packages/core/src/session-continuity/session-continuity-facade.ts`

---

## 3. Цели

### 3.1. Обязательные цели

1. Разделить transient turn failure и terminal provider/runtime failure.
2. Гарантировать: если turn был начат, Core обязан завершить его одним из событий:
   - `turn_completed`
   - `turn_failed`
3. Исключить тихий drop user message при потерянном binding.
4. Добавить **same-provider auto-recovery** как первый и самый дешёвый recovery path.
5. Добавить **Core-driven cross-provider switch** после явного согласия пользователя.
6. Сделать unified dialog history единственным source of truth для provider switch bootstrap.
7. Не использовать provider-native rollout/JSONL/SDK logs для передачи контекста в новый provider session.

### 3.2. Не цели этого этапа

- Не объединять полностью старый `session-continuity` и новый `flow-node continuity` в один subsystem.
- Не строить полноценную multi-provider orchestration на уровне параллельных сессий.
- Не переделывать весь PM session UX шире recovery-сценариев.
- Не внедрять автоматическое silent cross-provider переключение без согласия пользователя.

---

## 4. Архитектурные решения

### 4.1. Новая классификация ошибок

Core должен различать как минимум 4 класса:

1. `transient_turn_failure`
   - capacity exhausted
   - rate limit
   - upstream 5xx
   - read timeout
   - temporary network failure
   - следствие: turn завершается с `turn_failed`, binding не удаляется автоматически

2. `session_binding_recoverable`
   - binding потерян, но `providerSessionId` известен и provider adapter доступен
   - следствие: allowed same-provider auto-resume

3. `provider_runtime_failure`
   - adapter crashed
   - module init failed
   - provider unavailable globally
   - следствие: provider может быть помечен `degraded`

4. `terminal_session_failure`
   - auth invalid
   - explicit unsupported resume
   - corrupted native session id
   - следствие: current native session невосстановима, нужен новый segment

### 4.2. Инвариант turn lifecycle

Новый invariant:

- Любой outbound user/internal message, после которого Core эмитил `turn_started` / `turnState=running`, обязан завершиться через один explicit terminal signal:
  - `turn_completed`, либо
  - `turn_failed`.

Запрещённые состояния:

- provider error без `turn_failed`
- removed binding без разблокировки UI
- running session без recoverable outcome

### 4.3. Политика удаления binding

`binding` разрешено удалять только если classifier доказал один из сценариев:

- provider runtime crash;
- explicit terminal invalid session;
- close/delete session by user;
- successful migration to new runtime session.

Transient server-side failure не должен автоматически удалять binding и не должен автоматически закрывать unified dialog history.

Provider recovery retry timers принадлежат `ProviderRegistry` lifecycle. При `CoreOrchestrator.stop()` registry обязан вызывать scheduler dispose и очищать все pending retry timers, включая сценарий, где `RemoteBridge.stop()` завершается с ошибкой.

### 4.4. Source of truth для provider switch

Canonical source для передачи контекста новому провайдеру:

1. **Unified dialog history** через `DialogHistoryService`
2. **Continuity chain metadata** (`dialogId`, `rootSessionId`, `stage`, segments)
3. **Canonical workflow artifacts** текущего stage
4. **Latest unresolved user intent**

Запрещённые источники для bootstrap:

- provider rollout JSONL
- provider SDK debug logs
- raw provider-native event stream
- `thinking`/internal provider traces как canonical history

---

## 5. Recovery Strategy

### 5.1. Track A — Resilience bugfix

Первый этап чинит текущий баг без смены провайдера.

Flow:

```text
adapter.sendMessage throws
        │
        ▼
ProviderFailureClassifier
        │
        ├── transient_turn_failure
        │      └── emit turn_failed + session:error
        │          keep binding/providerSessionId
        │
        ├── session_binding_recoverable
        │      └── try same-provider auto-resume
        │
        └── provider_runtime_failure / terminal_session_failure
               └── recovery offer to PM
```

Обязательное поведение:

- no silent drop
- no perpetual running lock
- no global provider degradation for pure transient turn errors

### 5.2. Track B — Same-provider auto-recovery

Если `providerSessionId` сохранён и adapter доступен, Core должен пробовать:

1. `adapter.resumeSession(oldProviderSessionId)`
2. rebind runtime session
3. повторно отправить pending user intent

Если same-provider auto-resume успешен:

- новый segment не создаётся;
- dialog continuity сохраняется без смены провайдера;
- пользователь может даже не заметить recovery, кроме уведомления.

Если same-provider auto-resume неуспешен:

- Core переходит к user-consented recovery offer.

### 5.3. Track C — Core-driven provider switch after user consent

Cross-provider recovery должен быть инициирован Core, но подтверждён пользователем.

Flow:

```text
failure classified as not safely recoverable in-place
        │
        ▼
Core computes RecoveryPlan
        │
        ▼
        PM receives dialog:switch:offer
        │
        ├── User rejects
        │      └── dialog remains blocked/recoverable with explicit state
        │
        └── User confirms
               │
               ▼
        Core creates new provider/model segment
               │
               ├── materialize unified-dialog.prompt.md
               ├── materialize provider-switch-handoff.md
               ├── create new runtime session with target provider/model
               └── send bootstrap prompt + latest unresolved intent
```

Критично:

- пользователь не меняет provider вручную через restart Core как обязательный шаг;
- Core делает это сам после explicit consent.

### 5.4. Retry budget и TTL для pending user intent

Чтобы recovery не превратился в бесконечный retry loop, MVP фиксирует явный budget:

- `transient_turn_failure`
  - максимум **1 silent retry** через короткую задержку `3-5 секунд`
  - только если classifier считает retry безопасным и нет риска двойной доставки

- `session_binding_recoverable`
  - максимум **1 automatic resumeSession attempt**

- после исчерпания budget
  - Core прекращает автоматические попытки
  - PM получает явный switch/recovery offer

Отдельное правило для user message:

- pending user intent хранится ограниченное время;
- MVP TTL: **60 секунд** с момента первой неуспешной доставки;
- после истечения TTL Core обязан явно сообщить пользователю, что предыдущее сообщение не было доставлено и его нужно отправить повторно.

---

## 6. Recovery Target Resolution

Нужен новый `RecoveryTargetResolver`.

### 6.1. MVP правила выбора

Приоритет:

1. Same provider, same model, explicit retry
2. Same provider, fallback model
3. Cross-provider fallback по stage

### 6.2. MVP fallback matrix

#### Claude

- использовать текущий default model из settings
- если session unrecoverable:
  - `description` → `codexCli`
  - `virtual_simulation` → `codexCli`
  - `diagram_modules` → `codexCli`

#### Codex

- использовать текущий default model из settings
- если session unrecoverable:
  - `description` → `claudeCodeCli`
  - `virtual_simulation` → `claudeCodeCli`
  - `diagram_modules` → `claudeCodeCli`

Дальше матрица должна стать настраиваемой, но для MVP допустим hardcoded resolver.

### 6.3. Обязательные health checks перед выбором target

`RecoveryTargetResolver` не должен выбирать fallback target вслепую.

Перед тем как предложить `switch_model` или `switch_provider`, resolver обязан проверить:

- adapter реально загружен;
- provider включён и доступен в текущем workspace;
- provider не находится в hard-degraded / unavailable state;
- credentials присутствуют хотя бы на базовом уровне;
- target model существует и разрешена для данного provider;
- target не нарушает будущую budget/routing модель из `MultiProvider_Orchestration_Scenarios`.

Следствие:

- hardcoded matrix остаётся MVP-стартом;
- но фактический target всегда проходит runtime validation;
- тот же механизм потом естественно расширяется в `Routing decision engine` из multi-provider planning-дока.

---

## 7. Универсальный subsystem смены provider/model

### 7.1. Почему это отдельный блок

Смена провайдера или модели нужна не только для `BUG-2026-03-25-01`.

Этот механизм будет переиспользоваться минимум в трёх сценариях:

1. **Core-driven recovery**
   - провайдер не отвечает
   - модель недоступна
   - native session невосстановима

2. **User-driven manual switch**
   - пользователь сам хочет сменить provider/model посреди continuity dialog
   - явной ошибки может ещё не быть

3. **PM-guarded degraded mode**
   - Core уже недоступен или упал
   - Project Manager остаётся жив и должен предупредить пользователя, что recovery/switch сейчас невозможен без возвращения Core

Следствие:
- provider/model switch нельзя оформлять как частную ветку `handleProviderFailure()`;
- нужен отдельный reusable orchestration layer, где recovery от ошибки является лишь одной из причин переключения.

### 7.2. Допустимые инициаторы

#### Core-initiated

Core сам инициирует offer на switch, если:

- classifier определил `provider_runtime_failure`;
- classifier определил `terminal_session_failure`;
- provider registry знает, что provider временно недоступен;
- выбранная модель недоступна или запрещена;
- same-provider retry/model fallback не помогли.

#### User-initiated

Пользователь сам инициирует switch, если:

- хочет продолжить тот же dialog на другой модели;
- хочет продолжить тот же dialog на другом provider;
- видит, что ответ завис/не устраивает, даже если Core ещё не классифицировал это как failure.

#### PM-initiated guard notification

PM не должен сам выполнять continuity transfer, но обязан инициировать user-facing guard flow, если:

- WebSocket к Core закрылся;
- `/api/v1/status` перестал отвечать;
- supervisor restart не дал ready state за разумный интервал.

### 7.3. Режимы переключения

Subsystem должен поддерживать три явных режима:

1. `retry_in_place`
   - тот же provider
   - та же модель
   - тот же native session, если `resumeSession(...)` возможен

2. `switch_model`
   - тот же provider
   - другая модель
   - in-place только если adapter явно умеет model switch без новой native session
   - иначе создаётся новый Core segment с тем же logical dialog

3. `switch_provider`
   - другой provider
   - всегда создаётся новая native session
   - continuity сохраняется на уровне `dialogId/rootSessionId`, а не provider session id

Жёсткий invariant:

- foreign `providerSessionId` никогда не переносится между провайдерами;
- same logical dialog может состоять из нескольких Core segments;
- pending user intent должен быть воспроизведён после успешного switch.

### 7.4. State machine subsystem-а

```text
idle
  │
  ├── user_requested_switch
  ├── core_detected_failure
  └── pm_detected_core_unavailable
          │
          ▼
analysis_pending
          │
          ├── core_alive
          │      ▼
          │   offer_ready
          │      ▼
          │   awaiting_user
          │      ▼
          │   preparing_transfer
          │      ▼
          │   creating_target_session
          │      ▼
          │   bootstrap_sent
          │      ▼
          │      active
          │
          └── core_unavailable
                 ▼
            waiting_for_core
                 ▼
            pm_user_warning
```

### 7.5. Две контрольные точки здоровья системы

#### Первая точка: Core

Core отвечает за:

- classification provider/model failure;
- выбор next target;
- построение transfer package;
- создание нового runtime/native session;
- replay pending user intent.

#### Вторая точка: Project Manager

PM должен стать отдельным guardian слоем поверх здоровья Core.

Уже существующая база в коде:

- `src/client/ui/src/core-bridge/core-bridge.ts`
  - отслеживает WebSocket close/error
  - шлёт `core:connection`
  - просит supervisor `ensure-started` / `restart`

- `src/client/ui/src/core-bridge/core-bridge-logger.ts`
  - пишет sanitized diagnostics для status/history/supervisor request failures
  - не логирует raw provider payloads или user message content
  - не блокирует UX recovery: reconnect/live stream/snapshot hydration остаются recovery path

- `src/client/ui/src/core-bridge/core-bridge-reconnect.ts`
  - формирует user-facing reconnect states

- `src/client/project-manager/components/sessions/status-hydrator.ts`
  - повторно ходит в `/api/v1/status`
  - умеет отличать `connecting` / `ready` / `error`

- `src/client/ui/src/session/status-panel.tsx`
  - после рефакторинга `1.2.104` рендерит четырёх-chip ряд (`Модель:` + provider-tinted кнопки имени модели и reasoning + правая `Токены:` плашка) только при `connectionStatus === "ready"` и непустом `models[0]`; при `connecting` / `error` или отсутствующих моделях панель возвращает `null`. Это значит, что состояние Core/provider теперь не имеет UI surface на этом ряду.

Новый requirement:

- этого недостаточно как UX (при недоступном Core статус-панель просто исчезает, и пользователь не получает диагностики);
- PM должен поверх текущего status panel показывать явный banner/modal/toast, если Core недоступен или подозрительно перезапускается;
- пользователь должен получить сообщение вида:
  - `Core недоступен. Пытаемся перезапустить.`
  - `Core упал и пока не восстановился. Попробуйте перезапуск.`
  - `После восстановления Core можно будет продолжить или сменить provider/model.`

### 7.6. Поведение при живом и мёртвом Core

#### Если Core жив

PM показывает:

- причину switch/recovery;
- рекомендуемую цель от Core;
- варианты:
  - retry in place
  - switch model
  - switch provider

После подтверждения пользователя switch делает сам Core.

#### Если Core мёртв

PM не должен притворяться, что умеет делать continuity transfer сам.

В MVP PM делает только следующее:

- детектит недоступность Core;
- показывает явное предупреждение;
- просит supervisor поднять Core;
- после reconnect предлагает повторить незавершённое действие.

Опционально для следующей итерации:

- PM может сохранить `pendingSwitchIntent` в своей локальной state-модели и отправить его в Core после reconnect.

### 7.7. User-driven manual switch

Manual switch должен быть доступен даже без error path.

Правила:

- пользователь может из session UI запросить:
  - смену модели того же provider;
  - смену provider;
- Core обязан трактовать это как continuation migration, а не как новую независимую сессию;
- если switch не требует same-session resume, Core создаёт новый segment в том же logical dialog;
- старый segment остаётся read-only частью continuity chain.

### 7.8. Согласование с `MultiProvider_Orchestration_Scenarios`

Этот документ не реализует multi-provider orchestration целиком, но обязан заложить для него совместимую базу.

Связь с [MultiProvider_Orchestration_Scenarios.md](../Plans/Archive/MultiProvider_Orchestration_Scenarios.md#L1):

- `dialog:switch:*` и `dialog-switch-orchestrator`
  - это low-level primitive для будущего `multi-provider-orchestrator`
  - соответствует идее общего coordination layer из [раздела 2](../Plans/Archive/MultiProvider_Orchestration_Scenarios.md#L34)

- current `switch_provider` / `switch_model`
  - это база для `Adaptive Specialist Routing` из [Scenario D](../Plans/Archive/MultiProvider_Orchestration_Scenarios.md#L182)

- provider failure fallback внутри continuity
  - это прямой ответ на open question про graceful fallback, если один provider "умер" в multi-provider flow [раздел 6, пункт 5](../Plans/Archive/MultiProvider_Orchestration_Scenarios.md#L354)

- unified dialog + provider-neutral transfer package
  - это база для того, чтобы в сценариях A-F можно было безопасно передавать контекст между провайдерами без опоры на provider-native JSONL

- Project Manager guardian flow
  - остаётся совместимым с будущими multi-provider session groups, потому что реагирует на здоровье Core, а не на конкретный provider implementation

Жёсткое правило совместимости:

- никакой новой логики provider switch нельзя привязывать к Claude/Codex/Kimi-specific storage format;
- все контракты должны оставаться provider-neutral, чтобы их потом мог вызывать будущий `multi-provider-orchestrator`.

---

## 8. Provider-Facing Continuation Package

### 8.1. Разделение на Core-owned snapshot и provider-facing payload

Здесь нужно разделить две разные задачи:

1. **Core-owned snapshot**
   - нужен для audit/debug/traceability
   - может содержать технические метаданные

2. **Provider-facing payload**
   - должен читаться новым провайдером как обычный prompt context
   - не должен содержать JSONL/event envelopes/runtime metadata

Следствие:
- новый provider не должен читать наши JSONL;
- новый provider не должен читать metadata-rich transcript как основной prompt;
- provider-facing payload должен быть плоским и человеко/LLM-читаемым.

### 8.2. Какие файлы нужны

Для MVP нужны **2 обязательных** файла и **1 optional diagnostic** файл.

Core материализует:

1. `unified-dialog.prompt.md`
   - provider-facing plain dialog
   - только текст диалога в формате `User:` / `Assistant:`

2. `provider-switch-handoff.md`
   - краткий context package
   - reason, target, canonical preamble, artifacts, latest user intent

3. `unified-dialog.snapshot.md` *(optional для MVP)*
   - Core-owned continuity snapshot
   - для аудита и отладки

Критично:

- provider switch в MVP не блокируется отсутствием snapshot-файла;
- для фактического takeover нового provider достаточно `unified-dialog.prompt.md` + `provider-switch-handoff.md`.

### 8.3. Где хранить

Предлагаемый путь:

- `.codeai-hub/<workspaceSlug>/continuity/provider-switch/<dialogId>/<timestamp>/unified-dialog.snapshot.md`
- `.codeai-hub/<workspaceSlug>/continuity/provider-switch/<dialogId>/<timestamp>/unified-dialog.prompt.md`
- `.codeai-hub/<workspaceSlug>/continuity/provider-switch/<dialogId>/<timestamp>/provider-switch-handoff.md`

Принципиально:

- это **не** provider-native storage;
- это **не** Claude/Codex/Kimi provider-native storage;
- это отдельный Core-owned continuity package.

### 8.4. Источник данных и нормализация

Оба dialog-файла строятся из `DialogHistoryService.readHistory(...)`, а не из provider-native logs.

Нормализация:

- включать `user`
- включать `assistant`
- `thinking` исключать полностью
- tool/debug/provider envelopes исключать полностью
- сортировка только по timestamp
- dedupe по `messageId`

Особое правило для `system`:

- provider-facing transcript не должен быть просто дампом старых `system` сообщений;
- portable session instructions должны попадать в `provider-switch-handoff.md` как `Canonical Session Preamble`;
- raw provider-specific bootstrap не переносится verbatim автоматически.

### 8.5. Что именно отправляется новому провайдеру

Новый provider получает:

1. `provider-switch-handoff.md`
2. `unified-dialog.prompt.md`
3. canonical artifact paths
4. latest unresolved user intent

Новый provider **не** получает:

- provider rollout JSONL
- raw SDK logs
- event envelopes
- token usage snapshots
- raw previous provider system/bootstrap prompt

### 8.6. Нужно ли пересылать первоначальный prompt ядра

Ответ: **не в raw виде**.

Нельзя слепо пересылать исходный provider-specific bootstrap, потому что:

- он мог содержать vendor-specific assumptions;
- он мог зависеть от старой модели/старого CLI;
- он мог включать технические детали, ненужные новому provider.

Вместо этого Core должен собрать **Canonical Session Preamble**.

`Canonical Session Preamble` включает только переносимые вещи:

- текущий workflow stage;
- текущую objective/task framing;
- обязательные артефакты и пути;
- язык ответа;
- критические user-approved constraints;
- правила continuation, например `продолжай с места обрыва`.

То есть:

- старый raw system prompt не копируем как есть;
- Core строит новый provider-neutral preamble;
- после preamble новому provider передаётся plain dialog.

### 8.7. Синтаксис `unified-dialog.snapshot.md`

Это внутренний Core-owned файл. Он может содержать ограниченные метаданные:

```md
# Unified Dialog Snapshot

**Dialog ID:** <dialogId>
**Workspace:** <workspaceSlug>
**Stage:** <stageId>
**Messages:** <count>

---

## Message 000001
- Timestamp: 2026-03-26T12:34:56.000Z
- Role: USER
- Segment Session: <sessionId>

<verbatim content>
```

Этот файл нужен для audit/debug и не является основным provider-facing prompt.

### 8.8. Синтаксис `unified-dialog.prompt.md`

Это главный provider-facing transcript.

Требование: **никаких метаданных внутри turn body**.

Формат:

```md
User:
<verbatim user text>

Assistant:
<verbatim assistant text>

User:
<verbatim user text>
```

Ограничения:

- без timestamp;
- без session ids;
- без provider ids;
- без JSON;
- без SDK fields;
- без `thinking`;
- без tool/event envelopes.

Минимальная грамматика:

```text
PromptDialog
  = PromptTurn+

PromptTurn
  = "User:" LF Content LF LF
  | "Assistant:" LF Content LF LF
```

Именно этот файл должен понимать новый provider как читаемый текстовый диалог.

### 8.9. Синтаксис `provider-switch-handoff.md`

```md
# Provider Switch Handoff

## Switch Context
- Initiator: <core_recovery|user_request|pm_recovered_after_core_restart>
- Previous provider: <providerId>
- Previous model: <modelId|unknown>
- Target provider: <providerId>
- Target model: <modelId|settings-default>
- Switch mode: <retry_in_place|switch_model|switch_provider>
- Reason: <human readable>

## Canonical Session Preamble
- Stage: <stageId>
- Language: Russian
- Continue from the interruption point unless the user asks otherwise.
- Respect canonical artifacts over older assistant assumptions.

## Current Objective
- <current workflow objective>

## Canonical Artifacts To Read
1. <absolute path>: <why>
2. <absolute path>: <why>

## Latest Unresolved User Intent
- Raw user message: "<...>"
- If the raw message is "Продолжай", continue from the exact interruption point.

## Provider-Facing Dialog
- <absolute path to unified-dialog.prompt.md>

## Rules
- Do not mention provider switch unless the user asks.
- Treat the provider-facing dialog as the canonical conversational transcript.
- Continue in Russian.
```

### 8.10. Bootstrap prompt, который Core отправляет новому провайдеру

Новый provider получает markdown prompt вида:

```md
# Core Continuation Bootstrap

You are taking over an existing CodeAI Hub dialog.

Read these inputs in order before replying:
1. <absolute path to provider-switch-handoff.md>
2. <absolute path to unified-dialog.prompt.md>
3. <absolute canonical artifact path 1>
4. <absolute canonical artifact path 2>

Hard rules:
- Do not mention provider switching unless the user asks directly.
- Do not restate the full history.
- Continue from the latest unresolved user intent.
- Follow canonical artifacts over older assistant assumptions if they conflict.
- Reply in Russian.
```

Почему это работает лучше:

- новый provider читает plain dialog как обычный conversational prompt;
- handoff-файл держит компактный контекст отдельно;
- Core-owned snapshot остаётся для дебага, но не засоряет provider bootstrap.

Отдельное архитектурное решение:

- новый switch package не должен reuse старый `session-continuity` handoff как базовый orchestration path;
- допускается reuse только мелких утилит, если они не тянут lifecycle coupling;
- основной switch flow должен жить отдельным модулем.

---

## 9. Bridge / PM Protocol Changes

Поскольку switch должен работать не только для recovery, внешний protocol должен быть **generic**, а не bug-specific.

Recovery является одной из причин switch, а не отдельным subsystem-ом.

### 9.1. Новые outgoing events от Core

- `dialog:switch:offer`
  - `dialogId`
  - `sessionId`
  - `initiator: core_recovery | user_request`
  - `reason`
  - `recommendedTarget`
  - `alternativeTargets`
  - `canRetryInPlace`

- `dialog:switch:progress`
  - `phase: analyzing | awaiting_user | preparing_transfer | creating_session | sending_bootstrap | done | failed`

- `dialog:switch:result`
  - success/failure
  - new `sessionId`
  - new `providerId`
  - new `providerSessionId`

### 9.2. Новые incoming commands от PM

- `dialog:switch:request`
  - user-initiated switch without prior Core error
  - `dialogId`
  - `targetProviderId?`
  - `targetModelId?`
  - `mode: switch_model | switch_provider`

- `dialog:switch:confirm`
  - `dialogId`
  - `targetProviderId`
  - `targetModelId?`
  - `mode: retry_in_place | switch_model | switch_provider`

- `dialog:switch:cancel`
  - пользователь явно отказался от switch action

### 9.3. PM health-side UX contract

Если Core жив, PM показывает:

- причину switch/recovery;
- recommended target от Core;
- явное подтверждение пользователя.

Если Core недоступен, PM показывает:

- явный crash/unavailable banner;
- статус попытки reconnect/restart;
- sanitized non-blocking diagnostic events for failed status snapshot, history hydration, or supervisor bridge calls;
- CTA:
  - `Retry connection`
  - `Restart core`
  - `Continue after core is back`

### 9.4. Пример payload для `dialog:switch:offer`

```json
{
  "type": "dialog:switch:offer",
  "dialogId": "dlg_123",
  "sessionId": "sess_456",
  "initiator": "core_recovery",
  "reason": "Codex model is unavailable and current native session is not recoverable",
  "recommendedTarget": {
    "providerId": "claudeCodeCli",
    "modelId": null,
    "mode": "switch_provider"
  },
  "alternativeTargets": [
    {
      "providerId": "codexCli",
      "modelId": "gpt-5.4-mini",
      "mode": "switch_model"
    }
  ],
  "canRetryInPlace": false
}
```

### 9.5. Пример payload для `dialog:switch:request`

```json
{
  "type": "dialog:switch:request",
  "dialogId": "dlg_123",
  "targetProviderId": "claudeCodeCli",
  "targetModelId": null,
  "mode": "switch_provider"
}
```

---

## 10. Компоненты и write scopes

### 10.1. Новые core-компоненты

- `packages/core/src/recovery/provider-failure-classifier.ts`
  - классифицирует provider/model failures

- `packages/core/src/recovery/recovery-target-resolver.ts`
  - выбирает next provider/model

- Provider-neutral preamble/dialog transfer builders remain deferred design targets and are not materialized as standalone recovery files in the current codebase.

### 10.2. Existing файлы, которые нужно изменить

- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - classifier integration
  - no silent drop
  - switch protocol hooks

- `packages/core/src/provider-registry/index.ts`
  - transient error must not always degrade whole provider

- `packages/core/src/remote-bridge/types.ts`
  - new bridge messages

- `src/client/project-manager/core-stream-message-types.ts`
  - new switch message types

- `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`
  - provider-facing export path

- `packages/core/src/unified-session/storage.ts`
  - current same-provider `backfillHistory(...)` insufficient for cross-provider case
  - нужен новый API поверх provider-neutral source

- `src/client/ui/src/core-bridge/core-bridge.ts`
  - expose stronger connection state to PM/UI

- `src/client/ui/src/core-bridge/core-bridge-logger.ts`
  - sanitized browser-side diagnostics for best-effort Core Bridge recovery paths

- `src/client/ui/src/core-bridge/core-bridge-reconnect.ts`
  - PM-facing degraded status messages

- `src/client/project-manager/components/sessions/status-hydrator.ts`
  - health guardian logic

### 10.3. PM/UI

- новый switch/recovery banner or modal в session panel
- manual `switch model / switch provider` entrypoint
- explicit approve/reject UX
- отдельное предупреждение, если Core unavailable/crashed
- progress phases от Core

---

## 11. Execution Plan

Этот раздел описывает целевой MVP scope. По состоянию на audit `2026-05-01` он реализован только частично: error classification, retry budget, `dialog:switch:*` scaffold и same-provider `switch_model` уже в коде; полноценный `switch_provider` и provider-neutral handoff package остаются deferred.

То есть:

- в `todo-plan` будут отдельные микро-задачи и workstreams;
- но целевой deliverable один: рабочий MVP provider/model switch + bugfix resilience;
- non-blocking optional items не должны останавливать закрытие MVP.

### 11.0. MVP Done Criteria

Target MVP считается завершённым, когда одновременно выполнены все условия:

- transient provider errors больше не убивают binding и не оставляют UI в вечном running state;
- один safe silent retry поддержан для transient ошибок;
- same-provider retry и `switch_model` работают;
- `switch_provider` после user consent работает;
- новый provider получает plain dialog transcript, а не provider-native JSONL;
- PM показывает явное сообщение, если Core недоступен.

### Stream A — Error classification and no-silent-drop

- Ввести classifier.
- Прекратить вызывать full `handleProviderFailure()` для transient turn errors.
- Гарантировать `turn_failed`.
- При missing binding отправлять явный recovery/error event, а не просто `return`.

### Stream B — Same-provider retry and model switch

- Использовать сохранённый `providerSessionId`.
- Пробовать `resumeSession(...)`.
- Добавить path `switch_model` для того же provider.
- При успехе rebind + resend pending intent.

### Stream C — Generic provider/model switch orchestrator

- Ввести generic `dialog:switch:*` protocol.
- `CanonicalSessionPreambleResolver`.
- `ProviderFacingDialogBuilder`.
- Новый provider/model segment с тем же `dialogId/rootSessionId`.

### Stream D — PM second health checkpoint and crash UX

- Усилить PM health detection.
- Добавить banner/modal при недоступном Core.
- Добавить retry/restart CTAs.
- В памяти PM держать optional pending switch intent after reconnect.

### Stream E — Documentation and tests

- `doc/BugRegistry.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- tests для Core + PM + provider/model switch paths

---

## 12. Verification Scenarios

1. **Codex capacity error**
   - current turn завершается `turn_failed`
   - binding не дропается молча
   - same-provider retry возможен

2. **Transient failure happy path**
   - silent retry не сработал, но binding остался жив
   - пользователь пишет следующее сообщение
   - сообщение успешно доходит без ручного switch

3. **User-initiated model switch при живом Core**
   - пользователь выбирает другую модель того же provider
   - Core продолжает тот же logical dialog

4. **Cross-provider switch после terminal session failure**
   - пользователь подтверждает target provider
   - Core создаёт новый segment
   - новый provider получает `provider-switch-handoff.md` + `unified-dialog.prompt.md`
   - `Продолжай` продолжает тот же logical dialog

5. **Core crash while PM survives**
   - PM показывает crash/unavailable banner
   - supervisor restart запускается повторно
   - после возврата Core пользователь может продолжить recovery/switch

6. **Pending intent TTL expired**
   - recovery не удался за 60 секунд
   - пользователь получает явное сообщение, что предыдущее сообщение нужно отправить повторно

7. **No provider-native log dependency**
   - switch builder работает даже если rollout/SDK log отсутствуют или изменили формат

8. **Provider-facing transcript is plain dialog**
   - новый provider получает только `User:` / `Assistant:` transcript
   - metadata-rich snapshot не используется как primary prompt

---

## 13. MVP Assumptions

Для текущего MVP scope фиксируются следующие решения:

1. **Stage-specific artifact resolver**
   - отдельный новый resolver в MVP не вводится;
   - используются canonical artifacts текущего stage, уже доступные из workflow/runtime context;
   - специализированный resolver переносится в post-MVP.

2. **`targetModelId` behavior**
   - persistent session-scoped model override в MVP не вводится;
   - если explicit `targetModelId` не передан, используется текущий settings default;
   - если explicit `targetModelId` передан в `dialog:switch:confirm`, он применяется только к текущей switch operation.

3. **`pendingSwitchIntent` persistence**
   - в MVP хранение только in-memory на стороне PM;
   - disk-persistence переносится в post-MVP.

Эти assumptions обязательны для нового `todo-plan` и не должны переобсуждаться во время реализации, если не найден блокирующий technical constraint.

---

## 14. Post-MVP Questions

1. Нужен ли отдельный stage-specific artifact resolver для каждого workflow шага после MVP?
2. Нужен ли persistent session-scoped model override после MVP?
3. Нужна ли disk-persistence для `pendingSwitchIntent` после MVP?
