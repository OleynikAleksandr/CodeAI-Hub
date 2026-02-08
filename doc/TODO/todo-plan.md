# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов** и **≤ 3 новых классов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка/тест затронутых пакетов.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md`.
- Любые изменения логики/архитектуры синхронно отражаются в документации (`doc/Project_Docs/**`) в том же коммите.
- Любая фаза завершается только после чистого `git status` и фиксации session report.

## Required documents to review before work
1. `doc/SolidWorks-Flow/WorkspaceRuntime_LayeredArchitecture.md`
2. `doc/SolidWorks-Flow/InterfaceMap_WorkspaceRuntime.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

## Ключевые принципы Phase 105
- **Additive migration**: новый workspace runtime добавляется рядом с существующими механизмами, не ломая их. Legacy Phase 104 scoped delivery остаётся до явного удаления.
- **Два канала данных**: (1) `workspace:snapshot` — state transitions (turn_state, locks, nodes, artifacts); (2) существующие `session:message/history/stream/error` — контент сессий (остаётся event-driven).
- **Compound keys enforced**: `NodeKey = (workspaceRoot, nodeId)`, `SessionKey = (workspaceRoot, nodeId, sessionId)` — на уровне типов.
- **Micro-classes ≤ 300 строк**, facade как единственная публичная точка входа модуля.
- **sessionId = UUID (`randomUUID()`)**, глобально уникален в рамках Core процесса. Node может иметь несколько артефактов (`Record<artifactId, ArtifactPointer>`).
- **Snapshot push triggers**: turnState change, continuityLockActive change, bindingStatus change, NodeStatus change, loadState change, artifact change, session added/removed. НЕ пушить на каждый stream chunk (lastHeartbeatAt — серверный watchdog).

## Принятые решения по замечаниям аудита
- В Core не добавляем workspace-namespace для `Map/Set`, keyed by `sessionId`: `sessionId` генерируется как UUID (`randomUUID()`) и глобально уникален.
- `session:*` события должны оставаться scoped на Core (Stream 8). В PM оставляем только локальные проверки (например, send по `workspacePath`), без дублирования маршрутизации.
- В PM `status-hydrator` может загружать глобальный список сессий, но **input lock** после Stream 13 всегда определяется из `workspace:snapshot` (плюс локальный queued), чтобы stale `turn_state` не мог заблокировать ввод навсегда.


---

## Phase 105 — Workspace Runtime MVP: Sharded Store + Snapshot-First (owner: Oleksandr, updated: 2026-02-07)

### Stream 1: Core — Compound Keys & Snapshot Types

1. [TODO] Создать `packages/core/src/workspace-runtime/workspace-runtime-types.ts` — compound keys (`NodeKey`, `SessionKey`), snapshot types (`WorkspaceSnapshot`, `WorkspaceLoadState`, `NodeSnapshot`, `NodeStatus`, `SessionSnapshot`, `SessionTurnState`, `ArtifactPointer`). Контракт из InterfaceMap §7. Это чистые type definitions, без классов (scope: 1 новый файл; expected commit: `feat(core): define workspace runtime compound keys and snapshot types`)
2. [TODO] Git Commit: `feat(core): define workspace runtime compound keys and snapshot types` (hash: TBD)

### Stream 2: Core — Wire Protocol Types

3. [TODO] Создать `packages/core/src/workspace-runtime/workspace-wire-types.ts` — wire protocol messages: `WorkspaceSelect`, `WorkspaceSelectAck`, `WorkspaceSnapshotPush`, `WorkspaceSnapshotRequest`, `CommandError`. Контракт из InterfaceMap §5-6 (обязательно: `selectionId`+`sequence` в snapshot push и `selectionId` в ack; `workspaceRoot=null` для `workspace_cleared`). Чистые type definitions (scope: 1 новый файл; expected commit: `feat(core): define workspace runtime wire protocol types`)
4. [TODO] Git Commit: `feat(core): define workspace runtime wire protocol types` (hash: TBD)

5. [TODO] Обновить `packages/core/src/remote-bridge/types.ts` — добавить новые event types в `BridgeEvent` union (`workspace:snapshot`, `workspace:select:ack`, `command:error`) и `IncomingMessage` union (`workspace:select`, `workspace:snapshot:request`). Import из wire-types (scope: 1 файл; expected commit: `feat(core): extend bridge event types with workspace runtime messages`)
6. [TODO] Git Commit: `feat(core): extend bridge event types with workspace runtime messages` (hash: TBD)

### Stream 3: Core — WorkspaceStore (sharded state)

7. [TODO] Создать `packages/core/src/workspace-runtime/workspace-store.ts` — 1 класс `WorkspaceStore`. Sharded `Map<workspaceRoot, WorkspaceState>`. Internal `WorkspaceState`: `loadState`, `error`, `nodes`, `sessions`, `artifacts`. CRUD: `getOrCreate(workspaceRoot)`, `updateSession(sessionKey, patch)`, `removeSession(sessionKey)`, `updateNode(nodeKey, patch)`, `updateArtifact(nodeKey, artifactId, pointer)`. Change detection: dirty flag per workspace для trigger snapshot push (scope: 1 новый файл, 1 класс; expected commit: `feat(core): implement sharded workspace store`)
8. [TODO] Git Commit: `feat(core): implement sharded workspace store` (hash: TBD)

### Stream 4: Core — Snapshot Builder

9. [TODO] Создать `packages/core/src/workspace-runtime/workspace-snapshot-builder.ts` — 1 pure function `buildSnapshot(workspaceRoot, state): WorkspaceSnapshot`. Собирает immutable snapshot из internal mutable `WorkspaceState`. Без классов — stateless utility (scope: 1 новый файл; expected commit: `feat(core): implement workspace snapshot builder`)
10. [TODO] Git Commit: `feat(core): implement workspace snapshot builder` (hash: TBD)

### Stream 5: Core — SessionRuntime (turn_state FSM + watchdog)

11. [TODO] Создать `packages/core/src/workspace-runtime/session-runtime.ts` — 1 класс `SessionRuntime`. FSM: `idle ↔ running`. Heartbeat tracking (`lastHeartbeatAt`). Watchdog timer: если heartbeat отсутствует > M секунд при `running` → принудительно `idle` + `turn_error(timeout)`. Public API: `markRunning(sessionKey)`, `markIdle(sessionKey)`, `recordHeartbeat(sessionKey)`, `setLock(sessionKey, active)`. Callback `onStateChanged(sessionKey, field)` для оповещения facade (scope: 1 новый файл, 1 класс; expected commit: `feat(core): implement session runtime with turn state FSM and watchdog`)
12. [TODO] Git Commit: `feat(core): implement session runtime with turn state FSM and watchdog` (hash: TBD)

13. [TODO] Тесты: `packages/core/src/workspace-runtime/session-runtime.test.ts` — FSM transitions (idle→running→idle), watchdog timeout fires after M sec without heartbeat, heartbeat resets watchdog, lock transitions, onStateChanged callback invocation (scope: 1 новый файл; expected commit: `test(core): cover session runtime FSM and watchdog`)
14. [TODO] Git Commit: `test(core): cover session runtime FSM and watchdog` (hash: TBD)

### Stream 6: Core — WorkspaceRuntimeFacade

15. [TODO] Создать `packages/core/src/workspace-runtime/workspace-runtime-facade.ts` — 1 класс `WorkspaceRuntimeFacade`, единственный публичный фасад модуля. Координирует: `WorkspaceStore`, `SessionRuntime`, `buildSnapshot()`. Public API: `select(clientId, workspaceRoot | null): WorkspaceSelectAck`, `getSnapshot(workspaceRoot): WorkspaceSnapshot`, `subscribe(clientId, callback): unsubscribe`. Notify API (вызываются из session-request-handler): `notifyTurnStateChanged(sessionKey, state)`, `notifyLockChanged(sessionKey, active)`, `notifySessionCreated(sessionKey, snapshot)`, `notifyBindingChanged(sessionKey, patch)`, `notifySessionDeleted(sessionKey)`, `notifyArtifactWritten(nodeKey, artifactId, pointer)`, `recordHeartbeat(sessionKey)`. Debounce/coalesce: 25-100ms window; high-priority flush для turnState/continuityLockActive (scope: 1 новый файл, 1 класс; expected commit: `feat(core): implement workspace runtime facade`)
16. [TODO] Git Commit: `feat(core): implement workspace runtime facade` (hash: TBD)

17. [TODO] Создать `packages/core/src/workspace-runtime/index.ts` — barrel re-export фасада и публичных типов. Тесты: `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` — atomic switch (select меняет workspace), selectionId generation, snapshot push при state change, debounce coalesce, stale selectionId ignored (scope: 2 новых файла; expected commit: `test(core): cover workspace runtime facade`)
18. [TODO] Git Commit: `test(core): cover workspace runtime facade` (hash: TBD)

### Stream 7: Core — Store Hydration & Population

19. [TODO] Initial hydration при `workspace:select`: `facade.select()` вычитывает существующие сессии для запрошенного `workspacePath` из `SessionManager` (добавить метод `getSessionsByWorkspacePath(workspacePath): Session[]`) и наполняет `WorkspaceStore` → первый snapshot содержит реальные данные. Добавить тесты `packages/core/src/session-manager/index.test.ts`: `getSessionsByWorkspacePath` возвращает только сессии выбранного workspace, а `createSession` генерирует UUID (`randomUUID`) (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`, `packages/core/src/session-manager/index.ts`, `packages/core/src/session-manager/index.test.ts`; expected commit: `feat(core): hydrate workspace store from session manager on select`)
20. [TODO] Git Commit: `feat(core): hydrate workspace store from session manager on select` (hash: TBD)

21. [TODO] Session lifecycle → store: в `session-request-handler.ts` при `session:created` вызывать `facade.notifySessionCreated()`; при `session:binding` → `facade.notifyBindingChanged()`; при `session:deleted` → `facade.notifySessionDeleted()`. Additive: legacy broadcast остаётся (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`; expected commit: `feat(core): route session lifecycle events through workspace runtime`)
22. [TODO] Git Commit: `feat(core): route session lifecycle events through workspace runtime` (hash: TBD)

23. [TODO] Turn state + lock → facade: в `session-request-handler.ts` при `emitTurnStateEvent()` вызывать `facade.notifyTurnStateChanged()`; при `emitContinuityLockEvent()` → `facade.notifyLockChanged()`. Additive: legacy broadcast остаётся (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`; expected commit: `feat(core): route turn state and lock through workspace runtime`)
24. [TODO] Git Commit: `feat(core): route turn state and lock through workspace runtime` (hash: TBD)

25. [TODO] Heartbeat wiring: в `session-request-handler.ts` при обработке каждого входящего `session:stream` chunk от провайдера вызывать `facade.recordHeartbeat(sessionKey)`. Это единственный реальный heartbeat-сигнал — без него watchdog будет ложноположительным на длинных ответах (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `feat(core): wire stream chunk heartbeat to session runtime watchdog`)
26. [TODO] Git Commit: `feat(core): wire stream chunk heartbeat to session runtime watchdog` (hash: TBD)

### Stream 8: Core — Bridge Wiring

27. [TODO] Подключить `WorkspaceRuntimeFacade` к `WebSocketManager` и `RemoteBridge`: при `workspace:select` от клиента — делегировать в `facade.select()`; при snapshot push от facade — `sendToClient(workspace:snapshot)`; при ошибках command — `sendToClient(command:error)`. Добавить `workspace:select` case в `handleIncomingMessage()` в `index.ts`. **CRITICAL: scope sync** — при `facade.select(clientId, workspaceRoot)` Core обязан вызвать `setWorkspaceScope(clientId, workspaceRoot)` (или аналог) для scoped delivery `session:*` events — иначе при уходе с legacy `workspace:scope:set` Core станет unscoped. **HIGH: sessionWorkspaceById population** — при select гарантировать population `sessionWorkspaceById` для всех session IDs выбранного workspace (через lookup в SessionManager), чтобы scoped filter не drop'ал events при отсутствии записи в map. **CRITICAL: ingress scope guard** — до миграции на compound-key команды Core обязан отклонять входящие `session:create|session:message|session:delete`, если они не относятся к активному workspace клиента (defence-in-depth), чтобы UI-баг не мог отправить/удалить out-of-scope сессию (scope: `packages/core/src/remote-bridge/handlers/websocket-manager.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/websocket-session-scope.ts`; expected commit: `feat(core): wire workspace runtime facade into remote bridge with scope sync`)
28. [TODO] Git Commit: `feat(core): wire workspace runtime facade into remote bridge with scope sync` (hash: TBD)

### Stream 9: PM Client — Wire Types

29. [TODO] Обновить `src/client/project-manager/core-stream-message-types.ts` — добавить outgoing: `WorkspaceSelect`; incoming: `WorkspaceSelectAck`, `WorkspaceSnapshotPush`, `CommandError`. Обновить `OutgoingMessage` и `IncomingMessage` unions (scope: 1 файл; expected commit: `feat(pm): add workspace runtime wire types to message contract`)
30. [TODO] Git Commit: `feat(pm): add workspace runtime wire types to message contract` (hash: TBD)

### Stream 10: PM Client — Snapshot Store

31. [TODO] Создать `src/client/project-manager/services/workspace-snapshot-store.ts` — 1 класс/hook. State: `activeWorkspaceRoot`, `activeSelectionId`, `lastAppliedSequence`, `currentSnapshot: WorkspaceSnapshot | null`. Methods: `applySelectAck(ack)` (atomic switch, reset sequence=0), `applySnapshot(push)` (validate selectionId + sequence, ignore stale), `getServerLock(sessionId): boolean` (из snapshot: `turnState !== "idle" || continuityLockActive`), `clear()`. Export React hook `useWorkspaceSnapshot()` (scope: 1 новый файл; expected commit: `feat(pm): implement client-side workspace snapshot store`)
32. [TODO] Git Commit: `feat(pm): implement client-side workspace snapshot store` (hash: TBD)

### Stream 11: PM Client — Protocol Migration (workspace select)

33. [TODO] Обновить `api.ts` — добавить метод `selectWorkspace(payload: WorkspaceSelect["payload"])` для отправки `workspace:select` через WebSocket. Обновить `workspace-scope-sync.ts` — при workspace switch отправлять `workspace:select` (новый протокол); при получении `workspace:select:ack` — применять в snapshot store. **HIGH: Ack-gating** — все workspace-зависимые операции (activate session, resume, create) должны ждать `workspace:select:ack(applied)` перед выполнением; до получения ack workspace считается "pending" и команды блокируются — это заменяет ordering-гарантии legacy handshake (`workspace-scope-handshake.ts`). Legacy `workspace:scope:set` остаётся как fallback на переходный период (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/layout/workspace-scope-sync.ts`; expected commit: `feat(pm): migrate workspace scope sync to workspace:select protocol with ack-gating`)
34. [TODO] Git Commit: `feat(pm): migrate workspace scope sync to workspace:select protocol with ack-gating` (hash: TBD)

### Stream 12: PM Client — Resume Path Migration

35. [TODO] Мигрировать `session-resume-intent.ts` — при resume вызывать `selectWorkspace()` (workspace:select) вместо `syncWorkspaceScopeWithAck()` (legacy handshake). Пометить `workspace-scope-handshake.ts` как `@deprecated` — legacy, будет удалён после полной миграции. Убрать импорт handshake из resume-intent (scope: `src/client/project-manager/components/sessions/session-resume-intent.ts`, `src/client/project-manager/services/workspace-scope-handshake.ts`; expected commit: `feat(pm): migrate session resume intent to workspace:select protocol`)
36. [TODO] Git Commit: `feat(pm): migrate session resume intent to workspace:select protocol` (hash: TBD)

### Stream 13: PM Client — Input Lock from Snapshot

37. [TODO] Заменить источник `connectionState` для input lock: в `session-stream.ts` подписаться на `workspace:snapshot` events и обновлять `connectionState` из `snapshot.sessions[sessionId].turnState` и `continuityLockActive` (server-driven lock из snapshot вместо поштучных `session:stream` `turn_state` events). Client-local `queuedMessage` lock остаётся на уровне компонента. Результат: потеря единичного `session:stream` `turn_state=idle` event больше не блокирует UI навсегда — следующий snapshot пуш корректно разблокирует (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit: `feat(pm): derive input lock from workspace snapshot instead of stream events`)
38. [TODO] Git Commit: `feat(pm): derive input lock from workspace snapshot instead of stream events` (hash: TBD)

39. [TODO] **CRITICAL: Единый источник lock** — после задачи 37 `token-usage-stream.ts` больше не должен изменять `connectionState`/`continuityLock`/rollover-стейты на основании `session:stream` событий. Его роль после миграции: token usage cache + диагностика. Input lock/unlock всегда приходит из `workspace:snapshot` (scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit: `fix(pm): stop mutating connection lock state from stream events; snapshot authoritative`)
40. [TODO] Git Commit: `fix(pm): stop mutating connection lock state from stream events; snapshot authoritative` (hash: TBD)

### Stream 14: Legacy Deprecation Checklist

41. [TODO] Составить и зафиксировать checklist файлов Phase 104, которые становятся legacy после миграции на `workspace:select` + snapshot. Пометить `@deprecated` в коде: `websocket-session-scope.ts` (функции shouldDeliverEventForScope, recordSessionWorkspaceSnapshot), `websocket-manager.ts#setWorkspaceScope()`. Критерий завершения: PM не вызывает `workspace:scope:set`, все вызовы идут через `workspace:select`. Checklist сохранить в `doc/SolidWorks-Flow/Phase104_LegacyDeprecationChecklist.md` (scope: ≤3 файла; expected commit: `docs(legacy): create Phase 104 deprecation checklist and mark deprecated`)
42. [TODO] Git Commit: `docs(legacy): create Phase 104 deprecation checklist and mark deprecated` (hash: TBD)

### Stream 14b: Tests — Protocol Migration Non-regression

43. [TODO] Обновить `packages/core/src/remote-bridge/index.test.ts` — добавить asserts для `workspace:select` routing и сохранить `workspace:scope:set` test как legacy до удаления (scope: 1 файл; expected commit: `test(core): cover workspace select routing in remote bridge`)
44. [TODO] Git Commit: `test(core): cover workspace select routing in remote bridge` (hash: TBD)

45. [TODO] Обновить тесты под snapshot-first lock: `session-stream.test.ts` должен ожидать обработку `workspace:snapshot`; `token-usage-stream.test.ts` — что `token-usage-stream.ts` больше не меняет `connectionState`/lock от `turn_state`/`continuity_lock` (scope: `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/project-manager/components/sessions/token-usage-stream.test.ts`; expected commit: `test(pm): assert snapshot-driven lock and remove legacy turn_state expectations`)
46. [TODO] Git Commit: `test(pm): assert snapshot-driven lock and remove legacy turn_state expectations` (hash: TBD)

47. [TODO] Добавить ack-gating тесты: `workspace-scope-sync.test.ts` и `session-resume-intent.test.ts` — подтверждают, что PM ждёт `workspace:select:ack(applied)` перед `workspace-activate`/resume/create, и что `workspace-scope-handshake.ts` не используется в resume после миграции (scope: `src/client/project-manager/components/layout/workspace-scope-sync.test.ts`, `src/client/project-manager/components/sessions/session-resume-intent.test.ts`; expected commit: `test(pm): cover workspace select ack gating in switch and resume`)
48. [TODO] Git Commit: `test(pm): cover workspace select ack gating in switch and resume` (hash: TBD)

### Stream 15: Documentation

49. [TODO] Обновить `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` — новый модуль `workspace-runtime` (sharded store, snapshot-first, compound keys, watchdog, facade). Явно отметить Phase 104 `workspace:scope:set` как legacy/deprecated (scope: 1 файл; expected commit: `docs(architecture): document workspace runtime module in system architecture`)
50. [TODO] Git Commit: `docs(architecture): document workspace runtime module in system architecture` (hash: TBD)

51. [TODO] Обновить `README.md` и `CHANGELOG.md` — отразить workspace runtime MVP, snapshot-first изоляцию, watchdog terminal rollback (scope: 2 файла; expected commit: `docs(release): update README and CHANGELOG for workspace runtime MVP`)
52. [TODO] Git Commit: `docs(release): update README and CHANGELOG for workspace runtime MVP` (hash: TBD)

53. [TODO] Обновить Phase 104 doc как legacy: `doc/Project_Docs/SessionIsolation/ProjectManager_WorkspaceScopedSessionIsolation_Architecture.md` — пометить `workspace:scope:set/ack` как deprecated и сослаться на `workspace:select + workspace:snapshot` (Phase 105) и `Phase104_LegacyDeprecationChecklist.md` (scope: 1 файл; expected commit: `docs(legacy): mark workspace scope handshake doc as deprecated`)
54. [TODO] Git Commit: `docs(legacy): mark workspace scope handshake doc as deprecated` (hash: TBD)

55. [TODO] Создать session report `doc/Sessions/Session113.md` (scope: 1 файл; expected commit: `docs(session): create session 113 report`)
56. [TODO] Git Commit: `docs(session): create session 113 report` (hash: TBD)

### Stream 16: Release Build

57. [TODO] Release gate + build-all: перед запуском `./scripts/build-all.sh` убедиться, что `Phase104_LegacyDeprecationChecklist.md` выполнен (PM не вызывает `workspace:scope:set`, Core scoping работает через `workspace:select`), затем выполнить `./scripts/build-all.sh` на чистом дереве (scope: repo-wide; expected commit: `chore(release): build-all after workspace runtime MVP`)
58. [TODO] Git Commit: `chore(release): build-all after workspace runtime MVP` (hash: TBD)

59. [TODO] Release: `./scripts/build-release.sh --use-current-version`, проверить VSIX (scope: repo-wide; expected commit: `chore(release): build vsix after workspace runtime MVP`)
60. [TODO] Git Commit: `chore(release): build vsix after workspace runtime MVP` (hash: TBD)
