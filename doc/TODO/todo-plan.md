# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-completed-marker-hotfix-2026-06-05",
  "branch": "main",
  "baseHead": "6fbafc9d1",
  "lastRecordedCommit": "c293a834a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/QualityGates_CompletedMarker_Hotfix.md",
  "currentTaskId": "phase1.stream2.task1",
  "expectedCommitMessage": "fix: mark completed quality gates as available",
  "debt": {
    "expectedCommitMessage": "fix: mark completed quality gates as available",
    "preCommitHead": "c293a834a",
    "stage": "commit_pending",
    "taskId": "phase1.stream2.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/QualityGates_CompletedMarker_Hotfix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- Required reading before implementation: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Keep the fix scoped to `Quality Gates Baseline` completed marker projection.
- Do not move workflow truth into Project Manager; Core remains the authority for stage status and artifact availability.
- Each implementation task must touch no more than 3 files.
- Commit every completed task through `npm run plan:commit -- "<expected commit message>"`.
- Do not run release packaging unless the user explicitly confirms a release build.

## Phase 1 - Quality Gates Completed Marker Hotfix (owner: Codex, updated: 2026-06-05)

### Stream: Plan Intake

1. [DONE] `phase1.stream1.task1` Record the user-reported Quality Gates completed marker regression and open the active bugfix scope (scope: `doc/SolidWorks-WorkFlow/Plans/QualityGates_CompletedMarker_Hotfix.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan quality gates completed marker hotfix`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan quality gates completed marker hotfix` (hash: c293a834a)

### Stream: Marker Projection Fix

3. [DONE] `phase1.stream2.task1` Make completed `quality_gates` project as completed/available in the Documentation Tree marker while preserving Development Tree readiness (scope: `src/client/project-manager/components/layout/workspace-tree-model.ts, src/client/project-manager/components/layout/workspace-tree-model.test.ts`; expected commit: `fix: mark completed quality gates as available`).
4. [PENDING] `phase1.stream2.commit1` Git Commit: `fix: mark completed quality gates as available` (hash: TBD)

### Stream: Tooling Verification

5. [TODO] `phase1.stream3.task1` Run targeted regression tests/builds for the touched package plus `npm run plan:validate` (scope: verification commands and `doc/TODO/todo-plan.md`; expected commit: none).

### Stream: User Workflow Acceptance Testing

6. [TODO] `phase1.stream4.task1` Hand the fix back for user retest of the Quality Gates completed marker (scope: user workflow acceptance; expected commit: none).

### Stream: Scope Closeout

7. [TODO] `phase1.stream5.task1` Close this bugfix scope only after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/QualityGates_CompletedMarker_Hotfix.md`; expected commit: `docs: close quality gates completed marker hotfix`).
8. [TODO] `phase1.stream5.commit1` Git Commit: `docs: close quality gates completed marker hotfix` (hash: TBD)
9. [TODO] `phase1.stream5.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: post-closeout handoff only; expected commit: none).
