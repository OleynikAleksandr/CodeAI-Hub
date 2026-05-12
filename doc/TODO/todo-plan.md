# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-managed-orchestration-implementation",
  "branch": "main",
  "baseHead": "c348fa9d3",
  "lastRecordedCommit": "35210bdf6",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md",
  "currentTaskId": "quality-gates-implementation.phase4.revision.task1",
  "expectedCommitMessage": "feat: keep quality gates user return phase open",
  "debt": {
    "expectedCommitMessage": "feat: keep quality gates user return phase open",
    "preCommitHead": "35210bdf6",
    "stage": "commit_pending",
    "taskId": "quality-gates-implementation.phase4.revision.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowStep_PromptTesting_Methodology.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Step_Orchestration_Diagram_Modules_Scenario_1.2.229.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Step_Orchestration_Application_Skeleton_Scenario_1.2.238.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Step_Orchestration_Application_Skeleton_Architecture_1.2.238.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md`
- Only this Context Pack is the recovery source for the current execution cycle.

## Execution Rules

- Required reading before every code fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Every microtask must be followed by a separate `Git Commit:` item.
- Each implementation microtask is scoped to no more than 3 files or packages.
- Quality Gates must follow the accepted Application Skeleton lifecycle: draft contract, user review, Core-owned acceptance commit, integration, and open post-completion user-return phase.
- Every Core rejection, repair, retry, and artifact-changing user-return turn must inject a concrete child-plan microtask plus paired commit before provider-visible feedback is sent.
- Failed attempts must be durable: commit valid owned diffs, or write tracked attempt evidence and commit that evidence.
- Stage-light truth must have one source: completed upstream stages must not turn red because a downstream stage has dirty files or blockers.
- Release build is not automatic. Before README/CHANGELOG version updates, `./scripts/build-all.sh`, or `./scripts/build-release.sh --use-current-version`, stop and request explicit user confirmation.
- Use `npm run plan:commit -- "<expected commit message>"` for normal plan commits.

## Phase 0 - Scope Opening (owner: Codex, updated: 2026-05-11)

### Stream: Implementation Plan Intake

1. [DONE] `quality-gates-implementation.phase0.plan.task1` Mark the Quality Gates scenario accepted for implementation and open this active implementation plan (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md`; expected commit: `docs: open quality gates implementation plan`).
2. [DONE] Git Commit: `docs: open quality gates implementation plan` (hash: 0d04cba4d)

## Phase 1 - Managed Child Plan Model (owner: Codex, updated: 2026-05-11)

### Stream: Dynamic Quality Gates Plan

3. [DONE] `quality-gates-implementation.phase1.plan-mutator.task1` Add a Quality Gates child-plan mutator for acceptance, integration, repair, review revision, and post-completion user-return task-pair injection (scope: `packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts`; expected commit: `feat: add quality gates plan mutator`).
4. [DONE] Git Commit: `feat: add quality gates plan mutator` (hash: d77a4a226)
5. [DONE] `quality-gates-implementation.phase1.seed.task1` Replace static Quality Gates follow-up seeding with draft-only bootstrap and phase-aware task ids (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.ts`; expected commit: `fix: seed quality gates draft-only plan`).
6. [DONE] Git Commit: `fix: seed quality gates draft-only plan` (hash: d0e1da71a)
7. [DONE] `quality-gates-implementation.phase1.shim.task1` Align the bundled managed-plan orchestrator shim with the new Quality Gates dynamic plan lifecycle (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts`; expected commit: `fix: bundle quality gates dynamic plan shim`).
8. [DONE] Git Commit: `fix: bundle quality gates dynamic plan shim` (hash: d1e8d1b9a)

## Phase 2 - Acceptance Boundary (owner: Codex, updated: 2026-05-11)

### Stream: Core-Owned Acceptance

9. [DONE] `quality-gates-implementation.phase2.progress.task1` Track `accepted`, `acceptanceCommitted`, `integrated`, and `integrationState` from Quality Gates artifacts and managed plan evidence (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`; expected commit: `fix: track quality gates acceptance commit state`).
10. [DONE] Git Commit: `fix: track quality gates acceptance commit state` (hash: f37e84479)
11. [DONE] `quality-gates-implementation.phase2.accept-runner.task1` Add the Core-owned Quality Gates accept-contract writer and runner, including acceptance task-pair injection (scope: `packages/core/src/remote-bridge/handlers/quality-gates-acceptance-writer.ts, packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.test.ts`; expected commit: `feat: accept quality gates contract through core`).
12. [DONE] Git Commit: `feat: accept quality gates contract through core` (hash: ca0334264)
13. [DONE] `quality-gates-implementation.phase2.accept-route.task1` Route typed and UI acceptance through the Quality Gates runner instead of in-memory-only markers (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.ts, packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts`; expected commit: `fix: route quality gates acceptance through core boundary`).
14. [DONE] Git Commit: `fix: route quality gates acceptance through core boundary` (hash: 08dcc05f4)

## Phase 3 - Integration Continuation (owner: Codex, updated: 2026-05-11)

### Stream: Accepted-Only Integration

15. [DONE] `quality-gates-implementation.phase3.continuation.task1` Add an accepted-and-committed-only Quality Gates continuation dispatcher for the integration prompt (scope: `packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `feat: continue quality gates after acceptance commit`).
16. [DONE] Git Commit: `feat: continue quality gates after acceptance commit` (hash: dbac11e94)
17. [DONE] `quality-gates-implementation.phase3.commit-readiness.task1` Allow Quality Gates managed commits for draft, acceptance, integration, and repair attempts according to the active child-plan task (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.test.ts`; expected commit: `fix: commit quality gates managed lifecycle tasks`).
18. [DONE] Git Commit: `fix: commit quality gates managed lifecycle tasks` (hash: 3e2d10012)
19. [DONE] `quality-gates-implementation.phase3.hooks.task1` Keep hook wiring Core-owned through the managed hook registry and validate integrated state against registry-generated sections (scope: `packages/core/src/managed-workspace/managed-hook-registry.ts, packages/core/src/managed-workspace/managed-hook-registry.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.ts`; expected commit: `fix: validate quality gates hook registry integration`).
20. [DONE] Git Commit: `fix: validate quality gates hook registry integration` (hash: 542edb329)
21. [DONE] `quality-gates-implementation.phase3.prompts.task1` Update Quality Gates agent assets so draft, acceptance, and integration boundaries cannot be confused (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/agents/quality-gates-agent/assets/quality-gates-contract.md, packages/core/src/templates/quality-gates-bundled-templates.test.ts, packages/core/src/templates/bundled-templates.ts`; expected commit: `docs: enforce quality gates lifecycle prompt boundary`).
22. [DONE] Git Commit: `docs: enforce quality gates lifecycle prompt boundary` (hash: f51c2c385)

## Phase 4 - Rejection And Repair Lifecycle (owner: Codex, updated: 2026-05-11)

### Stream: Durable Failed Attempts

23. [DONE] `quality-gates-implementation.phase4.guard.task1` Add a Quality Gates contract guard and feedback builder that request concrete repairs instead of telling the agent to do nothing while unresolved (scope: `packages/core/src/remote-bridge/handlers/quality-gates-contract-guard.ts, packages/core/src/remote-bridge/handlers/quality-gates-contract-feedback.ts, packages/core/src/remote-bridge/handlers/quality-gates-contract-guard.test.ts`; expected commit: `feat: validate quality gates phase boundaries`).
24. [DONE] Git Commit: `feat: validate quality gates phase boundaries` (hash: d87669576)
25. [DONE] `quality-gates-implementation.phase4.repair.task1` Add repair orchestration that injects repair task-pairs and commits either valid owned diffs or tracked attempt evidence (scope: `packages/core/src/remote-bridge/handlers/quality-gates-repair-orchestration.ts, packages/core/src/remote-bridge/handlers/quality-gates-repair-orchestration.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.quality-gates-repair.test.ts`; expected commit: `feat: commit quality gates repair attempts`).
26. [DONE] Git Commit: `feat: commit quality gates repair attempts` (hash: 35210bdf6)
27. [DONE] `quality-gates-implementation.phase4.revision.task1` Add review-turn and user-return revision detection with Quality Gates task-pair injection before provider-visible revision prompts (scope: `packages/core/src/remote-bridge/handlers/quality-gates-review-turn-classifier.ts, packages/core/src/remote-bridge/handlers/quality-gates-revision-injection-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts`; expected commit: `feat: keep quality gates user return phase open`).
28. [PENDING] Git Commit: `feat: keep quality gates user return phase open` (hash: TBD)
29. [TODO] `quality-gates-implementation.phase4.post-turn.task1` Compose guard, repair, revision, continuation, and feedback into the Quality Gates post-turn service path (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `fix: orchestrate quality gates repair feedback`).
30. [TODO] Git Commit: `fix: orchestrate quality gates repair feedback` (hash: TBD)

## Phase 5 - Single Stage-Light Truth (owner: Codex, updated: 2026-05-11)

### Stream: Workflow State Boundaries

31. [TODO] `quality-gates-implementation.phase5.stage-light.task1` Make workflow state derive Application Skeleton and Quality Gates completion from their own committed terminal evidence only (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`; expected commit: `fix: keep completed technical stage lights stable`).
32. [TODO] Git Commit: `fix: keep completed technical stage lights stable` (hash: TBD)
33. [TODO] `quality-gates-implementation.phase5.development-tree.task1` Keep Development Tree locked until Quality Gates integration is committed, without recoloring completed upstream stages (scope: `packages/core/src/development-tree/development-tree-bootstrap-gate.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, src/client/project-manager/services/workflow-state-helpers.ts`; expected commit: `fix: unlock development tree after integrated quality gates`).
34. [TODO] Git Commit: `fix: unlock development tree after integrated quality gates` (hash: TBD)
35. [TODO] `quality-gates-implementation.phase5.client.task1` Align Project Manager acceptance and Quality Gates panel state with the Core-owned lifecycle truth (scope: `src/client/project-manager/services/managed-stage-accept-contract-client.ts, src/client/project-manager/services/managed-stage-accept-contract-client.test.ts, src/client/project-manager/components/quality-gates/quality-gates-panel.tsx`; expected commit: `fix: align quality gates project manager state`).
36. [TODO] Git Commit: `fix: align quality gates project manager state` (hash: TBD)

## Phase 6 - Prompt Pack And Regression Tests (owner: Codex, updated: 2026-05-11)

### Stream: Deterministic Failure Coverage

37. [TODO] `quality-gates-implementation.phase6.prompt-pack.task1` Remove duplicate or stale Quality Gates phase narratives from Project Manager runtime prompt packing (scope: `src/client/project-manager/services/prompt-pack-builder.ts, src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts, src/client/project-manager/services/prompt-pack-builder.diagram-contract.test.ts`; expected commit: `fix: remove stale quality gates runtime prompt narrative`).
38. [TODO] Git Commit: `fix: remove stale quality gates runtime prompt narrative` (hash: TBD)
39. [TODO] `quality-gates-implementation.phase6.rejection-tests.task1` Add deterministic tests for Core rejection, repair task injection, failed-attempt evidence, and retry commit behavior (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.quality-gates-repair.test.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts`; expected commit: `test: cover quality gates rejection retry lifecycle`).
40. [TODO] Git Commit: `test: cover quality gates rejection retry lifecycle` (hash: TBD)
41. [TODO] `quality-gates-implementation.phase6.boundary-tests.task1` Add deterministic tests for acceptance-before-integration, post-completion user-return revision, and downstream blocker isolation (scope: `packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `test: cover quality gates acceptance and user return boundaries`).
42. [TODO] Git Commit: `test: cover quality gates acceptance and user return boundaries` (hash: TBD)

## Phase 7 - Documentation And Targeted Verification (owner: Codex, updated: 2026-05-11)

### Stream: System Docs Sync

43. [TODO] `quality-gates-implementation.phase7.system-docs.task1` Sync system architecture docs with the implemented Quality Gates lifecycle and stage-light ownership model (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`; expected commit: `docs: document quality gates managed lifecycle`).
44. [TODO] Git Commit: `docs: document quality gates managed lifecycle` (hash: TBD)
45. [TODO] `quality-gates-implementation.phase7.contract-docs.task1` Sync lifecycle contracts, rollout guardrails, and docs index with Quality Gates implementation boundaries (scope: `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md, doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: update quality gates workflow contracts`).
46. [TODO] Git Commit: `docs: update quality gates workflow contracts` (hash: TBD)
47. [TODO] `quality-gates-implementation.phase7.verification.task1` Run targeted verification for core, agent assets, and Project Manager changes, then record the executed commands in this plan (scope: `packages/core, packages/agents/quality-gates-agent, src/client/project-manager`; expected commit: `test: verify quality gates managed orchestration`).
48. [TODO] Git Commit: `test: verify quality gates managed orchestration` (hash: TBD)

## Phase 8 - Release Build (owner: Codex, updated: 2026-05-11)

### Stream: Release Candidate

49. [TODO] `quality-gates-implementation.phase8.release-confirmation.task1` Stop after verification, request explicit user confirmation for the release build, and record the confirmation checkpoint (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates release checkpoint`).
50. [TODO] Git Commit: `docs: prepare quality gates release checkpoint` (hash: TBD)
51. [TODO] `quality-gates-implementation.phase8.release-docs.task1` After explicit confirmation only, update release notes for the future version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates release notes`).
52. [TODO] Git Commit: `docs: prepare quality gates release notes` (hash: TBD)
53. [TODO] `quality-gates-implementation.phase8.release-build.task1` After explicit confirmation only, run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage produced release artifacts (scope: `package.json, package-lock.json, doc/tmp/releases/**`; expected commit: `chore: build quality gates release`).
54. [TODO] Git Commit: `chore: build quality gates release` (hash: TBD)

## Phase 9 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-11)

### Stream: User Retest

55. [TODO] `quality-gates-implementation.phase9.user-retest.task1` User installs the release and retests Diagram Modules, Application Skeleton, Quality Gates, and Development Tree unlock behavior (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record quality gates user workflow acceptance`).
56. [TODO] Git Commit: `docs: record quality gates user workflow acceptance` (hash: TBD)
57. [TODO] `quality-gates-implementation.phase9.release-feedback.task1` If user retest finds defects, add a bounded repair stream instead of closing the scope (scope: `doc/TODO/todo-plan.md`; expected commit: `fix: address quality gates release feedback`).
58. [TODO] Git Commit: `fix: address quality gates release feedback` (hash: TBD)

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-05-11)

### Stream: Close Active Scope

59. [TODO] `quality-gates-implementation.phase10.closeout.task1` After explicit user acceptance only, archive this active plan and close the Quality Gates implementation scope (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-quality-gates-managed-orchestration-implementation-2026-05-11.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md`; expected commit: `docs: close quality gates implementation scope`).
60. [TODO] Git Commit: `docs: close quality gates implementation scope` (hash: TBD)
61. [TODO] `quality-gates-implementation.phase10.plans-cleanup.task1` Move or archive completed Quality Gates planning materials and refresh the docs index (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md, doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Scenario_1.2.TBD.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: archive quality gates implementation planning`).
62. [TODO] Git Commit: `docs: archive quality gates implementation planning` (hash: TBD)
