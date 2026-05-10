# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-phase-b-orchestration-implementation",
  "branch": "main",
  "baseHead": "d2c91d120",
  "lastRecordedCommit": "d2c91d120",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md",
  "currentTaskId": "application-skeleton-orchestration.phase0.plan.task1",
  "expectedCommitMessage": "docs: open application skeleton phase b orchestration implementation",
  "debt": {
    "expectedCommitMessage": "docs: open application skeleton phase b orchestration implementation",
    "preCommitHead": "d2c91d120",
    "stage": "commit_pending",
    "taskId": "application-skeleton-orchestration.phase0.plan.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`
- **Accepted planning intake closeout snapshot:** `doc/TODO/Archive/todo-plan-closeout-application-skeleton-phase-b-orchestration-intake-q7-fix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Runtime_Contract_Conformance.md`
- Only this Context Pack is the recovery source for the current implementation cycle.

## Execution Rules

- **Required reading before each code fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- This scope implements Application Skeleton only: `Phase 1A Type A draft -> Phase 1B Type B review -> Phase 2 Type A materialization`.
- Quality Gates symmetry, Diagram Modules review-stream symmetry, generalized phase metadata runtime, universal final correction phase, and full Type B candidate lifecycle are out of scope.
- Each implementation microtask touches no more than 3 files or package surfaces. If code audit shows a task needs a wider write set, split the task and update this plan first.
- Managed prompts remain content-readiness contracts. Provider turns must not be asked to run Git, staging, `npm run plan:commit`, or cleanup commands.
- Project Manager surfaces commands and read-model state only. Core owns acceptance, continuation, managed commit, plan advancement, and provider-visible corrective decisions.
- Read-model paths must stay side-effect free.
- **Release Build Confirmation Gate:** do not prepare release notes, bump versions, run `./scripts/build-all.sh`, or run `./scripts/build-release.sh --use-current-version` until the user gives separate explicit release-build confirmation.
- Do not use `--no-verify`.

## Implementation Defaults

- **Acceptance commit policy:** Option B from the planning document. Acceptance is folded into the Phase 2 transition transaction; no separate `docs: accept application skeleton contract` Git commit is created in this pilot.
- **Typed acceptance fallback:** kept as a headless secondary path through the same Core command handler as the UI button.
- **No-op vs revision classifier:** diff-based for this pilot. Any tracked Application Skeleton contract artifact diff is a revision; no owned diff is a discussion/no-op turn.
- **Phase registry granularity:** hard-coded stage id + sub-phase classifier for Application Skeleton only.
- **Corrective prompt text placement:** use a small pure prompt-builder file if the copy is non-trivial; decision ownership remains in `managed-workflow-post-turn-service.ts`.

## Phase 0 - Implementation Plan Open (owner: Codex, updated: 2026-05-10)

### Stream: Accepted Planning Handoff

1. [DONE] `application-skeleton-orchestration.phase0.plan.task1` Open this implementation plan from the accepted planning document and preserve the narrow intake revision closeout snapshot before replacing the terminal `NONE` plan. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-closeout-application-skeleton-phase-b-orchestration-intake-q7-fix.md`; expected commit: `docs: open application skeleton phase b orchestration implementation`).
2. [PENDING] Git Commit: `docs: open application skeleton phase b orchestration implementation` (hash: TBD)

## Phase 1 - Code Surface Audit (owner: next agent, updated: 2026-05-10)

### Stream: Confirm Runtime Owners

3. [TODO] `application-skeleton-orchestration.phase1.audit.task1` Re-audit current `HEAD` for exact owners of stage todo-plan seeding, Application Skeleton post-turn arbitration, acceptance command routing, HTTP route registration, PM panel state, premature-materialization validation, and managed commit boundaries. Update this plan if any provisional write scopes below need splitting or replacement. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: map application skeleton phase orchestration code surfaces`).
4. [TODO] Git Commit: `docs: map application skeleton phase orchestration code surfaces` (hash: TBD)

## Phase 2 - Stage Plan Shape And Phase Identity (owner: next agent, updated: 2026-05-10)

### Stream: Managed Stage Plan Seed

5. [TODO] `application-skeleton-orchestration.phase2.stage-plan.task1` Seed the Application Skeleton managed stage todo-plan as Phase 1A draft, Phase 1B open-ended review, Phase 2 materialization, plus reserved handoff anchor; add bootstrap/recovery regression coverage for the seeded task ids. (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`; expected commit: `fix: seed application skeleton phased stage plan`).
6. [TODO] Git Commit: `fix: seed application skeleton phased stage plan` (hash: TBD)

### Stream: Phase Classifier

7. [TODO] `application-skeleton-orchestration.phase2.classifier.task1` Add an Application Skeleton-specific phase/sub-phase classifier for Phase 1A, Phase 1B and Phase 2, and consume it from post-turn arbitration without introducing a generalized phase metadata runtime. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: classify application skeleton orchestration phases`).
8. [TODO] Git Commit: `fix: classify application skeleton orchestration phases` (hash: TBD)

## Phase 3 - Phase 1A Core-Gated Draft (owner: next agent, updated: 2026-05-10)

### Stream: Draft Structural Guard

9. [TODO] `application-skeleton-orchestration.phase3.phase1a.task1` Implement the Phase 1A post-turn structural guard with the Observe-vs-Dispatch rule and Readiness Resolution table: terminal + owned diff counts as implicit readiness; no terminal never validates; terminal + no diff in Phase 1A produces one non-commit repair decision. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: guard application skeleton draft post-turn`).
10. [TODO] Git Commit: `fix: guard application skeleton draft post-turn` (hash: TBD)

### Stream: Phase 1A Corrective Feedback

11. [TODO] `application-skeleton-orchestration.phase3.phase1a.task2` Add Phase 1A corrective feedback text as a pure prompt builder and route corrective decisions through the existing post-turn arbitration contract; the builder must not own state or dispatch decisions. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-feedback.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-feedback.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: send application skeleton draft repair feedback`).
12. [TODO] Git Commit: `fix: send application skeleton draft repair feedback` (hash: TBD)

### Stream: Read-Model Side-Effect Guard

13. [TODO] `application-skeleton-orchestration.phase3.phase1a.task3` Ensure workflow-state/read-model refreshes may expose Application Skeleton diagnostics but never dispatch provider-visible corrections before the post-turn readiness + terminal boundary. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `fix: keep application skeleton corrections post-turn only`).
14. [TODO] Git Commit: `fix: keep application skeleton corrections post-turn only` (hash: TBD)

## Phase 4 - Phase 1B User Review Revisions (owner: next agent, updated: 2026-05-10)

### Stream: Review Turn Classification

15. [TODO] `application-skeleton-orchestration.phase4.phase1b.task1` Add the Phase 1B revision-vs-discussion classifier: tracked owned Application Skeleton contract diff means revision, no owned diff means standard session-history-only discussion/no-op. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.ts, packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: classify application skeleton review turns`).
16. [TODO] Git Commit: `fix: classify application skeleton review turns` (hash: TBD)

### Stream: Dynamic Revision Plan Injection

17. [TODO] `application-skeleton-orchestration.phase4.phase1b.task2` Inject `revisionN.task1 + Git Commit` pairs before the open-ended Phase 1B review task for each structurally valid artifact-changing revision, then return `currentTaskId` to the open review task after commit. (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `fix: inject application skeleton review revision tasks`).
18. [TODO] Git Commit: `fix: inject application skeleton review revision tasks` (hash: TBD)

### Stream: Per-Revision Managed Commit

19. [TODO] `application-skeleton-orchestration.phase4.phase1b.task3` Reuse the managed commit boundary for Phase 1B accepted revisions while preserving Phase 1A draft and Phase 2 materialization commit semantics. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`; expected commit: `fix: commit application skeleton review revisions`).
20. [TODO] Git Commit: `fix: commit application skeleton review revisions` (hash: TBD)

## Phase 5 - Accept Contract Command And UI (owner: next agent, updated: 2026-05-10)

### Stream: Core Command Handler

21. [TODO] `application-skeleton-orchestration.phase5.accept.task1` Add a single Core acceptance command handler for Application Skeleton Phase 1B that validates acceptance preconditions, records Option B acceptance state, and marks the session for the existing Phase 2 materialization dispatcher. (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts`; expected commit: `fix: handle application skeleton accept contract command`).
22. [TODO] Git Commit: `fix: handle application skeleton accept contract command` (hash: TBD)

### Stream: HTTP Transport

23. [TODO] `application-skeleton-orchestration.phase5.accept.task2` Expose `/api/v1/orchestrator/managed-stage-accept-contract` as transport only; route to the Core command handler and keep route/read-model code side-effect free outside the handler. (scope: `packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.ts, packages/core/src/remote-bridge/handlers/http-api-router.ts, packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts`; expected commit: `fix: expose application skeleton accept contract endpoint`).
24. [TODO] Git Commit: `fix: expose application skeleton accept contract endpoint` (hash: TBD)

### Stream: Typed Fallback Routing

25. [TODO] `application-skeleton-orchestration.phase5.accept.task3` Route typed acceptance fallback through the same Core command handler, gated to Phase 1B acceptance-eligible state only, and ensure matched acceptance text is not delivered as a provider user message. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts`; expected commit: `fix: route skeleton typed acceptance through command handler`).
26. [TODO] Git Commit: `fix: route skeleton typed acceptance through command handler` (hash: TBD)

### Stream: Project Manager Command Surface

27. [TODO] `application-skeleton-orchestration.phase5.ui.task1` Add the PM command client and Application Skeleton `Accept Contract` button with disabled-state reasons derived from workflow-state read-model preconditions only. (scope: `src/client/project-manager/services/managed-stage-accept-contract-client.ts, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.tsx, src/client/project-manager/components/application-skeleton/application-skeleton-panel.tsx`; expected commit: `feat: add application skeleton accept contract button`).
28. [TODO] Git Commit: `feat: add application skeleton accept contract button` (hash: TBD)

## Phase 6 - Premature Materialization And Phase 2 Gate (owner: next agent, updated: 2026-05-10)

### Stream: Premature Materialization Validator

29. [TODO] `application-skeleton-orchestration.phase6.materialization.task1` Add a premature-materialization validator that derives blocked paths/state from the skeleton map and Application Skeleton stage ownership instead of a hardcoded `product-parts/**` glob. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`; expected commit: `fix: block premature application skeleton materialization`).
30. [TODO] Git Commit: `fix: block premature application skeleton materialization` (hash: TBD)

### Stream: Phase 1A/1B Premature Block Integration

31. [TODO] `application-skeleton-orchestration.phase6.materialization.task2` Run the premature-materialization validator from Phase 1A and Phase 1B structural guards, delivering one corrective turn only at the readiness + terminal boundary. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.test.ts`; expected commit: `fix: reject skeleton materialization before acceptance`).
32. [TODO] Git Commit: `fix: reject skeleton materialization before acceptance` (hash: TBD)

### Stream: Phase 2 Dispatcher Gate

33. [TODO] `application-skeleton-orchestration.phase6.materialization.task3` Ensure the existing Application Skeleton materialization dispatcher starts only after the Core acceptance command marker, and does not treat user text or premature `materialized` flips as Phase 2 authority. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts`; expected commit: `fix: gate skeleton materialization on accept command`).
34. [TODO] Git Commit: `fix: gate skeleton materialization on accept command` (hash: TBD)

## Phase 7 - Regression Coverage (owner: next agent, updated: 2026-05-10)

### Stream: Core End-To-End Coverage

35. [TODO] `application-skeleton-orchestration.phase7.tests.task1` Add an end-to-end Application Skeleton A->B->A regression covering draft commit, artifact-changing review commit, no-op review turn without Git commit, premature materialization rejection, acceptance command, Phase 2 dispatcher, and materialization commit. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts`; expected commit: `test: cover application skeleton a-b-a orchestration`).
36. [TODO] Git Commit: `test: cover application skeleton a-b-a orchestration` (hash: TBD)

### Stream: UI And Transport Coverage

37. [TODO] `application-skeleton-orchestration.phase7.tests.task2` Add focused tests for the accept-contract HTTP transport/client/button disabled states without making PM read-model paths responsible for workflow decisions. (scope: `packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts, src/client/project-manager/services/managed-stage-accept-contract-client.test.ts, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.test.tsx`; expected commit: `test: cover application skeleton accept contract surfaces`).
38. [TODO] Git Commit: `test: cover application skeleton accept contract surfaces` (hash: TBD)

## Phase 8 - SSOT Sync (owner: next agent, updated: 2026-05-10)

### Stream: Stable Documentation

39. [TODO] `application-skeleton-orchestration.phase8.docs.task1` Sync the implemented Application Skeleton A->B->A orchestration model into stable SSOT docs, including Core-owned command surface, Observe-vs-Dispatch, Stage Plan Shape, and premature-materialization block. (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`; expected commit: `docs: sync application skeleton phase orchestration ssot`).
40. [TODO] Git Commit: `docs: sync application skeleton phase orchestration ssot` (hash: TBD)

## Phase 9 - Targeted Verification (owner: next agent, updated: 2026-05-10)

### Stream: Build And Test Evidence

41. [TODO] `application-skeleton-orchestration.phase9.verify.task1` Run targeted Core tests for touched handlers, PM component/service tests, `npm run build --workspace @codeai-hub/core`, and `npm run typecheck:webview`; record evidence and any known residual risk in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton phase orchestration verification`).
42. [TODO] Git Commit: `docs: record application skeleton phase orchestration verification` (hash: TBD)

## Phase 10 - Release Build Confirmation Gate (owner: next agent, updated: 2026-05-10)

### Stream: Release Confirmation

43. [TODO] `application-skeleton-orchestration.phase10.release.task1` Ask the user for separate explicit confirmation before preparing release notes, bumping versions, or running release build scripts. (scope: chat/process observation only; no commit required).

### Stream: Release Preparation

44. [TODO] `application-skeleton-orchestration.phase10.release.task2` After explicit confirmation only, update README/CHANGELOG for the future release version and record the release-preparation evidence in this plan before running `build-all.sh`. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton phase orchestration release`).
45. [TODO] Git Commit: `docs: prepare application skeleton phase orchestration release` (hash: TBD)

### Stream: Release Build

46. [TODO] `application-skeleton-orchestration.phase10.release.task3` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton phase orchestration`).
47. [TODO] Git Commit: `build: release application skeleton phase orchestration` (hash: TBD)

## Phase 11 - User Workflow Acceptance Testing (owner: user, updated: 2026-05-10)

### Stream: VSIX Retest

48. [TODO] `application-skeleton-orchestration.phase11.acceptance.task1` User installs the new VSIX and retests Application Skeleton: Phase 1A draft repair, Phase 1B user revision/no-op turns, Accept Contract button, typed fallback if retained, premature-materialization block, Phase 2 materialization commit, and downstream handoff. (scope: chat/process observation only; no commit required).

## Phase 12 - Scope Closeout (owner: next agent, updated: 2026-05-10)

### Stream: Closeout After Acceptance

49. [TODO] `application-skeleton-orchestration.phase12.closeout.task1` After explicit user acceptance, archive this plan, decide final disposition for the planning document, update `Docs_Index.md` if needed, and leave active state terminal `NONE`. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close application skeleton phase orchestration implementation`).
50. [TODO] Git Commit: `docs: close application skeleton phase orchestration implementation` (hash: TBD)
51. [TODO] `application-skeleton-orchestration.phase12.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
