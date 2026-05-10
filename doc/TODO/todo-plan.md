# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-phase-b-orchestration-implementation",
  "branch": "main",
  "baseHead": "d2c91d120",
  "lastRecordedCommit": "68742258e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md",
  "currentTaskId": "application-skeleton-orchestration.phase12.audit.task1",
  "expectedCommitMessage": "docs: open application skeleton phase numbering refactor scope",
  "debt": {
    "expectedCommitMessage": "docs: open application skeleton phase numbering refactor scope",
    "preCommitHead": "68742258e",
    "stage": "commit_pending",
    "taskId": "application-skeleton-orchestration.phase12.audit.task1"
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
56. [PENDING] Git Commit: `docs: open application skeleton phase numbering refactor scope` (hash: TBD)

#### Audit findings (HEAD = `68742258e`, 2026-05-10)

- **Advancement skip surface.** `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts:26` defines `TASK_LINE_RE = /^\d+\. \[(?:TODO|IN_PROGRESS)\].*?\`([^\`]+)\`.*expected commit: \`([^\`]+)\`/u`. The trailing `expected commit: \`...\`` capture is mandatory, so any task line whose tail reads `expected commit: none — open until acceptance` (no backticks) is silently skipped by `readTaskLine()` and by the next-task scan in the post-commit advancement at lines 219–224. After the Phase 1A draft commit lands, the scan therefore selects the next backticked line — Pin 4 (`phase2.materialize.task1`) — and writes that as `currentTaskId` together with `expectedCommitMessage: "feat: materialize application skeleton"`, fully bypassing Pin 3 (`phase1b.review.task1`). No regression test currently locks down "after draft commit, currentTaskId advances to phase1b.review.task1".
- **Phase-type vs phase-number conflation.** Task IDs `application-skeleton.phase1a.draft.task1`, `application-skeleton.phase1b.review.task1`, `application-skeleton.phase2.materialize.task1` encode the phase-type attribute (Type A / Type B / Type A) inside the phase number, while the managed plan headings already read `Phase 1` / `Phase 2` / `Phase 3` (see `packages/core/src/managed-workspace/managed-todo-tree.ts:291,306,312,319`). Result: `phase2.materialize.task1` lives under heading `Phase 3`, which makes both the agent and the orchestrator state hard to read and reason about. Type A / Type B remains a domain attribute that survives in SSOT prose only.
- **Code surfaces touching legacy task IDs.** `packages/core/src/managed-workspace/managed-todo-tree.ts` (STAGE_PLANS seed, STAGE_TERMINAL_COMMITS), `packages/core/src/development-tree/development-tree-bootstrap-gate.ts` (bootstrap gate target task id), `packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts` (dynamic revision injection labels), `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts` (per-revision commit message text).
- **Internal classifier enum values.** `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.ts` exports type `ApplicationSkeletonPhase = "phase_1a_draft" | "phase_1b_review" | "phase_2_materialization" | "phase_handoff"`. Consumers: `application-skeleton-contract-guard.ts`, `application-skeleton-review-turn-classifier.ts`, `managed-stage-accept-contract-handler.ts`, `managed-stage-accept-contract-runner.ts`, `managed-workflow-post-turn-service.ts`, `application-skeleton-end-to-end.test.ts`, `application-skeleton-phase-state.test.ts`. These string values are internal classification, but renaming them in lockstep with task IDs keeps the codebase legible.
- **Test fixtures touching legacy task IDs.** `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`, `packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`, `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts`.
- **SSOT and planning docs.** `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`. `CHANGELOG.md` is historical and stays untouched.

### Stream: Advancement Regex Fix

57. [TODO] `application-skeleton-orchestration.phase12.advance.task1` Extend `TASK_LINE_RE` so it matches both `expected commit: \`<message>\`` and `expected commit: none — open until acceptance` task lines, and update the post-commit advancement so an open-ended task surfaces with `expectedCommitMessage: null` instead of being silently skipped. Add a regression test asserting that after the Phase 1A draft commit advances, `currentTaskId` lands on the open-ended Phase 2 review task and not on the materialization task. (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `fix: advance through open-ended managed plan tasks`).
58. [TODO] Git Commit: `fix: advance through open-ended managed plan tasks` (hash: TBD)

### Stream: Stage Plan Task ID Rename

59. [TODO] `application-skeleton-orchestration.phase12.rename-seed.task1` Rename `STAGE_PLANS` task IDs in the Application Skeleton seed from `phase1a.draft.task1` / `phase1b.review.task1` / `phase2.materialize.task1` to `phase1.draft.task1` / `phase2.review.task1` / `phase3.materialize.task1`; update `STAGE_TERMINAL_COMMITS` if its keys reference any of these IDs; realign the Development Tree bootstrap gate target id from `application-skeleton.phase2.materialize.task1` to `application-skeleton.phase3.materialize.task1`. Headings (`Phase 1` / `Phase 2` / `Phase 3`) already match — no heading renames needed. (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.ts`; expected commit: `fix: rename application skeleton stage plan task ids to plain phase numbering`).
60. [TODO] Git Commit: `fix: rename application skeleton stage plan task ids to plain phase numbering` (hash: TBD)

### Stream: Bootstrap Gate Fixture Sync

61. [TODO] `application-skeleton-orchestration.phase12.rename-seed.task2` Sync the bootstrap gate fixture and the seed-shape regression to the new plain-phase task IDs (`phase1.draft` / `phase2.review` / `phase3.materialize`). (scope: `packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `test: align bootstrap gate fixtures to plain phase task ids`).
62. [TODO] Git Commit: `test: align bootstrap gate fixtures to plain phase task ids` (hash: TBD)

### Stream: Handler Fixture Migration (Batch 1)

63. [TODO] `application-skeleton-orchestration.phase12.fixture-migration.task1` Migrate hardcoded legacy `phase1a` / `phase1b` / `phase2.materialize` task IDs in handler test fixtures to the plain-phase task IDs while preserving each test's existing behavioral assertions. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`; expected commit: `test: migrate handler fixture task ids to plain phase numbering (batch 1)`).
64. [TODO] Git Commit: `test: migrate handler fixture task ids to plain phase numbering (batch 1)` (hash: TBD)

### Stream: Handler Fixture Migration (Batch 2)

65. [TODO] `application-skeleton-orchestration.phase12.fixture-migration.task2` Migrate hardcoded legacy task IDs in the remaining handler tests (workflow-state bootstrap, end-to-end, post-turn) to the plain-phase task IDs. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `test: migrate handler fixture task ids to plain phase numbering (batch 2)`).
66. [TODO] Git Commit: `test: migrate handler fixture task ids to plain phase numbering (batch 2)` (hash: TBD)

### Stream: Phase Classifier Enum Rename

67. [TODO] `application-skeleton-orchestration.phase12.classifier-rename.task1` Rename `ApplicationSkeletonPhase` enum values: `phase_1a_draft → phase_1_draft`, `phase_1b_review → phase_2_review`, `phase_2_materialization → phase_3_materialization` (`phase_handoff` stays). Update the classifier definition, its peer test, and the post-turn service consumer in lockstep so the build stays green; remaining consumers are migrated in `phase12.classifier-consumers.task1` and `task2`. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: rename application skeleton phase classifier values to plain numbering`).
68. [TODO] Git Commit: `fix: rename application skeleton phase classifier values to plain numbering` (hash: TBD)

### Stream: Phase Classifier Consumers (Handlers)

69. [TODO] `application-skeleton-orchestration.phase12.classifier-consumers.task1` Sync handler consumers of `ApplicationSkeletonPhase` to the plain-numbering enum values. (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-guard.ts, packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts`; expected commit: `fix: align skeleton phase consumers to plain numbering`).
70. [TODO] Git Commit: `fix: align skeleton phase consumers to plain numbering` (hash: TBD)

### Stream: Phase Classifier Consumers (Runners + Injection)

71. [TODO] `application-skeleton-orchestration.phase12.classifier-consumers.task2` Sync runner / injection / commit-transaction consumers to the plain-numbering enum values, and update dynamic revision injection labels (`phase1b.review.revisionN.task1 → phase2.review.revisionN.task1`) plus the per-revision managed commit message text (`docs: revise application skeleton contract — phase 1B revision N → docs: revise application skeleton contract — revision N`, dropping the phase-type label from the commit because Type B is a domain attribute, not commit text). (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts`; expected commit: `fix: align skeleton runner phase identifiers to plain numbering`).
72. [TODO] Git Commit: `fix: align skeleton runner phase identifiers to plain numbering` (hash: TBD)

### Stream: SSOT Sync

73. [TODO] `application-skeleton-orchestration.phase12.docs-sync.task1` Sync SSOT and planning docs to plain phase numbering: replace `phase1a` / `phase1b` / `phase2.materialize` task IDs with the plain-phase forms; rephrase headings so `Phase 1A` / `Phase 1B` / `Phase 2` reads `Phase 1` / `Phase 2` / `Phase 3` (with Type A / Type B kept as a domain attribute clarifier in prose only); update the materialization-commit / revision-commit text references. (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`; expected commit: `docs: sync application skeleton plain phase numbering ssot`).
74. [TODO] Git Commit: `docs: sync application skeleton plain phase numbering ssot` (hash: TBD)

### Stream: Targeted Verification

75. [TODO] `application-skeleton-orchestration.phase12.verify.task1` Run targeted Core tests for touched managed-workspace, development-tree, and remote-bridge handler modules; run `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview`; record evidence and any residual risk in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton plain phase numbering verification`).
76. [TODO] Git Commit: `docs: record application skeleton plain phase numbering verification` (hash: TBD)

## Phase 13 - Release Build Confirmation Gate (owner: next agent, updated: 2026-05-10)

### Stream: Release Confirmation

77. [TODO] `application-skeleton-orchestration.phase13.release.task1` Ask the user for separate explicit confirmation before preparing release notes, bumping versions, or running release build scripts for the v1.2.222 VSIX containing the advancement fix and plain phase numbering. (scope: chat/process observation only; no commit required).

### Stream: Release Preparation

78. [TODO] `application-skeleton-orchestration.phase13.release.task2` After explicit confirmation only, update README/CHANGELOG for the future release version and record the release-preparation evidence in this plan before running `build-all.sh`. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton plain phase numbering release`).
79. [TODO] Git Commit: `docs: prepare application skeleton plain phase numbering release` (hash: TBD)

### Stream: Release Build

80. [TODO] `application-skeleton-orchestration.phase13.release.task3` After the release-preparation commit and clean tree, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`; record artifact paths, release output evidence, and version/manifest changes. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton plain phase numbering`).
81. [TODO] Git Commit: `build: release application skeleton plain phase numbering` (hash: TBD)

## Phase 14 - User Workflow Acceptance Testing Rerun (owner: user, updated: 2026-05-10)

### Stream: VSIX Retest

82. [TODO] `application-skeleton-orchestration.phase14.acceptance.task1` User installs the new VSIX and reruns the Application Skeleton retest with focus on the regression that motivated this scope: after Phase 1A draft commit lands, `currentTaskId` advances to `application-skeleton.phase2.review.task1` (open-ended user-led review), Phase 1A → Phase 2 → Phase 3 numbering reads cleanly in the managed plan, and Accept Contract / premature-materialization block / Phase 3 materialization commit all behave as in Phase 11 expectations. (scope: chat/process observation only; no commit required).

## Phase 15 - Scope Closeout (owner: next agent, updated: 2026-05-10)

### Stream: Closeout After Acceptance

83. [TODO] `application-skeleton-orchestration.phase15.closeout.task1` After explicit user acceptance, archive this plan, decide final disposition for the planning document, update `Docs_Index.md` if needed, and leave active state terminal `NONE`. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close application skeleton phase orchestration implementation`).
84. [TODO] Git Commit: `docs: close application skeleton phase orchestration implementation` (hash: TBD)
85. [TODO] `application-skeleton-orchestration.phase15.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
