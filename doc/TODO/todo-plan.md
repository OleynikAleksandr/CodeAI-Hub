# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Scope ID:** `SMB-002`
**Scope:** Persistent Session Model Binding Refactor
**Version at scope start:** `1.2.101`

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionModelBinding_Persistence_Refactor_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/SessionModelBinding_Persistence_Refactor_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/SessionScoped_ModelBinding_Architecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: реализация и отдельный `Git Commit: ...`.
- Если по факту разработки подзадача затрагивает больше 3 файлов, перед реализацией разбить ее на более мелкие пункты и обновить этот план.
- Гейты запускаются автоматически через Husky при `git commit` / `git push`; не обходить hooks.
- Таргетные сборки перед закрытием scope: `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`.
- Real-time документация: если меняется архитектура/контракт, синхронно обновлять связанные документы из `doc/` до коммита.
- После каждого коммита сразу обновлять статус пункта и hash в этом плане.

## Phase 1 — Client Transport Label Fix (owner: Codex, updated: 2026-04-28)

### Stream: Preserve Core modelBinding on client
1. [TODO] Normalize serialized `modelBinding` from Core into client `SessionRecord`; scope: `src/client/ui/src/core-bridge/types.ts`, `src/client/ui/src/core-bridge/normalizers.ts`, `src/client/ui/src/core-bridge/normalizers.test.ts`; expected commit: `fix: preserve session model binding in client bridge`.
2. [TODO] Git Commit: `fix: preserve session model binding in client bridge` (hash: TBD)
3. [TODO] Make runtime model sync prefer binding-owned identity over active Settings fallback for existing PM sessions; scope: `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`, `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/components/sessions/use-runtime-model-sync.test.ts`; expected commit: `fix: keep project manager session labels bound to session model`.
4. [TODO] Git Commit: `fix: keep project manager session labels bound to session model` (hash: TBD)

## Phase 2 — Persistent Core Binding (owner: Codex, updated: 2026-04-28)

### Stream: Store binding with continuity state
1. [TODO] Extend continuity data structures to persist session model binding; scope: `packages/core/src/session-continuity/continuity-types.ts`, `packages/core/src/session-continuity/continuity-store.ts`, `packages/core/src/session-continuity/continuity-store.test.ts`; expected commit: `fix: persist session model binding in continuity store`.
2. [TODO] Git Commit: `fix: persist session model binding in continuity store` (hash: TBD)
3. [TODO] Persist binding when outbound user turns are tracked for a logical session; scope: `packages/core/src/session-continuity/continuity-tracker.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/session-continuity/continuity-tracker.test.ts`; expected commit: `fix: record model binding during continuity tracking`.
4. [TODO] Git Commit: `fix: record model binding during continuity tracking` (hash: TBD)

## Phase 3 — Restore, Dialog, Workspace Hydration (owner: Codex, updated: 2026-04-28)

### Stream: Hydrate bound identity after materialization
1. [TODO] Hydrate restored/materialized sessions from persisted binding instead of current Settings; scope: `packages/core/src/remote-bridge/handlers/session-continuity-materializer.ts`, `packages/core/src/remote-bridge/handlers/session-continuity-materializer.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-resolution.ts`; expected commit: `fix: hydrate restored sessions with persisted model binding`.
2. [TODO] Git Commit: `fix: hydrate restored sessions with persisted model binding` (hash: TBD)
3. [TODO] Thread model binding through Project Manager dialog bootstrap placeholders; scope: `packages/core/src/remote-bridge/handlers/dialog-list-service.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/project-manager-dialog-core-events.test.ts`; expected commit: `fix: restore project manager dialog model binding`.
4. [TODO] Git Commit: `fix: restore project manager dialog model binding` (hash: TBD)

## Phase 4 — Rollover Inheritance (owner: Codex, updated: 2026-04-28)

### Stream: Clone binding for continuation sessions
1. [TODO] Add explicit inherit/clone binding API for continuation-created sessions; scope: `packages/core/src/session-model-binding/session-model-binding-types.ts`, `packages/core/src/session-model-binding/session-model-binding-facade.ts`, `packages/core/src/session-model-binding/session-model-binding-resolver.ts`; expected commit: `fix: clone model binding for continuation sessions`.
2. [TODO] Git Commit: `fix: clone model binding for continuation sessions` (hash: TBD)
3. [TODO] Ensure `Remaining context threshold (%)` rollover uses inherited binding for provider requests; scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-resolution.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `fix: keep rollover sessions on bound model`.
4. [TODO] Git Commit: `fix: keep rollover sessions on bound model` (hash: TBD)

## Phase 5 — Regression Coverage and SSOT Closeout (owner: Codex, updated: 2026-04-28)

### Stream: Prove behavior and document final contract
1. [TODO] Add regression coverage for two same-provider sessions with different Settings defaults, Settings change isolation, and restored dialog binding; scope: `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/ui/src/app-host/use-settings-models-sync.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test: cover persistent session model binding regressions`.
2. [TODO] Git Commit: `test: cover persistent session model binding regressions` (hash: TBD)
3. [TODO] Update canonical SSOT for persistent binding contract; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; expected commit: `docs: document persistent session model binding`.
4. [TODO] Git Commit: `docs: document persistent session model binding` (hash: TBD)
5. [TODO] Run targeted verification and record results in this plan; scope: package `@codeai-hub/core`, package `webview`, package `project-manager`; expected commit: `test: verify persistent session model binding scope`.
6. [TODO] Git Commit: `test: verify persistent session model binding scope` (hash: TBD)
