# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-managed-orchestration",
  "branch": "main",
  "baseHead": "131e22079",
  "lastRecordedCommit": "0aa4dc923",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Architecture.md",
  "currentTaskId": "application-skeleton.phase9j.release-docs.task1",
  "expectedCommitMessage": "docs: prepare application skeleton quality gates handoff release",
  "debt": {
    "expectedCommitMessage": "docs: prepare application skeleton quality gates handoff release",
    "preCommitHead": "0aa4dc923",
    "stage": "commit_pending",
    "taskId": "application-skeleton.phase9j.release-docs.task1"
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
42. [DONE] Git Commit: `test: cover application skeleton restart gate recovery` (hash: 81164d294)
43. [DONE] `application-skeleton.phase9a.verify.task1` Run targeted managed gate/workflow-state tests, core build, and `npm run plan:validate`; record exact evidence before asking for a new release build. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton restart gate verification`).
44. [DONE] Git Commit: `docs: record application skeleton restart gate verification` (hash: 077d3bf04)

Restart gate verification evidence (2026-05-11):

- PASS: `npx tsx --test packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts` — 9 tests passed.
- PASS: real workspace managed Git diagnostic for `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4` and slug `codeai-hub-codex-5-4` returned `clean: true`, empty `dirtyFiles`, and empty `dirtyByStage` for `diagram_modules`, `application_skeleton`, and `quality_gates`.
- PASS: real workspace workflow-state diagnostic returned HTTP status `200`, `gating.blocked.application_skeleton: false`, `diagramModulesProgress.aggregateReady: true`, `plannedCount: 4`, `generatedCount: 4`, and all four product parts valid.
- PASS: `npm run build --workspace packages/core`.
- PASS: `npm run plan:validate`.
- Root cause confirmed: after extension/Core reinstall, volatile Core metadata such as `.codeai-hub/state/task-timers.json` and `.codeai-hub/<workspace>/description/description-step.json` timestamp refreshes were counted as managed dirty state; Application Skeleton then stayed blocked and Project Manager surfaced the misleading `product-parts.index.md not found` readiness text.
- Residual requirement: package a new VSIX only after separate release-build confirmation, then user must retest the Application Skeleton start gate in the installed extension.

## Phase 9B - Restart Fix Release Gate (owner: Codex, updated: 2026-05-11)

### Stream: Rebuild And Retest Boundary

45. [DONE] `application-skeleton.phase9b.release-gate-plan.task1` Insert an explicit restart-fix release/retest boundary so the active scope cannot advance to closeout before a new VSIX is built and accepted by the user. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add application skeleton restart release gate`).
46. [DONE] Git Commit: `docs: add application skeleton restart release gate` (hash: 5e5712404)
47. [DONE] `application-skeleton.phase9b.release-confirmation.task1` Get separate explicit confirmation from the user before preparing release notes, running `build-all.sh`, or packaging the next VSIX for the Core restart gate fix. (scope: chat/process observation only; no commit required). Result: User explicitly confirmed release build after the Application Skeleton Core restart gate fix.
48. [DONE] `application-skeleton.phase9b.release-docs.task1` After release-build confirmation, determine the next release version and update release-facing docs for the Application Skeleton restart gate fix. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton restart fix release`).
49. [DONE] Git Commit: `docs: prepare application skeleton restart fix release` (hash: 5f05f7997)
50. [DONE] `application-skeleton.phase9b.release-build.task1` Run the approved release build sequence, then record artifact paths, VSIX version, and restart-fix release evidence. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton restart fix release`).
51. [DONE] Git Commit: `chore: build application skeleton restart fix release` (hash: 52c767ee9)
52. [DONE] `application-skeleton.phase9b.release-acceptance.task1` User installs the produced restart-fix release and accepts or rejects the Application Skeleton start gate behavior after extension/Core restart. (scope: chat/process observation only; no commit required). Result: Release 1.2.231 retest rejected: Application Skeleton started, but Core left scripts/plan-orchestrator/plan-cli.mjs dirty after managed lifecycle upgrade, blocked the draft commit as out-of-stage, sent contradictory provider feedback, and did not create a new correction microtask with a paired Git Commit.

Restart-fix release docs preparation evidence (2026-05-11):

- Future release version before packaging: `1.2.231` (`package.json` currently reports `1.2.230`; `build-all.sh` owns the version bump).
- Updated `README.md` current-release marker and `CHANGELOG.md` release notes for the Application Skeleton Core restart gate recovery fix.
- Explicit release-build confirmation was provided by the user in this thread after the fix: "После исправления собери новый релиз."

Restart-fix release build evidence (2026-05-11):

- PASS: `./scripts/build-all.sh --allow-dirty` built unified version `1.2.231` with the managed-plan dirty-state exception. Provider, core, UI, and CEF launcher artifacts were produced in `~/.codeai-hub/releases/` and copied to `doc/tmp/releases/`.
- PASS: `./scripts/build-release.sh --use-current-version --allow-dirty` packaged `codeai-hub-1.2.231.vsix`, verified SDK exclusions, validated local artifacts, checked markdown links, ran duplication advisory check, pruned/restored production dependencies, and verified the VSIX runtime package surface.
- VSIX: `codeai-hub-1.2.231.vsix` (`49M`).
- Release bundle paths: `doc/tmp/releases/*1.2.231*` and `~/.codeai-hub/releases/*1.2.231*`.
- Tarballs present in `doc/tmp/releases/`: `claude-module-1.2.231.tar.bz2`, `codex-module-1.2.231.tar.bz2`, `gemini-module-1.2.231.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.231.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.231.tar.bz2`, `vscode-webview-1.2.231.tar.bz2`, `project-manager-1.2.231.tar.bz2`.

## Phase 9C - Release Blocker: Managed Lifecycle Upgrade Dirty State (owner: Codex, updated: 2026-05-11)

### Stream: Core-Owned Shim Upgrade Boundary

53. [DONE] `application-skeleton.phase9c.lifecycle-upgrade.task1` Commit Core-owned managed lifecycle/shim upgrades before Application Skeleton provider sessions start, so `scripts/plan-orchestrator/plan-cli.mjs` cannot remain as out-of-stage dirty state and block the draft artifact commit. (scope: `packages/core/src/managed-workspace/managed-workspace-lifecycle-committer.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: commit managed lifecycle upgrades before application skeleton`).
54. [DONE] Git Commit: `fix: commit managed lifecycle upgrades before application skeleton` (hash: b6136a3e5)
55. [DONE] `application-skeleton.phase9c.out-of-owner-feedback.task1` Ensure Application Skeleton out-of-owner dirty blockers do not send actionable artifact-correction instructions to the provider; Core must either resolve its own boundary or surface a non-provider wait/block notice. (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: keep application skeleton out-of-owner blockers non-actionable`).
56. [DONE] Git Commit: `fix: keep application skeleton out-of-owner blockers non-actionable` (hash: 7b79850d5)
57. [DONE] `application-skeleton.phase9c.verify.task1` Reproduce the v1.2.231 dirty lifecycle-script blocker in a test workspace, verify Core commits the lifecycle upgrade before Application Skeleton work, run targeted tests, core build, and `npm run plan:validate`. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton lifecycle blocker verification`).
58. [DONE] Git Commit: `docs: record application skeleton lifecycle blocker verification` (hash: a04dd7dcf)
59. [DONE] `application-skeleton.phase9c.release-confirmation.task1` Get separate explicit confirmation from the user before preparing another release build for the managed lifecycle dirty-state fix. (scope: chat/process observation only; no commit required). Result: User explicitly confirmed release build after the managed lifecycle dirty-state fix.

Lifecycle blocker verification evidence (2026-05-11):

- PASS: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts` — 11 tests passed.
- PASS: regression `default managed lifecycle commits installed shim upgrades before technical stage work` reproduces an existing workspace with a stale tracked `scripts/plan-orchestrator/plan-cli.mjs`, then verifies `ensureReady(application_skeleton)` creates `chore: update managed workspace lifecycle` before `chore: switch managed workspace stage` and leaves `git status --short` empty.
- PASS: regression `managed feedback reports out-of-owner dirty files without provider actions` verifies Application Skeleton out-of-owner blockers say not to update Application Skeleton artifacts and do not include Git/plan shell instructions or draft/materialization correction instructions.
- PASS: `npm run build --workspace packages/core`.
- PASS: `npm run plan:validate`.
- Root cause confirmed from v1.2.231 retest: Core reinstalled/upgraded the managed child-plan shim inside the existing test workspace, leaving `scripts/plan-orchestrator/plan-cli.mjs` dirty outside the active Application Skeleton microtask; the draft commit then blocked before Core could finalize `application-skeleton.md` and `application-skeleton-map.json`.
- Residual requirement: package a new VSIX only after separate release-build confirmation, then user must retest Application Skeleton draft commit advancement on an existing workspace after Core/lifecycle upgrade.

## Phase 9D - Release Build: Managed Lifecycle Upgrade Fix (owner: Codex, updated: 2026-05-11)

### Stream: Package Retest Release

60. [DONE] `application-skeleton.phase9d.release-docs.task1` Prepare release metadata for the approved managed lifecycle dirty-state fix by updating `README.md` and `CHANGELOG.md` to the next release version and recording release intent. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton lifecycle release`).
61. [DONE] Git Commit: `docs: prepare application skeleton lifecycle release` (hash: 25cacc017)
62. [DONE] `application-skeleton.phase9d.release-build.task1` Run the approved release build sequence for the managed lifecycle dirty-state fix, verify VSIX and tarball outputs, and record artifact paths for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton lifecycle release`).
63. [DONE] Git Commit: `chore: build application skeleton lifecycle release` (hash: 168447743)
64. [DONE] `application-skeleton.phase9d.release-acceptance.task1` User installs the produced release and retests Application Skeleton on an existing managed workspace after Core/lifecycle upgrade. (scope: chat/process observation only; no commit required). Result: Release 1.2.232 retest was inconclusive because old local tails remained; user cleared the local folder and explicitly requested a fresh rebuild with a new version number.

Lifecycle-fix release build evidence (2026-05-11):

- PASS: `./scripts/build-all.sh --allow-dirty` built unified version `1.2.232`. Provider, core, UI, and CEF launcher artifacts were produced in `~/.codeai-hub/releases/` and copied to `doc/tmp/releases/`.
- PASS: `./scripts/build-release.sh --use-current-version --allow-dirty` packaged `codeai-hub-1.2.232.vsix`, verified SDK exclusions, validated local artifacts, checked markdown links, ran duplication advisory check, pruned/restored production dependencies, and verified the VSIX runtime package surface.
- VSIX: `codeai-hub-1.2.232.vsix` (`48M`).
- Release bundle paths: `doc/tmp/releases/*1.2.232*` and `~/.codeai-hub/releases/*1.2.232*`.
- Tarballs present in `doc/tmp/releases/`: `claude-module-1.2.232.tar.bz2`, `codex-module-1.2.232.tar.bz2`, `gemini-module-1.2.232.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.232.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.232.tar.bz2`, `vscode-webview-1.2.232.tar.bz2`, `project-manager-1.2.232.tar.bz2`.
- User retest target: reinstall `codeai-hub-1.2.232.vsix`, then run Application Skeleton on an existing managed workspace that has already gone through Diagram Modules and extension/Core restart or upgrade.

## Phase 9E - Clean Retest Rebuild (owner: Codex, updated: 2026-05-11)

### Stream: Package Fresh Retest Release

65. [DONE] `application-skeleton.phase9e.release-docs.task1` Prepare release metadata for a clean retest rebuild after the user cleared old local tails, updating `README.md` and `CHANGELOG.md` to the next release version. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton clean rebuild release`).
66. [DONE] Git Commit: `docs: prepare application skeleton clean rebuild release` (hash: f87682baa)
67. [DONE] `application-skeleton.phase9e.release-build.task1` Run the approved rebuild sequence with a new version number, verify VSIX and tarball outputs, and record artifact paths for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton clean rebuild release`).
68. [DONE] Git Commit: `chore: build application skeleton clean rebuild release` (hash: dbc2d4044)
69. [DONE] `application-skeleton.phase9e.release-acceptance.task1` User installs the freshly rebuilt release after clearing old local tails and retests Application Skeleton. (scope: chat/process observation only; no commit required). Result: Release 1.2.233 retest rejected: starting Diagram Modules eagerly created every managed stage plan, Application Skeleton mutated itself into a repair task before Diagram Modules was accepted, the Diagram Modules index remained uncommitted, and the provider session received no Core acceptance or repair continuation.

Clean rebuild release evidence (2026-05-11):

- PASS: `./scripts/build-all.sh --allow-dirty` built unified version `1.2.233`. Provider, core, UI, and CEF launcher artifacts were produced in `~/.codeai-hub/releases/` and copied to `doc/tmp/releases/`.
- PASS: `./scripts/build-release.sh --use-current-version --allow-dirty` packaged `codeai-hub-1.2.233.vsix`, verified SDK exclusions, validated local artifacts, checked markdown links, ran duplication advisory check, pruned/restored production dependencies, and verified the VSIX runtime package surface.
- VSIX: `codeai-hub-1.2.233.vsix` (`48M`).
- Release bundle paths: `doc/tmp/releases/*1.2.233*` and `~/.codeai-hub/releases/*1.2.233*`.
- Tarballs present in `doc/tmp/releases/`: `claude-module-1.2.233.tar.bz2`, `codex-module-1.2.233.tar.bz2`, `gemini-module-1.2.233.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.233.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.233.tar.bz2`, `vscode-webview-1.2.233.tar.bz2`, `project-manager-1.2.233.tar.bz2`.
- User retest target: reinstall `codeai-hub-1.2.233.vsix` after clearing old local tails, then retest Application Skeleton from the cleaned environment.

## Phase 9F - Release Blocker: Managed Stage Isolation (owner: Codex, updated: 2026-05-11)

### Stream: Regressed Stage Orchestration Boundary

70. [DONE] `application-skeleton.phase9f.plan.task1` Record the v1.2.233 managed stage isolation blocker and split the fix into progressive stage creation, active-stage-only post-turn arbitration, Diagram Modules index commit boundary, verification, and a new release build. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan managed stage isolation fix`).
71. [DONE] Git Commit: `docs: plan managed stage isolation fix` (hash: 7ebb9ffb3)
72. [DONE] `application-skeleton.phase9f.progressive-stage-plans.task1` Stop eager creation of downstream managed stage plans at workspace bootstrap while preserving the workspace ledger paths and active stage plan creation. (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts`; expected commit: `fix: create managed stage plans progressively`).
73. [DONE] Git Commit: `fix: create managed stage plans progressively` (hash: 1ed29c613)
74. [DONE] `application-skeleton.phase9f.post-turn-stage-scope.task1` Scope managed post-turn commit, repair, feedback, and continuation dispatch to the active provider stage so future stages cannot mutate plans during Diagram Modules. (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `fix: scope managed post-turn to active stage`).
75. [DONE] Git Commit: `fix: scope managed post-turn to active stage` (hash: 7de09e505)
76. [DONE] `application-skeleton.phase9f.diagram-index-boundary.task1` Keep Diagram Modules on the index subturn until the index commit boundary is clean, so Core cannot continue to the first Product Part before committing `product-parts.index.md`. (scope: `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts, packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts`; expected commit: `fix: keep diagram modules index on commit boundary`).
77. [DONE] Git Commit: `fix: keep diagram modules index on commit boundary` (hash: ad604f588)
78. [DONE] `application-skeleton.phase9f.diagram-feedback-gate.task1` Make dirty/blocked Diagram Modules commit-gate state visible to the provider instead of suppressing feedback while a subturn is pending. (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts`; expected commit: `fix: surface diagram modules dirty commit feedback`).
79. [DONE] Git Commit: `fix: surface diagram modules dirty commit feedback` (hash: fb8f51592)
80. [DONE] `application-skeleton.phase9f.verify.task1` Reproduce the v1.2.233 Diagram Modules first-turn regression in tests, run targeted managed workflow tests, core build, and `npm run plan:validate`. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed stage isolation verification`).
81. [DONE] Git Commit: `docs: record managed stage isolation verification` (hash: 3aadf28a4)

Managed stage isolation verification evidence (2026-05-11):

- PASS: `npx tsx --test packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts` - 39 tests passed.
- PASS: regression `session:create prepares diagram modules lifecycle baseline before provider session` verifies only the active Diagram Modules child plan exists at Diagram Modules start; Application Skeleton and Quality Gates plans are absent.
- PASS: regression `post-turn service does not mutate future stage plans during diagram modules arbitration` reproduces an existing future Application Skeleton plan and verifies Diagram Modules post-turn does not mutate it.
- PASS: regression `Diagram Modules progress keeps a dirty Product Part index on the index commit boundary` verifies a dirty/uncommitted `product-parts.index.md` stays on the index subturn until Git commit, then advances to the first Product Part.
- PASS: regression `Diagram Modules dirty pending index emits a Core-owned commit gate notice` verifies dirty pending index state is visible feedback instead of a silent pending subturn.
- PASS: `npm run build --workspace packages/core`.
- PASS: `npm run plan:validate`.
- Root cause fixed: v1.2.233 combined eager future-stage plan creation, cross-stage post-turn repair, premature Diagram Modules index advancement, and pending-subturn feedback suppression. The current implementation isolates post-turn by active stage, creates child plans progressively, keeps the index on its commit boundary, and surfaces blocked dirty commit gates.

## Phase 9G - Release Build: Managed Stage Isolation Fix (owner: Codex, updated: 2026-05-11)

### Stream: Package Retest Release

82. [DONE] `application-skeleton.phase9g.release-docs.task1` Prepare release metadata for the approved managed stage isolation fix by updating `README.md` and `CHANGELOG.md` to the next release version. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed stage isolation release`).
83. [DONE] Git Commit: `docs: prepare managed stage isolation release` (hash: 212517ef2)
84. [DONE] `application-skeleton.phase9g.release-build.task1` Run the approved release build sequence for the managed stage isolation fix, verify VSIX and tarball outputs, and record artifact paths for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build managed stage isolation release`).
85. [DONE] Git Commit: `chore: build managed stage isolation release` (hash: 9b76980c9)
86. [DONE] `application-skeleton.phase9g.release-acceptance.task1` User installs the produced release and retests Diagram Modules first-turn acceptance plus Application Skeleton unlock on a clean managed workspace. (scope: chat/process observation only; no commit required). Result: Release 1.2.234 retest rejected before Diagram Modules because Virtual Simulation wrote `virtual-simulation.md` into a provider-created `virtual-simulation/` alias directory while the Core gate requires canonical `virtual_simulation/virtual-simulation.md`.

Managed stage isolation release docs preparation evidence (2026-05-11):

- Future release version before packaging: `1.2.234` (`package.json` currently reports `1.2.233`; `build-all.sh` owns the version bump).
- Updated `README.md` current-release marker and `CHANGELOG.md` release notes for managed stage isolation, progressive child-plan creation, active-stage post-turn arbitration, Diagram Modules index commit boundary, and dirty pending feedback visibility.
- Explicit release-build confirmation was provided by the user in this thread: "Делай фикс и собирай новый релиз."

Managed stage isolation release build evidence (2026-05-11):

- PASS: `./scripts/build-all.sh --allow-dirty` built unified version `1.2.234`. Provider, core, UI, and CEF launcher artifacts were produced in `~/.codeai-hub/releases/` and copied to `doc/tmp/releases/`.
- PASS: `./scripts/build-release.sh --use-current-version --allow-dirty` packaged `codeai-hub-1.2.234.vsix`, verified SDK exclusions, validated local artifacts, checked markdown links, ran duplication advisory check, pruned/restored production dependencies, and verified the VSIX runtime package surface.
- VSIX: `codeai-hub-1.2.234.vsix` (`48M`).
- Release bundle paths: `doc/tmp/releases/*1.2.234*` and `~/.codeai-hub/releases/*1.2.234*`.
- Tarballs present in `doc/tmp/releases/`: `claude-module-1.2.234.tar.bz2`, `codex-module-1.2.234.tar.bz2`, `gemini-module-1.2.234.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.234.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.234.tar.bz2`, `vscode-webview-1.2.234.tar.bz2`, `project-manager-1.2.234.tar.bz2`.
- User retest target: reinstall `codeai-hub-1.2.234.vsix`, then retest Diagram Modules first-turn acceptance on a clean managed workspace and continue to Application Skeleton unlock.

## Phase 9H - Release Blocker: Virtual Simulation Alias Recovery (owner: Codex, updated: 2026-05-11)

### Stream: Canonical Artifact Directory Repair

87. [DONE] `application-skeleton.phase9h.plan.task1` Record the v1.2.234 blocker where Codex wrote `virtual-simulation.md` under the non-canonical `virtual-simulation/` directory while Core gates read only `virtual_simulation/`, and split the repair into deterministic canonicalization plus verification. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan virtual simulation alias recovery`).
88. [DONE] Git Commit: `docs: plan virtual simulation alias recovery` (hash: 08c53267c)
89. [DONE] `application-skeleton.phase9h.canonicalize.task1` Canonicalize a provider-created `.codeai-hub/<workspaceSlug>/virtual-simulation/virtual-simulation.md` alias into `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md` before workflow-state hydration, validation, and Diagram Modules gating; add regression coverage for the recovered gate. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts, packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.test.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `fix: recover virtual simulation artifact alias`).
90. [DONE] Git Commit: `fix: recover virtual simulation artifact alias` (hash: 8096966ae)
91. [DONE] `application-skeleton.phase9h.verify.task1` Run targeted workflow-state tests, core build, and `npm run plan:validate`; record exact evidence and residual release-build requirement. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record virtual simulation alias recovery verification`).
92. [DONE] Git Commit: `docs: record virtual simulation alias recovery verification` (hash: 83f6eef68)

Virtual Simulation alias recovery verification evidence (2026-05-11):

- PASS: `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts` - 5 tests passed.
- PASS: `npm run build --workspace packages/core`.
- PASS: `npm run plan:validate`.
- Root cause confirmed from the v1.2.234 retest workspace: Core pre-created canonical `virtual_simulation/`, but Codex wrote the artifact into provider-derived alias `virtual-simulation/`; workflow-state hydration and Diagram Modules gating only read the canonical underscore directory, so the next step reported `virtual-simulation.md not found` even though a file existed nearby.
- Fixed behavior: on workflow-state read, Core moves `.codeai-hub/<workspaceSlug>/virtual-simulation/virtual-simulation.md` into `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md` when the canonical file is missing, then hydrates and validates the canonical artifact.
- Residual requirement: package a new VSIX only after separate release-build confirmation; no release build scripts were run for this fix yet.

## Phase 9I - Release Build: Virtual Simulation Alias Recovery (owner: Codex, updated: 2026-05-11)

### Stream: Package Retest Release

93. [DONE] `application-skeleton.phase9i.release-gate-plan.task1` Insert an explicit release/retest boundary for the Virtual Simulation alias recovery fix so the scope cannot move to closeout before a new VSIX is built and accepted. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add virtual simulation alias release gate`).
94. [DONE] Git Commit: `docs: add virtual simulation alias release gate` (hash: 89c79d053)
95. [DONE] `application-skeleton.phase9i.release-confirmation.task1` Get separate explicit confirmation from the user before preparing release notes, running `build-all.sh`, or packaging the next VSIX for the Virtual Simulation alias recovery fix. (scope: chat/process observation only; no commit required). Result: User explicitly confirmed release build for the Virtual Simulation alias recovery fix.
96. [DONE] `application-skeleton.phase9i.release-docs.task1` After release-build confirmation, determine the next release version and update release-facing docs for the Virtual Simulation alias recovery fix. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare virtual simulation alias recovery release`).
97. [DONE] Git Commit: `docs: prepare virtual simulation alias recovery release` (hash: aadf57388)
98. [DONE] `application-skeleton.phase9i.release-build.task1` Run the approved release build sequence, verify VSIX and tarball outputs, and record artifact paths for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build virtual simulation alias recovery release`).
99. [DONE] Git Commit: `chore: build virtual simulation alias recovery release` (hash: 683c818ed)
100. [DONE] `application-skeleton.phase9i.release-acceptance.task1` User installs the produced release and retests Virtual Simulation alias recovery, Diagram Modules unlock, and continuation into Application Skeleton. (scope: chat/process observation only; no commit required). Result: Release 1.2.235 retest rejected: Application Skeleton materialized artifact commit succeeded, but Core left Phase 2 review in progress, failed to create the Quality Gates child plan before workspace-ledger rollover, and left workspace/stage ledger changes staged; user could not start the next step.

Virtual Simulation alias recovery release docs preparation evidence (2026-05-11):

- Future release version before packaging: `1.2.235` (`package.json` currently reports `1.2.234`; `build-all.sh` owns the version bump).
- Updated `README.md` current-release marker and `CHANGELOG.md` release notes for Virtual Simulation alias recovery and Diagram Modules false-missing gate recovery.
- Explicit release-build confirmation was provided by the user in this thread: "Ладно, собираем новый релиз."

Virtual Simulation alias recovery release build evidence (2026-05-11):

- PASS: `./scripts/build-all.sh --allow-dirty` completed the unified provider/core/UI/launcher build for version `1.2.235`.
- PASS: `./scripts/build-release.sh --use-current-version --allow-dirty` completed packaging for version `1.2.235`, including SDK exclusion verification, local artefact validation, markdown link check, duplication check, and VSIX runtime package surface verification.
- Produced VSIX: `codeai-hub-1.2.235.vsix` (48M on disk; release script reports package size 49M).
- Fresh local release bundles are present under `doc/tmp/releases/`: `claude-module-1.2.235.tar.bz2`, `codex-module-1.2.235.tar.bz2`, `gemini-module-1.2.235.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.235.tar.bz2`, `vscode-webview-1.2.235.tar.bz2`, `project-manager-1.2.235.tar.bz2`, and `CodeAIHubLauncher-macos-arm64-1.2.235.tar.bz2`.
- Retest target for user acceptance: install `codeai-hub-1.2.235.vsix`, rerun the Virtual Simulation -> Diagram Modules transition on a clean/restarted extension environment, confirm Core recovers any provider-created `virtual-simulation/virtual-simulation.md` alias into canonical `virtual_simulation/virtual-simulation.md`, then continue into Application Skeleton.

## Phase 9J - Release Blocker: Application Skeleton Quality Gates Handoff (owner: Codex, updated: 2026-05-11)

### Stream: Ledger Rollover Repair

101. [DONE] `application-skeleton.phase9j.plan.task1` Record the v1.2.235 blocker where Application Skeleton materialization commits, but Core leaves the Phase 2 review task open, switches `workspace.plan.md` to Quality Gates before creating `doc/TODO/stages/quality-gates/todo-plan.md`, and leaves ledger changes staged so the next step cannot launch. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan application skeleton quality gates handoff repair`).
102. [DONE] Git Commit: `docs: plan application skeleton quality gates handoff repair` (hash: 1875295ea)
103. [DONE] `application-skeleton.phase9j.quality-plan.task1` Make the managed plan shim create the next stage child plan before terminal workspace-ledger rollover commits, and cover the real Application Skeleton -> Quality Gates path without pre-created Quality Gates plan. (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `fix: create quality gates plan before application skeleton handoff`).
104. [DONE] Git Commit: `fix: create quality gates plan before application skeleton handoff` (hash: ffba1dff6)
105. [DONE] `application-skeleton.phase9j.review-anchor.task1` Close the open Application Skeleton Phase 2 review anchor when the user accepts without a revision, so later accepted/materialized tasks cannot coexist with a stale `IN_PROGRESS` review task. (scope: `packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts, packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts`; expected commit: `fix: close application skeleton review anchor on acceptance`).
106. [DONE] Git Commit: `fix: close application skeleton review anchor on acceptance` (hash: b67375168)
107. [DONE] `application-skeleton.phase9j.verify.task1` Run targeted managed-plan rollover tests, Application Skeleton mutator tests, core build, and `npm run plan:validate`; record exact evidence and residual release-build requirement. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton quality gates handoff verification`).
108. [DONE] Git Commit: `docs: record application skeleton quality gates handoff verification` (hash: 0aa4dc923)

Application Skeleton Quality Gates handoff repair verification evidence (2026-05-11):

- PASS: `npx tsx --test packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts` - 13 tests passed.
- PASS: `npm run build --workspace packages/core`.
- PASS: `npm run plan:validate`.
- Covered regression: Application Skeleton materialization no longer relies on a pre-created `doc/TODO/stages/quality-gates/todo-plan.md`; the generated managed shim creates the Quality Gates child plan before workspace-ledger rollover, includes it in the ledger commit, moves `workspace.plan.md` to `activeStage: "quality_gates"`, and leaves the managed workspace Git status clean.
- Covered regression: accepting the Application Skeleton contract without a user revision closes the Phase 2 review anchor and marks its revision commit pair as not-created due to acceptance, so Phase 2 cannot stay visually `IN_PROGRESS` after acceptance/materialization.
- Residual requirement: package a new VSIX only after separate release-build confirmation; no release build scripts were run for this handoff repair yet.

### Stream: Rebuild And Retest Boundary

109. [DONE] `application-skeleton.phase9j.release-confirmation.task1` Get separate explicit confirmation from the user before preparing another release build for the Application Skeleton Quality Gates handoff repair. (scope: chat/process observation only; no commit required). Result: User explicitly confirmed release build for the Application Skeleton Quality Gates handoff repair.
110. [DONE] `application-skeleton.phase9j.release-docs.task1` After release-build confirmation, determine the next release version and update release-facing docs for the Application Skeleton Quality Gates handoff repair. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton quality gates handoff release`).
111. [PENDING] Git Commit: `docs: prepare application skeleton quality gates handoff release` (hash: TBD)
112. [TODO] `application-skeleton.phase9j.release-build.task1` Run the approved release build sequence, verify VSIX and tarball outputs, and record artifact paths for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton quality gates handoff release`).
113. [TODO] Git Commit: `chore: build application skeleton quality gates handoff release` (hash: TBD)
114. [TODO] `application-skeleton.phase9j.release-acceptance.task1` User installs the produced release and retests Application Skeleton materialization, Quality Gates child-plan creation, and next-step launch. (scope: chat/process observation only; no commit required).

Application Skeleton Quality Gates handoff release docs preparation evidence (2026-05-11):

- Future release version before packaging: `1.2.236` (`package.json` currently reports `1.2.235`; `build-all.sh` owns the version bump).
- Updated `README.md` current-release marker and `CHANGELOG.md` release notes for the Application Skeleton Quality Gates handoff repair.
- Explicit release-build confirmation was provided by the user in this thread: "Собирай новый релиз."

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-05-11)

### Stream: Archive And Planning Disposition

115. [TODO] `application-skeleton.phase10.closeout-plan.task1` After explicit user acceptance, archive the active TODO plan and record the accepted Application Skeleton closeout state. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Scenario.md`; expected commit: `docs: archive application skeleton orchestration scope`).
116. [TODO] Git Commit: `docs: archive application skeleton orchestration scope` (hash: TBD)
117. [TODO] `application-skeleton.phase10.plans-disposition.task1` Move or update planning documents according to their final disposition and refresh documentation indexes after closeout. (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/README.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton planning disposition`).
118. [TODO] Git Commit: `docs: close application skeleton planning disposition` (hash: TBD)
119. [TODO] `application-skeleton.phase10.closeout-anchor.task1` Reserved post-closeout terminal anchor after plan completion scripts move the scope to terminal `NONE` state. (scope: process only; no commit required).
