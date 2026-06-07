# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-product-part-review-lifecycle-2026-06-07",
  "branch": "main",
  "baseHead": "e6cd05104",
  "lastRecordedCommit": "6d1fc87cf",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "development-tree-product-part-review.phase2.return.task1",
  "expectedCommitMessage": "feat: open product part user return after brief acceptance",
  "debt": {
    "expectedCommitMessage": "feat: open product part user return after brief acceptance",
    "preCommitHead": "6d1fc87cf",
    "stage": "commit_pending",
    "taskId": "development-tree-product-part-review.phase2.return.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task must touch no more than 3 files.
- Every task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"` for normal commit workflow.
- Do not bypass Husky hooks or quality gates.
- Keep `SystemArchitecture.md`, `WorkflowSteps_Overview.md`, and relevant cluster/module docs synchronized when behavior changes.
- Release build is not automatic. Ask the user before release notes, version bump, `build-all.sh`, or `build-release.sh`.

## Phase 0 - Scope Intake (owner: Codex, updated: 2026-06-07)

### Stream: Active Plan Setup

1. [DONE] `development-tree-product-part-review.phase0.plan.task1` Create the active execution plan for Product Part review lifecycle work (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: start development tree product part review lifecycle plan`).
2. [DONE] Git Commit: `docs: start development tree product part review lifecycle plan` (hash: 7a5be893d)

## Phase 1 - Product Part Review Decisions (owner: Codex, updated: 2026-06-07)

### Stream: Review Routing

3. [DONE] `development-tree-product-part-review.phase1.routing.task1` Add Product Part review-decision routing so normal user messages stay in revision flow and explicit acceptance is handled by Core (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.ts`; expected commit: `feat: handle product part brief review decisions`).
4. [DONE] Git Commit: `feat: handle product part brief review decisions` (hash: 6d1fc87cf)

## Phase 2 - Product Part Return State (owner: Codex, updated: 2026-06-07)

### Stream: Managed Plan Advancement

5. [DONE] `development-tree-product-part-review.phase2.return.task1` Advance accepted non-lead Product Part plans into `User Return And Revisions` and keep lead Product Part plans ready for the next managed assignment (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.ts, packages/core/src/development-tree/product-part-workflow/product-part-development-brief-plan-writer.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`; expected commit: `feat: open product part user return after brief acceptance`).
6. [PENDING] Git Commit: `feat: open product part user return after brief acceptance` (hash: TBD)

## Phase 3 - Documentation Sync (owner: Codex, updated: 2026-06-07)

### Stream: SSOT Update

7. [TODO] `development-tree-product-part-review.phase3.docs.task1` Document Product Part review lifecycle and current lead/non-lead boundary before Development Order Plan implementation (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit: `docs: describe product part review lifecycle`).
8. [TODO] Git Commit: `docs: describe product part review lifecycle` (hash: TBD)

## Phase 4 - Tooling Verification (owner: Codex, updated: 2026-06-07)

### Stream: Targeted Verification

9. [TODO] `development-tree-product-part-review.phase4.verify.task1` Run targeted tests for Product Part review lifecycle and relevant Core handlers (scope: `packages/core`; expected commit: `test: verify product part review lifecycle`).
10. [TODO] Git Commit: `test: verify product part review lifecycle` (hash: TBD)

## Phase 5 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-07)

### Stream: FinderWidget Retest

11. [TODO] `development-tree-product-part-review.phase5.user.task1` User retests `latest-note-search` and `widget-display` Product Part sessions: revision messages continue agent work, acceptance transitions to return/revision state (scope: user workflow; expected commit: none).
12. [TODO] Git Commit: `none` (hash: N/A)

## Phase 6 - Scope Closeout (owner: Codex, updated: 2026-06-07)

### Stream: Closeout After Acceptance

13. [TODO] `development-tree-product-part-review.phase6.closeout.task1` After explicit user acceptance, archive this plan and decide disposition for the active planning source (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`; expected commit: `docs: close development tree product part review lifecycle scope`).
14. [TODO] Git Commit: `docs: close development tree product part review lifecycle scope` (hash: TBD)
