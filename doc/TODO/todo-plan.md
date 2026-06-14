# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-main-workspace-documentation-mode-2026-06-14",
  "branch": "main",
  "baseHead": "4b16eed4e",
  "lastRecordedCommit": "8b584015d",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_MainWorkspaceDocumentationMode_ImplementationPlan.md",
  "currentTaskId": "devtree-main-doc-mode.phase7.product-part-parallel-start.task1",
  "expectedCommitMessage": "fix: start product part agents concurrently",
  "debt": {
    "expectedCommitMessage": "fix: start product part agents concurrently",
    "preCommitHead": "8b584015d",
    "stage": "commit_pending",
    "taskId": "devtree-main-doc-mode.phase7.product-part-parallel-start.task1"
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
16. [DONE] Git Commit: `fix: allow product part documentation dirt before skeleton` (hash: 3176baea3)

## Phase 7B - Release Rebuild (owner: Codex, updated: 2026-06-14)

### Stream: Release Notes

17. [DONE] `devtree-main-doc-mode.phase7.release-docs.task1` Update README and CHANGELOG for release `1.2.515` before rebuilding release artifacts (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.515`).
18. [DONE] Git Commit: `docs: prepare release 1.2.515` (hash: 329730cd1)

### Stream: Development Tree Locked Label

19. [DONE] `devtree-main-doc-mode.phase7.lock-label.task1` Point the locked Development Tree placeholder at `Diagram Modules` while that prerequisite is still missing (scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`; expected commit: `fix: correct development tree lock prerequisite`).
20. [DONE] Git Commit: `fix: correct development tree lock prerequisite` (hash: 1e65a3997)

### Stream: Release Notes Refresh

21. [DONE] `devtree-main-doc-mode.phase7.release-notes-refresh.task1` Add the Development Tree locked-label fix to the `1.2.515` release notes (scope: `README.md, CHANGELOG.md`; expected commit: `docs: refresh release 1.2.515 notes`).
22. [DONE] Git Commit: `docs: refresh release 1.2.515 notes` (hash: fcc79b2d7)

### Stream: Release Assembly

23. [DONE] `devtree-main-doc-mode.phase7.release-build.task1` Run release assembly and record generated release artifacts/version changes (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.515`).
24. [DONE] Git Commit: `chore: build release 1.2.515` (hash: eebbd3edb)

## Phase 7C - User Workflow Acceptance Testing (owner: user, updated: 2026-06-14)

### Stream: User Retest

25. [BLOCKED] `devtree-main-doc-mode.phase7.acceptance-1-2-515.task1` User installs release `1.2.515` and retests Product Part documentation bootstrap plus Application Skeleton start with dirty Product Part docs present and the Development Tree lock placeholder before Diagram Modules acceptance (scope: user workflow; expected commit: none). Result: Application Skeleton can start, but Project Manager does not auto-open the active Product Part user-gate session; the currently open Application Skeleton dialog shows the queued-gate lock and no `Подтверждаю` button.

## Phase 7D - Acceptance Defect Fix (owner: Codex, updated: 2026-06-14)

### Stream: Development Tree User Gate Focus

26. [DONE] `devtree-main-doc-mode.phase7.user-gate-focus.task1` Auto-open the active Development Tree user-gate session from Core `userGateCursor.activeUserGate.session` after selecting the highlighted node (scope: `src/client/project-manager/components/layout/workspace-tree-user-gate-focus.ts, src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/workflow-navigation.test.ts`; expected commit: `fix: open active development tree user gate session`).
27. [DONE] Git Commit: `fix: open active development tree user gate session` (hash: 8b37342b2)

## Phase 7E - Release Decision (owner: user, updated: 2026-06-14)

### Stream: Release Confirmation

28. [DONE] `devtree-main-doc-mode.phase7.release-decision-1-2-516.task1` User confirms whether to build release `1.2.516` for retesting the active Product Part user-gate auto-open fix (scope: user workflow; expected commit: none). Result: User confirmed release 1.2.516 build.

## Phase 7F - Release Rebuild (owner: Codex, updated: 2026-06-14)

### Stream: Release Notes

29. [DONE] `devtree-main-doc-mode.phase7.release-docs-1-2-516.task1` Update README and CHANGELOG for release `1.2.516` before rebuilding release artifacts (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.516`).
30. [DONE] Git Commit: `docs: prepare release 1.2.516` (hash: a9178d88d)

### Stream: Release Assembly

31. [DONE] `devtree-main-doc-mode.phase7.release-build-1-2-516.task1` Run release assembly and record generated release artifacts/version changes (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.516`).
32. [DONE] Git Commit: `chore: build release 1.2.516` (hash: c49c29f8e)

## Phase 7G - User Workflow Acceptance Testing (owner: user, updated: 2026-06-14)

### Stream: User Retest

33. [BLOCKED] `devtree-main-doc-mode.phase7.acceptance-1-2-516.task1` User installs release `1.2.516` and retests Application Skeleton running while a Product Part user gate becomes active; Project Manager should switch to the active Product Part session and show `Подтверждаю` there (scope: user workflow; expected commit: none). Result: active Product Part gate is highlighted, but Project Manager can remain on Application Skeleton after the same gate was already focused once.

## Phase 7H - Acceptance Defect Fix (owner: Codex, updated: 2026-06-14)

### Stream: Development Tree User Gate Refocus

34. [DONE] `devtree-main-doc-mode.phase7.user-gate-refocus.task1` Refocus the active Development Tree user gate when another node is currently selected, and make the dialog intent target the exact Core dialog/session ids (scope: `src/client/project-manager/components/layout/workspace-tree-user-gate-focus.ts, src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/workflow-navigation.test.ts`; expected commit: `fix: refocus active development tree user gate`).
35. [DONE] Git Commit: `fix: refocus active development tree user gate` (hash: 73b6e1702)

## Phase 7I - Release Decision (owner: user, updated: 2026-06-14)

### Stream: Release Confirmation

36. [DONE] `devtree-main-doc-mode.phase7.release-decision-1-2-517.task1` User confirms whether to build release `1.2.517` for retesting the active Product Part user-gate refocus fix (scope: user workflow; expected commit: none). Result: User confirmed release 1.2.517 build.

## Phase 7J - Release Rebuild (owner: Codex, updated: 2026-06-14)

### Stream: Release Notes

37. [DONE] `devtree-main-doc-mode.phase7.release-docs-1-2-517.task1` Update README and CHANGELOG for release `1.2.517` before rebuilding release artifacts (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.517`).
38. [DONE] Git Commit: `docs: prepare release 1.2.517` (hash: da0cac14d)

### Stream: Release Assembly

39. [DONE] `devtree-main-doc-mode.phase7.release-build-1-2-517.task1` Run release assembly and record generated release artifacts/version changes (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.517`).
40. [DONE] Git Commit: `chore: build release 1.2.517` (hash: c1db9dfdc)

## Phase 7K - User Workflow Acceptance Testing (owner: user, updated: 2026-06-14)

### Stream: User Retest

41. [BLOCKED] `devtree-main-doc-mode.phase7.acceptance-1-2-517.task1` User installs release `1.2.517` and retests Application Skeleton running while a Product Part user gate becomes active; Project Manager should switch to the active Product Part session and show `Подтверждаю` there (scope: user workflow; expected commit: none). Result: focus now returns too aggressively after manual navigation and can open a Product Part branch with no visible session history; Product Part bootstrap still starts Product Part agents serially.

## Phase 7L - Acceptance Defect Fix (owner: Codex, updated: 2026-06-14)

### Stream: One-Shot Gate Focus

42. [DONE] `devtree-main-doc-mode.phase7.user-gate-focus-one-shot.task1` Restore active Development Tree user-gate focus to one automatic switch per gate identity, without refocusing after the user manually selects another node (scope: `src/client/project-manager/components/layout/workspace-tree-user-gate-focus.ts, src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/workflow-navigation.test.ts`; expected commit: `fix: make development tree gate focus one-shot`).
43. [DONE] Git Commit: `fix: make development tree gate focus one-shot` (hash: 8b584015d)

### Stream: Product Part Agent Startup

44. [DONE] `devtree-main-doc-mode.phase7.product-part-parallel-start.task1` Start Product Part documentation agents concurrently after shared Development Tree materialization, and update the Diagram Modules acceptance regression (scope: `packages/core/src/remote-bridge/handlers/development-tree-product-part-precode-bootstrap.ts, packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts`; expected commit: `fix: start product part agents concurrently`).
45. [PENDING] Git Commit: `fix: start product part agents concurrently` (hash: TBD)

## Phase 8 - Scope Closeout (owner: Codex, updated: 2026-06-14)

### Stream: Closeout

46. [TODO] `devtree-main-doc-mode.phase8.closeout.anchor` Reserved post-acceptance closeout anchor; do not execute automatically unless the user accepts the release and asks to close this scope.
