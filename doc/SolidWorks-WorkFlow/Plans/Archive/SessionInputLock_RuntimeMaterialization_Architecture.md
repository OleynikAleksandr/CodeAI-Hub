# Session Input Lock — Runtime Session Materialization From Continuity

## Problem

Пользователь открывает workspace, в котором на диске существуют continuity entries для нескольких stage-ов (например, `description`, `virtual_simulation`, `diagram_modules`). Core на cold-start восстанавливает runtime session только для `lastActive` stage из `workflow/state.json` (путь через `workspace-activate-service.ts`). Runtime session-объекты для остальных continuity entries не создаются.

Когда PM reopen-ит один из этих dialogs:

1. `dialog:list` возвращает корректный `ContinuityIndexEntry[]` (читается напрямую с диска через `DialogListService.listDialogs()`).
2. PM создаёт initial `SessionSnapshot` для workflow session с `connectionState: "running"` (см. `createInitialSnapshot` в `src/client/ui/src/session/helpers.ts`), ожидая, что Core сейчас инициирует turn.
3. PM проверяет `latestWorkspaceSnapshotRef` и через `resolveRuntimeSessionFromWorkspaceSnapshot` получает `hasRuntimeSession: false` — snapshot не содержит запись для этой sessionId.
4. `shouldSuppressIdleDialogRestoreRefresh` возвращает true → PM подавляет `createSession` restore-запрос (оптимизация из релиза 1.2.18, Invariant 31).
5. `session-stream.applyWorkspaceSnapshotToSnapshots()` при получении snapshot'а пропускает этот sessionId (т.к. `runtimeSessions[preferredSessionId]` undefined) → initial `connectionState: "running"` остаётся навечно → InputPanel показывает `Agents is working, please wait...`.

Следствие для Stop: `SessionRequestHandlerStopAction.handleStop()` начинается с `sessionManager.getSession(sessionId)` и при undefined возвращает `"Session not found"` без эмиссии `turn_state: "idle"`. Stop-кнопка клика не снимает блокировку.

Оба симптома — разные углы одной архитектурной асимметрии: **persisted continuity entries существуют на диске, но runtime session-объекты не созданы в памяти Core**.

## Solution

Восстановить симметрию `workspace:snapshot` и continuity index: при `dialog:list` Core материализует stub runtime session для каждой continuity entry, чьей `latestSessionId` ещё нет в `SessionManager`. Stub содержит:

- `Session` объект с `id: latestSessionId`, `providerId` из continuity, `providerSessionId` из continuity, `providerSessionStatus: "ready"`, `stage`, `workspacePath`.
- Зарегистрированный `ProviderSessionBindingLike` в `SessionProviderBindingService.providerSessions` — чтобы `handleStop` нашёл binding.
- Hydrated entry в `WorkspaceStore` через `notifySessionCreated` callback с `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"` — чтобы попала в следующий `workspace:snapshot` push.

Stub не стартует provider adapter turn. Реальный `thread/resume` произойдёт лениво, когда пользователь пошлёт первый message через существующий `resolveProviderSessionId` path в `session-request-handler-message-dispatch.ts`.

После fix:

- `workspace:snapshot` всегда содержит runtime session для каждого reopened dialog с `turnState: idle`.
- PM `session-stream.applyWorkspaceSnapshotToSnapshots()` автоматически переводит initial "running" в "idle" через существующий `snapshotSignalsIdleUnlocked` path (fix релиза 1.1.646).
- Stop-кнопка находит session и binding в Core; `adapter.closeSession(providerSessionId)` на Codex app-server безопасно — метод только `turn/interrupt`-ит active turn (которого у stub нет) и удаляет entry из internal Map.
- Никаких PM-side safety-net'ов или специальных fallback логик.

## Implementation surface

Новый/меняемый код:

- `packages/core/src/session-manager/index.ts` — добавить `registerSessionWithId(options)`: принимает explicit `sessionId`, `providerId`, `workspacePath`, `providerSessionId`, `stage`. Если session уже существует — noop. Иначе создаёт `Session` с `providerSessionStatus: "ready"` и сохраняет в `sessions` Map.
- `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts` — добавить `registerRestoredBinding(sessionId, providerId, providerSessionId)`: создаёт paper-binding в `providerSessions` Map без provider adapter call. Помечает session `providerSessionStatus: "ready"`.
- `packages/core/src/remote-bridge/handlers/session-continuity-materializer.ts` — новый helper `materializeContinuityEntries(entries, workspacePath, deps)`: для каждой entry с `latestSessionId && providerSessionId` и отсутствующей в `sessionManager` вызывает registerSessionWithId + registerRestoredBinding + `notifySessionCreated` callback c `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`.
- `packages/core/src/remote-bridge/remote-bridge-dialog-command-router.ts` — вызвать materializer после `dialogListService.listDialogs()`, перед отправкой `dialog:list:result`.

## Out of Scope

- PM-side правки не требуются: после Core-fix существующие PM path'и автоматически работают.
- Full eager cold-start hydration (материализация всех continuity entries при старте Core без `dialog:list`-trigger) — deferred. Lazy-on-first-dialog-list достаточно, потому что PM всегда вызывает `dialog:list` перед открытием диалогов.
- Provider adapter pre-resume: stub bind'ится на `providerSessionId`, но `thread/resume` не вызывается до первого user message. Это нормально: Codex adapter `closeSession` безопасен для stub'а, а dispatch path уже умеет ленивый resume через existing `resolveProviderSessionId`.
- Refactor существующих `workspace-activate-service.ts` / `auto-select lastActive` paths: работают и после fix-а (description session продолжит создаваться через activate path, остальные — через materializer на dialog:list).

## Canonical Document Landing

SSOT правки:

- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md` — добавить инвариант "runtime session materialization on dialog:list" как часть snapshot-first lock contract.
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md` — упомянуть, что reopened workflow dialog всегда имеет runtime session в workspace snapshot после первого `dialog:list`.
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md` — зафиксировать materializer как часть dialog:list path.
- `doc/BugRegistry.md` — новая запись о баге и fix-е.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Инвариант 1 — уточнить, что "snapshot-first lock contract" опирается на гарантию наличия runtime session entry для каждой active continuity entry.

После закрытия cycle planning-doc архивируется в `doc/SolidWorks-WorkFlow/Plans/Archive/`.
