# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-final-review-gate-2026-05-18",
  "branch": "main",
  "baseHead": "3f3896ecd",
  "lastRecordedCommit": "290219e42",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md",
  "currentTaskId": "application-skeleton-final-review.phase1.lifecycle.task1",
  "expectedCommitMessage": "fix: defer application skeleton completion until final review",
  "debt": {
    "expectedCommitMessage": "fix: defer application skeleton completion until final review",
    "preCommitHead": "290219e42",
    "stage": "commit_pending",
    "taskId": "application-skeleton-final-review.phase1.lifecycle.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- Scope: fix `Application Skeleton` final materialization boundary so Core opens a user review gate before completing the stage and unlocking `Quality Gates`.
- Core remains workflow authority: PM renders the system-card button and submits intent only.
- Do not add Project Manager-owned acceptance state or direct client plan mutation.
- Keep microtasks to no more than 3 files each.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-18)

### Stream: Active Scope Creation

1. [DONE] `application-skeleton-final-review.phase0.plan.task1` Create planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan application skeleton final review gate`).
2. [DONE] Git Commit: `docs: plan application skeleton final review gate` (hash: 290219e42)

## Phase 1 - Core Final Gate Lifecycle (owner: Codex, updated: 2026-05-18)

### Stream: Stage Plan Completion Boundary

3. [DONE] `application-skeleton-final-review.phase1.lifecycle.task1` Defer Application Skeleton completed-stage ledger/unlock until explicit final user acceptance and expose final-review state helpers (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-review-intent.ts, doc/TODO/todo-plan.md`; expected commit: `fix: defer application skeleton completion until final review`).
4. [PENDING] Git Commit: `fix: defer application skeleton completion until final review` (hash: TBD)

### Stream: Core Handoff And Review Actions

5. [TODO] `application-skeleton-final-review.phase1.handlers.task1` Emit a final Application Skeleton user-review card after materialization and route final accept/revision decisions through Core (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder.ts`; expected commit: `fix: open application skeleton final review gate`).
6. [TODO] Git Commit: `fix: open application skeleton final review gate` (hash: TBD)

### Stream: Core Regression Tests

7. [TODO] `application-skeleton-final-review.phase1.tests.task1` Cover post-materialization review, final acceptance unlock, and final revision behavior for Application Skeleton (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts`; expected commit: `test: cover application skeleton final review gate`).
8. [TODO] Git Commit: `test: cover application skeleton final review gate` (hash: TBD)

## Phase 2 - Documentation And Verification (owner: Codex, updated: 2026-05-18)

### Stream: SSOT Documentation

9. [TODO] `application-skeleton-final-review.phase2.docs.task1` Document the Application Skeleton post-materialization user review gate in managed workflow SSOT docs (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md`; expected commit: `docs: document application skeleton final review gate`).
10. [TODO] Git Commit: `docs: document application skeleton final review gate` (hash: TBD)

### Stream: Tooling Verification

11. [TODO] `application-skeleton-final-review.phase2.verify.task1` Run targeted Core tests and record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify application skeleton final review gate`).
12. [TODO] Git Commit: `test: verify application skeleton final review gate` (hash: TBD)

## Phase 3 - Release Build (owner: Codex, updated: 2026-05-18)

### Stream: Release Build Confirmation

13. [TODO] `application-skeleton-final-review.phase3.release.gate.task1` Ask the user for explicit release build confirmation before preparing release notes or running release scripts (scope: user confirmation only; expected commit: none).

## Phase 4 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-18)

### Stream: User Retest

14. [TODO] `application-skeleton-final-review.phase4.acceptance.task1` User installs/retests the release and confirms Application Skeleton shows the final `Подтверждаю` gate before Quality Gates unlocks (scope: user workflow acceptance only; expected commit: none).

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-05-18)

### Stream: Scope Closeout

15. [TODO] `application-skeleton-final-review.phase5.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton final review gate scope`).
16. [TODO] Git Commit: `docs: close application skeleton final review gate scope` (hash: TBD)
