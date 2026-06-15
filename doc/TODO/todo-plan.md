# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-order-plan-agent-fill-validator-hotfix-2026-06-15",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "eb246daab",
  "lastRecordedCommit": "b594c308b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md",
  "currentTaskId": "phase1.stream3.task1",
  "expectedCommitMessage": "test: cover order plan markdown completion validation",
  "debt": {
    "expectedCommitMessage": "test: cover order plan markdown completion validation",
    "preCommitHead": "b594c308b",
    "stage": "commit_pending",
    "taskId": "phase1.stream3.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit` item.
- Keep each implementation task scoped to no more than 3 files.
- Use `npm run plan:commit -- "<expected commit message>"` for planned commits.
- Do not bypass Husky hooks or quality gates.
- Do not build a release without explicit user confirmation.

## Phase 1 - Development Order Plan Validator Hotfix (owner: Codex, updated: 2026-06-15)

### Stream: Plan Setup

1. [DONE] `phase1.stream1.task1` Create the accepted hotfix planning source and active execution plan. (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan development order validator hotfix`)
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan development order validator hotfix` (hash: 7ea43491c)

### Stream: Validator Fix

3. [DONE] `phase1.stream2.task1` Fix DevelopmentOrderPlan Markdown completion validation and repair diagnostics. (scope: `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.ts`; expected commit: `fix: allow filled order plan agent-fill blocks`)
4. [DONE] `phase1.stream2.commit1` Git Commit: `fix: allow filled order plan agent-fill blocks` (hash: b594c308b)

### Stream: Regression Tests

5. [DONE] `phase1.stream3.task1` Add focused regression coverage for filled agent-fill wrappers and sentinel residue. (scope: `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.test.ts`; expected commit: `test: cover order plan markdown completion validation`)
6. [PENDING] `phase1.stream3.commit1` Git Commit: `test: cover order plan markdown completion validation` (hash: TBD)

### Stream: Tooling Verification

7. [TODO] `phase1.stream4.task1` Run targeted tests and Core build after the fix. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record order plan validator verification`)
8. [TODO] `phase1.stream4.commit1` Git Commit: `docs: record order plan validator verification` (hash: TBD)

### Stream: User Workflow Acceptance Testing

9. [TODO] `phase1.stream5.task1` Report verification results and wait for user decision on release build. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record order plan validator acceptance`)
10. [TODO] `phase1.stream5.commit1` Git Commit: `docs: record order plan validator acceptance` (hash: TBD)

### Stream: Scope Closeout

11. [TODO] `phase1.stream6.task1` Close the accepted scope and archive planning state after user acceptance. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close order plan validator hotfix scope`)
12. [TODO] `phase1.stream6.commit1` Git Commit: `docs: close order plan validator hotfix scope` (hash: TBD)
13. [TODO] `phase1.stream6.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
