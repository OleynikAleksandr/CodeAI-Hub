# Pre-Turn Usage Limits Refresh For Reopened Dialogs

## Problem

При открытии уже существующего Claude/Codex dialog в Project Manager пользователь часто видит пустой usage-limits widget до первого нового turn. Это происходит в обоих ключевых сценариях:

- переход на другой шаг в том же workspace, где уже есть завершённый dialog;
- переключение в другой workspace и открытие шага с уже существующим dialog.

Для пользователя это неверный UX: именно в момент продолжения диалога нужно понимать, остались ли лимиты у провайдера до отправки следующего сообщения.

При этом действующий продуктовый контракт сохраняется и нарушать его нельзя:

- reopened dialogs materialize-ятся как paper/runtime sessions без eager provider resume;
- реальный `resumeSession`/`thread/resume`/SDK hydration происходят только на первом новом user message;
- Session UI не должен возвращаться к mount-driven polling или к eager provider hydration всех открытых dialog'ов.

## Confirmed Current Behavior

### 1. Provider usage limits формально account-scoped, но delivery остаётся session-shaped

Core usage-limits cache уже строится по `{providerId}:global`, то есть один успешный Claude/Codex refresh логически подходит всем dialog'ам провайдера. Это зафиксировано в `Usage_Limits_AccountScoped_Warmup_Architecture.md` и `SystemArchitecture.md` §3.

Но transport/replay path до PM всё ещё завязан на `sessionId`:

- websocket replay хранит последнее `usage_limits` событие по `sessionId`, а не по `providerScopeKey`;
- replay после `workspace:select` отправляется сразу в клиентский stream;
- PM применяет `usage_limits` только если snapshot для `payload.sessionId` уже существует.

Если event приходит раньше dialog bootstrap, он теряется для UI, хотя provider-scoped truth уже была.

### 2. Dialog bootstrap очищает локальные snapshots до provider-usage seed

При новом dialog intent PM сбрасывает локальные snapshots и только потом делает `workspace:select` + `dialog:list`. Если `usage_limits` replay прилетает в этот промежуток, он не переживает bootstrap нового active dialog.

### 3. Single-probe warmup не покрывает open-time UX

Hotfix `1.2.44` исправил storm repeated `binding_ready` probes, но не решил user-visible контракт "покажи лимиты до первого нового turn":

- первый `binding_ready` warmup может сработать до того, как PM создал snapshot активного dialog;
- provider может быть отмечен warmed ещё до того, как UI получил usable payload;
- subsequent `binding_ready` для того же провайдера уже dedup-ятся;
- если затем пользователь просто открывает другой dialog того же провайдера, виджет остаётся пустым до `turn_completed` или provider push на реальном новом turn.

### 4. Reopened dialog intentionally stays lazy

Materializer paper-session contract правильный и должен сохраниться:

- `dialog:list` materialize-ит runtime shell + ready binding в workspace snapshot;
- provider thread/session не гидратируется;
- первый настоящий send остаётся единственной точкой provider resume.

Значит решение должно давать truthful limits без eager session resume.

## Goals

1. Показать last-known provider-scoped limits сразу при открытии reopened dialog, если они уже есть в текущем PM/Core lifetime.
2. Если last-known данных нет, запустить дешёвый provider-scoped refresh до первого нового user message.
3. Не поднимать provider session/thread/dialog только ради лимитов.
4. Показывать те же reset annotations в скобках, что и в post-turn path: для 5-часового и недельного окна при наличии `resetsAt` пользователь должен видеть `Session N% (Resets ...)` / `Weekly M% (Resets ...)` уже в pre-turn seeded/open-time refreshed состоянии.
5. Сохранить текущий post-turn/live path без регрессий:
   - Codex продолжает обновлять limits из `account/rateLimits/updated`;
   - Claude продолжает обновлять limits из `rate_limit_event` / `turn_completed`.
6. После Core restart / computer restart пользователь должен получать truthful limits после cheap refresh, а не только после первого полноценного turn.

## Non-Goals

- disk persistence usage limits across Core restart;
- eager resume всех reopened dialog'ов на `dialog:list`;
- возврат к UI mount/remount polling;
- изменение token-usage contract;
- rate-limit error handling после failed send (отдельный future scope).

## Solution

### Phase 1 — PM provider-scoped usage telemetry memory

Нужен отдельный PM-side слой памяти для usage limits, независимый от существования конкретного session snapshot.

#### Contract

- Ключ хранения: `providerScopeKey` (`claude:global`, `codex:global`, `gemini:global`).
- Любой входящий `session:stream` с `data.kind = "usage_limits"`:
  - сохраняется в provider-scoped PM cache;
  - применяется к текущему source snapshot, если он уже существует;
  - не теряется, если source snapshot ещё не создан.

#### Consequence

Когда PM позже создаёт snapshot reopened dialog:

- `createInitialSnapshot(...)` / dialog bootstrap path seed-ят `status.usageLimits` и `status.usageLimitLabels` из provider-scoped cache;
- если cached payload уже содержит `resetsAt`, Session UI seed-ит и reset labels/скобочный формат сразу, без ожидания нового turn;
- usage widget получает last-known value немедленно;
- workspace-switch и dialog-switch начинают использовать уже увиденную provider truth, а не ждать новый turn.

Это решает race `workspace:select replay arrives before snapshot`.

### Phase 2 — Explicit pre-turn refresh on dialog activation

Нужен отдельный open-time trigger, привязанный не к mount/remount, а к явному user intent "я открыл этот dialog и собираюсь его продолжать".

#### Trigger ownership

Ownership остаётся lifecycle-driven, но не purely passive:

- PM не рефрешит usage limits на mount/rerender;
- PM имеет право отправить explicit Core request на **dialog activation event**;
- transport reuse: существующий `session:refreshUsageLimits` с новым `lifecycleTrigger: "dialog_opened"`.

#### Timing

Trigger запускается, когда active dialog session уже разрешена:

- либо это уже существующая runtime session;
- либо PM только что сделал targeted restore/create session для reopened dialog и получил session record / binding.

То есть refresh относится к **открытому пользователем active dialog**, а не ко всем dialog'ам из `dialog:list`.

#### Core behavior

На `dialog_opened` Core обязан:

1. Сначала попытаться replay provider-scoped cached payload.
2. Если payload отсутствует или stale, dispatch cheap refresh.
3. Не выполнять provider session hydration/turn start ради этого refresh.

### Phase 3 — Cheap provider-specific refresh paths

#### Codex

- Разрешён только account-level path `account/rateLimits/read`.
- Допустимо поднять `codex app-server` process, если он ещё не жив.
- Недопустимо делать `thread/start` / `thread/resume` / `turn/start` ради limits.
- После первого реального turn active baseline остаётся прежней: `account/rateLimits/updated` push — primary truth.

#### Claude

- Используется существующий headers probe (`max_tokens: 1`) через `ClaudeLiveHeadersReader`.
- Probe читает `anthropic-ratelimit-unified-*` headers.
- Недопустимо резюмировать Claude SDK dialog/session ради limits.
- После первого реального turn текущий path остаётся прежним: `rate_limit_event` + `turn_completed`.

### Phase 4 — Warmup semantics must stop penalizing empty first probe

Текущий single-probe warmup полезен против storm, но он не должен permanently suppress open-time refresh, если первый probe не дал usable payload.

Нужен один из двух допустимых вариантов:

1. `UsageLimitsWarmupTracker` считает провайдер warmed только после usable payload;
2. `dialog_opened` explicit trigger bypass-ит empty-warmup suppression через freshness / in-flight guards.

Для этого scope предпочтителен второй вариант как минимально-инвазивный:

- `binding_ready` dedup policy из `1.2.44` сохраняется;
- `dialog_opened` трактуется как explicit user-open intent и имеет свой refresh gate;
- repeated clicks защищаются provider-scoped throttling / in-flight guard, а не warmed-only boolean.

### Phase 5 — UI state model for cold open

Новый UX должен отличать три состояния:

1. **ready**
   - есть last-known provider snapshot;
   - проценты и reset time показываются сразу;
   - формат остаётся тем же, что и сейчас после turn completion: `Session N% (Resets ...)` / `Weekly M% (Resets ...)`.

2. **loading**
   - dialog открыт, last-known snapshot отсутствует, cheap refresh уже в полёте;
   - UI показывает явное pending-state для `Session` / `Weekly`, а не молчаливую пустую полосу и не fake `0%`;
   - как только refresh вернул `resetsAt`, скобочная reset information появляется вместе с процентами без дополнительного turn.

3. **unavailable**
   - cheap refresh завершился без usable payload / с ошибкой;
   - UI показывает явный neutral fallback (`—` / unavailable-state), но не врёт нулями.

Новый turn после user message просто перезаписывает это состояние текущим live/post-turn path.

## Detailed Design Decisions

### Decision A — No eager resume

Rejected:

- eager `resumeSession` / `thread/resume` при `dialog:list`;
- eager hydration при `dialog:open`.

Reason:

- это ломает intentional lazy continuity contract и масштабирует cold-start по числу reopened dialog'ов.

### Decision B — No disk persistence

Rejected:

- persisted usage-limits snapshot on disk as startup truth.

Reason:

- limits account-wide и меняются вне CodeAI Hub;
- disk snapshot быстро устаревает и создаёт ложную уверенность;
- cheap refresh on explicit open gives truthful data with lower architectural risk.

### Decision C — Reintroduce refresh only on explicit dialog-open lifecycle

Accepted:

- не возвращаем refresh на mount/remount;
- возвращаем only explicit `dialog_opened` refresh;
- trigger is intentional, bounded, provider-scoped, and cheap.

## Code Landing

### PM / UI

- `src/client/project-manager/components/sessions/usage-limits-stream.ts`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`
- `src/client/project-manager/components/sessions/dialog-session-bootstrap.ts`
- `src/client/ui/src/session/helpers.ts`
- `src/client/ui/src/session/session-id-bar.tsx`

### Core

- `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-refresh.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-warmup.ts`
- `packages/core/src/remote-bridge/remote-bridge-message-router.ts`
- `packages/core/src/remote-bridge/handlers/websocket-manager.ts` (только если provider-scoped replay helper понадобится на transport-layer; иначе PM cache решает race без его изменения)

### Providers

- `packages/Claude_Module/src/provider/claude-provider-adapter.ts`
- `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`
- `packages/core/src/provider-registry/provider-usage-limits-bridge-factory.ts`

## Verification Targets

1. Same workspace, другой шаг, reopened Codex dialog:
   - widget seed-ится immediately from provider cache если он уже был;
   - при cold cache уходит в loading;
   - до первого нового turn появляются truthful limits;
   - при наличии `resetsAt` видны скобки `Resets ...` у 5-часового и недельного окна.

2. Другой workspace, reopened Codex dialog:
   - same-provider cache reuse работает cross-workspace внутри текущего PM lifetime;
   - при отсутствии cache выполняется cheap account refresh без `thread/resume`.

3. Claude reopened dialog:
   - no SDK dialog resume before first user message;
   - headers probe даёт limits до первого нового turn;
   - если probe вернул `resetsAt`, UI показывает reset labels в том же формате, что и post-turn path.

4. Core restart / computer restart:
   - provider cache пуст;
   - open dialog triggers cheap refresh;
   - UI never shows fake `0%` or silent empty bars as final state.

5. First real turn after open:
   - Codex continues with passive push `account/rateLimits/updated`;
   - Claude continues with `rate_limit_event` / `turn_completed`;
   - no double UI ownership / no mount storm regression.

## Canonical Document Landing

После реализации scope:

- `SystemArchitecture.md` §3 Invariant 1 и invariant 31 дополняются pre-turn dialog-open refresh contract;
- `SessionUI_Behavior.md` уточняет исключение: UI остаётся display-only на mount/remount, но explicit dialog activation может запрашивать pre-turn provider refresh через Core;
- `Dialogs_And_Continuity_Routing.md` дополняется provider-scoped replay/seed contract для reopened dialogs;
- `BugRegistry.md` получает отдельную запись для reopened pre-turn usage visibility bug.
