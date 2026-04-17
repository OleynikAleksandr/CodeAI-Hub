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
11. [DONE] Update `README.md` and `CHANGELOG.md` to target 1.2.3 diagnostic release — scope: 2 files; commit message: `docs: prepare 1.2.3 diagnostic release notes`
12. [DONE] Git Commit: `docs: prepare 1.2.3 diagnostic release notes` (hash: 9094331c3)

### Stream 5: Build release
13. [DONE] Run `./scripts/build-all.sh --version 1.2.3` then `./scripts/build-release.sh --use-current-version`; tarballs auto-copied to `doc/tmp/releases/` (ignored by git) — scope: build artifacts + version bumps; commit message: `chore: bump version to 1.2.3 for diagnostic release`
14. [DONE] Git Commit: `chore: bump version to 1.2.3 for diagnostic release` (hash: 057adca0a)

## Phase 2 — 1.2.4 PM-side Diagnostic (owner: codeai-bot, updated: 2026-04-17)

Core 1.2.3 трассы доказали: `emit_turn_state state="running"` эмитится **корректно** и без перекрытия `idle` на новом sessionId `56bc4d74`. Три изначальные гипотезы (stale abort, sendMessage throw, pending binding) — все опровергнуты. Реальный источник: **PM не переключает `activeSessionId` после re-create** (rebind через `stop-rebind` path НЕ использован — `stopInvalidated=false`), поэтому UI смотрит status старой мёртвой session `9b300456` (idle), а running idёт на новую `56bc4d74`.

Phase 2 добавляет PM-side диагностику через `api.logDiagnostic({...})` → websocket → Core `remote-bridge-message-router` → `core.log` (уже работающий mechanism). Не трогает Core diag из Phase 1 — они продолжают писать.

### Stream 6: PM api + snapshot apply tracing
15. [DONE] Add `pmdiag_` logs to `src/client/project-manager/api.ts` (stopSession/sendSessionMessage) and `src/client/project-manager/components/sessions/session-stream.ts` (applyWorkspaceSnapshotToSnapshots per-session state) — scope: 2 files; commit message: `chore: add pmdiag logs to PM api + snapshot apply for 1.2.4`
16. [DONE] Git Commit: `chore: add pmdiag logs to PM api + snapshot apply for 1.2.4` (hash: a4425d09f)

### Stream 7: activeSessionId tracker
17. [DONE] Add `pmdiag_active_*` logs around `setActiveSessionId` in `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` and `project-manager-dialog-session-view.tsx` — scope: 2 files; commit message: `chore: add pmdiag activeSessionId tracker logs for 1.2.4`
18. [DONE] Git Commit: `chore: add pmdiag activeSessionId tracker logs for 1.2.4` (hash: f0e7d7a6a)

### Stream 8: Release notes + build
19. [DONE] Update `README.md` and `CHANGELOG.md` to target 1.2.4 diag release — scope: 2 files; commit message: `docs: prepare 1.2.4 PM-side diagnostic release notes`
20. [DONE] Git Commit: `docs: prepare 1.2.4 PM-side diagnostic release notes` (hash: f98adf205)
21. [DONE] Run `./scripts/build-all.sh --version 1.2.4` then `./scripts/build-release.sh --use-current-version` — scope: build artifacts + version bumps; commit message: `chore: bump version to 1.2.4 for PM diagnostic release`
22. [DONE] Git Commit: `chore: bump version to 1.2.4 for PM diagnostic release` (hash: f04b0802b)

### Stream 6b: Split PM diag into its own log file
23. [DONE] Route `pm:diag:log` to `~/.codeai-hub/logs/project-manager/project-manager.log` via a local appender in `packages/core/src/remote-bridge/remote-bridge-message-router.ts` instead of mixing with core.log — scope: 1 file; commit message: `chore: write pm:diag:log to project-manager.log instead of core.log`
24. [DONE] Git Commit: `chore: write pm:diag:log to project-manager.log instead of core.log` (hash: f9b7aa58d)

## Phase 3 — 1.2.5 Fix + Cleanup (owner: codeai-bot, updated: 2026-04-17)

1.2.4 retest proved: после Stop Core создаёт новую session с тем же `providerSessionId` (например `0e3f1142` → `4add602b`), но `useProjectManagerDialogSessionController.onSessionCreated` не adopt-ит её, потому что `current.binding.status` в `SessionRecord` не обновляется из `session:binding` events (там обновляется только snapshot). Результат — UI смотрит старую `session.id`, которая idle, и input panel не блокируется.

Fix: (1) обновлять `session.binding` в `onSessionBinding` того же контроллера; (2) запоминать old `providerSessionId` перед его reset to null; (3) расширить `shouldAdopt` в `onSessionCreated` веткой post-stop rebind (status !== "ready" + last providerSessionId match).

### Stream 9: PM dialog session controller fix
25. [IN_PROGRESS] Fix `useProjectManagerDialogSessionController` adoption path + track `lastProviderSessionIdRef` in `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` — scope: 1 file; commit message: `fix: adopt post-stop rebind session in PM dialog controller`
26. [TODO] Git Commit: `fix: adopt post-stop rebind session in PM dialog controller` (hash: TBD)

### Stream 10: Remove Core stopdiag_ instrumentation
27. [TODO] Remove all `stopdiag_` logs from `stop-action.ts`, `stop-rebind.ts`, `message-dispatch.ts`, `runtime-callbacks.ts`, `provider-event-router.ts` — scope: 5 files; commit message: `chore: remove 1.2.3 stopdiag core instrumentation`
28. [TODO] Git Commit: `chore: remove 1.2.3 stopdiag core instrumentation` (hash: TBD)

### Stream 11: Remove PM pmdiag_ + appender
29. [TODO] Remove `pmdiag_` logs from `api.ts`, `session-stream.ts`, `project-manager-runtime-session-view.tsx`, `project-manager-dialog-session-view.tsx`; revert `remote-bridge-message-router.ts` pm:diag:log handler to `logger.info` (drop appender) — scope: 5 files; commit message: `chore: remove 1.2.4 pmdiag instrumentation`
30. [TODO] Git Commit: `chore: remove 1.2.4 pmdiag instrumentation` (hash: TBD)

### Stream 12: Release notes + build
31. [TODO] Update `README.md` and `CHANGELOG.md` to target 1.2.5 fix release — scope: 2 files; commit message: `docs: prepare 1.2.5 fix release notes`
32. [TODO] Git Commit: `docs: prepare 1.2.5 fix release notes` (hash: TBD)
33. [TODO] Run `./scripts/build-all.sh --version 1.2.5` then `./scripts/build-release.sh --use-current-version` — scope: build artifacts + version bumps; commit message: `chore: bump version to 1.2.5 for fix release`
34. [TODO] Git Commit: `chore: bump version to 1.2.5 for fix release` (hash: TBD)

### Stream 13: Planning doc closeout
35. [TODO] Promote Invariant about post-stop rebind session adoption to `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` and archive `doc/SolidWorks-WorkFlow/Plans/StopResume_LockRegression_Diagnostic_1.2.3.md` to `doc/SolidWorks-WorkFlow/Plans/Archive/` — scope: 3 files (SystemArchitecture update + archive move + Docs_Index update); commit message: `docs: promote post-stop session adoption invariant, archive 1.2.3 diag plan`
36. [TODO] Git Commit: `docs: promote post-stop session adoption invariant, archive 1.2.3 diag plan` (hash: TBD)
