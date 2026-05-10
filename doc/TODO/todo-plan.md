# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-phase-b-orchestration-implementation",
  "branch": "main",
  "baseHead": "d2c91d120",
  "lastRecordedCommit": "ef22ccf32",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md",
  "currentTaskId": "application-skeleton-orchestration.phase5.accept.task3",
  "expectedCommitMessage": "fix: route skeleton typed acceptance through command handler",
  "debt": {
    "expectedCommitMessage": "fix: route skeleton typed acceptance through command handler",
    "preCommitHead": "ef22ccf32",
    "stage": "commit_pending",
    "taskId": "application-skeleton-orchestration.phase5.accept.task3"
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
2. [DONE] Git Commit: `docs: open application skeleton phase b orchestration implementation` (hash: 60180d32e)

## Phase 1 - Code Surface Audit (owner: next agent, updated: 2026-05-10)

### Stream: Confirm Runtime Owners

3. [DONE] `application-skeleton-orchestration.phase1.audit.task1` Re-audit current `HEAD` for exact owners of stage todo-plan seeding, Application Skeleton post-turn arbitration, acceptance command routing, HTTP route registration, PM panel state, premature-materialization validation, and managed commit boundaries. Update this plan if any provisional write scopes below need splitting or replacement. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: map application skeleton phase orchestration code surfaces`).
4. [DONE] Git Commit: `docs: map application skeleton phase orchestration code surfaces` (hash: eccc37754)

#### Audit findings (HEAD = `60180d32e`, 2026-05-10)

- **Surface 1 — stage plan seeding.** Owner: `packages/core/src/managed-workspace/managed-todo-tree.ts::ensureManagedTodoTree()` (uses `STAGE_PLANS` and `STAGE_TERMINAL_COMMITS` constants; Application Skeleton is one of three managed stages seeded here). Test peer `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts` exists. Phase 2.stage-plan.task1 provisional scope (2 files) confirmed.
- **Surface 2 — post-turn arbitration.** Owner: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts::ManagedWorkflowPostTurnService.run()` (already routes today's typed-acceptance via `recognizeManagedContractAcceptancePhrase()` and `handleContractAcceptance()`). Existing Application Skeleton modules in handlers: `application-skeleton-progress.ts/.test.ts`, `application-skeleton-continuation-dispatcher.ts/.test.ts`, `application-skeleton-materialization-validator.ts/.test.ts`, `application-skeleton-completion-observer.test.ts`, `application-skeleton-end-to-end.test.ts`, `application-skeleton-phase-b-rollover.test.ts`. New phase classifier file `application-skeleton-phase-state.ts` does not exist yet. Phase 2.classifier.task1 provisional scope (3 files) confirmed.
- **Surface 3 — acceptance command routing.** Today's typed-acceptance fallback enters via `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` (imports `recognizeManagedAcceptanceForStage` from `managed-workflow-post-turn-service.ts`). No dedicated `managed-stage-accept-contract-handler.ts` exists. Phase 5.accept.task1 (3 files) and Phase 5.accept.task3 typed-fallback (3 files) provisional scopes confirmed.
- **Surface 4 — HTTP route registration.** Central registry: `packages/core/src/remote-bridge/handlers/http-api-router.ts::HttpApiRouter.registerRoutes()` with a 1-line per-endpoint registration pattern (imported handler called inside `registerRoutes()`). New endpoint file `http-api-managed-stage-accept-contract.ts` is absent. Phase 5.accept.task2 provisional scope (3 files) confirmed.
- **Surface 5 — PM panel / button / client.** Directory `src/client/project-manager/components/application-skeleton/` exists with `application-skeleton-help.tsx` and `application-skeleton-panel.tsx`; no accept-contract button yet. PM service-client pattern lives in `src/client/project-manager/services/` (`workflow-state-client.ts` already exposes `WorkflowStageStatus` / `ContinuityChainSnapshot` for disabled-state derivation). Phase 5.ui.task1 provisional scope (3 files) confirmed.
- **Surface 6 — premature-materialization validation.** Existing `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts` encodes hardcoded draft-wording / `product-parts/**` patterns; no skeleton-map-driven derivation yet. Continuation dispatcher `application-skeleton-continuation-dispatcher.ts::sendApplicationSkeletonContinuationIfReady()` exists but is not yet Phase 1A-aware. Phase 6.materialization.task1 (3 files) and Phase 6.materialization.task3 dispatcher gate (3 files) provisional scopes confirmed.
- **Surface 7 — managed commit boundaries.** Transaction owner: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts::ManagedDocumentationCommitTransaction.commitAcceptedStage()`. Workflow-state integration owner: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts::commitManagedDocumentationStageIfReady()` (currently checks `materialized` flag only — no Phase 1A vs Phase 1B distinction). Both production files and their test peers exist. Phase 4.phase1b.task3 provisional scope (3 files) confirmed.
- **Coverage stubs already present.** `application-skeleton-end-to-end.test.ts` and `application-skeleton-phase-b-rollover.test.ts` exist today as stubs/placeholders; Phase 7.tests.task1 enriches these existing files rather than creating new ones — provisional scope (3 files) still valid.
- **Conclusion.** No provisional microtask scope needs splitting or replacement. Every Phase 2..Phase 7 microtask stays within the ≤3-file limit on the current `HEAD`.

## Phase 2 - Stage Plan Shape And Phase Identity (owner: next agent, updated: 2026-05-10)

### Stream: Managed Stage Plan Seed

5. [DONE] `application-skeleton-orchestration.phase2.stage-plan.task1` Seed the Application Skeleton managed stage todo-plan as Phase 1A draft, Phase 1B open-ended review, Phase 2 materialization, plus reserved handoff anchor; add bootstrap/recovery regression coverage for the seeded task ids and sync the installer regex fixture to the new phase 1A / phase 2 task ids. Bootstrap-gate realignment is split into `phase2.stage-plan.task2`. Scope crosses the ≤3-file guideline by one to keep the seed change atomic with its own existing fixture sync; further fixture migrations (`session-request-handler-managed-context-bundle.test.ts`, `workflow-state-managed-documentation-commit.test.ts`, `workflow-state-service-development-tree-bootstrap.test.ts`) only matter once those modules adopt phased task ids in later phases. (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: seed application skeleton phased stage plan`).
6. [DONE] Git Commit: `fix: seed application skeleton phased stage plan` (hash: 4d844c3bf)

### Stream: Bootstrap Gate Realignment

7. [DONE] `application-skeleton-orchestration.phase2.stage-plan.task2` Realign Development Tree bootstrap gate from the legacy `application-skeleton.stream1.task2` task id to the new `application-skeleton.phase2.materialize.task1` Phase 2 materialization task id, and update the matching gate fixture so the gate continues to recognize the materialization commit on phased managed plans. Quality Gates blocked-task id stays out of scope. The plan microtasks for the two follow-up risk streams (`fixture-migration`, `diagram-test-repair`) are introduced in this same commit to keep the surfaced risks visible. (scope: `packages/core/src/development-tree/development-tree-bootstrap-gate.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: realign development tree bootstrap gate to skeleton phase 2 task id`).
8. [DONE] Git Commit: `fix: realign development tree bootstrap gate to skeleton phase 2 task id` (hash: 2160c7504)

### Stream: Legacy Task Id Fixture Migration

9. [DONE] `application-skeleton-orchestration.phase2.fixture-migration.task1` Migrate hardcoded legacy `application-skeleton.stream1.task1/task2/task3` references in three core fixture tests to the new phased task ids (`application-skeleton.phase1a.draft.task1` / `application-skeleton.phase2.materialize.task1` / `application-skeleton.handoff.task1`) so fixtures stay consistent with the seed shape; preserve each test's existing behavioral assertions. Surfaced as a follow-up risk during `phase2.stage-plan.task1`. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`; expected commit: `test: migrate fixture task ids to phased application skeleton ids`).
10. [DONE] Git Commit: `test: migrate fixture task ids to phased application skeleton ids` (hash: ca93cda55)

### Stream: Diagram Modules Adoption Test Repair

11. [DONE] `application-skeleton-orchestration.phase2.diagram-test-repair.task1` Repair the pre-existing `DIAGRAM_MODULES_PLAN_COMMIT_RE` regex mismatch in the managed-workspace adoption test so it matches the current Diagram Modules seed commit (`docs: update diagram modules product part index`). Strictly outside Application Skeleton scope, but surfaced during `phase2.stage-plan.task1` test runs as a baseline failure on `main`; cleanup is opportunistic because the regex sits in a file already touched by this scope. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`; expected commit: `test: align diagram modules adoption regex to current seed`).
12. [DONE] Git Commit: `test: align diagram modules adoption regex to current seed` (hash: ea24aa7cf)

### Stream: Phase Classifier

13. [DONE] `application-skeleton-orchestration.phase2.classifier.task1` Add an Application Skeleton-specific phase/sub-phase classifier for Phase 1A, Phase 1B and Phase 2, and consume it from post-turn arbitration without introducing a generalized phase metadata runtime. Classifier coverage lives in a sibling test file (`application-skeleton-phase-state.test.ts`) instead of `application-skeleton-progress.test.ts` because folding it into the progress test pushed that file past the 500-line architecture limit; the inline classifier additions briefly committed to `application-skeleton-progress.test.ts` are reverted in the same commit. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, doc/TODO/todo-plan.md`; expected commit: `fix: classify application skeleton orchestration phases`).
14. [DONE] Git Commit: `fix: classify application skeleton orchestration phases` (hash: b6cb007b2)

## Phase 3 - Phase 1A Core-Gated Draft (owner: next agent, updated: 2026-05-10)

### Stream: Draft Structural Guard

15. [DONE] `application-skeleton-orchestration.phase3.phase1a.task1` Implement the Phase 1A post-turn structural guard with the Observe-vs-Dispatch rule and Readiness Resolution table: terminal + owned diff counts as implicit readiness; no terminal never validates; terminal + no diff in Phase 1A produces one non-commit repair decision. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: guard application skeleton draft post-turn`).
16. [DONE] Git Commit: `fix: guard application skeleton draft post-turn` (hash: 6a1e2f199)

### Stream: Phase 1A Corrective Feedback

17. [DONE] `application-skeleton-orchestration.phase3.phase1a.task2` Add Phase 1A corrective feedback text as a pure prompt builder and route corrective decisions through the existing post-turn arbitration contract; the builder must not own state or dispatch decisions. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-feedback.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-feedback.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: send application skeleton draft repair feedback`).
18. [DONE] Git Commit: `fix: send application skeleton draft repair feedback` (hash: 91b23eb63)

### Stream: Read-Model Side-Effect Guard

19. [DONE] `application-skeleton-orchestration.phase3.phase1a.task3` Ensure workflow-state/read-model refreshes may expose Application Skeleton diagnostics but never dispatch provider-visible corrections before the post-turn readiness + terminal boundary. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `fix: keep application skeleton corrections post-turn only`).
20. [DONE] Git Commit: `fix: keep application skeleton corrections post-turn only` (hash: acb91a52f)

## Phase 4 - Phase 1B User Review Revisions (owner: next agent, updated: 2026-05-10)

### Stream: Review Turn Classification

21. [DONE] `application-skeleton-orchestration.phase4.phase1b.task1` Add the Phase 1B revision-vs-discussion classifier: tracked owned Application Skeleton contract diff means revision, no owned diff means standard session-history-only discussion/no-op. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.ts, packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: classify application skeleton review turns`).
22. [DONE] Git Commit: `fix: classify application skeleton review turns` (hash: 1c045f172)

### Stream: Dynamic Revision Plan Injection

23. [DONE] `application-skeleton-orchestration.phase4.phase1b.task2` Inject `revisionN.task1 + Git Commit` pairs before the open-ended Phase 1B review task for each structurally valid artifact-changing revision, then return `currentTaskId` to the open review task after commit. (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `fix: inject application skeleton review revision tasks`).
24. [DONE] Git Commit: `fix: inject application skeleton review revision tasks` (hash: fd15fd327)

### Stream: Per-Revision Managed Commit

25. [DONE] `application-skeleton-orchestration.phase4.phase1b.task3` Reuse the managed commit boundary for Phase 1B accepted revisions while preserving Phase 1A draft and Phase 2 materialization commit semantics. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`; expected commit: `fix: commit application skeleton review revisions`).
26. [DONE] Git Commit: `fix: commit application skeleton review revisions` (hash: c4f12f14a)

## Phase 5 - Accept Contract Command And UI (owner: next agent, updated: 2026-05-10)

### Stream: Core Command Handler

27. [DONE] `application-skeleton-orchestration.phase5.accept.task1` Add a single Core acceptance command handler for Application Skeleton Phase 1B that validates acceptance preconditions, records Option B acceptance state, and marks the session for the existing Phase 2 materialization dispatcher. Scope expanded by two helper modules to keep `managed-workflow-post-turn-service.ts` under the 500-line architecture limit: a new accept-contract runner (`managed-stage-accept-contract-runner.ts`) and an extracted Phase 1B revision-injection runner (`application-skeleton-revision-injection-runner.ts`). (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: handle application skeleton accept contract command`).
28. [DONE] Git Commit: `fix: handle application skeleton accept contract command` (hash: 6ed4d93b4)

### Stream: HTTP Transport

29. [DONE] `application-skeleton-orchestration.phase5.accept.task2` Expose `/api/v1/orchestrator/managed-stage-accept-contract` as transport only; route to the Core command handler and keep route/read-model code side-effect free outside the handler. Scope adds `workflow-state-service.ts` for a thin getter that exposes the existing post-turn service instance to the new HTTP route (no decision logic). (scope: `packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.ts, packages/core/src/remote-bridge/handlers/http-api-router.ts, packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; expected commit: `fix: expose application skeleton accept contract endpoint`).
30. [DONE] Git Commit: `fix: expose application skeleton accept contract endpoint` (hash: ef22ccf32)

### Stream: Typed Fallback Routing

31. [DONE] `application-skeleton-orchestration.phase5.accept.task3` Route typed acceptance fallback through the same Core command handler, gated to Phase 1B acceptance-eligible state only, and ensure matched acceptance text is not delivered as a provider user message. Scope adds a small router module (`application-skeleton-typed-acceptance-router.ts`) and an architecture allowlist entry that documents the residual four-line debt on `session-request-handler-message-dispatch.ts`; production wiring of the Core handler into the dispatch deps remains a follow-up via the new optional callback. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/application-skeleton-typed-acceptance-router.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts, scripts/check-architecture-rules/max-lines-debt-allowlist.txt`; expected commit: `fix: route skeleton typed acceptance through command handler`).
32. [PENDING] Git Commit: `fix: route skeleton typed acceptance through command handler` (hash: TBD)

### Stream: Project Manager Command Surface

33. [TODO] `application-skeleton-orchestration.phase5.ui.task1` Add the PM command client and Application Skeleton `Accept Contract` button with disabled-state reasons derived from workflow-state read-model preconditions only. (scope: `src/client/project-manager/services/managed-stage-accept-contract-client.ts, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.tsx, src/client/project-manager/components/application-skeleton/application-skeleton-panel.tsx`; expected commit: `feat: add application skeleton accept contract button`).
34. [TODO] Git Commit: `feat: add application skeleton accept contract button` (hash: TBD)

## Phase 6 - Premature Materialization And Phase 2 Gate (owner: next agent, updated: 2026-05-10)

### Stream: Premature Materialization Validator

35. [TODO] `application-skeleton-orchestration.phase6.materialization.task1` Add a premature-materialization validator that derives blocked paths/state from the skeleton map and Application Skeleton stage ownership instead of a hardcoded `product-parts/**` glob. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`; expected commit: `fix: block premature application skeleton materialization`).
36. [TODO] Git Commit: `fix: block premature application skeleton materialization` (hash: TBD)

### Stream: Phase 1A/1B Premature Block Integration

37. [TODO] `application-skeleton-orchestration.phase6.materialization.task2` Run the premature-materialization validator from Phase 1A and Phase 1B structural guards, delivering one corrective turn only at the readiness + terminal boundary. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.test.ts`; expected commit: `fix: reject skeleton materialization before acceptance`).
38. [TODO] Git Commit: `fix: reject skeleton materialization before acceptance` (hash: TBD)

### Stream: Phase 2 Dispatcher Gate

39. [TODO] `application-skeleton-orchestration.phase6.materialization.task3` Ensure the existing Application Skeleton materialization dispatcher starts only after the Core acceptance command marker, and does not treat user text or premature `materialized` flips as Phase 2 authority. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts`; expected commit: `fix: gate skeleton materialization on accept command`).
40. [TODO] Git Commit: `fix: gate skeleton materialization on accept command` (hash: TBD)

## Phase 7 - Regression Coverage (owner: next agent, updated: 2026-05-10)

### Stream: Core End-To-End Coverage

41. [TODO] `application-skeleton-orchestration.phase7.tests.task1` Add an end-to-end Application Skeleton A->B->A regression covering draft commit, artifact-changing review commit, no-op review turn without Git commit, premature materialization rejection, acceptance command, Phase 2 dispatcher, and materialization commit. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts`; expected commit: `test: cover application skeleton a-b-a orchestration`).
42. [TODO] Git Commit: `test: cover application skeleton a-b-a orchestration` (hash: TBD)

### Stream: UI And Transport Coverage

43. [TODO] `application-skeleton-orchestration.phase7.tests.task2` Add focused tests for the accept-contract HTTP transport/client/button disabled states without making PM read-model paths responsible for workflow decisions. (scope: `packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts, src/client/project-manager/services/managed-stage-accept-contract-client.test.ts, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.test.tsx`; expected commit: `test: cover application skeleton accept contract surfaces`).
44. [TODO] Git Commit: `test: cover application skeleton accept contract surfaces` (hash: TBD)

## Phase 8 - SSOT Sync (owner: next agent, updated: 2026-05-10)

### Stream: Stable Documentation

45. [TODO] `application-skeleton-orchestration.phase8.docs.task1` Sync the implemented Application Skeleton A->B->A orchestration model into stable SSOT docs, including Core-owned command surface, Observe-vs-Dispatch, Stage Plan Shape, and premature-materialization block. (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`; expected commit: `docs: sync application skeleton phase orchestration ssot`).
46. [TODO] Git Commit: `docs: sync application skeleton phase orchestration ssot` (hash: TBD)

## Phase 9 - Targeted Verification (owner: next agent, updated: 2026-05-10)

### Stream: Build And Test Evidence

47. [TODO] `application-skeleton-orchestration.phase9.verify.task1` Run targeted Core tests for touched handlers, PM component/service tests, `npm run build --workspace @codeai-hub/core`, and `npm run typecheck:webview`; record evidence and any known residual risk in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton phase orchestration verification`).
48. [TODO] Git Commit: `docs: record application skeleton phase orchestration verification` (hash: TBD)

## Phase 10 - Release Build Confirmation Gate (owner: next agent, updated: 2026-05-10)

### Stream: Release Confirmation

49. [TODO] `application-skeleton-orchestration.phase10.release.task1` Ask the user for separate explicit confirmation before preparing release notes, bumping versions, or running release build scripts. (scope: chat/process observation only; no commit required).

### Stream: Release Preparation

50. [TODO] `application-skeleton-orchestration.phase10.release.task2` After explicit confirmation only, update README/CHANGELOG for the future release version and record the release-preparation evidence in this plan before running `build-all.sh`. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton phase orchestration release`).
51. [TODO] Git Commit: `docs: prepare application skeleton phase orchestration release` (hash: TBD)

### Stream: Release Build

52. [TODO] `application-skeleton-orchestration.phase10.release.task3` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton phase orchestration`).
53. [TODO] Git Commit: `build: release application skeleton phase orchestration` (hash: TBD)

## Phase 11 - User Workflow Acceptance Testing (owner: user, updated: 2026-05-10)

### Stream: VSIX Retest

54. [TODO] `application-skeleton-orchestration.phase11.acceptance.task1` User installs the new VSIX and retests Application Skeleton: Phase 1A draft repair, Phase 1B user revision/no-op turns, Accept Contract button, typed fallback if retained, premature-materialization block, Phase 2 materialization commit, and downstream handoff. (scope: chat/process observation only; no commit required).

## Phase 12 - Scope Closeout (owner: next agent, updated: 2026-05-10)

### Stream: Closeout After Acceptance

55. [TODO] `application-skeleton-orchestration.phase12.closeout.task1` After explicit user acceptance, archive this plan, decide final disposition for the planning document, update `Docs_Index.md` if needed, and leave active state terminal `NONE`. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close application skeleton phase orchestration implementation`).
56. [TODO] Git Commit: `docs: close application skeleton phase orchestration implementation` (hash: TBD)
57. [TODO] `application-skeleton-orchestration.phase12.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
