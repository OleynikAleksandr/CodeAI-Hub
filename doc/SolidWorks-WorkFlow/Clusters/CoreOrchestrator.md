# Core Orchestrator — Cluster (SSOT)

## 0) Start here (контекст + контракты)

- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Workspace Runtime (keys + snapshot-first + lock): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing (dialogId vs sessionId): `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Session Continuity (handoff/rollover): `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Workflow CLI/Watcher: `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`

## 1) Назначение

Core Orchestrator — автономное ядро, которое:
- принимает команды клиентов (PM/Webview/Launcher) и держит multi-workspace scope;
- управляет lifecycle каждого turn (`turn_started` → `turn_completed|turn_failed`);
- обеспечивает routing сообщений в актуальный provider segment (resume/rollover);
- пишет/читает историю диалогов (unified-session JSONL) и continuity chain;
- публикует snapshot-first состояние для UI (lock/usage/status).

## 2) Где живёт код

- Core: `packages/core/`
- Remote Bridge/API handlers: `packages/core/src/remote-bridge/`
- Session continuity: `packages/core/src/session-continuity/`
- Workflow runtime: `packages/core/src/workflow/`

## 3) Ключевые инварианты (коротко)

- **Никогда не оставлять UI в stuck working/resuming**: любой provider/core failure обязан завершать turn (fail + rollback `turnState="idle"`), иначе UI может остаться locked навсегда.
- **Немедленный lock на submit**: Core обязан эмитить `turnState="running"` до реального provider send.
- **dialogId ≠ sessionId**: история диалога стабильна, live статус/usage привязан к текущему сегменту.
- **Continuity**: Core выбирает path по stage/contract. Documentation Tree trunk stages используют synthetic rollover без report/resume bootstrap; report-based handoff остаётся fallback для implementation-heavy flows и обязан иметь delivery/ack/retry, иначе UI получает явный failure, а не вечный lock.
- **Post-turn continuity arbitration**: threshold breach на `token_usage` не имеет права сам по себе запускать flow-node rollover во время активного one-shot turn; до `turn_completed` Core только кеширует usage snapshot.
- **Trunk flow-node rollover eligibility**: production flow-node rollover разрешён для `description`, `virtual_simulation`, `diagram_modules` только при `runSlug=null` и hydrated context (`initiativeSlug + stage`). Branch/run agents остаются rejected до отдельного continuity contract.
- **Documentation Tree synthetic continuation**: after post-turn threshold breach Core materializes target session, captures last user-visible assistant message, clears stale create-report state, emits `resume_ready`, and attaches continuation instructions only to the next real user message. The provider sees workflow start/step contract + `Continuation Mode`; UI/history sees only the user's original message.
- **Provider-order tolerance**: `Gemini` может дать `token_usage` раньше `turn_completed`, а `Claude/Codex` наоборот; Core обязан завершать одно и то же continuity-решение независимо от порядка событий.
- **Turn-scoped usage cache**: cached usage snapshot очищается при старте нового outbound turn-а и после финального решения post-turn arbitration, чтобы usage прошлого turn-а не протекал в следующий.
- **Replay-first usage telemetry**: `usage_limits` для ready session сначала реплеится из cached stream snapshot и только потом, при допустимом lifecycle trigger, может инициировать provider refresh; idle session без lifecycle trigger не должна дёргать provider ради usage reread.
- **One-shot ready-binding bootstrap**: automatic usage bootstrap разрешён только один раз на конкретный ready-binding lifecycle (`providerId + providerSessionId`); повторные reopen/rebind того же lifecycle обязаны переиспользовать replay cache вместо нового provider read.
- **Turn completion owns fresh usage delivery**: `turn_completed` остаётся единственной unconditional automatic boundary для свежего usage telemetry; provider completion path обязан доставить terminal `usageLimits`/`tokenUsage` сам, а websocket layer — переиграть последние `token_usage` и `usage_limits` после connect/scope switch, включая legacy `usage_limits` payload через normalizing `stream_event`.
- **Runtime session materialization on dialog:list**: `RemoteBridgeDialogCommandRouter.handleDialogList` через `materializeContinuityEntries` обязан для каждой `ContinuityIndexEntry` с полной связкой (`latestSessionId + providerId + providerSessionId`) создавать stub runtime session в `SessionManager` / paper-binding в `SessionProviderBindingService` / hydrate в `WorkspaceStore` с `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`, если такая session ещё не существует. Materialized workflow session обязана получить `initiativeSlug=workspaceSlug` и `stage` из continuity entry; если старый stub был создан без этого context, `dialog:send` repair-ит его до provider dispatch. Provider adapter turn, Create Report и resume/bootstrap prompt в момент materialize не стартуются; Documentation Tree continuation instructions добавляются только lazy envelope на первом real user message, а обычный provider binding остаётся ленивым через `resolveProviderSessionId`. Это гарантирует, что `workspace:snapshot` содержит runtime session для любого reopened workflow dialog до следующего reconciliation loop'а, и что `handleStop` не возвращает `"Session not found"` для reopened sessions.
- **Settings snapshot read cache**: Core settings/default/translation reads use path-scoped short TTL snapshots through `packages/core/src/config/json-file-snapshot-cache.ts`. Settings write/reset/default-materialization/migration paths must invalidate the canonical settings path immediately after write, so live Core can reduce hot-path disk reads without serving stale user settings after explicit mutation.
- **Core WebSocket command boundary**: `WebSocketManager` валидирует каждый incoming client frame через `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` до dispatch в `RemoteBridgeMessageRouter`. Invalid JSON, non-object envelopes, unknown commands и malformed command payloads отклоняются с sanitized warn log + `session:error`; router получает только структурно валидные `IncomingMessage` команды.
- **Core WebSocket error ownership**: `WebSocketManager` owns WebSocketServer/client-socket `error` events. Server errors are logged through Core logger instead of relying on Node's unhandled `EventEmitter` semantics; client socket errors log sanitized context, disconnect that client through the normal disconnect path, and terminate the affected socket. `stop()` clears owned clients plus replay/scope maps (`token_usage`, `usage_limits`, session workspace scope).
- **Startup/workspace best-effort diagnostics**: startup settings default materialization and workspace-session side effects remain non-blocking, but they must emit sanitized Core logger warnings on failure. Silent `.catch(() => undefined)` / `.catch(() => {})` is not allowed on these ownership boundaries because corrupt settings files or workspace bootstrap failures need operational evidence.
- **Runtime factory callback wiring**: `createSessionRequestHandlerRuntimeCore` и верхнеуровневый `createSessionRequestHandlerRuntime` держат циклические callback-dependencies (`messageDispatch`, `sessionResolution`, `continuityRolloverOrchestrator`) через явные deferred refs. Continuity callbacks должны вызываться только после полной сборки runtime; если порядок будет нарушен, factory обязан падать явной initialization error вместо скрытого `undefined` access.
- **Development Tree materialization**: Core разделяет read-model и downstream bootstrap. `DevelopmentTreeStateFacade` остаётся extension текущей PM snapshot-читалки: читает только валидные Diagram Modules artifacts, строит P/C/M snapshot и запускает neutral filesystem materialization under `.codeai-hub/<workspaceSlug>/development_tree/materialized/`. `DevelopmentTreeFilesystemStructuratorFacade` отвечает только за path planning/apply/orphan summary и не создаёт draft-файлы или sessions. `DevelopmentTreeNodeBootstrapFacade` стартует от materialized folders, создаёт draft skeletons (`PartDescription`, `ClusterDescription`, `ClusterFacadeContract`, `ModuleSpec`, `ModuleFacadeContract`), сохраняет agent-owned `agent-fill` зоны при rerun, и опционально создаёт per-node agent session через gateway к существующему session/request контуру. Draft readiness вычисляется из файловой правды draft-файлов и затем попадает в `developmentTree` snapshot как optional field.

Канон: `doc/SolidWorks-WorkFlow/Contracts/*`.
