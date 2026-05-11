# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-managed-orchestration",
  "branch": "main",
  "baseHead": "131e22079",
  "lastRecordedCommit": "1b31b8155",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Architecture.md",
  "currentTaskId": "application-skeleton.phase9a.restart-regression.task1",
  "expectedCommitMessage": "test: cover application skeleton restart gate recovery",
  "debt": {
    "expectedCommitMessage": "test: cover application skeleton restart gate recovery",
    "preCommitHead": "1b31b8155",
    "stage": "commit_pending",
    "taskId": "application-skeleton.phase9a.restart-regression.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/README.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Scenario.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Step_Orchestration_Diagram_Modules_Scenario_1.2.229.md`
- Only this Context Pack is the recovery source for the current implementation cycle.

## Execution Rules

- This scope implements the managed `Application Skeleton` orchestration using the accepted `Diagram Modules` release `1.2.229` behavior as the precedent.
- The generated Application Skeleton child plan must grow dynamically from runtime decisions. Core must not pre-seed a static Phase 1 / 2 / 3 / 4 block at stage bootstrap.
- Every provider-visible Core correction, repair, retry, user review revision, acceptance command, materialization attempt, and post-completion user-return turn must be represented in the Application Skeleton child plan before Core sends feedback to the agent or records the Core command.
- Every executable microtask in the generated child plan must have the next separate `Git Commit: ...` item. A phase that accepts user interaction must never appear without a paired commit task for the next possible revision.
- If Core rejects the agent output, the attempt must still be committed. If there is no valid artifact diff to accept, Core writes tracked attempt evidence and commits that evidence.
- User acceptance is a Core command. Core must commit acceptance state first, and only then inject/send the materialization microtask.
- Post-completion Application Skeleton Phase 4 is a user-return revision loop, not a handoff anchor. Quality Gates handoff is a separate workspace-ledger transition after materialization acceptance.
- Keep every implementation microtask at three files or fewer. If a task needs broader edits, split it before changing code.
- Do not run release build scripts in this scope without a separate explicit release-build confirmation.

## Phase 0 - Scope Activation (owner: Codex, updated: 2026-05-11)

### Stream: Implementation Plan

1. [DONE] `application-skeleton.phase0.plan.task1` Open this active implementation plan for the accepted Application Skeleton orchestration scope, explicitly carrying forward the Diagram Modules lessons about dynamic child plans, mandatory commit-paired user turns, and Core rejection persistence. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan application skeleton managed orchestration`).
2. [DONE] Git Commit: `docs: plan application skeleton managed orchestration` (hash: 487ad0f93)

## Phase 1 - Dynamic Child Plan Shape (owner: Codex, updated: 2026-05-11)

### Stream: Runtime-Grown Application Skeleton Tasks

3. [DONE] `application-skeleton.phase1.seed.task1` Change Application Skeleton stage seeding so the generated child plan starts with only the draft-contract microtask and its paired commit, while future review, acceptance, materialization, and user-return tasks are injected dynamically. (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `fix: seed application skeleton dynamic child plan`).
4. [DONE] Git Commit: `fix: seed application skeleton dynamic child plan` (hash: 5c5d615c2)
5. [DONE] `application-skeleton.phase1.mutator.task1` Add a tested Application Skeleton child-plan mutator for `draft`, `review-revisionN`, `acceptance`, `materialize`, `repairN`, and `user-return revisionN` task pairs. (scope: `packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts, packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts, packages/core/src/managed-workspace/managed-todo-tree.ts`; expected commit: `feat: add application skeleton plan mutator`).
6. [DONE] Git Commit: `feat: add application skeleton plan mutator` (hash: 570f5bf3d)

## Phase 2 - Core Rejection And Attempt Persistence (owner: Codex, updated: 2026-05-11)

### Stream: Repair Task Injection Before Feedback

7. [DONE] `application-skeleton.phase2.evidence.task1` Add Application Skeleton repair-attempt evidence under `.codeai-hub/<workspace>/workflow/revisions/application-skeleton/attempts/` with target phase, validator diagnostics, attempt number, and outcome fields. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-repair-attempt-evidence.ts, packages/core/src/remote-bridge/handlers/application-skeleton-repair-attempt-evidence.test.ts`; expected commit: `feat: record application skeleton repair attempt evidence`).
8. [DONE] Git Commit: `feat: record application skeleton repair attempt evidence` (hash: b774bbef7)
9. [DONE] `application-skeleton.phase2.orchestration.task1` Integrate Application Skeleton repair orchestration into the post-turn path so Core injects the next repair task pair before provider-visible feedback. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-repair-orchestration.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `feat: orchestrate application skeleton repair attempts`).
10. [DONE] Git Commit: `feat: orchestrate application skeleton repair attempts` (hash: 59b5e19c3)
11. [DONE] `application-skeleton.phase2.commit-task1` Commit failed Application Skeleton attempts when the target artifact is still invalid by allowing tracked attempt evidence without marking the draft, revision, or materialization as accepted. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.application-skeleton-repair.test.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts`; expected commit: `feat: commit rejected application skeleton repair attempts`).
12. [DONE] Git Commit: `feat: commit rejected application skeleton repair attempts` (hash: cce18f6a4)

## Phase 3 - Review Acceptance And Materialization Boundary (owner: Codex, updated: 2026-05-11)

### Stream: Contract Review Revisions

13. [DONE] `application-skeleton.phase3.review-revisions.task1` Ensure user review messages before acceptance inject `review-revisionN` task pairs and commit changed Application Skeleton draft artifacts before the next review decision. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.ts, packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts`; expected commit: `feat: track application skeleton review revisions`).
14. [DONE] Git Commit: `feat: track application skeleton review revisions` (hash: f65bb2445)
15. [DONE] `application-skeleton.phase3.acceptance.task1` Make the Accept Contract command inject and commit explicit acceptance state before materialization can be requested. (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.test.ts`; expected commit: `fix: commit application skeleton acceptance before materialization`).
16. [DONE] Git Commit: `fix: commit application skeleton acceptance before materialization` (hash: e096efe5e)
17. [DONE] `application-skeleton.phase3.materialization-gate.task1` Gate the materialization continuation on completed acceptance commit evidence, then inject only the materialization microtask and its paired commit. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts`; expected commit: `fix: gate application skeleton materialization after acceptance commit`).
18. [DONE] Git Commit: `fix: gate application skeleton materialization after acceptance commit` (hash: a8f6a152c)
19. [DONE] `application-skeleton.phase3.materialization-shim.task1` Make the generated managed plan shim inject the Application Skeleton materialization task pair immediately after the acceptance commit. (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts`; expected commit: `fix: inject application skeleton materialization task after acceptance commit`).
20. [DONE] Git Commit: `fix: inject application skeleton materialization task after acceptance commit` (hash: 78ef8b06f)

## Phase 4 - Post-Completion User Return And Downstream Handoff (owner: Codex, updated: 2026-05-11)

### Stream: Open Revision Surface

19. [DONE] `application-skeleton.phase4.user-return.task1` Replace the reserved post-closeout anchor with a real post-completion user-return revision loop that injects `revisionN` task pairs after materialization acceptance. (scope: `packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `feat: keep application skeleton user return phase open`).
20. [DONE] Git Commit: `feat: keep application skeleton user return phase open` (hash: 203cdecc1)
21. [DONE] `application-skeleton.phase4.handoff.task1` Separate Quality Gates ledger handoff from the Application Skeleton user-return loop so Quality Gates can unlock while Application Skeleton remains revisable. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts, packages/core/src/managed-workspace/managed-todo-tree.ts`; expected commit: `fix: decouple application skeleton return loop from quality gates handoff`).
22. [DONE] Git Commit: `fix: decouple application skeleton return loop from quality gates handoff` (hash: 97dadca85)

## Phase 5 - Deterministic Regression Tests (owner: Codex, updated: 2026-05-11)

### Stream: Rejection And Revision Harness

23. [DONE] `application-skeleton.phase5.dynamic-seed-test.task1` Add regression coverage that Application Skeleton bootstrap does not create static future phases and that every injected phase with user interaction has an immediate paired commit task. (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts`; expected commit: `test: cover application skeleton dynamic plan seed`).
24. [DONE] Git Commit: `test: cover application skeleton dynamic plan seed` (hash: 01ac0989c)
25. [DONE] `application-skeleton.phase5.rejection-test.task1` Add a deterministic forced-rejection test: initialize a managed Application Skeleton workspace, make Core reject draft or materialization output, assert repair injection before feedback, then assert failed-attempt evidence is committed. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-repair-orchestration.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.application-skeleton-repair.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `test: cover application skeleton forced repair rejection`).
26. [DONE] Git Commit: `test: cover application skeleton forced repair rejection` (hash: 8734586be)
27. [DONE] `application-skeleton.phase5.user-return-test.task1` Add regression coverage for a post-materialization user request that updates Application Skeleton artifacts and produces a real child-plan revision task plus commit instead of dirty uncommitted state. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts`; expected commit: `test: cover application skeleton user return commits`).
28. [DONE] Git Commit: `test: cover application skeleton user return commits` (hash: 82fac908b)

## Phase 6 - Documentation And Tooling Verification (owner: Codex, updated: 2026-05-11)

### Stream: Scenario Documentation

29. [DONE] `application-skeleton.phase6.docs.task1` Update Application Skeleton planning docs and the docs index with the implemented dynamic orchestration, rejection, acceptance, materialization, and post-completion revision semantics. (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Architecture.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Scenario.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: finalize application skeleton orchestration scenario`).
30. [DONE] Git Commit: `docs: finalize application skeleton orchestration scenario` (hash: de977a95a)

### Stream: Targeted Verification

31. [DONE] `application-skeleton.phase6.verify.task1` Run targeted Application Skeleton managed-workflow tests, the core package build, and `npm run plan:validate`; record exact evidence and residual risks in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton orchestration verification`).
32. [DONE] Git Commit: `docs: record application skeleton orchestration verification` (hash: 10b53f626)

Verification evidence (2026-05-11):

- PASS: `npx tsx --test packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-repair-orchestration.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-repair-attempt-evidence.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-user-return-revision.test.ts packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.test.ts packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.application-skeleton-repair.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-contract-feedback.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts` — 80 tests passed.
- PASS: `npm run build --workspace packages/core`.
- PASS: `npm run plan:validate`.
- Residual risk: user must still verify the packaged VSIX in Project Manager against a real Application Skeleton workflow; this remains Phase 7 / Phase 9 acceptance.

## Phase 7 - User Workflow Acceptance Testing (owner: user, updated: 2026-05-11)

### Stream: Local Workflow Review

33. [TODO] `application-skeleton.phase7.acceptance.task1` User verifies the next release candidate in Project Manager: dynamic Application Skeleton plan, Core rejection repair loop, Accept Contract commit boundary, materialization commit, post-completion revision commit, and Quality Gates unlock. (scope: chat/process observation only; no commit required).

## Phase 8 - Release Build (owner: Codex, updated: 2026-05-11)

### Stream: Release Confirmation And Packaging

34. [DONE] `application-skeleton.phase8.release-docs.task1` After separate explicit release-build confirmation, determine the next release version and update release-facing docs before `build-all.sh`. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton orchestration release`).
35. [DONE] Git Commit: `docs: prepare application skeleton orchestration release` (hash: 5857395f3)
36. [DONE] `application-skeleton.phase8.release-build.task1` Run the approved release build sequence with the same managed-plan dirty-state exception used by the accepted Diagram Modules release, then record artifact paths, VSIX version, and release evidence. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton orchestration release`).
37. [DONE] Git Commit: `chore: build application skeleton orchestration release` (hash: fe1a2ec72)

Release docs preparation evidence (2026-05-11):

- Future release version before packaging: `1.2.230` (`package.json` currently reports `1.2.229`; `build-all.sh` owns the version bump).
- Updated `README.md` current-release marker and `CHANGELOG.md` release notes for Application Skeleton managed orchestration.
- Explicit release-build confirmation was provided by the user in this thread: proceed through packaging without pauses and report after the new release is built.

Release build evidence (2026-05-11):

- PASS: `./scripts/build-all.sh --allow-dirty` built unified version `1.2.230` with the managed-plan dirty-state exception. Provider, core, UI, and CEF launcher artifacts were produced in `~/.codeai-hub/releases/` and `doc/tmp/releases/`.
- PASS: `./scripts/build-release.sh --use-current-version --allow-dirty` packaged `codeai-hub-1.2.230.vsix`, verified SDK exclusions, validated local artifacts, checked markdown links, ran duplication advisory check, pruned/restored production dependencies, and verified the VSIX runtime package surface.
- VSIX: `codeai-hub-1.2.230.vsix` (`48M`).
- Release bundle paths: `doc/tmp/releases/*1.2.230*` and `~/.codeai-hub/releases/*1.2.230*`.
- Tarballs present in `doc/tmp/releases/`: `claude-module-1.2.230.tar.bz2`, `codex-module-1.2.230.tar.bz2`, `gemini-module-1.2.230.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.230.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.230.tar.bz2`, `vscode-webview-1.2.230.tar.bz2`, `project-manager-1.2.230.tar.bz2`.

## Phase 9 - Release Acceptance Testing (owner: user, updated: 2026-05-11)

### Stream: Installed Release Review

38. [DONE] `application-skeleton.phase9.release-acceptance.task1` User installs the produced release and accepts or rejects Application Skeleton behavior based on real workflow testing. (scope: chat/process observation only; no commit required). Result: Release 1.2.230 retest found a blocker: after extension/Core reinstall Application Skeleton remained blocked with misleading product-parts.index.md not found, while Diagram Modules files were present and valid; investigation showed only volatile Core metadata made managedGitClean false.

## Phase 9A - Release Blocker: Core Restart Gate Recovery (owner: Codex, updated: 2026-05-11)

### Stream: Volatile Metadata Does Not Block Application Skeleton

39. [DONE] `application-skeleton.phase9a.restart-gate.task1` Exclude Core volatile metadata from managed dirty-gate blocking after restart/reinstall, and cover the managed Git status classification so `description-step.json` timestamp refreshes and workspace task timers do not masquerade as pending managed commits. (scope: `packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: unblock application skeleton after core restart`).
40. [DONE] Git Commit: `fix: unblock application skeleton after core restart` (hash: 1b31b8155)
41. [DONE] `application-skeleton.phase9a.restart-regression.task1` Add workflow-state read regression for a restarted Core with valid Diagram Modules artifacts plus volatile metadata dirty state: Application Skeleton must be unblocked and the UI gate must not report the product-parts index as missing. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover application skeleton restart gate recovery`).
42. [PENDING] Git Commit: `test: cover application skeleton restart gate recovery` (hash: TBD)
43. [TODO] `application-skeleton.phase9a.verify.task1` Run targeted managed gate/workflow-state tests, core build, and `npm run plan:validate`; record exact evidence before asking for a new release build. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton restart gate verification`).
44. [TODO] Git Commit: `docs: record application skeleton restart gate verification` (hash: TBD)

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-05-11)

### Stream: Archive And Planning Disposition

45. [TODO] `application-skeleton.phase10.closeout-plan.task1` After explicit user acceptance, archive the active TODO plan and record the accepted Application Skeleton closeout state. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Scenario.md`; expected commit: `docs: archive application skeleton orchestration scope`).
46. [TODO] Git Commit: `docs: archive application skeleton orchestration scope` (hash: TBD)
47. [TODO] `application-skeleton.phase10.plans-disposition.task1` Move or update planning documents according to their final disposition and refresh documentation indexes after closeout. (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/README.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton planning disposition`).
48. [TODO] Git Commit: `docs: close application skeleton planning disposition` (hash: TBD)
49. [TODO] `application-skeleton.phase10.closeout-anchor.task1` Reserved post-closeout terminal anchor after plan completion scripts move the scope to terminal `NONE` state. (scope: process only; no commit required).
