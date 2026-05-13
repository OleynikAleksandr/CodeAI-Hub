# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-managed-orchestration-implementation",
  "branch": "main",
  "baseHead": "c348fa9d3",
  "lastRecordedCommit": "bf4f0fcc7",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md",
  "currentTaskId": "quality-gates-implementation.phase35.dynamic-ownership.task1",
  "expectedCommitMessage": "fix: classify dynamic quality gates integration ownership",
  "debt": {
    "expectedCommitMessage": "fix: classify dynamic quality gates integration ownership",
    "preCommitHead": "bf4f0fcc7",
    "stage": "commit_pending",
    "taskId": "quality-gates-implementation.phase35.dynamic-ownership.task1"
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
28. [DONE] Git Commit: `feat: keep quality gates user return phase open` (hash: a1731d6b5)
29. [DONE] `quality-gates-implementation.phase4.post-turn.task1` Compose guard, repair, revision, continuation, and feedback into the Quality Gates post-turn service path (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `fix: orchestrate quality gates repair feedback`).
30. [DONE] Git Commit: `fix: orchestrate quality gates repair feedback` (hash: 0ab78fb0a)

## Phase 5 - Single Stage-Light Truth (owner: Codex, updated: 2026-05-11)

### Stream: Workflow State Boundaries

31. [DONE] `quality-gates-implementation.phase5.stage-light.task1` Make workflow state derive Application Skeleton and Quality Gates completion from their own committed terminal evidence only (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-committed-evidence.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `fix: keep completed technical stage lights stable`).
32. [DONE] Git Commit: `fix: keep completed technical stage lights stable` (hash: f5ea34211)
33. [DONE] `quality-gates-implementation.phase5.development-tree.task1` Keep Development Tree locked until Quality Gates integration is committed, without recoloring completed upstream stages (scope: `packages/core/src/development-tree/development-tree-bootstrap-gate.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, src/client/project-manager/services/workflow-state-helpers.ts`; expected commit: `fix: unlock development tree after integrated quality gates`).
34. [DONE] Git Commit: `fix: unlock development tree after integrated quality gates` (hash: 13339a57d)
35. [DONE] `quality-gates-implementation.phase5.client.task1` Align Project Manager acceptance and Quality Gates panel state with the Core-owned lifecycle truth (scope: `src/client/project-manager/services/managed-stage-accept-contract-client.ts, src/client/project-manager/services/managed-stage-accept-contract-client.test.ts, src/client/project-manager/components/quality-gates/quality-gates-panel.tsx`; expected commit: `fix: align quality gates project manager state`).
36. [DONE] Git Commit: `fix: align quality gates project manager state` (hash: a6c2547dd)

## Phase 6 - Prompt Pack And Regression Tests (owner: Codex, updated: 2026-05-11)

### Stream: Deterministic Failure Coverage

37. [DONE] `quality-gates-implementation.phase6.prompt-pack.task1` Remove duplicate or stale Quality Gates phase narratives from Project Manager runtime prompt packing (scope: `src/client/project-manager/services/prompt-pack-builder.ts, src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts, src/client/project-manager/services/prompt-pack-builder.diagram-contract.test.ts`; expected commit: `fix: remove stale quality gates runtime prompt narrative`).
38. [DONE] Git Commit: `fix: remove stale quality gates runtime prompt narrative` (hash: 1e35586f9)
39. [DONE] `quality-gates-implementation.phase6.rejection-tests.task1` Add deterministic tests for Core rejection, repair task injection, failed-attempt evidence, and retry commit behavior (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.quality-gates-repair.test.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts`; expected commit: `test: cover quality gates rejection retry lifecycle`).
40. [DONE] Git Commit: `test: cover quality gates rejection retry lifecycle` (hash: efc65ad37)
41. [DONE] `quality-gates-implementation.phase6.boundary-tests.task1` Add deterministic tests for acceptance-before-integration, post-completion user-return revision, and downstream blocker isolation (scope: `packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `test: cover quality gates acceptance and user return boundaries`).
42. [DONE] Git Commit: `test: cover quality gates acceptance and user return boundaries` (hash: fa6b1562a)

## Phase 7 - Documentation And Targeted Verification (owner: Codex, updated: 2026-05-11)

### Stream: System Docs Sync

43. [DONE] `quality-gates-implementation.phase7.system-docs.task1` Sync system architecture docs with the implemented Quality Gates lifecycle and stage-light ownership model (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`; expected commit: `docs: document quality gates managed lifecycle`).
44. [DONE] Git Commit: `docs: document quality gates managed lifecycle` (hash: a4d9b5a59)
45. [DONE] `quality-gates-implementation.phase7.contract-docs.task1` Sync lifecycle contracts, rollout guardrails, and docs index with Quality Gates implementation boundaries (scope: `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md, doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: update quality gates workflow contracts`).
46. [DONE] Git Commit: `docs: update quality gates workflow contracts` (hash: ec5928811)
47. [DONE] `quality-gates-implementation.phase7.verification.task1` Run targeted verification for core, agent assets, and Project Manager changes, then record the executed commands in this plan (scope: `packages/core, packages/agents/quality-gates-agent, src/client/project-manager`; expected commit: `test: verify quality gates managed orchestration`). Verification commands (2026-05-12): `npm run build --workspace packages/core` (OK), `npm run typecheck:webview` (OK), `npx tsx --test packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.test.ts packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts packages/core/src/remote-bridge/handlers/quality-gates-contract-guard.test.ts packages/core/src/remote-bridge/handlers/quality-gates-repair-orchestration.test.ts packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.quality-gates-repair.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts packages/core/src/managed-workspace/managed-hook-registry.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts` (65/65 pass).
48. [DONE] Git Commit: `test: verify quality gates managed orchestration` (hash: a34de2c9c)

## Phase 8 - Release Build (owner: Codex, updated: 2026-05-11)

### Stream: Release Candidate

49. [DONE] `quality-gates-implementation.phase8.release-confirmation.task1` Stop after verification, request explicit user confirmation for the release build, and record the confirmation checkpoint (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates release checkpoint`). Release Build Confirmation Gate (2026-05-12): Phases 0-7 implemented (commits 0d04cba4d→a34de2c9c), 65/65 QG-related tests pass, build/typecheck green. Awaiting explicit user confirmation before running `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`.
50. [DONE] Git Commit: `docs: prepare quality gates release checkpoint` (hash: 2537dcb13)
51. [DONE] `quality-gates-implementation.phase8.release-docs.task1` After explicit confirmation only, update release notes for the future version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates release notes`).
52. [DONE] Git Commit: `docs: prepare quality gates release notes` (hash: e274e3820)
53. [DONE] `quality-gates-implementation.phase8.release-build.task1` After explicit confirmation only, run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage produced release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: build quality gates release`).
54. [DONE] Git Commit: `chore: build quality gates release` (hash: 6baa4f2bc)

## Phase 9 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-11)

### Stream: User Retest

55. [DONE] `quality-gates-implementation.phase9.user-retest.task1` User installs the release and retests Diagram Modules, Application Skeleton, Quality Gates, and Development Tree unlock behavior (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record quality gates user workflow acceptance`). Retest result (2026-05-12): release `1.2.239` failed Quality Gates workflow acceptance. Observed defects: Quality Gates Phase 2 child plan duplicated review/revision task pairs and repeated item number `3`; Core treated Core-owned plan files as out-of-owner dirty paths; Core sent Phase 1/2 provider feedback that requested hook integration before user acceptance; typed user acceptance did not advance to provider integration.
56. [DONE] Git Commit: `docs: record quality gates user workflow acceptance` (hash: not-created-release-feedback-opened)
57. [DONE] `quality-gates-implementation.phase9.release-feedback.task1` Address failed release retest by aligning Quality Gates Phase 2 lifecycle with Application Skeleton: include QG child plan/workspace ledger files in managed stage ownership and keep draft/review feedback contract-only until acceptance via a dedicated Quality Gates feedback action resolver (scope: `packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts`; expected commit: `fix: address quality gates release feedback`).
58. [DONE] Git Commit: `fix: address quality gates release feedback` (hash: 2b69a8ccb)
59. [DONE] `quality-gates-implementation.phase9.release-feedback.task2` Normalize Quality Gates Phase 2/3 post-turn continuation and review revision injection so Core never opens Phase 3 from failed acceptance state and never duplicates numbered tasks, with targeted regression coverage (scope: `packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts`; expected commit: `test: cover quality gates release feedback lifecycle`).
60. [DONE] Git Commit: `test: cover quality gates release feedback lifecycle` (hash: 6b7bf55fb)

## Phase 10 - Release Rebuild Gate (owner: Codex, updated: 2026-05-12)

### Stream: Release Confirmation

61. [DONE] `quality-gates-implementation.phase10.rebuild-confirmation.task1` After fixing the failed Quality Gates release retest in commits `2b69a8ccb` and `6b7bf55fb`, request explicit user confirmation before rebuilding release artifacts; do not run `./scripts/build-all.sh` or `./scripts/build-release.sh --use-current-version` until the user approves a new release build (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates rebuild checkpoint`). Rebuild Confirmation Gate (2026-05-12): release `1.2.239` remains rejected; the Quality Gates lifecycle fixes are now in commits `2b69a8ccb` and `6b7bf55fb`; awaiting explicit user approval before rerunning release scripts for the next candidate.
62. [DONE] Git Commit: `docs: prepare quality gates rebuild checkpoint` (hash: 95c3adf2b)

## Phase 11 - Release Rebuild (owner: Codex, updated: 2026-05-12)

### Stream: Rebuild Release Candidate

63. [DONE] `quality-gates-implementation.phase11.rebuild-docs.task1` After explicit confirmation only, update release notes for the next Quality Gates release and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates rebuild release notes`). Release rebuild approved by user on 2026-05-12; next candidate version: `1.2.240`.
64. [DONE] Git Commit: `docs: prepare quality gates rebuild release notes` (hash: 3f4947d80)
65. [DONE] `quality-gates-implementation.phase11.rebuild-build.task1` After explicit confirmation only, rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild quality gates release`). Build evidence (2026-05-12): `./scripts/build-all.sh --version 1.2.240` completed successfully; refreshed tarballs now present in `doc/tmp/releases/` for Claude, Codex, Gemini, core `darwin-arm64`, CEF launcher `macos-arm64`, `vscode-webview`, and `project-manager`.
66. [DONE] Git Commit: `chore: rebuild quality gates release` (hash: 4b53b29a1)

## Phase 12 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-12)

### Stream: User Re-Retest

67. [DONE] `quality-gates-implementation.phase12.user-reretest.task1` User installs the rebuilt release and retests Diagram Modules, Application Skeleton, Quality Gates, and Development Tree unlock behavior against the Quality Gates release-fix scenario (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record rebuilt quality gates user workflow acceptance`). Retest candidate (2026-05-12): build commit `4b53b29a1`, VSIX `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.240.vsix`, refreshed tarballs in `doc/tmp/releases/`. Retest result (2026-05-12): release `1.2.240` failed during Application Skeleton. Observed defects: Core opened Application Skeleton Phase 4 user-return before materialization was accepted; Phase 3 materialization pair `7/8` and premature Phase 4 pair `11/12` ended up blocked while `phase3.materialize.repair2.task1` remained in progress; workspace ledger advanced `application_skeleton` to completed / `quality_gates` active on repair commit `1d99f36` before the materialization revalidation loop converged. The same managed stage-handoff shortcut must be audited for Diagram Modules and removed from Quality Gates parity paths.
68. [DONE] Git Commit: `docs: record rebuilt quality gates user workflow acceptance` (hash: 292b21bab)

## Phase 13 - Cross-Stage Lifecycle Barrier Repairs (owner: Codex, updated: 2026-05-12)

### Stream: Diagram Modules Handoff Audit

69. [DONE] `quality-gates-implementation.phase13.diagram-modules-handoff.task1` Audit Diagram Modules for the same managed handoff boundary and ensure the final accepted Product Part repair still completes the step and opens Application Skeleton only after the repaired artifact is reread as valid (scope: `packages/core/src/managed-workspace/managed-diagram-modules-plan-mutator.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-diagram-modules.test.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.diagram-modules.test.ts`; expected commit: `fix: harden diagram modules handoff barrier`).
70. [DONE] Git Commit: `fix: harden diagram modules handoff barrier` (hash: fbeafb634)

### Stream: Application Skeleton Validated Handoff

71. [DONE] `quality-gates-implementation.phase13.application-skeleton-handoff.task1` Rework Application Skeleton so materialization or repair commits do not unlock Quality Gates or mark the stage completed until Core rereads the committed artifacts, confirms a materialized accepted skeleton without validation errors, and opens only a Phase 4 idle user-return anchor instead of auto-opening `revision1` (scope: `packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts`; expected commit: `fix: gate application skeleton handoff on validated materialization`).
72. [DONE] Git Commit: `fix: gate application skeleton handoff on validated materialization` (hash: 7e07030f1)

### Stream: Post-Completion User Return Anchors

73. [DONE] `quality-gates-implementation.phase13.user-return-anchors.task1` Reopen Application Skeleton Phase 4 revisions from the idle handoff anchor once the user actually changes owned files, and treat clean Phase 4 handoff turns as discussion rather than `out_of_scope` so the idle anchor remains reachable at runtime (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.ts, packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.test.ts`; expected commit: `fix: normalize managed user return anchors`).
74. [DONE] Git Commit: `fix: normalize managed user return anchors` (hash: 547eac0cd)

### Stream: Quality Gates Validated User Return Anchor

75. [DONE] `quality-gates-implementation.phase13.quality-gates-user-return-anchor.task1` Rework Quality Gates so integration or repair commits open only the Phase 4 idle anchor after Core rereads the integrated contract, confirms accepted integrated state plus hook/package wiring, and leaves `revision1` to real user-return diffs instead of auto-opening it on the terminal integration commit (scope: `packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts`; expected commit: `fix: gate quality gates user return anchor on validated integration`).
76. [DONE] Git Commit: `fix: gate quality gates user return anchor on validated integration` (hash: e708409cc)

### Stream: Cross-Stage Regression Coverage

77. [DONE] `quality-gates-implementation.phase13.lifecycle-regressions.task1` Align workspace ledger handoff with validated child-plan anchors so terminal commit messages cannot advance managed stages early, validated repair/terminal anchor openings can promote the correct active stage, and Quality Gates Phase 4 anchor persistence remains covered at runtime (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts`; expected commit: `fix: align workspace handoff with validated anchors`).
78. [DONE] Git Commit: `fix: align workspace handoff with validated anchors` (hash: 581f98b72)

## Phase 14 - Verification And Release Rebuild Gate (owner: Codex, updated: 2026-05-12)

### Stream: Active Stage Persistence

79. [DONE] `quality-gates-implementation.phase14.handoff-decoupling.task1` Keep managed stages on their own post-completion active plan while only unlocking downstream stages and seeding downstream child plans from the validated anchor, so upstream user-return revisions remain committable after handoff (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts`; expected commit: `fix: preserve active stage through managed handoff`).
80. [DONE] Git Commit: `fix: preserve active stage through managed handoff` (hash: 397eba9d5)

### Stream: Targeted Verification

81. [DONE] `quality-gates-implementation.phase14.verification.task1` Run targeted verification for the cross-stage managed handoff barrier fixes and record the executed commands in this plan before any rebuild is requested (scope: `packages/core/src/managed-workspace, packages/core/src/remote-bridge/handlers`; expected commit: `test: verify managed stage handoff fixes`). Verification commands (2026-05-12): `npx ultracite check packages/core/src/managed-workspace/managed-diagram-modules-plan-mutator.ts packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-diagram-modules.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.ts packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-user-return-revision.test.ts packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.diagram-modules.test.ts` (OK), `npx tsx --test packages/core/src/managed-workspace/managed-plan-orchestrator-shim-diagram-modules.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-review-turn-classifier.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-user-return-revision.test.ts packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.diagram-modules.test.ts` (38/38 pass), `npm run build --workspace packages/core` (OK).
82. [DONE] Git Commit: `test: verify managed stage handoff fixes` (hash: 78eb68e15)

### Stream: Release Confirmation

83. [DONE] `quality-gates-implementation.phase14.rebuild-confirmation.task1` Stop after verification, request explicit user confirmation for rebuilding the managed handoff barrier fixes, and record that checkpoint before running release scripts again (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed handoff rebuild checkpoint`). Rebuild Confirmation Gate (2026-05-12): targeted handoff verification is green (`ultracite`, 38/38 targeted tests, `npm run build --workspace packages/core`); explicit rebuild approval was provided by the user in this session for a full implementation through the next release build after one more plan review.
84. [DONE] Git Commit: `docs: prepare managed handoff rebuild checkpoint` (hash: 464950454)

## Phase 15 - Release Rebuild (owner: Codex, updated: 2026-05-12)

### Stream: Rebuild Release Candidate

85. [DONE] `quality-gates-implementation.phase15.rebuild-docs.task1` After explicit confirmation only, update release notes for the next managed handoff rebuild candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed handoff rebuild release notes`). Release rebuild approved by user on 2026-05-12; next candidate version: `1.2.241`; release scope: validated downstream unlock only after reread, persistent upstream `activeStage` through post-completion anchors, and idle Phase 4 anchors for Application Skeleton / Quality Gates before real user-return revisions.
86. [DONE] Git Commit: `docs: prepare managed handoff rebuild release notes` (hash: 69ab9399a)
87. [DONE] `quality-gates-implementation.phase15.rebuild-build.task1` After explicit confirmation only, rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild managed handoff release`). Build evidence (2026-05-12): `./scripts/build-all.sh --allow-dirty --version 1.2.241` completed successfully with the managed-plan dirty-state exception (`doc/TODO/todo-plan.md` machine advance before the build); refreshed tarballs are present in `doc/tmp/releases/`; `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully and confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`; VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.241.vsix`.
88. [DONE] Git Commit: `chore: rebuild managed handoff release` (hash: e5a90a205)

## Phase 16 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-12)

### Stream: User Re-Re-Retest

89. [DONE] `quality-gates-implementation.phase16.user-reretest.task1` User installs the rebuilt release and retests Diagram Modules, Application Skeleton, Quality Gates, and Development Tree unlock behavior against the managed handoff barrier fix scenario (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed handoff rebuild acceptance`). Result: release `1.2.241` passed Diagram Modules and Application Skeleton, but Quality Gates stalled in contract review. Observed defects: Project Manager exposed no step-local `Accept Contract` button under `quality-gates.md`; the agent ended the draft turn with Core-review wording instead of an explicit user accept-or-revise instruction; typed Quality Gates acceptance still did not advance from review into the Core-owned acceptance/integration continuation. Agreed repair scope: shared contract-review protocol with Core form-check before user review, panel-scoped explicit acceptance, normal chat revisions for requested changes, and Core-owned continuation into post-acceptance materialization/integration.
90. [DONE] Git Commit: `docs: record managed handoff rebuild acceptance` (hash: 0184c0e40)

## Phase 17 - Contract Review Boundary Repairs (owner: Codex, updated: 2026-05-12)

### Stream: Managed Contract Review Protocol

91. [DONE] `quality-gates-implementation.phase17.review-prompts.task1` Align Application Skeleton and Quality Gates prompt assets with the shared contract review protocol so draft turns explicitly ask the user to confirm the contract or list revisions, never phrase that boundary as Core review/approval, and keep Core reserved for form/lifecycle ownership plus post-acceptance continuation; record the resulting task split in the active plan before continuing with template-only regressions (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `docs: align managed contract review prompts`).
92. [DONE] Git Commit: `docs: align managed contract review prompts` (hash: 46ce32407)
93. [DONE] `quality-gates-implementation.phase17.review-template-tests.task1` Sync bundled template assertions with the revised user-review wording for Application Skeleton and Quality Gates so asset/template drift is caught without widening the prompt-edit task scope (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `test: sync managed contract review prompt templates`).
94. [DONE] Git Commit: `test: sync managed contract review prompt templates` (hash: 73353f131)
95. [DONE] `quality-gates-implementation.phase17.quality-gates-panel.task1` Add a step-local Quality Gates `Accept Contract` button under the rendered contract artifact, reuse Core transport decisions for disabled-state reasons, and surface a short "write revisions in chat" hint next to the button (scope: `src/client/project-manager/components/quality-gates/quality-gates-accept-contract-button.tsx, src/client/project-manager/components/quality-gates/quality-gates-panel.tsx, src/client/project-manager/components/quality-gates/quality-gates-accept-contract-button.test.tsx`; expected commit: `feat: add quality gates accept contract button`).
96. [DONE] Git Commit: `feat: add quality gates accept contract button` (hash: 69defd28e)
97. [DONE] `quality-gates-implementation.phase17.acceptance-fallback.task1` Replace the Application Skeleton-only typed acceptance router with a stage-aware managed contract acceptance fallback so explicit Quality Gates acceptance text reaches the Core runner while ambiguous replies continue down the normal revision path (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-typed-acceptance-router.ts, packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts`; expected commit: `fix: route managed contract typed acceptance by stage`).
98. [DONE] Git Commit: `fix: route managed contract typed acceptance by stage` (hash: c8d1a9bdc)
99. [DONE] `quality-gates-implementation.phase17.review-regressions.task1` Add focused regression coverage for the shared contract review protocol, Quality Gates accept-command transport, and post-turn acceptance wording so the release retest cannot regress back to silent review dead-ends (scope: `packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, src/client/project-manager/services/managed-stage-accept-contract-client.test.ts`; expected commit: `test: cover managed contract review protocol`).
100. [DONE] Git Commit: `test: cover managed contract review protocol` (hash: 5e206572e)

## Phase 18 - Verification And Release Rebuild Gate (owner: Codex, updated: 2026-05-12)

### Stream: Targeted Verification

101. [DONE] `quality-gates-implementation.phase18.verification.task1` Run targeted verification for the managed contract review boundary fixes across Core, prompt assets, and Project Manager, then record the executed commands in this plan before any rebuild is requested (scope: `packages/core, packages/agents, src/client/project-manager`; expected commit: `test: verify managed contract review fixes`). Verification evidence (2026-05-12): `npx tsx --test packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts src/client/project-manager/components/quality-gates/quality-gates-accept-contract-button.test.tsx packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts src/client/project-manager/services/managed-stage-accept-contract-client.test.ts` passed (`52/52`); `npm run build --workspace packages/core` passed; `npm run typecheck:webview` passed; `npm run build:webview` passed.
102. [DONE] Git Commit: `test: verify managed contract review fixes` (hash: 23cd4b8bb)

### Stream: Release Confirmation

103. [DONE] `quality-gates-implementation.phase18.rebuild-confirmation.task1` Stop after verification, request explicit user confirmation for rebuilding the managed contract review fixes, and record that checkpoint before running release scripts again (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed contract review rebuild checkpoint`). Rebuild already approved by the user on 2026-05-12 with the instruction to continue through the next release build without another pause after the repair streams were created.
104. [DONE] Git Commit: `docs: prepare managed contract review rebuild checkpoint` (hash: c4770aa8d)

## Phase 19 - Release Rebuild (owner: Codex, updated: 2026-05-12)

### Stream: Rebuild Release Candidate

105. [DONE] `quality-gates-implementation.phase19.rebuild-docs.task1` After explicit confirmation only, update release notes for the next managed contract review candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed contract review release notes`). Release rebuild approved by user on 2026-05-12; next candidate version: `1.2.242`; release scope: explicit Quality Gates review action in PM, user-facing accept-or-revise draft wording, stage-aware typed acceptance fallback for `application_skeleton` and `quality_gates`, and regression guards that keep ambiguous short acknowledgements on the normal revision path.
106. [DONE] Git Commit: `docs: prepare managed contract review release notes` (hash: 855a8aac6)
107. [DONE] `quality-gates-implementation.phase19.rebuild-build.task1` After explicit confirmation only, rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild managed contract review release`). Build evidence (2026-05-12): `./scripts/build-all.sh --allow-dirty --version 1.2.242` completed successfully with the managed-plan dirty-state exception (`doc/TODO/todo-plan.md` machine advance before the build); refreshed tarballs are present in `doc/tmp/releases/`; `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully and confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`; VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.242.vsix`.
108. [DONE] Git Commit: `chore: rebuild managed contract review release` (hash: 6028529e0)

## Phase 20 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-12)

### Stream: User Re-Re-Re-Retest

109. [DONE] `quality-gates-implementation.phase20.user-reretest.task1` User installs the rebuilt release and retests Diagram Modules, Application Skeleton, Quality Gates, and Development Tree unlock behavior against the managed contract review boundary fix scenario (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed contract review acceptance`). Retest result (2026-05-12): Diagram Modules and Application Skeleton passed the shared contract review flow, including revision commits and typed acceptance via `Подтверждаю`. Quality Gates still stalled in `phase2.review.task2`: the agent's review revision prompt drifted away from the mandatory accept-or-revise closing line, and explicit typed acceptance such as `Подтверждаю` was intercepted by Core but did not reach the Quality Gates accept-contract runner or advance the child plan. The previously discussed rollover continuity failure on Spark remains a separate deferred investigation and is not part of this repair slice.
110. [DONE] Git Commit: `docs: record managed contract review acceptance` (hash: 1d0a74601)

## Phase 21 - Typed Acceptance And Prompt Boundary Repairs (owner: Codex, updated: 2026-05-12)

### Stream: Quality Gates Typed Acceptance Production Wiring

111. [DONE] `quality-gates-implementation.phase21.typed-acceptance-wiring.task1` Route managed typed acceptance in production by the session stage so `quality_gates` acceptance phrases call the Quality Gates Core runner instead of the Application Skeleton runner, and cover the dispatch path with a regression test (scope: `packages/core/src/remote-bridge/remote-bridge-bootstrap.ts, packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts`; expected commit: `fix: route quality gates typed acceptance in production`).
112. [DONE] Git Commit: `fix: route quality gates typed acceptance in production` (hash: 3575b5585)

### Stream: Exact Contract Review Closing Phrase

113. [DONE] `quality-gates-implementation.phase21.review-closing-phrase.task1` Require the exact shared Russian closing phrase for every pre-acceptance Application Skeleton and Quality Gates contract review response, and regenerate bundled template assets from the updated prompt sources (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts`; expected commit: `docs: enforce exact managed contract review phrase`).
114. [DONE] Git Commit: `docs: enforce exact managed contract review phrase` (hash: 6a55f3ee4)
115. [DONE] `quality-gates-implementation.phase21.review-closing-phrase-tests.task1` Tighten bundled template assertions so prompt drift is caught only when the exact review closing phrase remains present for both managed contract stages (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `test: lock managed contract review phrase`).
116. [DONE] Git Commit: `test: lock managed contract review phrase` (hash: 258fccd26)

## Phase 22 - Verification And Release Rebuild Gate (owner: Codex, updated: 2026-05-12)

### Stream: Targeted Verification

117. [DONE] `quality-gates-implementation.phase22.verification.task1` Run targeted verification for the production typed acceptance repair and exact review-closing phrase enforcement, then record the executed commands in this plan before any rebuild is requested (scope: `packages/core, packages/agents/application-skeleton-agent, packages/agents/quality-gates-agent`; expected commit: `test: verify managed typed acceptance review fixes`). Verification evidence (2026-05-12): `npx tsx --test packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts` passed (`33/33`); `npx ultracite check packages/core/src/remote-bridge/remote-bridge-bootstrap.ts packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md packages/agents/quality-gates-agent/assets/quality-gates-prompt.md packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/templates/bundled-templates.ts` passed; `npm run build --workspace packages/core` passed.
118. [DONE] Git Commit: `test: verify managed typed acceptance review fixes` (hash: 89f92195b)

### Stream: Release Confirmation

119. [DONE] `quality-gates-implementation.phase22.rebuild-confirmation.task1` Stop after verification, request explicit user confirmation for rebuilding the typed acceptance and prompt-boundary fixes, and record that checkpoint before running release scripts again (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed typed acceptance rebuild checkpoint`). Rebuild approved by the user on 2026-05-12 with the instruction to continue through release preparation and packaging without another pause.
120. [DONE] Git Commit: `docs: prepare managed typed acceptance rebuild checkpoint` (hash: ce3ba0859)

## Phase 23 - Release Rebuild (owner: Codex, updated: 2026-05-12)

### Stream: Rebuild Release Candidate

121. [DONE] `quality-gates-implementation.phase23.rebuild-docs.task1` After explicit confirmation only, update release notes for the next managed typed acceptance candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed typed acceptance release notes`). Release rebuild approved by user on 2026-05-12; next candidate version: `1.2.243`; release scope: production stage-aware typed acceptance routing for `quality_gates`, exact mandatory review-closing phrase for Application Skeleton and Quality Gates draft/revision turns, and regression coverage that locks both the bootstrap dispatch path and the shared prompt/template boundary.
122. [DONE] Git Commit: `docs: prepare managed typed acceptance release notes` (hash: 76f7de93e)
123. [DONE] `quality-gates-implementation.phase23.rebuild-build.task1` After explicit confirmation only, rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild managed typed acceptance release`). Build evidence (2026-05-12): `./scripts/build-all.sh --allow-dirty --version 1.2.243` completed successfully with the managed-plan dirty-state exception (`doc/TODO/todo-plan.md` machine advance before the build); refreshed tarballs are present in `doc/tmp/releases/` for Claude, Codex, Gemini, core `darwin-arm64`, CEF launcher `macos-arm64`, `vscode-webview`, and `project-manager`; `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully and confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`; VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.243.vsix`.
124. [DONE] Git Commit: `chore: rebuild managed typed acceptance release` (hash: ca5cc329d)

## Phase 24 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-12)

### Stream: User Re-Re-Re-Re-Retest

125. [DONE] `quality-gates-implementation.phase24.user-reretest.task1` User installs the rebuilt release and retests Application Skeleton and Quality Gates review acceptance, including typed acceptance with `Подтверждаю` after at least one contract revision (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed typed acceptance workflow acceptance`). Retest result (2026-05-12): Application Skeleton accepted typed `Подтверждаю` and continued into materialization correctly. Quality Gates still stalled after the same typed acceptance phrase on release `1.2.243`: the child plan advanced through `docs: accept quality gates contract` into `quality-gates.phase3.integration.task1`, but no provider-visible integration continuation arrived in the same session. The Quality Gates acceptance-to-integration continuation transport must be repaired and regression-covered before another rebuild.
126. [DONE] Git Commit: `docs: record managed typed acceptance workflow acceptance` (hash: c7426e39b)

## Phase 25 - Acceptance Continuation Transport Repair (owner: Codex, updated: 2026-05-12)

### Stream: Post-Turn Re-Entry Queue

127. [DONE] `quality-gates-implementation.phase25.acceptance-continuation.task1` Queue a managed post-turn rerun when a Core-owned acceptance command calls `handle(sessionId)` while that session still has an in-flight post-turn arbitration, so the acceptance commit can always trigger the provider-visible Quality Gates integration continuation after the current pass finishes (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `fix: queue managed acceptance continuation reruns`).
128. [DONE] Git Commit: `fix: queue managed acceptance continuation reruns` (hash: 1eb58d53e)

## Phase 26 - Verification And Release Rebuild Gate (owner: Codex, updated: 2026-05-12)

### Stream: Targeted Verification

129. [DONE] `quality-gates-implementation.phase26.verification.task1` Run targeted verification for the managed acceptance continuation rerun repair and record the executed commands in this plan before any rebuild is requested (scope: `packages/core/src/remote-bridge/handlers`; expected commit: `test: verify managed acceptance continuation reruns`). Verification evidence (2026-05-12): `npx tsx --test packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.test.ts packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts` passed (`32/32`); `npx ultracite check packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts` passed; `npm run build --workspace packages/core` passed.
130. [DONE] Git Commit: `test: verify managed acceptance continuation reruns` (hash: e071a55cb)

### Stream: Release Confirmation

131. [DONE] `quality-gates-implementation.phase26.rebuild-confirmation.task1` Stop after verification, request explicit user confirmation for rebuilding the managed acceptance continuation repair, and record that checkpoint before running release scripts again (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed acceptance continuation rebuild checkpoint`). Rebuild approved by the user on 2026-05-12 with the instruction to continue through the newly sliced fix plan and immediately package a new release after the repair work completed.
132. [DONE] Git Commit: `docs: prepare managed acceptance continuation rebuild checkpoint` (hash: cb5cd218c)

## Phase 27 - Release Rebuild (owner: Codex, updated: 2026-05-12)

### Stream: Rebuild Release Candidate

133. [DONE] `quality-gates-implementation.phase27.rebuild-docs.task1` After explicit confirmation only, update release notes for the next managed acceptance continuation candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed acceptance continuation release notes`). Release rebuild approved by user on 2026-05-12; next candidate version: `1.2.244`; release scope: queued rerun of managed post-turn arbitration when Core acceptance lands during an in-flight pass, preserved Quality Gates acceptance-to-integration continuation in the same session, and regression coverage that locks the lost-rerun race.
134. [DONE] Git Commit: `docs: prepare managed acceptance continuation release notes` (hash: 86e0b5e10)
135. [DONE] `quality-gates-implementation.phase27.rebuild-build.task1` After explicit confirmation only, rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild managed acceptance continuation release`). Build evidence (2026-05-12): `./scripts/build-all.sh --allow-dirty --version 1.2.244` completed successfully with the managed-plan dirty-state exception (`doc/TODO/todo-plan.md` machine advance before the build); refreshed tarballs are present in `doc/tmp/releases/` for Claude, Codex, Gemini, core `darwin-arm64`, CEF launcher `macos-arm64`, `vscode-webview`, and `project-manager`; `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully and confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`; VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.244.vsix`.
136. [DONE] Git Commit: `chore: rebuild managed acceptance continuation release` (hash: addc92e6e)

## Phase 28 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-12)

### Stream: User Re-Re-Re-Re-Re-Retest

137. [DONE] `quality-gates-implementation.phase28.user-reretest.task1` User installs the rebuilt release and retests Quality Gates typed acceptance with `Подтверждаю`, including the immediate acceptance-to-integration continuation in the same session after at least one review turn (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed acceptance continuation workflow acceptance`). Retest result (2026-05-13): release `1.2.244` still stalls after Quality Gates contract acceptance. Core intercepts `Подтверждаю`, commits `docs: accept quality gates contract`, and advances the child plan to `quality-gates.phase3.integration.task1`, but no provider-visible integration continuation is sent. Root cause: Quality Gates progress reads `acceptanceCommitted` only from `quality-gates.json`, where it remains `false`, while Application Skeleton derives the same truth from `workspace.plan.md` accepted commit evidence. A second stale `phase2.review.task2` remains open and is handled by the review-anchor cleanup repair stream below.
138. [DONE] Git Commit: `docs: record managed acceptance continuation workflow acceptance` (hash: 20901670e)

## Phase 29 - Managed Review Anchor Cleanup Repair (owner: Codex, updated: 2026-05-13)

### Stream: Quality Gates Acceptance Commit Evidence

139. [DONE] `quality-gates-implementation.phase29.quality-gates-accepted-ledger.task1` Make Quality Gates derive `acceptanceCommitted` from `workspace.plan.md` accepted commit evidence, matching Application Skeleton, so Phase 3 integration continuation can fire after `docs: accept quality gates contract` even when the artifact still contains `acceptanceCommitted: false` (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts`; expected commit: `fix: derive quality gates acceptance from ledger`).
140. [DONE] Git Commit: `fix: derive quality gates acceptance from ledger` (hash: 152c0928c)

### Stream: Contract Review Revision Anchors

141. [DONE] `quality-gates-implementation.phase29.precommit-revision-injection.task1` Move Application Skeleton and Quality Gates review/user-return revision injection ahead of the managed documentation commit transaction so real artifact-changing review turns commit concrete `revisionN.task1` pairs and then return to the stable review anchor instead of letting the generic plan fallback create `phase2.review.task2` (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-revision-injection-runner.ts`; expected commit: `fix: inject managed review revisions before commits`).
142. [DONE] Git Commit: `fix: inject managed review revisions before commits` (hash: 9e38febcf)
143. [DONE] `quality-gates-implementation.phase29.stale-anchor-guard.task1` Harden managed child-plan mutation so Application Skeleton and Quality Gates acceptance cannot leave stale synthetic Phase 2 review pairs open, and the generic shim fallback cannot silently manufacture `Continue managed ...` tasks for managed contract-review anchors when explicit revision injection was required (scope: `packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts`; expected commit: `fix: prevent stale managed review anchors`).
144. [DONE] Git Commit: `fix: prevent stale managed review anchors` (hash: 786b119b0)
145. [DONE] `quality-gates-implementation.phase29.cross-stage-regressions.task1` Add regression coverage for the one-correction-then-accept flow in Application Skeleton and Quality Gates, and verify Diagram Modules user-return revision flow does not regress into generic `Continue managed ...` fallback tasks (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-diagram-modules.test.ts`; expected commit: `test: cover managed review anchor cleanup`).
146. [DONE] Git Commit: `test: cover managed review anchor cleanup` (hash: d91e85012)
147. [DONE] `quality-gates-implementation.phase29.verification.task1` Run targeted verification for the review-anchor cleanup repair across managed-workspace shim tests, post-turn service tests, and core build before any new release rebuild is requested (scope: `packages/core/src/managed-workspace, packages/core/src/remote-bridge/handlers`; expected commit: `test: verify managed review anchor cleanup`). Verification evidence (2026-05-13): `npx tsx --test packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.test.ts packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-diagram-modules.test.ts` passed (`47/47`); `npx ultracite check` passed for the changed progress, post-turn, mutator, shim, and regression files; `npm run build --workspace packages/core` passed.
148. [DONE] Git Commit: `test: verify managed review anchor cleanup` (hash: 248cf80e6)

## Phase 30 - Release Rebuild (owner: Codex, updated: 2026-05-13)

### Stream: Rebuild Release Candidate

149. [DONE] `quality-gates-implementation.phase30.rebuild-docs.task1` After explicit user confirmation, update release notes for the next managed review-anchor cleanup candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed review anchor cleanup release notes`). Release rebuild approved by user on 2026-05-13; next candidate version: `1.2.245`; release scope: Quality Gates acceptance evidence derived from `workspace.plan.md`, pre-commit review/user-return revision injection before managed commits, stale Phase 2 review-anchor cleanup after user acceptance, and cross-stage regression coverage for Application Skeleton, Quality Gates, and Diagram Modules.
150. [DONE] Git Commit: `docs: prepare managed review anchor cleanup release notes` (hash: d6bbcdbb9)
151. [DONE] `quality-gates-implementation.phase30.rebuild-build.task1` After explicit confirmation only, rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild managed review anchor cleanup release`). Build evidence (2026-05-13): `./scripts/build-all.sh --allow-dirty --version 1.2.245` completed successfully with the managed-plan dirty-state exception (`doc/TODO/todo-plan.md` machine advance before the build); refreshed tarballs are present in `doc/tmp/releases/` for Claude, Codex, Gemini, core `darwin-arm64`, CEF launcher `macos-arm64`, `vscode-webview`, and `project-manager`; `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully and confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`; VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.245.vsix`.
152. [DONE] Git Commit: `chore: rebuild managed review anchor cleanup release` (hash: 891c588da)

## Phase 31 - Integration Repair Retest Intake (owner: Codex, updated: 2026-05-13)

### Stream: Quality Gates Integration Failure Slicing

153. [DONE] `quality-gates-implementation.phase31.integration-repair-plan.task1` Record the release `1.2.245` Quality Gates integration failure and slice the repair streams before changing Core behavior again (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add quality gates integration repair plan`). Retest result (2026-05-13): Quality Gates now reaches Phase 3 after user acceptance, but Core rejects the agent materialization with a self-contradictory acceptance message: it lists missing hook wiring and outside-allowlist files, then tells the provider not to update Quality Gates artifacts and to wait for Core. The child plan receives a stale `phase2.acceptance.repairN` task instead of an actionable Phase 3 integration repair task, while valid integration-owned files such as `scripts/quality-gates/**` and `biome.jsonc` are treated as external blockers.
154. [DONE] Git Commit: `docs: add quality gates integration repair plan` (hash: f07148b2e)

## Phase 32 - Quality Gates Integration Repair Boundary (owner: Codex, updated: 2026-05-13)

### Stream: Core Integration Ownership And Phase Target

155. [DONE] `quality-gates-implementation.phase32.integration-ownership.task1` Include the actual Quality Gates materialization paths in Core-owned dirty-file checks, child-plan integration scopes, and installed shim fallback wording, while keeping volatile install noise out of the managed stage blocker list (scope: `packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts`; expected commit: `fix: repair quality gates integration ownership`).
156. [DONE] Git Commit: `fix: repair quality gates integration ownership` (hash: 8966da8b8)

### Stream: Actionable Integration Repair Feedback

157. [DONE] `quality-gates-implementation.phase32.integration-feedback.task1` Treat Quality Gates integrated-but-unfinalized Phase 3 work as integration repair and replace the failed-integration feedback dead-end with provider-actionable repair instructions tied to that repair task (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts`; expected commit: `fix: make quality gates repair feedback actionable`).
158. [DONE] Git Commit: `fix: make quality gates repair feedback actionable` (hash: 635f15b8b)

### Stream: Quality Gates Materialization Prompt Contract

159. [DONE] `quality-gates-implementation.phase32.integration-prompt.task1` Strengthen the Quality Gates agent prompt so materialization is complete only when scripts, package commands, Husky hook wiring, and accepted artifact state are all updated and ready for Core validation (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/agents/quality-gates-agent/assets/quality-gates-contract.md, packages/core/src/templates/bundled-templates.ts`; expected commit: `docs: clarify quality gates integration completion`).
160. [DONE] Git Commit: `docs: clarify quality gates integration completion` (hash: 884563429)

### Stream: Regression And Verification

161. [DONE] `quality-gates-implementation.phase32.integration-regressions.task1` Add regression coverage for Quality Gates integration repair task targeting, allowed materialization paths, and actionable failed-integration feedback (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `test: cover quality gates integration repair boundary`).
162. [DONE] Git Commit: `test: cover quality gates integration repair boundary` (hash: cd0fc47fd)
163. [DONE] `quality-gates-implementation.phase32.integration-template-regressions.task1` Lock the Quality Gates bundled template assertions to the explicit hook wiring and materialization-completion contract (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `test: lock quality gates integration prompt contract`).
164. [DONE] Git Commit: `test: lock quality gates integration prompt contract` (hash: 1c8801665)
165. [DONE] `quality-gates-implementation.phase32.prompt-phase-wording.task1` Remove stale Phase 2 materialization wording from the Quality Gates prompt/reference and regenerated bundled template so the accepted integration work is consistently described as Phase 3 (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/agents/quality-gates-agent/assets/quality-gates-contract.md, packages/core/src/templates/bundled-templates.ts`; expected commit: `docs: normalize quality gates phase wording`).
166. [DONE] Git Commit: `docs: normalize quality gates phase wording` (hash: de5332c3b)
167. [DONE] `quality-gates-implementation.phase32.explicit-hook-validation.task1` Require explicit `npm run qg:<gate-id>` hook wiring in both the live Quality Gates progress validator and the installed child-plan shim, so aggregate `qg:before-*` scripts cannot falsely finalize integration (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts`; expected commit: `fix: require explicit quality gates hook wiring`).
168. [DONE] Git Commit: `fix: require explicit quality gates hook wiring` (hash: 76e1fe3bb)
169. [DONE] `quality-gates-implementation.phase32.shim-explicit-hook-regressions.task1` Update managed child-plan shim regressions so Phase 4 only opens after explicit required gate hook calls, not aggregate `qg:before-*` calls alone (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts`; expected commit: `test: require explicit quality gates hook shim wiring`).
170. [DONE] Git Commit: `test: require explicit quality gates hook shim wiring` (hash: 188223fbe)
171. [DONE] `quality-gates-implementation.phase32.verification.task1` Run targeted verification for the Quality Gates integration repair boundary across Core handlers, managed-workspace mutators, prompt templates, and Core build before rebuilding the release (scope: `packages/core/src/remote-bridge/handlers, packages/core/src/managed-workspace, packages/core/src/templates, packages/agents/quality-gates-agent`; expected commit: `test: verify quality gates integration repair boundary`). Verification evidence (2026-05-13): `npx ultracite check packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts packages/agents/quality-gates-agent/assets/quality-gates-prompt.md packages/agents/quality-gates-agent/assets/quality-gates-contract.md packages/core/src/templates/bundled-templates.ts packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/remote-bridge/handlers/quality-gates-progress.ts packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts` passed; `npx tsx --test packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts` passed (`39/39`); `npm run build --workspace packages/core` passed.
172. [DONE] Git Commit: `test: verify quality gates integration repair boundary` (hash: e6be607d8)

## Phase 33 - Release Rebuild (owner: Codex, updated: 2026-05-13)

### Stream: Rebuild Release Candidate

173. [DONE] `quality-gates-implementation.phase33.rebuild-docs.task1` After the user's explicit rebuild request, update release notes for the next Quality Gates integration repair candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates integration repair release notes`). Release rebuild approved by the user on 2026-05-13; next candidate version: `1.2.246`; release scope: Phase 3 Quality Gates integration repair targeting, managed dirty-file ownership for `scripts/quality-gates/**` and `biome.jsonc`, provider-actionable failed-integration feedback, and prompt/template enforcement that materialization is complete only after explicit `npm run qg:<gate-id>` Husky hook wiring is present.
174. [DONE] Git Commit: `docs: prepare quality gates integration repair release notes` (hash: 22a356c40)
175. [DONE] `quality-gates-implementation.phase33.rebuild-build.task1` Rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild quality gates integration repair release`). Build evidence (2026-05-13): `./scripts/build-all.sh --allow-dirty --version 1.2.246` completed successfully with the managed-plan dirty-state exception (`doc/TODO/todo-plan.md` machine advance before the build); refreshed tarballs are present in `doc/tmp/releases/` for Claude, Codex, Gemini, core `darwin-arm64`, CEF launcher `macos-arm64`, `vscode-webview`, and `project-manager`; `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully and confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and `VSIX runtime package surface verified`; VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.246.vsix`.
176. [DONE] Git Commit: `chore: rebuild quality gates integration repair release` (hash: 9a57c1142)

## Phase 34 - Scope Closeout (owner: Codex, updated: 2026-05-13)

### Stream: Close Active Scope

177. [TODO] `quality-gates-implementation.phase34.closeout.task1` After explicit user acceptance only, archive this active plan and close the Quality Gates implementation scope (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-quality-gates-managed-orchestration-implementation-2026-05-11.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md`; expected commit: `docs: close quality gates implementation scope`).
178. [TODO] Git Commit: `docs: close quality gates implementation scope` (hash: TBD)
179. [TODO] `quality-gates-implementation.phase34.plans-cleanup.task1` Move or archive completed Quality Gates planning materials and refresh the docs index (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md, doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Scenario_1.2.TBD.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: archive quality gates implementation planning`).
180. [TODO] Git Commit: `docs: archive quality gates implementation planning` (hash: TBD)

## Phase 35 - Quality Gates Dynamic Integration Ownership Repair (owner: Codex, updated: 2026-05-13)

### Stream: Retest Failure Intake

181. [DONE] `quality-gates-implementation.phase35.dynamic-ownership-plan.task1` Record the release `1.2.246` Quality Gates integration failure and slice the dynamic ownership/action-policy repair before changing Core again (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add quality gates dynamic ownership repair plan`). Retest result (2026-05-13): Quality Gates reached Phase 3 and opened `quality-gates.phase3.integration.repair1.task1`, but Core still sent provider-visible instructions to do nothing because `.oxfmtrc.json`, `.oxlintrc.json`, `scripts/qg/**`, and `tsconfig.qg*.json` were treated as outside the active stage allowlist. Those paths were declared in `quality-gates.json.integratedPaths` and are Quality Gates materialization files. Core must classify stage-owned integration paths dynamically and must not emit `Do not update... Wait for Core...` when the same feedback contains repairable Phase 3 hook-wiring errors.
182. [DONE] Git Commit: `docs: add quality gates dynamic ownership repair plan` (hash: bf4f0fcc7)

### Stream: Dynamic Ownership And Action Policy

183. [DONE] `quality-gates-implementation.phase35.dynamic-ownership.task1` Classify Quality Gates-owned integration files from the accepted contract plus known QG toolchain paths, and make failed-integration action lines provider-actionable unless dirty files are truly outside the Quality Gates stage (scope: `packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts`; expected commit: `fix: classify dynamic quality gates integration ownership`).
184. [PENDING] Git Commit: `fix: classify dynamic quality gates integration ownership` (hash: TBD)
185. [TODO] `quality-gates-implementation.phase35.prompt-hook-ownership.task1` Strengthen the Quality Gates prompt/reference so Phase 3 cannot finish by declaring Husky hook regeneration as Core-owned pending work (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/agents/quality-gates-agent/assets/quality-gates-contract.md, packages/core/src/templates/bundled-templates.ts`; expected commit: `docs: require quality gates hook materialization`).
186. [TODO] Git Commit: `docs: require quality gates hook materialization` (hash: TBD)

### Stream: Dynamic Ownership Regressions

187. [TODO] `quality-gates-implementation.phase35.dynamic-ownership-regressions.task1` Add regressions for dynamic Quality Gates ownership, provider-actionable dirty-path repair feedback, and Phase 3 repair targeting with `scripts/qg/**` / Oxc config paths (scope: `packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts`; expected commit: `test: cover dynamic quality gates ownership repair`).
188. [TODO] Git Commit: `test: cover dynamic quality gates ownership repair` (hash: TBD)
189. [TODO] `quality-gates-implementation.phase35.prompt-regressions.task1` Lock bundled Quality Gates template wording so hook wiring remains agent-owned in Phase 3 and integrated state cannot defer required Husky hooks to Core (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.test.ts`; expected commit: `test: lock quality gates hook ownership wording`).
190. [TODO] Git Commit: `test: lock quality gates hook ownership wording` (hash: TBD)

### Stream: Verification

191. [TODO] `quality-gates-implementation.phase35.verification.task1` Run targeted verification for dynamic Quality Gates ownership/action-policy repairs and Core build before rebuilding the release (scope: `packages/core/src/remote-bridge/handlers, packages/core/src/managed-workspace, packages/core/src/templates, packages/agents/quality-gates-agent`; expected commit: `test: verify dynamic quality gates ownership repair`).
192. [TODO] Git Commit: `test: verify dynamic quality gates ownership repair` (hash: TBD)

## Phase 36 - Release Rebuild (owner: Codex, updated: 2026-05-13)

### Stream: Rebuild Release Candidate

193. [TODO] `quality-gates-implementation.phase36.rebuild-docs.task1` After the user's explicit rebuild request, update release notes for the next dynamic Quality Gates ownership repair candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare dynamic quality gates ownership release notes`).
194. [TODO] Git Commit: `docs: prepare dynamic quality gates ownership release notes` (hash: TBD)
195. [TODO] `quality-gates-implementation.phase36.rebuild-build.task1` Rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild dynamic quality gates ownership release`).
196. [TODO] Git Commit: `chore: rebuild dynamic quality gates ownership release` (hash: TBD)
