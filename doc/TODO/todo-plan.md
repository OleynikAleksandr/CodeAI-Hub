# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/StopResume_LockRegression_Diagnostic_1.2.3.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md` (Invariant 24 — shutdown-safe Stop path)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача Stream ≤ 3 файлов; каждая подзадача парой: (1) изменения, (2) `Git Commit: ...`.
- Gates через Husky hooks (`.husky/pre-commit`, `.husky/pre-push`) — вручную не прогоняем.
- Таргетные сборки: `npm run build --workspace packages/core` после каждого Stream затрагивающего core.
- Real-time доки в одном коммите с кодом.
- `doc/TODO/todo-plan.md` обновляется после каждого коммита (hash, STATUS).

## Phase 1 — 1.2.3 Diagnostic Release (owner: codeai-bot, updated: 2026-04-17)

### Stream 1: Stop path tracing
1. [DONE] Add `stopdiag_stop_*` logs to `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts` — scope: 1 file; commit message: `chore: add stopdiag logs to session stop-action for 1.2.3`
2. [DONE] Git Commit: `chore: add stopdiag logs to session stop-action for 1.2.3` (hash: e1205614d)
3. [IN_PROGRESS] Add `stopdiag_rebind_*` logs to `packages/core/src/remote-bridge/handlers/session-request-handler-stop-rebind.ts` — scope: 1 file; commit message: `chore: add stopdiag logs to session stop-rebind for 1.2.3`
4. [TODO] Git Commit: `chore: add stopdiag logs to session stop-rebind for 1.2.3` (hash: TBD)

### Stream 2: Dispatch + emit tracing
5. [DONE] Add `stopdiag_dispatch_*` logs to `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — scope: 1 file; commit message: `chore: add stopdiag logs to session message-dispatch for 1.2.3`
6. [DONE] Git Commit: `chore: add stopdiag logs to session message-dispatch for 1.2.3` (hash: 0c5476090)
7. [IN_PROGRESS] Add `stopdiag_emit_*` with stack capture to `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-callbacks.ts` — scope: 1 file; commit message: `chore: add stopdiag stack-capturing emit logs for 1.2.3`
8. [TODO] Git Commit: `chore: add stopdiag stack-capturing emit logs for 1.2.3` (hash: TBD)

### Stream 3: Provider event router tracing
9. [DONE] Add `stopdiag_router_*` logs to `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` — scope: 1 file; commit message: `chore: add stopdiag logs to session provider-event-router for 1.2.3`
10. [DONE] Git Commit: `chore: add stopdiag logs to session provider-event-router for 1.2.3` (hash: 5ba8fad30)

### Stream 4: Release notes prep
11. [IN_PROGRESS] Update `README.md` and `CHANGELOG.md` to target 1.2.3 diagnostic release — scope: 2 files; commit message: `docs: prepare 1.2.3 diagnostic release notes`
12. [TODO] Git Commit: `docs: prepare 1.2.3 diagnostic release notes` (hash: TBD)

### Stream 5: Build release
13. [TODO] Run `./scripts/build-all.sh --version 1.2.3` then `./scripts/build-release.sh --use-current-version`; copy tarballs to `doc/tmp/releases/` — scope: build artifacts + version bumps; commit message: `chore: build 1.2.3 diagnostic release assets`
14. [TODO] Git Commit: `chore: build 1.2.3 diagnostic release assets` (hash: TBD)
