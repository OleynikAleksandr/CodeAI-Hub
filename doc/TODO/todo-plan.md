# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plans-backlog-intake-2026-06-01",
  "branch": "main",
  "baseHead": "1add4fc4f",
  "lastRecordedCommit": "90b753bb4",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase11.stream1.task1",
  "expectedCommitMessage": "docs: sync module tree projection docs",
  "debt": {
    "expectedCommitMessage": "docs: sync module tree projection docs",
    "preCommitHead": "90b753bb4",
    "stage": "commit_pending",
    "taskId": "phase11.stream1.task1"
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
6. [DONE] Git Commit: `docs: revise development tree module workflow` (hash: 3c0ca1e3c)

## Phase 5 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

7. [DONE] `phase5.stream1.task1` Run `npm run plan:validate` and `npm run check:links` after the architecture revision (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; check:links passed after Development Tree architecture revision.

## Phase 6 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

8. [DONE] `phase6.stream1.task1` User reviews the revised Development Tree branch workflow architecture and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`). Result: User requested adjustment: add Git Commit rows after each implementation microtask, define whether module agent or worker commits, and define worker workspace isolation rules.

## Phase 7 - Module Worker Commit Policy Revision (owner: Codex, updated: 2026-06-01)

### Stream: Commit And Workspace Policy

9. [DONE] `phase7.stream1.task1` Update `DevelopmentTree_BranchWorkflow_Architecture.md` with the Implementation TODO Plan microtask/Git Commit pairing, pre-commit Quality Gates behavior, module-agent commit ownership, worker sandbox/workspace rules, and parallel execution constraints (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: add module worker commit policy`).
10. [DONE] Git Commit: `docs: add module worker commit policy` (hash: 2774bf6b6)

## Phase 8 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

11. [DONE] `phase8.stream1.task1` Run `npm run plan:validate` and `npm run check:links` after the worker commit policy revision (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; check:links passed after module worker commit policy revision.

## Phase 9 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

12. [DONE] `phase9.stream1.task1` User reviews the revised Development Tree branch workflow architecture and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`). Result: User accepted the revised Development Tree architecture and requested implementation of the module-node display change plus a new release build.

## Phase 10 - Module Development Tree Display Fix (owner: Codex, updated: 2026-06-02)

### Stream: Core Snapshot Projection

13. [DONE] `phase10.stream1.task1` Stop Core from projecting module phase/operation rows (`Module / Facade Specification`, `Implementation`, nested `Workers`, `Integration`) under module nodes while keeping Product Part / Cluster / Module rows intact; update the focused Core snapshot test and SSOT note (scope: `packages/core/src/development-tree/development-tree-operation-nodes.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `fix: hide module operation rows in development tree`).
14. [DONE] Git Commit: `fix: hide module operation rows in development tree` (hash: 90b753bb4)

## Phase 11 - Documentation Sync (owner: Codex, updated: 2026-06-02)

### Stream: Sidebar Projection SSOT

15. [DONE] `phase11.stream1.task1` Update remaining SSOT/module docs so Project Manager and UI bundle documentation no longer describe module operation rows as the active Development Tree projection (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: sync module tree projection docs`).
16. [PENDING] Git Commit: `docs: sync module tree projection docs` (hash: TBD)

## Phase 12 - Tooling Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

17. [TODO] `phase12.stream1.task1` Run targeted Core/Project Manager checks after the module tree display fix, including plan validation and affected builds/tests where available (scope: `doc/TODO/todo-plan.md`).

## Phase 13 - Release Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

18. [TODO] `phase13.stream1.task1` Prepare release docs for the next version requested by the user before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.437`).
19. [TODO] Git Commit: `docs: prepare release 1.2.437` (hash: TBD)

## Phase 14 - Release Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

20. [TODO] `phase14.stream1.task1` Run the release build flow requested by the user and record the resulting VSIX/tarball artifacts (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.437`).
21. [TODO] Git Commit: `chore: build release 1.2.437` (hash: TBD)

## Phase 15 - User Visual Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

22. [TODO] `phase15.stream1.task1` User installs/tests the release and verifies module nodes no longer show module phase/operation children in the Development Tree (scope: `doc/TODO/todo-plan.md`).

## Phase 16 - Scope Closeout (owner: Codex, updated: 2026-06-02)

### Stream: Closeout

23. [TODO] `phase16.stream1.task1` After explicit user acceptance, archive this active `todo-plan.md` closeout snapshot and leave `DevelopmentTree_BranchWorkflow_Architecture.md` as the active root planning source or record its final disposition (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree module display scope`).
24. [TODO] Git Commit: `docs: close development tree module display scope` (hash: TBD)
25. [TODO] `phase16.stream1.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`).
