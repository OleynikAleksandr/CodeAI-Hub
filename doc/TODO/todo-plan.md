# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plans-backlog-intake-2026-06-01",
  "branch": "main",
  "baseHead": "1add4fc4f",
  "lastRecordedCommit": "1ad80e095",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase4.stream1.task1",
  "expectedCommitMessage": "docs: revise development tree module workflow",
  "debt": {
    "expectedCommitMessage": "docs: revise development tree module workflow",
    "preCommitHead": "1ad80e095",
    "stage": "commit_pending",
    "taskId": "phase4.stream1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/README.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- Only this list is the source for restoring context in this execution cycle.

## Execution Rules

- Required reading before code/design edits: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md` when the change touches facade/class/module boundaries.
- Keep `doc/SolidWorks-WorkFlow/Plans/` root reserved for the current active planning document plus directory metadata.
- Important but not-started planning sources belong in `doc/SolidWorks-WorkFlow/Plans/Backlog/`, not in `Plans/Archive/`.
- Completed historical planning sources remain in `doc/SolidWorks-WorkFlow/Plans/Archive/`.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-managed tasks.

## Phase 1 - Plans Backlog Intake (owner: Codex, updated: 2026-06-01)

### Stream: Root Planning Shelf

1. [DONE] `phase1.stream1.task1` Reorganize `Plans/` root so the current active planning source remains in root while deferred/reference planning documents move to `Plans/Backlog/`; update navigation and path references (scope: `doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: organize active plans backlog`).
2. [DONE] Git Commit: `docs: organize active plans backlog` (hash: 1ad80e095)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

3. [DONE] `phase2.stream1.task1` Run `npm run plan:validate` and targeted path/link spot checks for moved planning documents (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; check:links passed; root Plans contains only README.md plus DevelopmentTree_BranchWorkflow_Architecture.md as the active working planning document

## Phase 3 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

4. [DONE] `phase3.stream1.task1` User reviews the `Plans/` shelf model and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`). Result: User accepted the Plans shelf model and requested continuing with the active Development Tree planning source.

## Phase 4 - Development Tree Module Workflow Revision (owner: Codex, updated: 2026-06-01)

### Stream: Module Session And Worker Visibility

5. [DONE] `phase4.stream1.task1` Revise `DevelopmentTree_BranchWorkflow_Architecture.md` to reflect the one module-agent session model, artifact/user-review phases, interactive Implementation TODO Plan, read-only worker sessions, and MVP responsibility split between Core and the module agent; update the docs index summary for this active planning source (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: revise development tree module workflow`).
6. [PENDING] Git Commit: `docs: revise development tree module workflow` (hash: TBD)

## Phase 5 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

7. [TODO] `phase5.stream1.task1` Run `npm run plan:validate` and `npm run check:links` after the architecture revision (scope: `doc/TODO/todo-plan.md`).

## Phase 6 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

8. [TODO] `phase6.stream1.task1` User reviews the revised Development Tree branch workflow architecture and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`).

## Phase 7 - Scope Closeout (owner: Codex, updated: 2026-06-01)

### Stream: Closeout

9. [TODO] `phase7.stream1.task1` After explicit user acceptance, archive this active `todo-plan.md` closeout snapshot and leave `DevelopmentTree_BranchWorkflow_Architecture.md` as the active root planning source (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close plans backlog intake`).
10. [TODO] Git Commit: `docs: close plans backlog intake` (hash: TBD)
11. [TODO] `phase7.stream1.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`).
