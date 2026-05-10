# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-phase-b-orchestration-intake-q7-fix",
  "branch": "main",
  "baseHead": "ec9f8a4e2",
  "lastRecordedCommit": "ec4b690fe",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md",
  "currentTaskId": "intake-q7-fix.revision4.task1",
  "expectedCommitMessage": "docs: finalize application skeleton phase b orchestration intake",
  "debt": {
    "expectedCommitMessage": "docs: finalize application skeleton phase b orchestration intake",
    "preCommitHead": "ec4b690fe",
    "stage": "commit_pending",
    "taskId": "intake-q7-fix.revision4.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`
- **Read this context before applying the revision and reviewing:**
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`
- Only this Context Pack is the recovery source for the current planning intake revision cycle.

## Execution Rules

- This is a narrow planning intake revision scope: one final clarification before the planning document is accepted as the implementation source.
- Only the planning document and this todo-plan are touched in this scope.
- The previous intake scope (`application-skeleton-phase-b-orchestration-intake`) closed prematurely after `plan:complete` advanced through both `review.task3` and the handoff anchor in one call (no revision3 task was injected before completion). This scope re-opens the conversation only for the single remaining Q7 fix; the rest of the planning document already carries Phase 1A/1B/2 split, observe-vs-dispatch rule, narrowed acceptance owned diff, Stage Plan Shape, and readiness-resolution fallback from the previous intake's revision 1 and revision 2 commits (`5cca71a99`, `2b9a7074e`).
- Do not use `--no-verify`.
- Implementation work and runtime/code changes are deferred to a separate scope opened against the accepted planning document.

## Phase 1 — Apply Q7 Revision (owner: next agent, updated: 2026-05-10)

### Stream: Narrow Open Question 7

1. [DONE] `intake-q7-fix.task1` Rewrite Open Question 7 in the planning document so it no longer asks whether to introduce a standalone Phase 1A corrective dispatcher (this contradicts the already-accepted Existing Code Inventory and Implementation Surfaces, which place corrective decision ownership inside `managed-workflow-post-turn-service.ts`). New Q7 asks only about the placement of the corrective message-text prompt-builder: a small dedicated pure prompt-builder file vs inline in the post-turn service until it grows. (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`; expected commit: `docs: revise application skeleton phase b orchestration intake — narrow open question 7`).
2. [DONE] Git Commit: `docs: revise application skeleton phase b orchestration intake — narrow open question 7` (hash: ec4b690fe)

## Phase 2 — User Acceptance And Handoff (owner: user, updated: 2026-05-10)

### Stream: Final Review

3. [DONE] `intake-q7-fix.review.task1` User reviews the rewritten Open Question 7 and either explicitly accepts the planning document as final or asks for further revisions. Further revisions queue as `revisionN.task1 + Git Commit` pairs under this stream. (scope: chat/process observation only; no commit required). Result: User accepted the Q7 ownership clarification, requested one final wording precision so the Phase B reference says pure discussion turns are recorded in standard session history (not audit/history), and asked to cut the implementation plan from the accepted planning document.
4. [DONE] `intake-q7-fix.revision4.task1` Apply final wording precision in the planning document: replace the remaining generic `audit/history` phrasing for Phase B pure discussion turns with `standard session history`, matching the detailed T2 pilot policy and avoiding an implied new managed audit kind. (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`; expected commit: `docs: finalize application skeleton phase b orchestration intake`).
5. [PENDING] Git Commit: `docs: finalize application skeleton phase b orchestration intake` (hash: TBD)

### Stream: Reserved Post-Closeout Handoff Anchor

6. [TODO] `intake-q7-fix.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically. After explicit user acceptance closes the review, this task closes the intake-revision scope so a fresh implementation todo-plan can open against the now-accepted planning document. (scope: chat/process observation only; no commit required).
