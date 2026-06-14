# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "product-part-lane-closeout-implementation-2026-06-14",
  "branch": "main",
  "baseHead": "5f388460e",
  "lastRecordedCommit": "66c0ef10b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartLaneCloseout_ImplementationPlan.md",
  "currentTaskId": "product-part-lane-closeout.phase5.compile-repair.task1",
  "expectedCommitMessage": "fix: remove product part cluster gateway injection",
  "debt": {
    "expectedCommitMessage": "fix: remove product part cluster gateway injection",
    "preCommitHead": "66c0ef10b",
    "stage": "commit_pending",
    "taskId": "product-part-lane-closeout.phase5.compile-repair.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartLaneCloseout_ImplementationPlan.md`
- **Read this context before implementation:**
  - `doc/TODO/todo-plan.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartLaneCloseout_ImplementationPlan.md`

## Execution Rules

- Scope is the Product Part pre-code lane closeout runtime only.
- Do not implement cluster/module downstream execution in this cycle.
- Each implementation task changes at most 3 source/doc files.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks.
- Final release build is explicitly requested by the user in this cycle.

## Phase 1 - Operational Planning (owner: Codex, updated: 2026-06-14)

### Stream: Planning Source And Todo Slice

1. [DONE] `product-part-lane-closeout.phase1.plan.task1` Create the operational planning document and this implementation todo slice (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartLaneCloseout_ImplementationPlan.md`; expected commit: `docs: plan product part lane closeout implementation`).
2. [DONE] Git Commit: `docs: plan product part lane closeout implementation` (hash: 4432e8d30)

## Phase 2 - Product Part Plan Boundary (owner: Codex, updated: 2026-06-14)

### Stream: Generated Product Part Todo Plans

3. [DONE] `product-part-lane-closeout.phase2.plan-writer.task1` Remove the generated downstream coordination phase from lead Product Part pre-code plans and update its focused test (scope: `packages/core/src/development-tree/product-part-workflow/product-part-development-brief-plan-writer.ts, packages/core/src/development-tree/product-part-workflow/product-part-development-brief-plan-writer.test.ts`; expected commit: `fix: stop lead product part plans before cluster coordination`).
4. [DONE] Git Commit: `fix: stop lead product part plans before cluster coordination` (hash: d097d6b83)

## Phase 3 - Product Part Final Checkpoint (owner: Codex, updated: 2026-06-14)

### Stream: Order Plan Acceptance

5. [DONE] `product-part-lane-closeout.phase3.order-plan.task1` Finalize accepted lead Product Part order plans by checkpointing accepted artifacts to main, cleaning Product Part worktrees, and moving the managed plan to user-return instead of downstream coordination (scope: `packages/core/src/remote-bridge/handlers/product-part-brief-lane-checkpoint.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-review-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`; expected commit: `fix: finalize product part order plans in main workspace`).
6. [DONE] Git Commit: `fix: finalize product part order plans in main workspace` (hash: 30d546a80)

### Stream: Cluster Wave Guard

7. [DONE] `product-part-lane-closeout.phase3.handler.task1` Remove Product Part acceptance-side cluster wave bootstrap dispatch and update its focused handler test (scope: `packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.ts, packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.test.ts`; expected commit: `fix: block cluster wave bootstrap after product part acceptance`).
8. [DONE] Git Commit: `fix: block cluster wave bootstrap after product part acceptance` (hash: ea3177cbc)

## Phase 4 - Documentation Alignment (owner: Codex, updated: 2026-06-14)

### Stream: Runtime Contract Docs

9. [DONE] `product-part-lane-closeout.phase4.docs.task1` Document the accepted Product Part lane closeout runtime in the canonical workflow docs (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: document product part lane closeout runtime`).
10. [DONE] Git Commit: `docs: document product part lane closeout runtime` (hash: 66c0ef10b)

## Phase 5 - Tooling Verification (owner: Codex, updated: 2026-06-14)

### Stream: Targeted Verification

11. [DONE] `product-part-lane-closeout.phase5.verify.task1` Run targeted Product Part lane closeout tests and the affected core build (scope: commands only; expected commit: none). Result: targeted Product Part tests passed; `npm run build --workspace @codeai-hub/core` exposed stale `developmentTreeAgentGateway` injection in `session-request-handler-managed-review-decisions.ts`.

### Stream: Compile Repair

12. [DONE] `product-part-lane-closeout.phase5.compile-repair.task1` Remove the stale Product Part managed review handler gateway injection found by the core build (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts`; expected commit: `fix: remove product part cluster gateway injection`).
13. [PENDING] Git Commit: `fix: remove product part cluster gateway injection` (hash: TBD)

## Phase 6 - Release Build (owner: Codex, updated: 2026-06-14)

### Stream: Release Notes

14. [TODO] `product-part-lane-closeout.phase6.release-docs.task1` Update README and CHANGELOG for the next release version before building release artifacts (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.513`).
15. [TODO] Git Commit: `docs: prepare release 1.2.513` (hash: TBD)

### Stream: Release Assembly

16. [TODO] `product-part-lane-closeout.phase6.release-build.task1` Run release assembly and record generated release artifacts/version changes (scope: `package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.513`).
17. [TODO] Git Commit: `chore: build release 1.2.513` (hash: TBD)

## Phase 7 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-14)

### Stream: User Retest

18. [TODO] `product-part-lane-closeout.phase7.acceptance.task1` User installs the new release and retests Product Part order-plan acceptance: no cluster sessions start, accepted Product Part artifacts are in main, and Product Part worktree folders are removed (scope: user workflow; expected commit: none).

## Phase 8 - Scope Closeout (owner: Codex, updated: 2026-06-14)

### Stream: Closeout

19. [TODO] `product-part-lane-closeout.phase8.closeout.anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user accepts the release and asks to close this scope.
