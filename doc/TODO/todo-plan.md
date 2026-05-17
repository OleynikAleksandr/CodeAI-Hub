# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "diagram-modules-row-aware-auto-layout-2026-05-17",
  "branch": "main",
  "baseHead": "39e4388a7",
  "lastRecordedCommit": "40620b901",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DiagramModules_RowAwareAutoLayout_Planning.md",
  "currentTaskId": "diagram-row-layout.phase1.docs.task1",
  "expectedCommitMessage": "docs: document diagram row auto layout",
  "debt": {
    "expectedCommitMessage": "docs: document diagram row auto layout",
    "preCommitHead": "40620b901",
    "stage": "commit_pending",
    "taskId": "diagram-row-layout.phase1.docs.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_RowAwareAutoLayout_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_DevTreeParser_And_AutoFitZoom_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_AutoFitZoom_NaturalWidthHotfix_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_TwoColumnModuleTable_Cleanup_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules

- Scope: make Diagram Modules CSS Grid auto layout row-aware so default placement does not exceed three horizontal module-card slots across adjacent clusters and standalone modules.
- Do not change Diagram Modules semantic artifact formats.
- Do not reintroduce React Flow or JS pixel placement.
- Manual `module-map.flow.json` sidecar overrides remain authoritative.
- Each implementation task must touch no more than 3 files unless this plan is first split into smaller tasks.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Scope Creation

1. [DONE] `diagram-row-layout.phase0.plan.task1` Create the planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_RowAwareAutoLayout_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan diagram module row-aware layout`).
2. [DONE] Git Commit: `docs: plan diagram module row-aware layout` (hash: ce4c40cc7)

## Phase 1 - Row-Aware Auto Layout (owner: Codex, updated: 2026-05-17)

### Stream: Default Layout Algorithm

3. [DONE] `diagram-row-layout.phase1.layout.task1` Add row-aware Diagram Modules auto layout and regression coverage for the three-module horizontal row budget (scope: `src/client/project-manager/components/diagram-editor/**, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix: cap diagram module row auto layout`).
4. [DONE] Git Commit: `fix: cap diagram module row auto layout` (hash: 40620b901)

### Stream: Project Manager Contract Docs

5. [DONE] `diagram-row-layout.phase1.docs.task1` Mirror the row-aware auto layout contract in Project Manager documentation (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/TODO/todo-plan.md`; expected commit: `docs: document diagram row auto layout`).
6. [PENDING] Git Commit: `docs: document diagram row auto layout` (hash: TBD)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-05-17)

### Stream: Targeted Checks

7. [TODO] `diagram-row-layout.phase2.verify.task1` Run targeted Diagram Modules layout tests plus webview typecheck/build and record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify diagram row auto layout`).
8. [TODO] Git Commit: `test: verify diagram row auto layout` (hash: TBD)

## Phase 3 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: Diagram Retest

9. [TODO] `diagram-row-layout.phase3.acceptance.task1` User retests Diagram Modules visual layout in Project Manager and confirms automatic rows no longer overflow the right panel for adjacent clusters/modules (scope: user workflow acceptance only; expected commit: none).

## Phase 4 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Closeout

10. [TODO] `diagram-row-layout.phase4.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close diagram row auto layout scope`).
11. [TODO] Git Commit: `docs: close diagram row auto layout scope` (hash: TBD)
12. [TODO] `diagram-row-layout.phase4.closeout.anchor` Reserved post-closeout handoff anchor (scope: none; expected commit: none).
