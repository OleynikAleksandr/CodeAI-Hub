# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-clean-stage-markers-2026-05-17",
  "branch": "main",
  "baseHead": "e0373dde8",
  "lastRecordedCommit": "8e5994770",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ManagedWorkflow_CleanStageMarkers_Planning.md",
  "currentTaskId": "managed-clean-markers.phase2.markers.task1",
  "expectedCommitMessage": "fix: make stage markers core owned",
  "debt": {
    "expectedCommitMessage": "fix: make stage markers core owned",
    "preCommitHead": "8e5994770",
    "stage": "commit_pending",
    "taskId": "managed-clean-markers.phase2.markers.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ManagedWorkflow_CleanStageMarkers_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules

- Scope: make managed workflow stage markers Core-owned and prevent terminal stage completion from leaving a dirty Git tree.
- Do not bypass hooks. Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks.
- Each implementation task must touch no more than 3 files unless this plan is first split into smaller tasks.
- A managed stage marker has exactly three visible states: gray means not started, yellow means Core has sent the first agent prompt or opened the step session, and green means the step has reached its terminal user-return/revision boundary.
- Description and Virtual Simulation do not use managed todo-plans, but they still become yellow when Core starts their session. Their existing green completion behavior must stay intact.
- A green marker must not be published for a managed step while Core-owned or stage-owned Git changes remain uncommitted. Classified managed residue is committed by Core; unclassified residue blocks completion and next-stage transition until resolved through a Core command.
- Release build is out of scope for this fix unless the user explicitly requests it later.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Plan Creation

1. [DONE] `managed-clean-markers.phase0.plan.task1` Create the active todo-plan for the clean Git and stage marker fix (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open clean stage marker planning`).
2. [DONE] Git Commit: `docs: open clean stage marker planning` (hash: 25171dd87)

### Stream: Planning Source

3. [DONE] `managed-clean-markers.phase0.plan.task2` Create the planning source and register the active scope in the documentation index (scope: `doc/SolidWorks-WorkFlow/Plans/ManagedWorkflow_CleanStageMarkers_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan clean stage markers`).
4. [DONE] Git Commit: `docs: plan clean stage markers` (hash: b9794c24a)

## Phase 1 - Terminal Clean Git Guard (owner: Codex, updated: 2026-05-17)

### Stream: Managed Residue Classification

5. [DONE] `managed-clean-markers.phase1.clean.task1` Add a Core-owned terminal dirty-tree classifier for managed stage outputs and runtime metadata (scope: `packages/core/src/managed-workflow-orchestration/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/**/*.test.ts`; expected commit: `fix: classify managed terminal git residue`).
6. [DONE] Git Commit: `fix: classify managed terminal git residue` (hash: 3965c697a)

### Stream: Terminal Commit Boundary

7. [DONE] `managed-clean-markers.phase1.clean.task2` Wire the classifier into managed terminal/user-return transitions so green completion requires a clean tree or a Core commit of classified residue (scope: `packages/core/src/managed-workflow-orchestration/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/**/*.test.ts`; expected commit: `fix: enforce clean git before managed stage completion`).
8. [DONE] Git Commit: `fix: enforce clean git before managed stage completion` (hash: e510bfd2f)

### Stream: Application Skeleton Terminal Boundary

9. [DONE] `managed-clean-markers.phase1.clean.task3` Apply the terminal clean-Git checkpoint before Application Skeleton opens persistent user return (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/**, packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts, packages/core/src/**/*.test.ts`; expected commit: `fix: enforce clean git before application skeleton completion`).
10. [DONE] Git Commit: `fix: enforce clean git before application skeleton completion` (hash: 7de441992)

### Stream: Quality Gates Terminal Boundary

11. [DONE] `managed-clean-markers.phase1.clean.task4` Apply the terminal clean-Git checkpoint before Quality Gates opens persistent user return (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/**, packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/**/*.test.ts`; expected commit: `fix: enforce clean git before quality gates completion`).
12. [DONE] Git Commit: `fix: enforce clean git before quality gates completion` (hash: 8e5994770)

## Phase 2 - Core-Owned Stage Markers (owner: Codex, updated: 2026-05-17)

### Stream: Status Projection

13. [DONE] `managed-clean-markers.phase2.markers.task1` Make Core project trunk stage status from explicit start and terminal completion signals instead of artifact/review side effects (scope: `packages/core/src/workflow/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/**/*.test.ts`; expected commit: `fix: make stage markers core owned`).
14. [PENDING] Git Commit: `fix: make stage markers core owned` (hash: TBD)

### Stream: Project Manager Rendering

15. [TODO] `managed-clean-markers.phase2.markers.task2` Restrict Project Manager tree marker rendering to the Core-provided gray/yellow/green stage status contract (scope: `src/client/project-manager/components/layout/**, src/client/project-manager/services/**, src/client/project-manager/**/*.test.*`; expected commit: `fix: render deterministic project manager step markers`).
16. [TODO] Git Commit: `fix: render deterministic project manager step markers` (hash: TBD)

## Phase 3 - Documentation And Verification (owner: Codex, updated: 2026-05-17)

### Stream: Architecture Docs

17. [TODO] `managed-clean-markers.phase3.docs.task1` Document the clean Git completion boundary and the three-state stage marker contract (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `docs: document clean stage marker contract`).
18. [TODO] Git Commit: `docs: document clean stage marker contract` (hash: TBD)

### Stream: Tooling Verification

19. [TODO] `managed-clean-markers.phase3.verify.task1` Run targeted tests/builds for managed workflow Core and Project Manager marker behavior, then record the verification result (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify clean stage marker workflow`).
20. [TODO] Git Commit: `test: verify clean stage marker workflow` (hash: TBD)

## Phase 4 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: User Retest

21. [TODO] `managed-clean-markers.phase4.acceptance.task1` User retests the managed workflow: each step becomes yellow on first Core-started session, becomes green only at the terminal User Return And Revisions boundary, and the Git tree stays clean after each step. Scope: user workflow acceptance only; expected commit: none.

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Closeout

22. [TODO] `managed-clean-markers.phase5.closeout.task1` After explicit user acceptance, archive this todo-plan and dispose of the planning source according to the docs lifecycle (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close clean stage marker scope`).
23. [TODO] Git Commit: `docs: close clean stage marker scope` (hash: TBD)
