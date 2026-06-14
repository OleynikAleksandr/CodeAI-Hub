# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-main-workspace-documentation-mode-2026-06-14",
  "branch": "main",
  "baseHead": "4b16eed4e",
  "lastRecordedCommit": "0df40b4ff",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_MainWorkspaceDocumentationMode_ImplementationPlan.md",
  "currentTaskId": "devtree-main-doc-mode.phase7.dirty-gate.task1",
  "expectedCommitMessage": "fix: allow product part documentation dirt before skeleton",
  "debt": {
    "expectedCommitMessage": "fix: allow product part documentation dirt before skeleton",
    "preCommitHead": "0df40b4ff",
    "stage": "commit_pending",
    "taskId": "devtree-main-doc-mode.phase7.dirty-gate.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_MainWorkspaceDocumentationMode_ImplementationPlan.md`
- **Read this context before implementation:**
  - `doc/TODO/todo-plan.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartLaneCloseout_ImplementationPlan.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_MainWorkspaceDocumentationMode_ImplementationPlan.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

## Execution Rules

- Scope is Product Part documentation bootstrap after accepted `Diagram Modules`.
- Do not implement Cluster/Module documentation sessions in this cycle.
- Do not implement code-stage persistent worktrees in this cycle.
- Each implementation task changes at most 3 source/doc files.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks.
- Final release build is explicitly requested by the user in this cycle.

## Phase 1 - Operational Planning (owner: Codex, updated: 2026-06-14)

### Stream: Planning Source And Todo Slice

1. [DONE] `devtree-main-doc-mode.phase1.plan.task1` Create the operational planning document and active implementation todo slice (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_MainWorkspaceDocumentationMode_ImplementationPlan.md`; expected commit: `docs: plan main workspace product part documentation mode`).
2. [DONE] Git Commit: `docs: plan main workspace product part documentation mode` (hash: ed65561aa)

## Phase 2 - Product Part Documentation Bootstrap (owner: Codex, updated: 2026-06-14)

### Stream: Main Workspace Bootstrap

3. [DONE] `devtree-main-doc-mode.phase2.bootstrap.task1` Refactor Product Part documentation bootstrap to use the main workspace instead of Product Part pre-code worktrees, and update the Diagram Modules acceptance regression test (scope: `packages/core/src/remote-bridge/handlers/development-tree-product-part-precode-bootstrap.ts, packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts`; expected commit: `fix: start product part documentation sessions in main workspace`).
4. [DONE] Git Commit: `fix: start product part documentation sessions in main workspace` (hash: 1cf21e1f8)

## Phase 3 - Product Part Acceptance Checkpoint (owner: Codex, updated: 2026-06-14)

### Stream: Main Workspace Acceptance

5. [DONE] `devtree-main-doc-mode.phase3.checkpoint.task1` Make Product Part accepted-brief/order-plan checkpoint helpers no-op when the Product Part session already runs in main, and update focused Product Part controller tests if needed (scope: `packages/core/src/remote-bridge/handlers/product-part-brief-lane-checkpoint.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`; expected commit: `fix: skip product part lane checkpoints in main workspace`).
6. [DONE] Git Commit: `fix: skip product part lane checkpoints in main workspace` (hash: 01e7e13d1)

## Phase 4 - Documentation Alignment (owner: Codex, updated: 2026-06-14)

### Stream: Runtime Contract Docs

7. [DONE] `devtree-main-doc-mode.phase4.docs.task1` Update canonical workflow docs and docs index for Product Part documentation mode in main workspace (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document main workspace product part documentation mode`).
8. [DONE] Git Commit: `docs: document main workspace product part documentation mode` (hash: 7863ef23b)

## Phase 5 - Tooling Verification (owner: Codex, updated: 2026-06-14)

### Stream: Targeted Verification

9. [DONE] `devtree-main-doc-mode.phase5.verify.task1` Run targeted Product Part documentation-mode tests and the affected core build (scope: commands only; expected commit: none). Result: verification passed: diagram review bootstrap test, product part review/order-plan test, npm run build --workspace packages/core

## Phase 6 - Release Build (owner: Codex, updated: 2026-06-14)

### Stream: Release Notes

10. [DONE] `devtree-main-doc-mode.phase6.release-docs.task1` Update README and CHANGELOG for release `1.2.514` before building release artifacts (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.514`).
11. [DONE] Git Commit: `docs: prepare release 1.2.514` (hash: f2182bbfc)

### Stream: Release Assembly

12. [DONE] `devtree-main-doc-mode.phase6.release-build.task1` Run release assembly and record generated release artifacts/version changes (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.514`).
13. [DONE] Git Commit: `chore: build release 1.2.514` (hash: 0df40b4ff)

## Phase 7 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-14)

### Stream: User Retest

14. [BLOCKED] `devtree-main-doc-mode.phase7.acceptance.task1` User installs release `1.2.514` and retests Product Part documentation bootstrap: sessions/artifacts in main workspace, no Product Part pre-code worktrees, lead order-plan barrier still works, no Cluster/Module sessions start (scope: user workflow; expected commit: none). Result: Application Skeleton start was blocked by dirty Product Part documentation files in the main workspace.

## Phase 7A - Acceptance Defect Fix (owner: Codex, updated: 2026-06-14)

### Stream: Product Part Dirty Gate

15. [DONE] `devtree-main-doc-mode.phase7.dirty-gate.task1` Allow technical trunk dirty-gating to ignore main-workspace Product Part documentation paths while Product Part sessions are active (scope: `packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.ts, packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts`; expected commit: `fix: allow product part documentation dirt before skeleton`).
16. [PENDING] Git Commit: `fix: allow product part documentation dirt before skeleton` (hash: TBD)

## Phase 7B - Release Rebuild (owner: Codex, updated: 2026-06-14)

### Stream: Release Notes

17. [TODO] `devtree-main-doc-mode.phase7.release-docs.task1` Update README and CHANGELOG for release `1.2.515` before rebuilding release artifacts (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.515`).
18. [TODO] Git Commit: `docs: prepare release 1.2.515` (hash: TBD)

### Stream: Release Assembly

19. [TODO] `devtree-main-doc-mode.phase7.release-build.task1` Run release assembly and record generated release artifacts/version changes (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.515`).
20. [TODO] Git Commit: `chore: build release 1.2.515` (hash: TBD)

## Phase 7C - User Workflow Acceptance Testing (owner: user, updated: 2026-06-14)

### Stream: User Retest

21. [TODO] `devtree-main-doc-mode.phase7.acceptance-1-2-515.task1` User installs release `1.2.515` and retests Product Part documentation bootstrap plus Application Skeleton start with dirty Product Part docs present (scope: user workflow; expected commit: none).

## Phase 8 - Scope Closeout (owner: Codex, updated: 2026-06-14)

### Stream: Closeout

22. [TODO] `devtree-main-doc-mode.phase8.closeout.anchor` Reserved post-acceptance closeout anchor; do not execute automatically unless the user accepts the release and asks to close this scope.
