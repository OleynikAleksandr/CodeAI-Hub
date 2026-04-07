# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_WorkspaceStartup_Reset_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Only this list is the recovery document pack for the current execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Every implementation task must stay within **<= 3 files**.
- Every implementation task must be followed by a separate `Git Commit:` line so the commit cannot be skipped.
- If a task grows past 3 files, it must be split before implementation continues.
- Real-time docs sync is mandatory: any architecture or behavior change must update the relevant `doc/` files in the same commit.
- Husky gates remain mandatory:
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Targeted manual validation is required before closing a stream when the touched area needs it:
  - `npm run build --workspace <package>`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- `doc/TODO/todo-plan.md` must be updated in real time after each micro-task and each commit.

## Phase 1 — Description-First Workspace Startup Reset (owner: Codex, updated: 2026-04-07)

### Stream: Core Startup Truth
1. [DONE] Remove continuity-recency as a startup-stage selector in `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-last-active-resolver.ts`, and `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; include gate-driven cleanup in `packages/core/src/workflow/state/workflow-last-active-store.ts` if the old stage-order export becomes unused; scope: startup-stage repair only; expected commit message: `fix(pm): remove continuity recency from workspace startup`
2. [DONE] Git Commit: `fix(pm): remove continuity recency from workspace startup` (hash: `a315ca4fd`)

### Stream: PM Startup Route
3. [DONE] Force workspace-open startup routing to `description` in `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, and `src/client/project-manager/components/layout/workflow-navigation.test.ts`; scope: startup-stage selection only; expected commit message: `fix(pm): always start workspace in description`
4. [DONE] Git Commit: `fix(pm): always start workspace in description` (hash: `12edeb962`)

### Stream: Session Panel Startup Scope
5. [DONE] Keep automatic startup session restore Description-scoped in `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, and `src/client/project-manager/components/sessions/session-visibility.ts`; include aligned source-test sync in `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx` if the runtime-stage contract changes; scope: startup fallback only; expected commit message: `fix(pm): scope startup sessions to description`
6. [DONE] Git Commit: `fix(pm): scope startup sessions to description` (hash: `12606d508`)

### Stream: False Startup Heuristics Cleanup
7. [DONE] Remove or narrow obsolete recency-based startup helpers in `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, and `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; include aligned source-test sync in `src/client/project-manager/components/layout/foundation-envelope-tree-parity.test.ts` if old startup assumptions surface; scope: delete invalid startup selectors while preserving still-valid local stage actions; expected commit message: `refactor(pm): remove obsolete startup heuristics`
8. [DONE] Git Commit: `refactor(pm): remove obsolete startup heuristics` (hash: `c27cdc4f1`)

### Stream: Startup Contract Docs And Coverage
9. [DONE] Sync the temporary startup contract in `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, and `src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`; include aligned source-test sync in `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts` if old `lastActive` startup assumptions surface; scope: docs plus regression coverage for Description-first startup; expected commit message: `docs(pm): document description-first workspace startup`
10. [IN_PROGRESS] Git Commit: `docs(pm): document description-first workspace startup` (hash: TBD)

### Stream: Release Build For User Testing
11. [TODO] Run the release checklist for this scope in `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, and release/build outputs as needed: finish all streams, keep a clean tree before packaging, execute `./scripts/build-all.sh`, verify fresh tarballs in `doc/tmp/releases/`, execute `./scripts/build-release.sh --use-current-version`, and sync the final release status for user test delivery; scope: release closeout and packaging for a test build; expected commit message: `build(release): cut test build for description startup reset`
12. [TODO] Git Commit: `build(release): cut test build for description startup reset` (hash: TBD)
