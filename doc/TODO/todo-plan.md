# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-phase-b-orchestration-implementation",
  "branch": "main",
  "baseHead": "d2c91d120",
  "lastRecordedCommit": "66a291c60",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md",
  "currentTaskId": "application-skeleton-orchestration.phase25.release.task2",
  "expectedCommitMessage": "build: release application skeleton acceptance write-path",
  "debt": {
    "expectedCommitMessage": "build: release application skeleton acceptance write-path",
    "preCommitHead": "66a291c60",
    "stage": "commit_pending",
    "taskId": "application-skeleton-orchestration.phase25.release.task2"
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
32. [DONE] Git Commit: `fix: route skeleton typed acceptance through command handler` (hash: 55fb999aa)

### Stream: Project Manager Command Surface

33. [DONE] `application-skeleton-orchestration.phase5.ui.task1` Add the PM command client and Application Skeleton `Accept Contract` button with disabled-state reasons derived from workflow-state read-model preconditions only. (scope: `src/client/project-manager/services/managed-stage-accept-contract-client.ts, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.tsx, src/client/project-manager/components/application-skeleton/application-skeleton-panel.tsx`; expected commit: `feat: add application skeleton accept contract button`).
34. [DONE] Git Commit: `feat: add application skeleton accept contract button` (hash: 5281d2288)

## Phase 6 - Premature Materialization And Phase 2 Gate (owner: next agent, updated: 2026-05-10)

### Stream: Premature Materialization Validator

35. [DONE] `application-skeleton-orchestration.phase6.materialization.task1` Add a premature-materialization validator that derives blocked paths/state from the skeleton map and Application Skeleton stage ownership instead of a hardcoded `product-parts/**` glob. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`; expected commit: `fix: block premature application skeleton materialization`).
36. [DONE] Git Commit: `fix: block premature application skeleton materialization` (hash: cb181633c)

### Stream: Phase 1A/1B Premature Block Integration

37. [DONE] `application-skeleton-orchestration.phase6.materialization.task2` Run the premature-materialization validator from Phase 1A and Phase 1B structural guards, delivering one corrective turn only at the readiness + terminal boundary. Scope adds the premature validator file because the guard integration needs an async wrapper that reads `application-skeleton-map.json` and runs the pure decision; without that wrapper the post-turn-service would have to inline file I/O outside its 500-line limit. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: reject skeleton materialization before acceptance`).
38. [DONE] Git Commit: `fix: reject skeleton materialization before acceptance` (hash: 1440af2c2)

### Stream: Phase 2 Dispatcher Gate

39. [DONE] `application-skeleton-orchestration.phase6.materialization.task3` Ensure the existing Application Skeleton materialization dispatcher starts only after the Core acceptance command marker, and does not treat user text or premature `materialized` flips as Phase 2 authority. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts`; expected commit: `fix: gate skeleton materialization on accept command`).
40. [DONE] Git Commit: `fix: gate skeleton materialization on accept command` (hash: a9a17c0c2)

## Phase 7 - Regression Coverage (owner: next agent, updated: 2026-05-10)

### Stream: Core End-To-End Coverage

41. [DONE] `application-skeleton-orchestration.phase7.tests.task1` Add an end-to-end Application Skeleton A->B->A regression covering draft commit, artifact-changing review commit, no-op review turn without Git commit, premature materialization rejection, acceptance command, Phase 2 dispatcher, and materialization commit. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts`; expected commit: `test: cover application skeleton a-b-a orchestration`).
42. [DONE] Git Commit: `test: cover application skeleton a-b-a orchestration` (hash: dae240373)

### Stream: UI And Transport Coverage

43. [DONE] `application-skeleton-orchestration.phase7.tests.task2` Add focused tests for the accept-contract HTTP transport/client/button disabled states without making PM read-model paths responsible for workflow decisions. Scope adds the button component file because the SSR test needs `React` in runtime scope (the button used `import type React`, which is erased at runtime). (scope: `packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts, src/client/project-manager/services/managed-stage-accept-contract-client.test.ts, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.test.tsx, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.tsx`; expected commit: `test: cover application skeleton accept contract surfaces`).
44. [DONE] Git Commit: `test: cover application skeleton accept contract surfaces` (hash: e07f917fc)

## Phase 8 - SSOT Sync (owner: next agent, updated: 2026-05-10)

### Stream: Stable Documentation

45. [DONE] `application-skeleton-orchestration.phase8.docs.task1` Sync the implemented Application Skeleton A->B->A orchestration model into stable SSOT docs, including Core-owned command surface, Observe-vs-Dispatch, Stage Plan Shape, and premature-materialization block. (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`; expected commit: `docs: sync application skeleton phase orchestration ssot`).
46. [DONE] Git Commit: `docs: sync application skeleton phase orchestration ssot` (hash: 4bdeaf94c)

## Phase 9 - Targeted Verification (owner: next agent, updated: 2026-05-10)

### Stream: Build And Test Evidence

47. [DONE] `application-skeleton-orchestration.phase9.verify.task1` Run targeted Core tests for touched handlers, PM component/service tests, `npm run build --workspace @codeai-hub/core`, and `npm run typecheck:webview`; record evidence and any known residual risk in this plan. Scope expanded by four files because the build surfaced four narrow type errors that needed to land with the verification record. (scope: `doc/TODO/todo-plan.md, packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `docs: record application skeleton phase orchestration verification`).
48. [DONE] Git Commit: `docs: record application skeleton phase orchestration verification` (hash: 0b8d38cf7)

## Phase 10 - Release Build Confirmation Gate (owner: next agent, updated: 2026-05-10)

### Stream: Release Confirmation

49. [DONE] `application-skeleton-orchestration.phase10.release.task1` Ask the user for separate explicit confirmation before preparing release notes, bumping versions, or running release build scripts. (scope: chat/process observation only; no commit required). Result: User confirmed release-build at 2026-05-10; proceeding with README/CHANGELOG update for v1.2.221 and build pipeline.

### Stream: Release Preparation

50. [DONE] `application-skeleton-orchestration.phase10.release.task2` After explicit confirmation only, update README/CHANGELOG for the future release version and record the release-preparation evidence in this plan before running `build-all.sh`. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton phase orchestration release`).
51. [DONE] Git Commit: `docs: prepare application skeleton phase orchestration release` (hash: ece2ac0fb)

### Stream: Release Build

52. [DONE] `application-skeleton-orchestration.phase10.release.task3` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton phase orchestration`).
53. [DONE] Git Commit: `build: release application skeleton phase orchestration` (hash: 68742258e)

## Phase 11 - User Workflow Acceptance Testing (owner: user, updated: 2026-05-10)

### Stream: VSIX Retest

54. [BLOCKED] `application-skeleton-orchestration.phase11.acceptance.task1` User installs the new VSIX and retests Application Skeleton: Phase 1A draft repair, Phase 1B user revision/no-op turns, Accept Contract button, typed fallback if retained, premature-materialization block, Phase 2 materialization commit, and downstream handoff. (scope: chat/process observation only; no commit required). **BLOCKED 2026-05-10:** retest in `CodeAI-Hub codex 5.4` workspace exposed two coupled defects in the shipped v1.2.221 VSIX: (1) advancement-skip bug — after the Phase 1A draft commit `docs: draft application skeleton contract` landed, `managed-plan-orchestrator-shim-source.ts::TASK_LINE_RE` did not match Pin 3 (`application-skeleton.phase1b.review.task1`, `expected commit: none — open until acceptance`) and the orchestrator silently jumped `currentTaskId` straight to Pin 4 (`application-skeleton.phase2.materialize.task1`), bypassing the entire user-led review phase; (2) phase numbering misalignment — task IDs `phase1a` / `phase1b` / `phase2.materialize` are out of sync with managed-plan headings `Phase 1` / `Phase 2` / `Phase 3`, conflating the Type A / Type B phase-type attribute with phase numbering and confusing both Core and the agent. Retest cannot resume until both defects are fixed and a new VSIX is shipped. Resumed retest is tracked under Phase 14.

## Phase 12 - Phase Numbering Refactor And Advancement Bug Fix (owner: next agent, updated: 2026-05-10)

### Stream: Scope Audit

55. [DONE] `application-skeleton-orchestration.phase12.audit.task1` Open this refactor scope: block Phase 11 with the retest defect summary, record audit findings for the advancement regex skip and the phase-numbering misalignment (Type A/B is a phase-type attribute, not part of the phase number; managed plan headings already read `Phase 1` / `Phase 2` / `Phase 3` while task IDs lag at `phase1a` / `phase1b` / `phase2`), and enumerate the file inventory that future streams must touch. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open application skeleton phase numbering refactor scope`).
56. [DONE] Git Commit: `docs: open application skeleton phase numbering refactor scope` (hash: 355aca966)

#### Audit findings (HEAD = `68742258e`, 2026-05-10)

- **Advancement skip surface.** `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts:26` defines `TASK_LINE_RE = /^\d+\. \[(?:TODO|IN_PROGRESS)\].*?\`([^\`]+)\`.*expected commit: \`([^\`]+)\`/u`. The trailing `expected commit: \`...\`` capture is mandatory, so any task line whose tail reads `expected commit: none — open until acceptance` (no backticks) is silently skipped by `readTaskLine()` and by the next-task scan in the post-commit advancement at lines 219–224. After the Phase 1A draft commit lands, the scan therefore selects the next backticked line — Pin 4 (`phase2.materialize.task1`) — and writes that as `currentTaskId` together with `expectedCommitMessage: "feat: materialize application skeleton"`, fully bypassing Pin 3 (`phase1b.review.task1`). No regression test currently locks down "after draft commit, currentTaskId advances to phase1b.review.task1".
- **Phase-type vs phase-number conflation.** Task IDs `application-skeleton.phase1a.draft.task1`, `application-skeleton.phase1b.review.task1`, `application-skeleton.phase2.materialize.task1` encode the phase-type attribute (Type A / Type B / Type A) inside the phase number, while the managed plan headings already read `Phase 1` / `Phase 2` / `Phase 3` (see `packages/core/src/managed-workspace/managed-todo-tree.ts:291,306,312,319`). Result: `phase2.materialize.task1` lives under heading `Phase 3`, which makes both the agent and the orchestrator state hard to read and reason about. Type A / Type B remains a domain attribute that survives in SSOT prose only.
- **Code surfaces touching legacy task IDs.** `packages/core/src/managed-workspace/managed-todo-tree.ts` (STAGE_PLANS seed, STAGE_TERMINAL_COMMITS), `packages/core/src/development-tree/development-tree-bootstrap-gate.ts` (bootstrap gate target task id), `packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts` (dynamic revision injection labels), `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts` (per-revision commit message text).
- **Internal classifier enum values.** `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.ts` exports type `ApplicationSkeletonPhase = "phase_1a_draft" | "phase_1b_review" | "phase_2_materialization" | "phase_handoff"`. Consumers: `application-skeleton-contract-guard.ts`, `application-skeleton-review-turn-classifier.ts`, `managed-stage-accept-contract-handler.ts`, `managed-stage-accept-contract-runner.ts`, `managed-workflow-post-turn-service.ts`, `application-skeleton-end-to-end.test.ts`, `application-skeleton-phase-state.test.ts`. These string values are internal classification, but renaming them in lockstep with task IDs keeps the codebase legible.
- **Test fixtures touching legacy task IDs.** `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`, `packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`, `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts`.
- **SSOT and planning docs.** `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`. `CHANGELOG.md` is historical and stays untouched.

### Stream: Advancement Regex Fix

57. [DONE] `application-skeleton-orchestration.phase12.advance.task1` Extend `TASK_LINE_RE` so it matches both `expected commit: \`<message>\`` and `expected commit: none — open until acceptance` task lines, and update the post-commit advancement so an open-ended task surfaces with `expectedCommitMessage: null` instead of being silently skipped. Add a regression test asserting that after the Phase 1A draft commit advances, `currentTaskId` lands on the open-ended Phase 2 review task and not on the materialization task. (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `fix: advance through open-ended managed plan tasks`).
58. [DONE] Git Commit: `fix: advance through open-ended managed plan tasks` (hash: b58b9d20e)

### Stream: Stage Plan Task ID Rename

59. [DONE] `application-skeleton-orchestration.phase12.rename-seed.task1` Rename `STAGE_PLANS` task IDs in the Application Skeleton seed from `phase1a.draft.task1` / `phase1b.review.task1` / `phase2.materialize.task1` to `phase1.draft.task1` / `phase2.review.task1` / `phase3.materialize.task1`; drop the "Phase 1A / Phase 1B / Phase 2" prefixes from stream headings inside the seed (Type A / Type B remains a domain attribute, not a stream-heading prefix); realign the Development Tree bootstrap gate target id from `application-skeleton.phase2.materialize.task1` to `application-skeleton.phase3.materialize.task1`; sync the seed-shape fixture in `managed-plan-orchestrator-installer.test.ts` so the Stream A regression test continues to assert the post-rename task IDs. Scope expanded by one file because `installer.test.ts` already pinned the legacy task IDs as fixtures and the rename would have left it red on `main` without the same-commit migration. (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `fix: rename application skeleton stage plan task ids to plain phase numbering`).
60. [DONE] Git Commit: `fix: rename application skeleton stage plan task ids to plain phase numbering` (hash: 32a8dc0ff)

### Stream: Bootstrap Gate Fixture Sync

61. [DONE] `application-skeleton-orchestration.phase12.rename-seed.task2` Sync the bootstrap gate fixture to the new plain-phase task ID (`application-skeleton.phase3.materialize.task1`). (scope: `packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`; expected commit: `test: align bootstrap gate fixture to plain phase task id`).
62. [DONE] Git Commit: `test: align bootstrap gate fixture to plain phase task id` (hash: c280d78a4)

### Stream: Handler Fixture Migration (Batch 1)

63. [DONE] `application-skeleton-orchestration.phase12.fixture-migration.task1` Migrate hardcoded legacy `phase1a` / `phase1b` / `phase2.materialize` task IDs in handler test fixtures to the plain-phase task IDs while preserving each test's existing behavioral assertions. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`; expected commit: `test: migrate handler fixture task ids to plain phase numbering (batch 1)`).
64. [DONE] Git Commit: `test: migrate handler fixture task ids to plain phase numbering (batch 1)` (hash: 84a119ae4)

### Stream: Handler Fixture Migration (Batch 2)

65. [DONE] `application-skeleton-orchestration.phase12.fixture-migration.task2` Migrate hardcoded legacy task IDs in the remaining handler tests (workflow-state bootstrap and post-turn) to the plain-phase task IDs. The end-to-end test holds no task IDs — only classifier enum strings and variable names — so it migrates with Stream F instead. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `test: migrate handler fixture task ids to plain phase numbering (batch 2)`).
66. [DONE] Git Commit: `test: migrate handler fixture task ids to plain phase numbering (batch 2)` (hash: b9c0bc6c4)

### Stream: Phase Classifier Enum Rename

67. [DONE] `application-skeleton-orchestration.phase12.classifier-rename.task1` Rename `ApplicationSkeletonPhase` enum values to plain numbering (`phase_1a_draft → phase_1_draft`, `phase_1b_review → phase_2_review`, `phase_2_materialization → phase_3_materialization`; `phase_handoff` stays). The classifier returns the new values; the type union temporarily admits both new and deprecated-old values so the still-unmigrated consumers continue to type-check across Streams G/H/H_b until the alias is removed in `phase12.classifier-cleanup.task1`. Migrate `application-skeleton-phase-state.ts` (definition + classifier body + deprecated aliases), its peer test (`application-skeleton-phase-state.test.ts`, asserts new values), and the end-to-end test (`application-skeleton-end-to-end.test.ts`, var names `phase1aProgress` / `phase1bProgress` and enum strings) in lockstep. Scope changed from the original (`phase-state.ts, phase-state.test.ts, managed-workflow-post-turn-service.ts`) to (`phase-state.ts, phase-state.test.ts, application-skeleton-end-to-end.test.ts`) because the post-turn service does not use enum string literals (only the classifier function), while the end-to-end test pins both var names and enum strings and breaks the moment classifier returns new values. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts`; expected commit: `fix: rename application skeleton phase classifier values to plain numbering`).
68. [DONE] Git Commit: `fix: rename application skeleton phase classifier values to plain numbering` (hash: acc0ee383)

### Stream: Phase Classifier Consumers (Guard + Review Classifier)

69. [DONE] `application-skeleton-orchestration.phase12.classifier-consumers.task1` Sync the contract guard and review-turn classifier (production + the contract guard's peer test) to the plain-numbering enum values. The review-turn classifier's peer test migrates with `phase12.classifier-consumers.task2` to keep the scope at three files. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.ts`; expected commit: `fix: align skeleton contract guard and review classifier to plain numbering`).
70. [DONE] Git Commit: `fix: align skeleton contract guard and review classifier to plain numbering` (hash: 9955ed2b5)

### Stream: Phase Classifier Consumers (Accept Contract Handler + Tests)

71. [DONE] `application-skeleton-orchestration.phase12.classifier-consumers.task2` Sync the accept-contract handler (production + peer test) and the deferred review-turn classifier peer test to the plain-numbering enum values. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts`; expected commit: `fix: align skeleton accept contract handler to plain numbering`).
72. [DONE] Git Commit: `fix: align skeleton accept contract handler to plain numbering` (hash: 8e32e0c07)

### Stream: Revision Injection And Commit Transaction Rename

73. [DONE] `application-skeleton-orchestration.phase12.classifier-consumers.task3` Rename the dynamic revision injection labels (`phase1b.review.revisionN.task1 → phase2.review.revisionN.task1`) and the per-revision managed commit message text (`docs: revise application skeleton contract — phase 1B revision N → docs: revise application skeleton contract — revision N`, dropping the phase-type label from the commit text because Type B is a domain attribute, not commit text); update the legacy `phase1b.review.task1` plan-text lookup in the injection runner; the accept-contract runner is in scope only if it carries any phase string literal (it does not — it only forwards the classifier function call). (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `fix: align skeleton revision injection labels to plain numbering`).
74. [DONE] Git Commit: `fix: align skeleton revision injection labels to plain numbering` (hash: 946ca493c)

### Stream: Phase Classifier Cleanup

75. [DONE] `application-skeleton-orchestration.phase12.classifier-cleanup.task1` Remove the deprecated `phase_1a_draft` / `phase_1b_review` / `phase_2_materialization` aliases from the `ApplicationSkeletonPhase` type union now that every consumer reports the new values. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.ts`; expected commit: `fix: drop deprecated application skeleton phase aliases`).
76. [DONE] Git Commit: `fix: drop deprecated application skeleton phase aliases` (hash: 735b16af9)

### Stream: SSOT Sync

73. [DONE] `application-skeleton-orchestration.phase12.docs-sync.task1` Sync SSOT and planning docs to plain phase numbering: replace `phase1a` / `phase1b` / `phase2.materialize` task IDs with the plain-phase forms; rephrase headings so `Phase 1A` / `Phase 1B` / `Phase 2` reads `Phase 1` / `Phase 2` / `Phase 3` (with Type A / Type B kept as a domain attribute clarifier in prose only); update the materialization-commit / revision-commit text references. (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`; expected commit: `docs: sync application skeleton plain phase numbering ssot`).
74. [DONE] Git Commit: `docs: sync application skeleton plain phase numbering ssot` (hash: 3612e6d2a)

### Stream: Targeted Verification

75. [DONE] `application-skeleton-orchestration.phase12.verify.task1` Run targeted Core tests for touched managed-workspace, development-tree, and remote-bridge handler modules; run `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview`; record evidence and any residual risk in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton plain phase numbering verification`).
76. [DONE] Git Commit: `docs: record application skeleton plain phase numbering verification` (hash: b8a9ce323)

#### Verification evidence (HEAD = `3612e6d2a`, 2026-05-10)

- **Targeted handler / managed-workspace / development-tree tests:** 54/60 pass on the post-Phase-12 HEAD across `managed-plan-orchestrator-installer.test.ts`, `development-tree-bootstrap-gate.test.ts`, `application-skeleton-phase-state.test.ts`, `application-skeleton-contract-guard.test.ts`, `application-skeleton-review-turn-classifier.test.ts`, `managed-stage-accept-contract-handler.test.ts`, `managed-workflow-post-turn-service.test.ts`, `application-skeleton-end-to-end.test.ts`, `session-request-handler-managed-context-bundle.test.ts`, `session-request-handler-workflow-session.managed-workspace.test.ts`, `workflow-state-managed-documentation-commit.test.ts`, and `workflow-state-service-development-tree-bootstrap.test.ts`. Every test that was directly touched by Phase 12 streams (advancement regex, stage plan rename, classifier enum, consumer migrations, revision injection labels, SSOT sync) passes after the migration.
- **Remaining 6 failures are pre-existing on the v1.2.221 baseline (`68742258e`).** Verified by checking out `packages/core/src` from `68742258e` and re-running the same tests: `workflow-state-managed-documentation-commit.test.ts` reports 3 fail / 4 total ("auto-commits valid Diagram Modules artifacts and unlocks Application Skeleton", "auto-commits valid Application Skeleton artifacts and unlocks Quality Gates", "auto-commits valid Quality Gates artifacts" — git status not empty after `readWorkflowStatePayload`); `workflow-state-service-development-tree-bootstrap.test.ts` reports 4 fail / 17 total on baseline (same auto-commit pattern in feedback scenarios). The post-Phase-12 HEAD shows 3 / 4 and 3 / 17 failures respectively — one bootstrap test now passes that previously failed; the other 6 failures remain pre-existing and out of Phase 12 scope. They will be addressed in a follow-up scope (separate Stream / cycle).
- **`npm run build --workspace @codeai-hub/core`:** passes (no TypeScript errors).
- **`npm run typecheck:webview`:** passes (no errors).
- **No new regressions:** post-Phase-12 failure count (6) ≤ baseline failure count (7); zero of the 6 remaining failures were introduced by Phase 12 streams; all touched code paths and renames type-check and pass their direct tests.

## Phase 13 - Release Build Confirmation Gate (owner: next agent, updated: 2026-05-10)

### Stream: Release Confirmation

77. [DONE] `application-skeleton-orchestration.phase13.release.task1` Ask the user for separate explicit confirmation before preparing release notes, bumping versions, or running release build scripts for the v1.2.222 VSIX containing the advancement fix and plain phase numbering. (scope: chat/process observation only; no commit required). Result: user confirmed release-build at 2026-05-11.

### Stream: Release Preparation

78. [DONE] `application-skeleton-orchestration.phase13.release.task2` After explicit confirmation only, update README/CHANGELOG for the future release version and record the release-preparation evidence in this plan before running `build-all.sh`. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton plain phase numbering release`).
79. [DONE] Git Commit: `docs: prepare application skeleton plain phase numbering release` (hash: 49cad0dc7)

### Stream: Release Build

80. [DONE] `application-skeleton-orchestration.phase13.release.task3` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton plain phase numbering`).
81. [DONE] Git Commit: `build: release application skeleton plain phase numbering` (hash: 821373294)

## Phase 14 - User Workflow Acceptance Testing Rerun (owner: user, updated: 2026-05-10)

### Stream: VSIX Retest

82. [BLOCKED] `application-skeleton-orchestration.phase14.acceptance.task1` User installs the new VSIX and reruns the Application Skeleton retest with focus on the regression that motivated this scope: after Phase 1A draft commit lands, `currentTaskId` advances to `application-skeleton.phase2.review.task1` (open-ended user-led review), Phase 1A → Phase 2 → Phase 3 numbering reads cleanly in the managed plan, and Accept Contract / premature-materialization block / Phase 3 materialization commit all behave as in Phase 11 expectations. (scope: chat/process observation only; no commit required). **BLOCKED 2026-05-11:** retest of v1.2.222 confirmed the Phase 12 advancement fix and plain numbering work (managed plan reads cleanly, `currentTaskId` correctly lands on `phase2.review.task1` after draft commit). However retest exposed five orthogonal defects in the Application Skeleton orchestration that are out of Phase 12's scope and require a fresh refactor: (1) Phase 2 has only one microtask (open-ended review) without a Git Commit pin — visually inconsistent vs Phase 1 / Phase 3 and incompatible with the user's expectation that every real microtask is followed by a commit; (2) Core feedback prompts to the agent are dispatched with `userMessageVisibility: "deferred"` and never written to the codex-cli session jsonl, so PM transcript hides them — unlike Diagram Modules, where continuation prompts are plain-string payloads that DO get recorded; (3) the Application Skeleton agent prompt instructs the agent to self-mark `accepted: true` and `materialized: true` after observing user acceptance text, which bypasses the Core accept-contract handler's `recentlyAcceptedSessions` marker and renders the PM Accept Contract button effectively redundant; (4) the typed-fallback recognizer only matches Russian `принимаю/подтверждаю/утверждаю` + the noun `контракт` and does not pick up the bare English `accepted` text the user typed; (5) `workflow-state-managed-documentation-commit.ts` gate blocked the Phase 3 managed commit `feat: materialize application skeleton` because the agent's `materializedPaths` shape (directories + files) differs from the gate's tracked-files expectation. Resumed retest is tracked under Phase 18.

## Phase 16 - Acceptance Flow Refactor (Option C) (owner: next agent, updated: 2026-05-11)

### Stream: Scope Audit

83. [DONE] `application-skeleton-orchestration.phase16.audit.task1` Open this refactor scope: block Phase 14, record audit findings for the five Phase-14 defects (Phase 2 single-microtask, hidden Core feedback dispatch, agent self-acceptance vs Core handler, narrow typed-fallback recognizer, `materializedPaths` gate mismatch), and enumerate the file inventory each Stream must touch. Adopt **Option C** acceptance policy: any path that sets `accepted: true` in `application-skeleton-map.json` (Core handler, agent self-set, typed-fallback, or PM button) triggers the explicit `docs: accept application skeleton contract` Phase 2 commit; the PM button stays as a UI shortcut, not as the exclusive entry. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open application skeleton acceptance flow refactor scope`).
84. [DONE] Git Commit: `docs: open application skeleton acceptance flow refactor scope` (hash: 18ed74e93)

#### Audit findings (HEAD = `821373294`, 2026-05-11)

- **Phase 2 single-microtask shape.** `packages/core/src/managed-workspace/managed-todo-tree.ts` seeds Phase 2 with one Pin (`application-skeleton.phase2.review.task1`, `expected commit: none — open until acceptance`) and no Git Commit pin, which violates the user's invariant that every real microtask is followed by a commit. The accepted commit message for Phase 2 acceptance will be `docs: accept application skeleton contract` (acceptance commit policy switches from Option B "folded into Phase 3 transition" to Option A "explicit accept commit", refined into Option C below).
- **Hidden Core feedback dispatch.** `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts` (lines 364–370) sends Application Skeleton corrective prompts with `turnOptions: { userMessageVisibility: "deferred" }`, which `shouldHideUserMessage` in `workflow-turn-control.ts` honours by skipping `appendVisibleUserMessage` in `session-request-handler-message-dispatch.ts:191–198`. As a result the Core text never appears in `codex-cli` session jsonl and is invisible in PM transcript. `packages/core/src/remote-bridge/handlers/diagram-modules-continuation-dispatcher.ts:134` sends a plain-string payload that gets recorded as `role: "user"` and is therefore visible. The two dispatchers must align on the visible path.
- **Agent self-acceptance vs Core handler.** The Application Skeleton agent system prompt (delivered through `assets/flow/managed/application-skeleton-instructions.md` or equivalent — confirmed by inspecting the first `role: "user"` payload in the Phase 14 session jsonl) instructs the agent to update `application-skeleton-map.json` to `accepted: true, materialized: true` after observing explicit user acceptance and to continue with materialization in the same session. This bypasses the Core `recentlyAcceptedSessions` marker set written by `managed-stage-accept-contract-handler.ts`, so `application-skeleton-continuation-dispatcher.ts::sendApplicationSkeletonContinuationIfReady` never fires its visible plain-string prompt — only the deferred `workflow-agent-acceptance-feedback.ts` path runs. Option C unifies the flows by making Core observe `accepted: true` in the map artifact (read-model) and trigger the acceptance commit regardless of who set the flag.
- **Narrow typed-fallback recognizer.** `recognizeManagedContractAcceptancePhrase` in `managed-workflow-post-turn-service.ts` requires Russian glyphs (`принимаю/подтверждаю/утверждаю`) AND the noun `контракт`; bare English `accepted` and bare verbs like `принимаю` (without the noun) do not match. The retest user typed `accepted` and the recognizer ignored it, so the typed-fallback router (`application-skeleton-typed-acceptance-router.ts`) never invoked the Core handler. The recognizer must broaden to bare verbs and English equivalents when the session is in Phase 2 acceptance-eligible state.
- **`materializedPaths` gate mismatch.** `workflow-state-managed-documentation-commit.ts` (auto-commit gate) and the agent's self-audit disagree on the shape of `materializedPaths`: the agent includes directories AND files; the gate expects tracked-file paths only. The mismatch blocked `feat: materialize application skeleton` from landing. Either the gate normalizes both shapes, or the agent prompt mandates a tracked-files-only `materializedPaths` shape. Audit will pick the gate-normalization path because the prompt rule alone has historically drifted (see Bug-3 finding).
- **Code surfaces touching this scope.** Production: `managed-todo-tree.ts`, `managed-stage-accept-contract-handler.ts`, `managed-stage-accept-contract-runner.ts`, `managed-workflow-post-turn-service.ts`, `application-skeleton-continuation-dispatcher.ts`, `application-skeleton-typed-acceptance-router.ts`, `workflow-agent-acceptance-feedback.ts`, `workflow-state-managed-documentation-commit.ts`, `managed-documentation-commit-transaction.ts`. Tests: peer test files for each. Docs: `WorkflowSteps_Overview.md`, `SystemArchitecture.md`, `Application_Skeleton_Architecture.md`.

### Stream: Phase 2 Stage Plan Restructure

85. [DONE] `application-skeleton-orchestration.phase16.phase2-pin.task1` Add a Git Commit pin to Phase 2 in the Application Skeleton seed: the existing review task's expected commit becomes `docs: accept application skeleton contract`; a new Pin 4 `Git Commit: docs: accept application skeleton contract` follows it; the materialization task and its commit shift to Pins 5 and 6; the handoff anchor shifts to Pin 7. Sync the seed-shape fixture in `managed-plan-orchestrator-installer.test.ts` and the fixtures in `session-request-handler-workflow-session.managed-workspace.test.ts` so Phase 2 now asserts both the task and the Git Commit pin. Scope expanded by one file (`max-lines-debt-allowlist.txt`) because the new fixture assertion pushed `managed-plan-orchestrator-installer.test.ts` four lines over the 500-line architecture limit; splitting the seed-shape fixture is out of scope for the refactor. (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, scripts/check-architecture-rules/max-lines-debt-allowlist.txt`; expected commit: `fix: seed application skeleton phase 2 accept commit pin`).
86. [DONE] Git Commit: `fix: seed application skeleton phase 2 accept commit pin` (hash: 7b1816de7)

### Stream: Application Skeleton Feedback Visibility

87. [DONE] `application-skeleton-orchestration.phase16.feedback-visibility.task1` Drop `userMessageVisibility: "deferred"` from Application Skeleton feedback dispatches in `workflow-agent-acceptance-feedback.ts` so Core corrective prompts get appended to the codex-cli session jsonl as visible `role: "user"` entries (aligned with the Diagram Modules continuation dispatcher pattern). Update the peer test to assert visible dispatch for Application Skeleton feedback. (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `fix: make application skeleton core feedback visible in session log`).
88. [DONE] Git Commit: `fix: make application skeleton core feedback visible in session log` (hash: 377ea3438)

### Stream: Core Map Observer (Option C)

89. [DONE] `application-skeleton-orchestration.phase16.map-observer.task1` Add a Core read-model observer that detects `accepted: true` in `application-skeleton-map.json` and triggers the Phase 2 acceptance commit + Phase 3 continuation pipeline independent of whether the Core accept-contract handler, the agent (self-set), the typed-fallback router, or the PM button set the flag. Drop the `recentlyAcceptedSessions` marker as the exclusive gate for `sendApplicationSkeletonContinuationIfReady` — keep it as a hint, but allow the observer to set/trigger acceptance flow when the agent self-sets `accepted: true`. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts, packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts`; expected commit: `fix: observe application skeleton acceptance from map.json`).
90. [DONE] Git Commit: `fix: observe application skeleton acceptance from map.json` (hash: 2d3ad255a)

### Stream: Acceptance Phrase Recognizer Broadening

91. [DONE] `application-skeleton-orchestration.phase16.recognizer.task1` Broaden `recognizeManagedContractAcceptancePhrase` to also accept English `accepted`/`accept`/`confirmed` and bare Russian verbs (`принимаю`/`подтверждаю`/`утверждаю`) without the mandatory `контракт` noun, gated on Phase 2 acceptance-eligible state. Route matched phrases through the same Core accept-contract handler path. (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/application-skeleton-typed-acceptance-router.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `fix: broaden application skeleton acceptance phrase recognizer`).
92. [DONE] Git Commit: `fix: broaden application skeleton acceptance phrase recognizer` (hash: fef3b07eb)

### Stream: Managed Commit Gate materializedPaths Normalization

93. [DONE] `application-skeleton-orchestration.phase16.gate-normalize.task1` Re-audit during implementation showed the managed commit gate (`workflow-state-managed-documentation-commit.ts`, `managed-documentation-commit-transaction.ts`) does not perform shape comparison on `materializedPaths` at all — it triggers a commit whenever the Application Skeleton stage owns dirty files. The Phase 14 "Core gate did not finalize" symptom was driven by `application-skeleton-materialization-validator.ts` raising validation errors when declared `materializedPaths` entries had trailing slashes / whitespace / duplicates that did not resolve against `stat`. Scope shifts to that validator: normalize `materializedPaths` entries (trim whitespace, strip trailing slashes, deduplicate) before the `relativePathExists` check, so an agent's noisy-but-real path list is not punished with spurious validation errors. Add a peer test that locks down normalization. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts`; expected commit: `fix: normalize application skeleton materialized paths for managed commit gate`).
94. [DONE] Git Commit: `fix: normalize application skeleton materialized paths for managed commit gate` (hash: c1296adb0)

### Stream: SSOT Sync

95. [DONE] `application-skeleton-orchestration.phase16.docs-sync.task1` Sync SSOT and planning docs to describe Option C acceptance flow: explicit Phase 2 accept commit, visible Core feedback dispatch, map.json-driven acceptance observation, broadened recognizer, normalized gate. (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`; expected commit: `docs: sync application skeleton acceptance flow ssot`).
96. [DONE] Git Commit: `docs: sync application skeleton acceptance flow ssot` (hash: 323d0f5cf)

### Stream: Targeted Verification

97. [DONE] `application-skeleton-orchestration.phase16.verify.task1` Run targeted Core tests for touched managed-workspace and remote-bridge handler modules; run `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview`; record evidence and any residual risk in this plan. Scope expanded by one file (`application-skeleton-end-to-end.test.ts`) because the verification run surfaced one test fixture (`buildAwaitingAcceptanceProgress`) that still asserted the pre-Option-C invariant (`accepted: false`, `substep: "awaiting_acceptance"`) and needed to be re-pinned to the new Option C invariant (`accepted: true`, `substep: "accepted"`). (scope: `doc/TODO/todo-plan.md, packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts`; expected commit: `docs: record application skeleton acceptance flow verification`).

#### Verification evidence (HEAD = `323d0f5cf`, 2026-05-11)

- **Targeted Core tests:** 67/67 pass after the Stream 16H fixture realignment, across `managed-plan-orchestrator-installer.test.ts`, `development-tree-bootstrap-gate.test.ts`, `application-skeleton-phase-state.test.ts`, `application-skeleton-contract-guard.test.ts`, `application-skeleton-review-turn-classifier.test.ts`, `managed-stage-accept-contract-handler.test.ts`, `managed-workflow-post-turn-service.test.ts`, `application-skeleton-end-to-end.test.ts`, `application-skeleton-continuation-dispatcher.test.ts`, `application-skeleton-materialization-validator.test.ts`, `workflow-agent-acceptance-feedback.test.ts`, and `session-request-handler-workflow-session.managed-workspace.test.ts`.
- **`npm run build --workspace @codeai-hub/core`:** passes (no TypeScript errors).
- **`npm run typecheck:webview`:** passes (no errors).
- **Pre-existing baseline failures from Phase 12 (Phase 14 retest backlog) remain out of Phase 16 scope:** `workflow-state-managed-documentation-commit.test.ts` (3 auto-commit suites) and `workflow-state-service-development-tree-bootstrap.test.ts` (3 acceptance-feedback scenarios). Phase 16 changes do not regress them and Phase 16 streams do not touch their owning production code paths.
- **No new regressions.** Every Phase 16 stream's direct test peer passes; the broaden-recognizer change is locked down by `recogniser accepts bare verbs / accepts bare English / rejects negated forms` cases; the map.json observer change is locked down by `dispatcher fires materialization prompt when progress reports accepted skeleton` + `dispatcher is a no-op when progress.accepted is false`; the feedback-visibility change is locked down by `visibilities === [null, null, null]`; the `materializedPaths` normalization is locked down by the new `normalizes materializedPaths shape (trailing slashes, whitespace, duplicates)` case.
98. [DONE] Git Commit: `docs: record application skeleton acceptance flow verification` (hash: 7d8bb5237)

## Phase 17 - Release Build (owner: next agent, updated: 2026-05-11)

### Stream: Release Preparation

99. [DONE] `application-skeleton-orchestration.phase17.release.task1` After Stream 16H verification clean, update README/CHANGELOG for v1.2.223 and record the release-preparation evidence in this plan before running `build-all.sh`. Release-build pre-approval was given by the user when opening Phase 16, so no separate explicit confirmation is required this cycle. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton acceptance flow release`).
100. [DONE] Git Commit: `docs: prepare application skeleton acceptance flow release` (hash: c767e21cc)

### Stream: Release Build

101. [DONE] `application-skeleton-orchestration.phase17.release.task2` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton acceptance flow`).
102. [DONE] Git Commit: `build: release application skeleton acceptance flow` (hash: dd4c54db7)

## Phase 18 - User Workflow Acceptance Testing Rerun (owner: user, updated: 2026-05-11)

### Stream: VSIX Retest

103. [BLOCKED] `application-skeleton-orchestration.phase18.acceptance.task1` User installs the v1.2.223 VSIX and reruns the Application Skeleton retest with focus on the Phase 16 regressions: Phase 2 now shows task + Git Commit pin; Core feedback prompts appear in PM transcript; the typed-fallback recognizer accepts `accepted`/bare verbs; map.json `accepted: true` from any source triggers the Phase 2 commit and Phase 3 continuation; the managed commit gate accepts the agent's `materializedPaths` shape; the full Phase 1 → Phase 2 → Phase 3 sequence lands all three commits cleanly. (scope: chat/process observation only; no commit required). **BLOCKED 2026-05-11:** retest of v1.2.223 surfaced a release-blocker regression in Phase 16E. Stream 16E broadened `recognizeManagedContractAcceptancePhrase` to match bare `accept`/`accepted` verbs without requiring `контракт`. Bootstrap prompts sent by Core to start the Application Skeleton agent are ~107 KB and contain instructional text about the PM "Accept Contract" button — the broadened recognizer now triggers on those prompts, `routeApplicationSkeletonTypedAcceptance` intercepts the message as a typed-fallback acceptance and refuses to deliver it to codex-cli, so the Application Skeleton session never starts. Plan seeds (Stream 16B) and Core log entries land normally, but no agent jsonl is ever created. Hot-fix is tracked under Phase 20; resumed retest under Phase 22.

## Phase 20 - Recognizer Hot-Fix (owner: next agent, updated: 2026-05-11)

### Stream: Scope Audit

104. [DONE] `application-skeleton-orchestration.phase20.hotfix-audit.task1` Open this hot-fix scope: block Phase 18, record the recognizer false-positive symptom and the bootstrap-prompt-vs-user-text overlap, scope the cap-by-length fix that keeps Stream 16E's broadening for short user-typed phrases while excluding multi-kilobyte Core bootstrap prompts. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open application skeleton recognizer hotfix scope`).
105. [DONE] Git Commit: `docs: open application skeleton recognizer hotfix scope` (hash: 2afa0e527)

#### Audit findings (HEAD = `dd4c54db7`, 2026-05-11)

- **Symptom.** Core log at `23:07:47` shows `Session message received contentLength: 107827` followed by `Skipping managed contract acceptance phrase, phrase: "Accept Contract"` for the Application Skeleton session `855a2ec5-95a9-4c9e-a6da-4f511c7ffb88`. No `Dispatching message to provider adapter` line follows. The stage plan was seeded correctly (`doc/TODO/stages/application-skeleton/todo-plan.md` exists with `currentTaskId: "application-skeleton.phase1.draft.task1"`), but the agent jsonl was never written because `routeApplicationSkeletonTypedAcceptance` intercepted the bootstrap prompt as a typed acceptance phrase.
- **Root cause.** Stream 16E in `managed-workflow-post-turn-service.ts::recognizeManagedContractAcceptancePhrase` broadened the regex to `(?<!\p{L})(принимаю|подтверждаю|утверждаю|accept|accepted|confirm|confirmed|approve|approved)(?!\p{L})` and dropped the previous `CONTRACT_NOUN_RE` requirement. Bootstrap prompts assembled by Core contain instructional text about the PM "Accept Contract" button and other acceptance flow language, so the broadened recognizer matches them. The downstream `application-skeleton-typed-acceptance-router.ts` then drops provider delivery and routes through the Core accept-contract command handler.
- **Fix scope.** Cap recognizer input length to a short user-message ceiling (e.g. 200 characters). User acceptance phrases are typically 1–50 characters; Core bootstrap prompts are 100 KB+. The cap retains the Stream 16E broadening for short user-typed messages but excludes bootstrap and other multi-paragraph contexts where "accept" is incidental. Add a peer test for the cap.

### Stream: Recognizer Length Cap

106. [DONE] `application-skeleton-orchestration.phase20.length-cap.task1` Add a 200-character length cap at the top of `recognizeManagedContractAcceptancePhrase` so multi-kilobyte Core bootstrap prompts (and any other long-form context that incidentally contains an acceptance verb) are excluded before regex matching. Add a peer test that locks down the cap behaviour (long prompt → null; short bare-verb phrase → recognized). Scope expanded by one file (`max-lines-debt-allowlist.txt`) because the cap constant + explanatory comment pushed `managed-workflow-post-turn-service.ts` one line over the 500-line architecture limit; a deeper slice refactor is out of scope for the hot-fix. (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, scripts/check-architecture-rules/max-lines-debt-allowlist.txt`; expected commit: `fix: cap acceptance phrase recognizer to short user-typed messages`).
107. [DONE] Git Commit: `fix: cap acceptance phrase recognizer to short user-typed messages` (hash: e7f6a0586)

### Stream: Targeted Verification

108. [DONE] `application-skeleton-orchestration.phase20.verify.task1` Run targeted Core tests for the recognizer and adjacent modules; run `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview`; record evidence and any residual risk in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton recognizer hotfix verification`).

#### Verification evidence (HEAD = `e7f6a0586`, 2026-05-11)

- **Targeted Core tests:** 33/33 pass across `managed-workflow-post-turn-service.test.ts` (15 tests, including the new release-blocker regression guard), `application-skeleton-end-to-end.test.ts` (2 tests), `application-skeleton-continuation-dispatcher.test.ts` (8 tests), and `managed-stage-accept-contract-handler.test.ts` (8 tests).
- **`npm run build --workspace @codeai-hub/core`:** passes (no TypeScript errors).
- **`npm run typecheck:webview`:** passes (no errors).
- **Regression guard:** `recogniser rejects long-form prompts that incidentally contain acceptance verbs (release-blocker regression guard)` locks down the v1.2.223 failure mode — a ~3 KB bootstrap-style prompt containing both "Accept Contract" and "accepted" returns `null` from the recognizer; the broadened bare-verb / English-verb / negated-form invariants from Phase 16E continue to hold for short user-typed phrases.
109. [DONE] Git Commit: `docs: record application skeleton recognizer hotfix verification` (hash: b780f7b2f)

## Phase 21 - Hot-Fix Release Build (owner: next agent, updated: 2026-05-11)

### Stream: Release Preparation

110. [DONE] `application-skeleton-orchestration.phase21.release.task1` Update README/CHANGELOG for v1.2.224 (release-blocker hot-fix) and record release-preparation evidence in this plan before running `build-all.sh`. Release-build pre-approval was given by the user when opening Phase 16; the hot-fix inherits that approval. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton recognizer hotfix release`).
111. [DONE] Git Commit: `docs: prepare application skeleton recognizer hotfix release` (hash: aaab75436)

### Stream: Release Build

112. [DONE] `application-skeleton-orchestration.phase21.release.task2` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton recognizer hotfix`).
113. [DONE] Git Commit: `build: release application skeleton recognizer hotfix` (hash: 257565787)

## Phase 22 - User Workflow Acceptance Testing Rerun (owner: user, updated: 2026-05-11)

### Stream: VSIX Retest

114. [BLOCKED] `application-skeleton-orchestration.phase22.acceptance.task1` User installs the v1.2.224 VSIX and reruns the Application Skeleton retest with focus on the recognizer hot-fix: the Application Skeleton session actually starts (agent jsonl is written); Phase 1 draft commit lands; Phase 2 review accepts both short typed acceptance phrases and the PM button; Phase 3 materialization commit lands. The Phase 16 invariants from Phase 18 also hold. (scope: chat/process observation only; no commit required). **BLOCKED 2026-05-11:** retest of v1.2.224 confirmed the Phase 20 length-cap hot-fix (Application Skeleton session bootstrap now reaches codex-cli, Phase 1 draft commit `4256791` landed cleanly, plan advanced to Phase 2 review correctly). But the typed-fallback path silently dropped three user acceptance attempts: Core log shows `Skipping managed contract acceptance phrase, phrase: "Подтверждаю контракт"` at 01:28:14 / 01:28:42 and `phrase: "Accept Contract"` at 09:04:52 with no `Dispatching message to provider adapter` after, no agent response, no Phase 2 commit, no Phase 3 continuation. Root cause is a Phase 5 design hole that survived through Phase 16: the typed-fallback router's optional `handleManagedAcceptContractCommand` callback IS wired in production (to `markAccepted` from `ManagedWorkflowPostTurnService` line ~239), but that callback only updates the in-memory `recentlyAcceptedSessions` Set; nobody writes `accepted: true` to `application-skeleton-map.json`. The Phase 3 continuation dispatcher (Stream 16D Option C) gates on `progress.accepted === true` reading the file, but no path — Core handler, runner, HTTP endpoint, button, typed-fallback, agent self-set — actually patches the file. Hot-fix is tracked under Phase 24; resumed retest under Phase 26.

## Phase 24 - Acceptance Write-Path Fix (owner: next agent, updated: 2026-05-11)

### Stream: Scope Audit

115. [DONE] `application-skeleton-orchestration.phase24.audit.task1` Open this scope: block Phase 22 with the acceptance write-path findings, document the design hole (every existing acceptance path only sets the in-memory `recentlyAcceptedSessions` marker, none patches `application-skeleton-map.json::accepted: true`), and adopt **Variant A** — the Core accept-contract runner owns the `accepted: true` write so that PM button (via HTTP endpoint), typed-fallback router (via callback), and any future programmatic acceptance entry point all funnel through one writer. The agent's own self-set per its Phase 2 prompt continues to work as a parallel path. After the write lands, `application-skeleton-map.json` becomes a dirty Application Skeleton-owned file, the managed commit gate auto-commits it as `docs: accept application skeleton contract` (Phase 2 acceptance commit), the next read-model snapshot reports `progress.accepted === true`, and `sendApplicationSkeletonContinuationIfReady` fires the Phase 3 materialization prompt. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open application skeleton acceptance write-path scope`).
116. [DONE] Git Commit: `docs: open application skeleton acceptance write-path scope` (hash: ccb3c8c5e)

#### Audit findings (HEAD = `257565787`, 2026-05-11)

- **Phase 22 retest symptom (v1.2.224 session `bac50e46-e460-4526-8d9f-d6d39cadba61`).** Phase 1 bootstrap succeeded, agent produced draft, Core auto-committed `4256791` (`docs: draft application skeleton contract`), plan advanced to Phase 2 review. User typed three acceptance phrases (47 chars, 11 chars, 41 chars) at 01:28:14 / 01:28:42 / 09:04:52. Each one matched the broadened recognizer and was intercepted by `routeApplicationSkeletonTypedAcceptance`. Core log records `Skipping managed contract acceptance phrase, phrase: "…"` for each, with no `Dispatching message to provider adapter` after. Native codex rollout `rollout-2026-05-11T01-25-42-019e1435…` ends at 01:27:18.587Z and never gets another entry. PM-side `codex-bac50e46-…-application-skeleton.jsonl` ends at the same timestamp. Nothing patched `application-skeleton-map.json` — it still reads `accepted: false`. `progress.accepted` therefore stays `false`, `canContinueApplicationSkeleton` returns `false`, `sendApplicationSkeletonContinuationIfReady` short-circuits. Plan stays at `currentTaskId: application-skeleton.phase2.review.task1` with `expectedCommitMessage: "docs: accept application skeleton contract"` waiting for a dirty owned file that never arrives.
- **Existing write-paths today (none patch map.json):**
  - `application-skeleton-typed-acceptance-router.ts::routeApplicationSkeletonTypedAcceptance` invokes optional callback `handleManagedAcceptContractCommand?.({sessionId, source: "typed-fallback"})`. Callback is wired in `session-request-handler-message-dispatch.ts:181–189` to the post-turn service's `handleApplicationSkeletonAcceptContractCommand` (delegates to `managed-stage-accept-contract-runner.ts`).
  - `managed-stage-accept-contract-handler.ts::evaluateApplicationSkeletonAcceptContractCommand` is a **pure decision** — no side effects.
  - `managed-stage-accept-contract-runner.ts` only invokes `params.markAccepted(sessionId)` (which calls `this.recentlyAcceptedSessions.add(sessionId)` on the post-turn service) and `params.handle()`. **No `application-skeleton-map.json` patch.**
  - `http-api-managed-stage-accept-contract.ts` returns the runner's `accepted | rejected` decision as JSON to the PM client. **No file system write.**
  - `managed-workflow-post-turn-service.ts` updates `recentlyAcceptedSessions` in `markAccepted` (~line 239) and `handleContractAcceptance` (~line 266); removes the session on materialized (~line 351). All in-memory.
- **Read-path that gates Phase 3 dispatch:**
  - `application-skeleton-progress.ts:164` reads `accepted = markdownExists && mapExists && readAcceptedFlag(mapJson)` — purely from `application-skeleton-map.json`. Stream 16D switched the dispatcher gate to `progress.accepted === true` (Option C). With no writer, the gate never opens.
- **Variant A target.** `managed-stage-accept-contract-runner.ts` becomes the single owner of the accepted-write. After `evaluateApplicationSkeletonAcceptContractCommand` returns `kind: "accepted"`, the runner patches `application-skeleton-map.json` setting `accepted: true` (and optionally `reviewState: "accepted"` to mirror the agent prompt's expected shape), then proceeds with its existing `markAccepted` + `handle` flow. The patch lives in a new helper `application-skeleton-acceptance-writer.ts` so the runner stays under the architecture limit and the writer is unit-testable. The managed commit gate (`workflow-state-managed-documentation-commit.ts::hasCommittableApplicationSkeletonStage`) already triggers on any owned dirty file in `application_skeleton` stage scope, so the auto-commit pipeline fires `docs: accept application skeleton contract` with no further wiring. Phase 3 dispatcher fires on the next read-model snapshot.

### Stream: Map.json Acceptance Writer

117. [DONE] `application-skeleton-orchestration.phase24.writer.task1` Add a new pure helper `application-skeleton-acceptance-writer.ts` that reads `application-skeleton-map.json`, patches `accepted: true` (and `reviewState: "accepted"` if absent), and writes it back. Add peer test `application-skeleton-acceptance-writer.test.ts` covering happy path, missing-file path, and idempotency (already-accepted map is a noop). (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-acceptance-writer.ts, packages/core/src/remote-bridge/handlers/application-skeleton-acceptance-writer.test.ts`; expected commit: `fix: add application skeleton acceptance map.json writer`).
118. [DONE] Git Commit: `fix: add application skeleton acceptance map.json writer` (hash: 832b9773c)

### Stream: Runner Integration

119. [DONE] `application-skeleton-orchestration.phase24.runner-write.task1` Wire the new writer into `managed-stage-accept-contract-runner.ts` so that after `evaluateApplicationSkeletonAcceptContractCommand` returns `kind: "accepted"`, the runner patches `application-skeleton-map.json` before calling `markAccepted` + `handle`. Add a dedicated runner peer test `managed-stage-accept-contract-runner.test.ts` that asserts the file gets patched on accept and stays untouched on reject. Scope shifted from the existing `managed-stage-accept-contract-handler.test.ts` (pure decision tests) to a new runner peer test file so writer-injection spies stay scoped to runner integration and do not pollute the handler decision suite. (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.test.ts`; expected commit: `fix: patch application skeleton map.json from accept contract runner`).
120. [DONE] Git Commit: `fix: patch application skeleton map.json from accept contract runner` (hash: df9786fad)

### Stream: Targeted Verification

121. [DONE] `application-skeleton-orchestration.phase24.verify.task1` Run targeted Core tests for the writer, runner, dispatcher, and end-to-end modules; run `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview`; record evidence and any residual risk in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton acceptance write-path verification`).

#### Verification evidence (HEAD = `df9786fad`, 2026-05-11)

- **Targeted Core tests:** 43/43 pass across `application-skeleton-acceptance-writer.test.ts` (7 — happy path, idempotency for accepted and materialized states, materialized reviewState preservation, map_missing, invalid_json, path_unresolved), `managed-stage-accept-contract-runner.test.ts` (3 — patch on accept, no-write on reject, log-payload status forwarding), `managed-stage-accept-contract-handler.test.ts` (8), `application-skeleton-continuation-dispatcher.test.ts` (8), `managed-workflow-post-turn-service.test.ts` (15, including the Phase 20 release-blocker guard), and `application-skeleton-end-to-end.test.ts` (2).
- **`npm run build --workspace @codeai-hub/core`:** passes.
- **`npm run typecheck:webview`:** passes.
- **End-to-end flow.** Recognizer matches "accepted" → typed-fallback router calls runner → runner reads progress → handler decides `kind: "accepted"` → runner calls `writeApplicationSkeletonAcceptance` → `application-skeleton-map.json` gets `accepted: true` + `reviewState: "accepted"` → managed-git-status now lists the file under `dirtyByStage.application_skeleton` → `hasCommittableApplicationSkeletonStage` returns true → `commitManagedDocumentationStageIfReady` auto-commits `docs: accept application skeleton contract` (the plan's `expectedCommitMessage`) → plan advances to Phase 3 (`phase3.materialize.task1`) → next read-model snapshot reports `progress.accepted === true` → `sendApplicationSkeletonContinuationIfReady` fires the Phase 3 materialization continuation prompt to the agent.
- **PM button parity.** HTTP endpoint `/api/v1/orchestrator/managed-stage-accept-contract` → `handleApplicationSkeletonAcceptContractCommand` → same runner → same writer. Variant A single-owner contract holds for both entry points.
122. [DONE] Git Commit: `docs: record application skeleton acceptance write-path verification` (hash: 8b7187ff4)

## Phase 25 - Release Build (owner: next agent, updated: 2026-05-11)

### Stream: Release Preparation

123. [DONE] `application-skeleton-orchestration.phase25.release.task1` Update README/CHANGELOG for v1.2.225 (acceptance write-path fix) and record release-preparation evidence in this plan before running `build-all.sh`. Release-build pre-approval inherited from Phase 16 / Phase 20; no separate confirmation gate this cycle. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton acceptance write-path release`).
124. [DONE] Git Commit: `docs: prepare application skeleton acceptance write-path release` (hash: 66a291c60)

### Stream: Release Build

125. [DONE] `application-skeleton-orchestration.phase25.release.task2` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton acceptance write-path`).
126. [PENDING] Git Commit: `build: release application skeleton acceptance write-path` (hash: TBD)

## Phase 26 - User Workflow Acceptance Testing Rerun (owner: user, updated: 2026-05-11)

### Stream: VSIX Retest

127. [TODO] `application-skeleton-orchestration.phase26.acceptance.task1` User installs the v1.2.225 VSIX and reruns the Application Skeleton retest: Phase 1 draft commit lands; typed acceptance ("accepted", "принимаю", PM button) flips `application-skeleton-map.json::accepted: true`; Core auto-commits `docs: accept application skeleton contract`; Phase 3 materialization continuation prompt arrives at the agent; Phase 3 commit `feat: materialize application skeleton` lands; downstream handoff to Quality Gates Baseline. (scope: chat/process observation only; no commit required).

## Phase 19 - Scope Closeout (owner: next agent, updated: 2026-05-11)

### Stream: Closeout After Acceptance

104. [BLOCKED] `application-skeleton-orchestration.phase19.closeout.task1` After explicit user acceptance, archive this plan, decide final disposition for the planning document, update `Docs_Index.md` if needed, and leave active state terminal `NONE`. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close application skeleton phase orchestration implementation`). **SUPERSEDED 2026-05-11:** Phase 18 retest blocked → Phase 16 + Phase 20 + Phase 22 follow-up scopes opened. Closeout deferred to Phase 27 once Phase 26 retest of v1.2.225 lands.
105. [TODO] Git Commit: `docs: close application skeleton phase orchestration implementation` (hash: TBD)
106. [BLOCKED] `application-skeleton-orchestration.phase19.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. **SUPERSEDED 2026-05-11:** handoff anchor relocated to Phase 27.

## Phase 27 - Scope Closeout (owner: next agent, updated: 2026-05-11)

### Stream: Closeout After Acceptance

128. [TODO] `application-skeleton-orchestration.phase27.closeout.task1` After explicit user acceptance of Phase 26 retest, archive this plan, decide final disposition for the planning document, update `Docs_Index.md` if needed, and leave active state terminal `NONE`. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close application skeleton phase orchestration implementation`).
129. [TODO] Git Commit: `docs: close application skeleton phase orchestration implementation` (hash: TBD)
130. [TODO] `application-skeleton-orchestration.phase27.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
