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
1. [TODO] Remove continuity-recency as a startup-stage selector in `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-last-active-resolver.ts`, and `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; scope: startup-stage repair only; expected commit message: `fix(pm): remove continuity recency from workspace startup`
2. [TODO] Git Commit: `fix(pm): remove continuity recency from workspace startup` (hash: TBD)

### Stream: PM Startup Route
3. [TODO] Force workspace-open startup routing to `description` in `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, and `src/client/project-manager/components/layout/workflow-navigation.test.ts`; scope: startup-stage selection only; expected commit message: `fix(pm): always start workspace in description`
4. [TODO] Git Commit: `fix(pm): always start workspace in description` (hash: TBD)

### Stream: Session Panel Startup Scope
5. [TODO] Keep automatic startup session restore Description-scoped in `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, and `src/client/project-manager/components/sessions/session-visibility.ts`; scope: startup fallback only; expected commit message: `fix(pm): scope startup sessions to description`
6. [TODO] Git Commit: `fix(pm): scope startup sessions to description` (hash: TBD)

### Stream: False Startup Heuristics Cleanup
7. [TODO] Remove or narrow obsolete recency-based startup helpers in `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, and `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; scope: delete invalid startup selectors while preserving still-valid local stage actions; expected commit message: `refactor(pm): remove obsolete startup heuristics`
8. [TODO] Git Commit: `refactor(pm): remove obsolete startup heuristics` (hash: TBD)

### Stream: Startup Contract Docs And Coverage
9. [TODO] Sync the temporary startup contract in `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, and `src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`; scope: docs plus regression coverage for Description-first startup; expected commit message: `docs(pm): document description-first workspace startup`
10. [TODO] Git Commit: `docs(pm): document description-first workspace startup` (hash: TBD)
