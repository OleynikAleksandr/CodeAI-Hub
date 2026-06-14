# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "downstream-execution-refactor-strategy-doc-2026-06-14",
  "branch": "main",
  "baseHead": "17e593ebf",
  "lastRecordedCommit": "17e593ebf",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md",
  "currentTaskId": "planning-intake.downstream-refactor-doc.phase1.task1",
  "expectedCommitMessage": "docs: update downstream execution refactor strategy",
  "debt": {
    "expectedCommitMessage": "docs: update downstream execution refactor strategy",
    "preCommitHead": "17e593ebf",
    "stage": "commit_pending",
    "taskId": "planning-intake.downstream-refactor-doc.phase1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`
- **Read this context before implementation:**
  - `doc/TODO/todo-plan.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`

## Правила выполнения

- Scope is documentation-only.
- Do not edit production code in this intake.
- Commit through `npm run plan:commit -- "<expected commit message>"`.
- Keep this active plan open after the documentation update until user acceptance.

## Phase 1 — Downstream Execution Strategy Documentation (owner: Codex, updated: 2026-06-14)

### Stream: Planning Document Update

1. [DONE] `planning-intake.downstream-refactor-doc.phase1.task1` Update the downstream execution refactor planning document with the accepted short-lived Product Part lane and AI impact-planning model (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`; expected commit: `docs: update downstream execution refactor strategy`).
2. [PENDING] Git Commit: `docs: update downstream execution refactor strategy` (hash: TBD)

### Stream: Tooling Verification

3. [TODO] `planning-intake.downstream-refactor-doc.phase1.verify.task1` Verify Markdown UTF-8/readback and run plan validation after the documentation commit (scope: commands only; expected commit: none).

### Stream: User Workflow Acceptance Testing

4. [TODO] `planning-intake.downstream-refactor-doc.phase1.acceptance.task1` User reviews the updated planning document and either accepts it or requests corrections (scope: user workflow; expected commit: none).

### Stream: Scope Closeout

5. [TODO] `planning-intake.downstream-refactor-doc.phase1.closeout.anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
