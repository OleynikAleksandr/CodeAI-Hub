# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-managed-orchestration-implementation",
  "branch": "main",
  "baseHead": "c348fa9d3",
  "lastRecordedCommit": "e708409cc",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md",
  "currentTaskId": "quality-gates-implementation.phase13.lifecycle-regressions.task1",
  "expectedCommitMessage": "fix: align workspace handoff with validated anchors",
  "debt": {
    "expectedCommitMessage": "fix: align workspace handoff with validated anchors",
    "preCommitHead": "e708409cc",
    "stage": "commit_pending",
    "taskId": "quality-gates-implementation.phase13.lifecycle-regressions.task1"
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
78. [PENDING] Git Commit: `fix: align workspace handoff with validated anchors` (hash: TBD)

## Phase 14 - Verification And Release Rebuild Gate (owner: Codex, updated: 2026-05-12)

### Stream: Targeted Verification

79. [TODO] `quality-gates-implementation.phase14.verification.task1` Run targeted verification for the cross-stage managed handoff barrier fixes and record the executed commands in this plan before any rebuild is requested (scope: `packages/core/src/managed-workspace, packages/core/src/remote-bridge/handlers`; expected commit: `test: verify managed stage handoff fixes`).
80. [TODO] Git Commit: `test: verify managed stage handoff fixes` (hash: TBD)

### Stream: Release Confirmation

81. [TODO] `quality-gates-implementation.phase14.rebuild-confirmation.task1` Stop after verification, request explicit user confirmation for rebuilding the managed handoff barrier fixes, and record that checkpoint before running release scripts again (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed handoff rebuild checkpoint`).
82. [TODO] Git Commit: `docs: prepare managed handoff rebuild checkpoint` (hash: TBD)

## Phase 15 - Release Rebuild (owner: Codex, updated: 2026-05-12)

### Stream: Rebuild Release Candidate

83. [TODO] `quality-gates-implementation.phase15.rebuild-docs.task1` After explicit confirmation only, update release notes for the next managed handoff rebuild candidate and record the rebuild scope before rerunning release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed handoff rebuild release notes`).
84. [TODO] Git Commit: `docs: prepare managed handoff rebuild release notes` (hash: TBD)
85. [TODO] `quality-gates-implementation.phase15.rebuild-build.task1` After explicit confirmation only, rerun `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then stage the rebuilt release artifacts for the next user retest (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**`; expected commit: `chore: rebuild managed handoff release`).
86. [TODO] Git Commit: `chore: rebuild managed handoff release` (hash: TBD)

## Phase 16 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-12)

### Stream: User Re-Re-Retest

87. [TODO] `quality-gates-implementation.phase16.user-reretest.task1` User installs the rebuilt release and retests Diagram Modules, Application Skeleton, Quality Gates, and Development Tree unlock behavior against the managed handoff barrier fix scenario (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed handoff rebuild acceptance`).
88. [TODO] Git Commit: `docs: record managed handoff rebuild acceptance` (hash: TBD)

## Phase 17 - Scope Closeout (owner: Codex, updated: 2026-05-12)

### Stream: Close Active Scope

89. [TODO] `quality-gates-implementation.phase17.closeout.task1` After explicit user acceptance only, archive this active plan and close the Quality Gates implementation scope (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-quality-gates-managed-orchestration-implementation-2026-05-11.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md`; expected commit: `docs: close quality gates implementation scope`).
90. [TODO] Git Commit: `docs: close quality gates implementation scope` (hash: TBD)
91. [TODO] `quality-gates-implementation.phase17.plans-cleanup.task1` Move or archive completed Quality Gates planning materials and refresh the docs index (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Scenario.md, doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Scenario_1.2.TBD.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: archive quality gates implementation planning`).
92. [TODO] Git Commit: `docs: archive quality gates implementation planning` (hash: TBD)
