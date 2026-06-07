# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-product-part-review-lifecycle-2026-06-07",
  "branch": "main",
  "baseHead": "e6cd05104",
  "lastRecordedCommit": "766827923",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "development-tree-product-part-review.phase21.release-state.task1",
  "expectedCommitMessage": "docs: checkpoint 1.2.464 release build state",
  "debt": {
    "expectedCommitMessage": "docs: checkpoint 1.2.464 release build state",
    "preCommitHead": "766827923",
    "stage": "commit_pending",
    "taskId": "development-tree-product-part-review.phase21.release-state.task1"
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
6. [DONE] Git Commit: `feat: open product part user return after brief acceptance` (hash: 8715a63d6)

## Phase 3 - Documentation Sync (owner: Codex, updated: 2026-06-07)

### Stream: SSOT Update

7. [DONE] `development-tree-product-part-review.phase3.docs.task1` Document Product Part review lifecycle and current lead/non-lead boundary before Development Order Plan implementation (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit: `docs: describe product part review lifecycle`).
8. [DONE] Git Commit: `docs: describe product part review lifecycle` (hash: f796e3b6a)

## Phase 4 - Tooling Verification (owner: Codex, updated: 2026-06-07)

### Stream: Targeted Verification

9. [DONE] `development-tree-product-part-review.phase4.verify.task1` Run targeted tests for Product Part review lifecycle and relevant Core handlers (scope: `packages/core`; expected commit: `test: verify product part review lifecycle`).
10. [DONE] Git Commit: `test: verify product part review lifecycle` (hash: 6795e1d39)

## Phase 5 - Release Build (owner: Codex, updated: 2026-06-07)

### Stream: Release Preparation

11. [DONE] `development-tree-product-part-review.phase5.release-plan.task1` Add release build streams after explicit user request and keep user retest after VSIX delivery (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.460 release build scope`).
12. [DONE] Git Commit: `docs: prepare 1.2.460 release build scope` (hash: 12009e918)

### Stream: Release Notes

13. [DONE] `development-tree-product-part-review.phase5.release-notes.task1` Update release notes for future version `1.2.460` before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.460 release notes`).
14. [DONE] Git Commit: `docs: prepare 1.2.460 release notes` (hash: 05f240ee1)

### Stream: Unified Artifacts

15. [DONE] `development-tree-product-part-review.phase5.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare 1.2.460 unified release artifacts`).
16. [DONE] Git Commit: `build: prepare 1.2.460 unified release artifacts` (hash: 2652de01b)

### Stream: VSIX Packaging

17. [DONE] `development-tree-product-part-review.phase5.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-1.2.460.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package 1.2.460 vsix release`).
18. [DONE] Git Commit: `build: package 1.2.460 vsix release` (hash: 4c8b2641a)

## Phase 6 - Development Tree Clear/Undo Planning Sync (owner: Codex, updated: 2026-06-07)

### Stream: Git-First Clear/Undo Model

19. [DONE] `development-tree-product-part-review.phase6.clear-undo-docs.task1` Document the Git-first Development Tree Clear/Undo and refactoring model in the active planning source (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: document development tree git-first clear undo model`).
20. [DONE] Git Commit: `docs: document development tree git-first clear undo model` (hash: e3be8afdc)

## Phase 7 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-07)

### Stream: FinderWidget Retest

21. [DONE] `development-tree-product-part-review.phase7.user.task1` User installs release `1.2.460` and retests `latest-note-search` and `widget-display` Product Part sessions: revision messages continue agent work, acceptance transitions to return/revision state (scope: user workflow; expected commit: none). Result: 1.2.460 retest passed; scope continues with Product Part Clear/Undo MVP by user request

## Phase 8 - Product Part Clear/Undo MVP (owner: Codex, updated: 2026-06-07)

### Stream: Core Clear And Auto-Restart

22. [DONE] `development-tree-product-part-review.phase8.clear-core.task1` Implement Product Part root-node Clear/Undo so Core deletes the old Product Part session state, removes its Product Part todo-plan/drafts, and immediately recreates the Product Part plan/session from current Development Tree truth (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear*.ts, packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit: `feat: clear and restart product part agent sessions`).
23. [DONE] Git Commit: `feat: clear and restart product part agent sessions` (hash: ec8da212b)

### Stream: Project Manager Clear Feedback

24. [DONE] `development-tree-product-part-review.phase8.clear-ui.task1` Surface Product Part clear/restart response details in the Project Manager clear event contract so retest can confirm deleted sessions and replaced Product Part todo-plans (scope: `src/client/project-manager/services/workflow-step-clear-client.ts, src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx, src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`; expected commit: `feat: expose product part clear restart feedback`).
25. [DONE] Git Commit: `feat: expose product part clear restart feedback` (hash: b5256625f)

### Stream: Documentation Sync

26. [DONE] `development-tree-product-part-review.phase8.clear-docs.task1` Document the Product Part Clear/Undo MVP boundary and visible retest contract (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe product part clear restart mvp`).
27. [DONE] Git Commit: `docs: describe product part clear restart mvp` (hash: 13d97a76d)

## Phase 9 - Tooling Verification (owner: Codex, updated: 2026-06-07)

### Stream: Targeted Verification

28. [DONE] `development-tree-product-part-review.phase9.verify.task1` Run targeted Core and Project Manager tests for Product Part Clear/Undo restart behavior (scope: `packages/core, src/client/project-manager`; expected commit: `test: verify product part clear restart`).
29. [DONE] Git Commit: `test: verify product part clear restart` (hash: 7d08bbe6f)

## Phase 10 - Release Build (owner: Codex, updated: 2026-06-07)

### Stream: Release Notes

30. [DONE] `development-tree-product-part-review.phase10.release-notes.task1` Update release notes for future version `1.2.461` before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.461 release notes`).
31. [DONE] Git Commit: `docs: prepare 1.2.461 release notes` (hash: 843edd247)

### Stream: Unified Artifacts

32. [DONE] `development-tree-product-part-review.phase10.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for `1.2.461` (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare 1.2.461 unified release artifacts`).
33. [DONE] Git Commit: `build: prepare 1.2.461 unified release artifacts` (hash: 5530fde36)

### Stream: VSIX Packaging

34. [DONE] `development-tree-product-part-review.phase10.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output for `1.2.461` (scope: `codeai-hub-1.2.461.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package 1.2.461 vsix release`).
35. [DONE] Git Commit: `build: package 1.2.461 vsix release` (hash: 223ba2db0)

## Phase 11 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-07)

### Stream: FinderWidget Clear/Undo Retest

36. [DONE] `development-tree-product-part-review.phase11.user.task1` User installs release `1.2.461` and retests Clear/Undo on `latest-note-search` and `widget-display`: old Product Part sessions and todo-plans disappear, new Product Part sessions and fresh todo-plans are recreated automatically (scope: user workflow; expected commit: none). Result: retest found that clearing `widget-display` also restarted sibling Product Part `latest-note-search`, causing concurrent Codex provider turns and an OAuth refresh-token race.

## Phase 13 - Product Part Clear/Undo Scoped Restart Hotfix (owner: Codex, updated: 2026-06-07)

### Stream: Target Part Restart Only

39. [DONE] `development-tree-product-part-review.phase13.hotfix-api.task1` Add a targeted Product Part bootstrap filter to the Core Development Tree bootstrap API, without changing existing full bootstrap callers (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.ts, packages/core/src/remote-bridge/handlers/development-tree-product-part-agent-bootstrap.ts, doc/TODO/todo-plan.md`; expected commit: `feat: add targeted product part bootstrap filter`).
40. [DONE] Git Commit: `feat: add targeted product part bootstrap filter` (hash: 760a50db0)
41. [DONE] `development-tree-product-part-review.phase13.hotfix-clear.task1` Restrict Product Part Clear/Undo restart to the selected Product Part only and cover the multi-Product-Part regression (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: scope product part clear restart to target part`).
42. [DONE] Git Commit: `fix: scope product part clear restart to target part` (hash: bf1a5a135)

## Phase 14 - Tooling Verification (owner: Codex, updated: 2026-06-07)

### Stream: Targeted Verification

43. [DONE] `development-tree-product-part-review.phase14.verify.task1` Run targeted Core tests for Product Part Clear/Undo scoped restart behavior and confirm only the cleared Product Part is recreated (scope: `packages/core`; expected commit: `test: verify scoped product part clear restart`).
44. [DONE] Git Commit: `test: verify scoped product part clear restart` (hash: 548138aa9)

## Phase 15 - Release Build (owner: Codex, updated: 2026-06-07)

### Stream: Release Notes

45. [DONE] `development-tree-product-part-review.phase15.release-notes.task1` Update release notes for future version `1.2.462` before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.462 release notes`).
46. [DONE] Git Commit: `docs: prepare 1.2.462 release notes` (hash: 5f35e9660)

### Stream: Unified Artifacts

47. [DONE] `development-tree-product-part-review.phase15.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for `1.2.462` (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare 1.2.462 unified release artifacts`).
48. [DONE] Git Commit: `build: prepare 1.2.462 unified release artifacts` (hash: 4ee9d42ae)

### Stream: VSIX Packaging

49. [DONE] `development-tree-product-part-review.phase15.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output for `1.2.462` (scope: `codeai-hub-1.2.462.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package 1.2.462 vsix release`).
50. [DONE] Git Commit: `build: package 1.2.462 vsix release` (hash: 335f83cf7)

## Phase 16 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-07)

### Stream: FinderWidget Scoped Clear/Undo Retest

51. [DONE] `development-tree-product-part-review.phase16.user.task1` User installs release `1.2.462` and retests Clear/Undo on `widget-display` and `latest-note-search`: only the selected Product Part session/todo-plan is deleted and recreated, siblings are not restarted, and no concurrent provider auth refresh is triggered by Clear/Undo (scope: user workflow; expected commit: none). Result: scoped restart worked per Product Part timestamps, but the Codex provider home was already left with a stale/reused refresh token and every new Codex turn now fails before native session start.

## Phase 17 - Codex Provider Auth Race Hotfix (owner: Codex, updated: 2026-06-07)

### Stream: Provider Turn Serialization

52. [DONE] `development-tree-product-part-review.phase17.codex-queue.task1` Serialize Codex provider operations that can touch the shared `CODEX_HOME` auth state so multiple Product Part sessions cannot trigger concurrent refresh-token use (scope: `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts, packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: serialize codex provider turns`).
53. [DONE] Git Commit: `fix: serialize codex provider turns` (hash: 5c8ab47bc)
54. [DONE] `development-tree-product-part-review.phase17.codex-queue.task2` Run targeted Codex provider adapter verification for serialized create/resume/send/usage-limit operations (scope: `packages/Codex_AppServer_Module`; expected commit: `test: verify codex provider operation serialization`).
55. [DONE] Git Commit: `test: verify codex provider operation serialization` (hash: e547c086a)

## Phase 18 - Release Build (owner: Codex, updated: 2026-06-07)

### Stream: Release After Confirmation

56. [DONE] `development-tree-product-part-review.phase18.release-notes.task1` Prepare release notes for future version `1.2.463` before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.463 release notes`).
57. [DONE] Git Commit: `docs: prepare 1.2.463 release notes` (hash: 9e9d55bba)
58. [DONE] `development-tree-product-part-review.phase18.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for `1.2.463` (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare 1.2.463 unified release artifacts`).
59. [DONE] Git Commit: `build: prepare 1.2.463 unified release artifacts` (hash: f35034b42)
60. [DONE] `development-tree-product-part-review.phase18.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output for `1.2.463` (scope: `codeai-hub-1.2.463.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package 1.2.463 vsix release`).
61. [DONE] Git Commit: `build: package 1.2.463 vsix release` (hash: 6f33dbfd2)

## Phase 19 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-07)

### Stream: FinderWidget Codex Reauth Retest

62. [DONE] `development-tree-product-part-review.phase19.user.task1` User installs release `1.2.463`, performs one Codex provider sign-out/sign-in if the workspace already has the reused refresh-token error, then retests Product Part Clear/Undo for `widget-display` and `latest-note-search`: sessions and todo-plans are recreated, and Codex provider turns proceed without recreating a Core-side refresh-token race (scope: user workflow; expected commit: none). Result: functional retest passed; Git hygiene failed because provider/unified runtime files remain tracked and dirty after session recreation.

## Phase 20 - Workspace Runtime Git Hygiene Hotfix (owner: Codex, updated: 2026-06-07)

### Stream: Runtime Local-Only Contract

63. [DONE] `development-tree-product-part-review.phase20.runtime-gitignore.task1` Change generated workspace Git ignore contracts so `.codeai-hub/<workspace>/runtime/` is local-only runtime state, not product Git truth (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.ts, packages/core/src/remote-bridge/handlers/application-skeleton-output-hygiene.ts`; expected commit: `fix: ignore workspace runtime capsules`).
64. [DONE] Git Commit: `fix: ignore workspace runtime capsules` (hash: 59b308021)
65. [DONE] `development-tree-product-part-review.phase20.runtime-cleanup.task1` Update managed commit/clean boundaries to untrack already tracked workspace runtime files and stop classifying runtime provider/session logs as committable residue (scope: `packages/core/src/workflow/runtime/workspace-settings-rollback-ignore.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts`; expected commit: `fix: untrack workspace runtime during managed commits`).
66. [DONE] Git Commit: `fix: untrack workspace runtime during managed commits` (hash: 735bdb5ea)
67. [DONE] `development-tree-product-part-review.phase20.runtime-clean-boundary.task1` Update managed terminal clean boundary so already tracked workspace runtime residue is removed from the Git index instead of being silently tolerated (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts`; expected commit: `fix: clean tracked workspace runtime residue`).
68. [DONE] Git Commit: `fix: clean tracked workspace runtime residue` (hash: 312a70531)
69. [DONE] `development-tree-product-part-review.phase20.runtime-clean-boundary-deletions.task1` Include workspace runtime index cleanup paths in the managed residue commit so removing previously tracked runtime files leaves Git clean (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts`; expected commit: `fix: commit workspace runtime index cleanup`).
70. [DONE] Git Commit: `fix: commit workspace runtime index cleanup` (hash: e55f6013f)
71. [DONE] `development-tree-product-part-review.phase20.runtime-clean-boundary-anchor.task1` Commit staged runtime index cleanup through a safe `.gitignore` anchor so ignored runtime files are not passed back to `git add` (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts`; expected commit: `fix: commit ignored runtime cleanup through gitignore anchor`).
72. [DONE] Git Commit: `fix: commit ignored runtime cleanup through gitignore anchor` (hash: cbfc10423)
73. [DONE] `development-tree-product-part-review.phase20.runtime-tests.task1` Update focused runtime Git hygiene tests for generated `.gitignore`, step commit cleanup, and managed terminal dirty classification (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts`; expected commit: `test: verify workspace runtime stays local only`).
74. [DONE] Git Commit: `test: verify workspace runtime stays local only` (hash: ab608c465)
75. [DONE] `development-tree-product-part-review.phase20.runtime-docs.task1` Sync SSOT docs with the Git-first rule: tracked workflow/product artifacts are rollback truth; workspace runtime is local execution residue recreated from tracked truth (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`; expected commit: `docs: clarify local runtime rollback boundary`).
76. [DONE] Git Commit: `docs: clarify local runtime rollback boundary` (hash: b5035eed5)

## Phase 21 - Release Build (owner: Codex, updated: 2026-06-07)

### Stream: Release After Confirmation

77. [DONE] `development-tree-product-part-review.phase21.release-notes.task1` Prepare release notes for future version `1.2.464` before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.464 release notes`).
78. [DONE] Git Commit: `docs: prepare 1.2.464 release notes` (hash: 766827923)
79. [DONE] `development-tree-product-part-review.phase21.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint 1.2.464 release build state`).
80. [PENDING] Git Commit: `docs: checkpoint 1.2.464 release build state` (hash: TBD)
81. [TODO] `development-tree-product-part-review.phase21.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for `1.2.464` (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare 1.2.464 unified release artifacts`).
82. [TODO] Git Commit: `build: prepare 1.2.464 unified release artifacts` (hash: TBD)
83. [TODO] `development-tree-product-part-review.phase21.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output for `1.2.464` (scope: `codeai-hub-1.2.464.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package 1.2.464 vsix release`).
84. [TODO] Git Commit: `build: package 1.2.464 vsix release` (hash: TBD)

## Phase 22 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-07)

### Stream: Runtime Git Hygiene Retest

85. [TODO] `development-tree-product-part-review.phase22.user.task1` User installs release `1.2.464` and retests from a fresh Description flow plus Product Part Clear/Undo: Git stays clean after generated sessions/runtime are recreated, and tracked workflow/product artifacts still roll back through Git (scope: user workflow; expected commit: none).

## Phase 12 - Scope Closeout (owner: Codex, updated: 2026-06-07)

### Stream: Closeout After Acceptance

86. [TODO] `development-tree-product-part-review.phase12.closeout.task1` After explicit user acceptance, archive this plan and decide disposition for the active planning source (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`; expected commit: `docs: close development tree product part review lifecycle scope`).
87. [TODO] Git Commit: `docs: close development tree product part review lifecycle scope` (hash: TBD)
