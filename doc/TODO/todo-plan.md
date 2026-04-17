# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_Stop_Abort_And_PM_Debounce_1.2.6.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 24 — shutdown-safe Stop, 28 — post-stop rebind adoption)
  - `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` (streamCodexExec)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача Stream ≤ 3 файлов; каждая подзадача парой: (1) изменения, (2) `Git Commit: ...`.
- Gates через Husky hooks (`.husky/pre-commit`, `.husky/pre-push`) — вручную не прогоняем.
- Таргетные сборки: `npm run build --workspace packages/Codex_Module` + `packages/core` + webview после каждого Stream.
- Real-time доки в одном коммите с кодом.
- `doc/TODO/todo-plan.md` обновляется после каждого коммита (hash, STATUS).

## Phase 1 — 1.2.6 Codex Stop Abort (owner: codeai-bot, updated: 2026-04-17)

### Stream 1: Codex subprocess abort
1. [IN_PROGRESS] Add module-scoped `activeCodexChildProcessesByThreadId` Map + exported `killActiveCodexProcess(threadId)` to `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`; register/unregister child inside `streamCodexExec` — scope: 1 file; commit message: `feat: expose active codex subprocess kill handle from sdk patches`
2. [TODO] Git Commit: `feat: expose active codex subprocess kill handle from sdk patches` (hash: TBD)
3. [IN_PROGRESS] Wire `killActiveCodexProcess` into `packages/Codex_Module/src/session/session-manager.ts` `closeSession` before awaiting lifecycle/processing loop — scope: 1 file; commit message: `fix: abort active codex subprocess on adapter.closeSession`
4. [TODO] Git Commit: `fix: abort active codex subprocess on adapter.closeSession` (hash: TBD)

### Stream 2: PM Stop-button debounce
5. [IN_PROGRESS] Add `stopInFlight` state to `src/client/ui/src/session/input-panel.tsx`: set on Stop click, reset when `agentBusy` transitions to false; disable StopButton while in-flight — scope: 1 file; commit message: `fix: debounce PM stop button while close is in flight`
6. [TODO] Git Commit: `fix: debounce PM stop button while close is in flight` (hash: TBD)

### Stream 3: Core handleStop re-entry guard
7. [TODO] Early-return in `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts` when `hasStopInvalidatedBinding(sessionId)` is already true — scope: 1 file; commit message: `fix: guard handleStop re-entry when binding already invalidated`
8. [TODO] Git Commit: `fix: guard handleStop re-entry when binding already invalidated` (hash: TBD)

### Stream 4: Docs + build
9. [TODO] Update `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 24 extended with Codex subprocess kill), `doc/SolidWorks-WorkFlow/Modules/Codex.md` — scope: 3 files (batch A: README + CHANGELOG + SystemArchitecture); commit message: `docs: prepare 1.2.6 release notes and codex stop invariant`
10. [TODO] Git Commit: `docs: prepare 1.2.6 release notes and codex stop invariant` (hash: TBD)
11. [TODO] Run `./scripts/build-all.sh --version 1.2.6` then `./scripts/build-release.sh --use-current-version` — scope: build artifacts + version bumps; commit message: `chore: bump version to 1.2.6 for codex stop fix release`
12. [TODO] Git Commit: `chore: bump version to 1.2.6 for codex stop fix release` (hash: TBD)

### Stream 5: Planning doc closeout
13. [TODO] Archive `doc/SolidWorks-WorkFlow/Plans/Codex_Stop_Abort_And_PM_Debounce_1.2.6.md` to `doc/SolidWorks-WorkFlow/Plans/Archive/` — scope: 1 move; commit message: `docs: archive 1.2.6 codex stop planning doc after release`
14. [TODO] Git Commit: `docs: archive 1.2.6 codex stop planning doc after release` (hash: TBD)
