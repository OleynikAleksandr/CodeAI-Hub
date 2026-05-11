# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-managed-orchestration",
  "branch": "main",
  "baseHead": "131e22079",
  "lastRecordedCommit": "97dadca85",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Architecture.md",
  "currentTaskId": "application-skeleton.phase5.dynamic-seed-test.task1",
  "expectedCommitMessage": "test: cover application skeleton dynamic plan seed",
  "debt": {
    "expectedCommitMessage": "test: cover application skeleton dynamic plan seed",
    "preCommitHead": "97dadca85",
    "stage": "commit_pending",
    "taskId": "application-skeleton.phase5.dynamic-seed-test.task1"
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
24. [PENDING] Git Commit: `test: cover application skeleton dynamic plan seed` (hash: TBD)
25. [TODO] `application-skeleton.phase5.rejection-test.task1` Add a deterministic forced-rejection test: initialize a managed Application Skeleton workspace, make Core reject draft or materialization output, assert repair injection before feedback, then assert failed-attempt evidence is committed. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-repair-orchestration.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.application-skeleton-repair.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `test: cover application skeleton forced repair rejection`).
26. [TODO] Git Commit: `test: cover application skeleton forced repair rejection` (hash: TBD)
27. [TODO] `application-skeleton.phase5.user-return-test.task1` Add regression coverage for a post-materialization user request that updates Application Skeleton artifacts and produces a real child-plan revision task plus commit instead of dirty uncommitted state. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts`; expected commit: `test: cover application skeleton user return commits`).
28. [TODO] Git Commit: `test: cover application skeleton user return commits` (hash: TBD)

## Phase 6 - Documentation And Tooling Verification (owner: Codex, updated: 2026-05-11)

### Stream: Scenario Documentation

29. [TODO] `application-skeleton.phase6.docs.task1` Update Application Skeleton planning docs and the docs index with the implemented dynamic orchestration, rejection, acceptance, materialization, and post-completion revision semantics. (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Architecture.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Scenario.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: finalize application skeleton orchestration scenario`).
30. [TODO] Git Commit: `docs: finalize application skeleton orchestration scenario` (hash: TBD)

### Stream: Targeted Verification

31. [TODO] `application-skeleton.phase6.verify.task1` Run targeted Application Skeleton managed-workflow tests, the core package build, and `npm run plan:validate`; record exact evidence and residual risks in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton orchestration verification`).
32. [TODO] Git Commit: `docs: record application skeleton orchestration verification` (hash: TBD)

## Phase 7 - User Workflow Acceptance Testing (owner: user, updated: 2026-05-11)

### Stream: Local Workflow Review

33. [TODO] `application-skeleton.phase7.acceptance.task1` User verifies the next release candidate in Project Manager: dynamic Application Skeleton plan, Core rejection repair loop, Accept Contract commit boundary, materialization commit, post-completion revision commit, and Quality Gates unlock. (scope: chat/process observation only; no commit required).

## Phase 8 - Release Build (owner: Codex, updated: 2026-05-11)

### Stream: Release Confirmation And Packaging

34. [TODO] `application-skeleton.phase8.release-docs.task1` After separate explicit release-build confirmation, determine the next release version and update release-facing docs before `build-all.sh`. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton orchestration release`).
35. [TODO] Git Commit: `docs: prepare application skeleton orchestration release` (hash: TBD)
36. [TODO] `application-skeleton.phase8.release-build.task1` Run the approved release build sequence and record artifact paths, VSIX version, and release evidence. (scope: `doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton orchestration release`).
37. [TODO] Git Commit: `chore: build application skeleton orchestration release` (hash: TBD)

## Phase 9 - Release Acceptance Testing (owner: user, updated: 2026-05-11)

### Stream: Installed Release Review

38. [TODO] `application-skeleton.phase9.release-acceptance.task1` User installs the produced release and accepts or rejects Application Skeleton behavior based on real workflow testing. (scope: chat/process observation only; no commit required).

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-05-11)

### Stream: Archive And Planning Disposition

39. [TODO] `application-skeleton.phase10.closeout-plan.task1` After explicit user acceptance, archive the active TODO plan and record the accepted Application Skeleton closeout state. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Scenario.md`; expected commit: `docs: archive application skeleton orchestration scope`).
40. [TODO] Git Commit: `docs: archive application skeleton orchestration scope` (hash: TBD)
41. [TODO] `application-skeleton.phase10.plans-disposition.task1` Move or update planning documents according to their final disposition and refresh documentation indexes after closeout. (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/README.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton planning disposition`).
42. [TODO] Git Commit: `docs: close application skeleton planning disposition` (hash: TBD)
43. [TODO] `application-skeleton.phase10.closeout-anchor.task1` Reserved post-closeout terminal anchor after plan completion scripts move the scope to terminal `NONE` state. (scope: process only; no commit required).
