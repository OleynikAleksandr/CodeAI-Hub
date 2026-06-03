# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "workflow-clear-session-cleanup-rollback-2026-06-03",
  "branch": "main",
  "baseHead": "12edb060e",
  "lastRecordedCommit": "66e037018",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase1.stream3.task1",
  "expectedCommitMessage": "docs: sync workflow clear cleanup rollback",
  "debt": {
    "expectedCommitMessage": "docs: sync workflow clear cleanup rollback",
    "preCommitHead": "66e037018",
    "stage": "commit_pending",
    "taskId": "phase1.stream3.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`

## Execution Rules

- Keep the rollback scoped to the Clear/Undo session cleanup regression.
- Use Git rollback mechanics for the cleanup code; do not rewrite public history.
- Commit every completed task through `npm run plan:commit -- "<expected commit message>"`.
- Do not build a release until the user explicitly asks for a release build.

## Phase 1 — Roll Back Clear/Undo Session Cleanup (owner: Codex, updated: 2026-06-03)

### Stream: Plan Intake

1. [DONE] `phase1.stream1.task1` Create the active rollback plan for the Clear/Undo provider-native session cleanup regression (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan workflow clear cleanup rollback`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan workflow clear cleanup rollback` (hash: 3ab555283)

### Stream: Code Rollback

3. [DONE] `phase1.stream2.task1` Roll back the Clear/Undo session cleanup code to the pre-`cd34a5d08` behavior, removing the broad workflow history cleanup helper and restoring the narrower service path (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-runtime-cleanup.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.runtime-cleanup.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: revert workflow clear session cleanup`).
4. [DONE] `phase1.stream2.commit1` Git Commit: `fix: revert workflow clear session cleanup` (hash: 66e037018)

### Stream: Documentation Sync

5. [DONE] `phase1.stream3.task1` Sync the workflow documentation so it no longer claims the reverted broad provider-native cleanup behavior as the active contract (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: sync workflow clear cleanup rollback`).
6. [PENDING] `phase1.stream3.commit1` Git Commit: `docs: sync workflow clear cleanup rollback` (hash: TBD)

### Stream: Tooling Verification

7. [TODO] `phase1.stream4.task1` Run targeted Clear/Undo tests plus Core build and plan validation after the rollback (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected).

### Stream: User Workflow Acceptance Testing

8. [TODO] `phase1.stream5.task1` Hand over the rollback result for user retest; wait for explicit acceptance or the next failure report (scope: user workflow acceptance; expected commit: no commit expected).

### Stream: Scope Closeout

9. [TODO] `phase1.stream6.task1` Close or extend this rollback scope only after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**`; expected commit: `docs: close workflow clear cleanup rollback`).
10. [TODO] `phase1.stream6.commit1` Git Commit: `docs: close workflow clear cleanup rollback` (hash: TBD)
