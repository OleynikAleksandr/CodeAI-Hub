# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_LeftSidebar_ActiveStageSync_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
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

## Phase 1 — Left Sidebar Active Stage Sync (owner: Codex, updated: 2026-04-07)

### Stream: Tree Selection Source Of Truth
1. [DONE] Add left-tree active-stage sync in `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/workspace-tree-model.ts`, and `src/client/project-manager/components/layout/use-workspace-tree-active-stage.ts`; scope: selected-stage state only, keeping workflow status separate from UI selection; expected commit message: `fix(pm): sync left sidebar with active stage`
2. [DONE] Git Commit: `fix(pm): sync left sidebar with active stage` (hash: `a21489562`)

### Stream: Tree Accordion And Highlight
3. [DONE] Make only the active stage branch expanded and add selected-stage styling in `src/client/project-manager/components/layout/workspace-tree.tsx` and `packages/ui/project-manager/styles.css`; scope: accordion visibility plus selected-step highlight without changing workflow status markers; expected commit message: `feat(pm): highlight active step in left sidebar`
4. [DONE] Git Commit: `feat(pm): highlight active step in left sidebar` (hash: `9d50d57b3`)

### Stream: Navigation Docs And Coverage
5. [DONE] Sync the left-sidebar stage-selection contract in `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, and `src/client/project-manager/components/layout/workflow-navigation.test.ts`; scope: document the accordion/highlight behavior and guard cross-surface stage sync; expected commit message: `docs(pm): document left sidebar active stage sync`
6. [DONE] Git Commit: `docs(pm): document left sidebar active stage sync` (hash: `88358bcc9`)

### Stream: Release Build For User Testing
7. [DONE] Prepare the release docs for the next test build in `README.md`, `CHANGELOG.md`, and `doc/TODO/todo-plan.md`; scope: release-prep docs only so the tree is clean before packaging; expected commit message: `docs(release): prep left sidebar sync test release`
8. [DONE] Git Commit: `docs(release): prep left sidebar sync test release` (hash: `fcc9e29d7`)
9. [IN_PROGRESS] Run the release checklist for this scope in `doc/TODO/todo-plan.md` and release/build outputs: keep a clean tree before packaging, execute `./scripts/build-all.sh`, verify fresh tarballs in `doc/tmp/releases/`, execute `./scripts/build-release.sh --use-current-version`, and sync the final release status for user test delivery; scope: release closeout and packaging for a test build; expected commit message: `build(release): cut test build for left sidebar sync`
10. [TODO] Git Commit: `build(release): cut test build for left sidebar sync` (hash: TBD)
