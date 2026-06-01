# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plans-backlog-intake-2026-06-01",
  "branch": "main",
  "baseHead": "1add4fc4f",
  "lastRecordedCommit": "1add4fc4f",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase1.stream1.task1",
  "expectedCommitMessage": "docs: organize active plans backlog",
  "debt": {
    "expectedCommitMessage": "docs: organize active plans backlog",
    "preCommitHead": "1add4fc4f",
    "stage": "commit_pending",
    "taskId": "phase1.stream1.task1"
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
2. [PENDING] Git Commit: `docs: organize active plans backlog` (hash: TBD)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

3. [TODO] `phase2.stream1.task1` Run `npm run plan:validate` and targeted path/link spot checks for moved planning documents (scope: `doc/TODO/todo-plan.md`).

## Phase 3 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

4. [TODO] `phase3.stream1.task1` User reviews the `Plans/` shelf model and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`).

## Phase 4 - Scope Closeout (owner: Codex, updated: 2026-06-01)

### Stream: Closeout

5. [TODO] `phase4.stream1.task1` After explicit user acceptance, archive this active `todo-plan.md` closeout snapshot and leave `DevelopmentTree_BranchWorkflow_Architecture.md` as the active root planning source (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close plans backlog intake`).
6. [TODO] Git Commit: `docs: close plans backlog intake` (hash: TBD)
7. [TODO] `phase4.stream1.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`).
