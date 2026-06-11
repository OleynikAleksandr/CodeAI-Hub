# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-restore-isolation-2026-06-10",
  "branch": "main",
  "baseHead": "df0341147",
  "lastRecordedCommit": "978f6da18",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md",
  "currentTaskId": "qg-restore-isolation.phase6o.vsix.task1",
  "expectedCommitMessage": "build: package product part brief barrier vsix release",
  "debt": {
    "expectedCommitMessage": "build: package product part brief barrier vsix release",
    "preCommitHead": "978f6da18",
    "stage": "commit_pending",
    "taskId": "qg-restore-isolation.phase6o.vsix.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md`
  - `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`
  - `packages/agents/quality-gates-agent/assets/quality-gates-contract.md`
- **Code surfaces that influence this plan:**
  - `packages/core/src/managed-workflow-orchestration/quality-gates/`
  - `packages/core/src/templates/`
  - `packages/agents/quality-gates-agent/assets/`
- Only this list is the recovery context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task must touch no more than 3 files/packages.
- Every implementation task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"` for normal commit workflow.
- Do not bypass Husky hooks or quality gates.
- Do not special-case `qg:restore`; the architectural rule is sequential workspace verification for every command that can mutate dependency/install state.
- Keep Quality Gates name-agnostic validation intact: `commands.<gate-id>.proposedCommand` remains the machine source of truth.
- Release build is not automatic. Ask the user before release notes, version bump, `build-all.sh`, or `build-release.sh`.

## Phase 1 - Planning Intake (owner: Codex, updated: 2026-06-10)

### Stream: Restore Isolation Scope

1. [DONE] `qg-restore-isolation.phase1.intake.task1` Open the active Quality Gates restore-isolation scope, add the planning source, and register it in Docs Index (scope: `doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan quality gates restore isolation`).
2. [DONE] Git Commit: `docs: plan quality gates restore isolation` (hash: 90f771ec6)

## Phase 2 - Sequential Verification Contract (owner: Codex, updated: 2026-06-10)

### Stream: Core Evidence Contract

3. [DONE] `qg-restore-isolation.phase2.evidence.task1` Require sequential execution metadata for verified Quality Gates Phase 4 evidence and add regression tests for missing/accepted sequential evidence (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts`; expected commit: `fix: require sequential quality gates verification evidence`). Result: targeted Quality Gates tests (`npx tsx --test ...formal-verification-runner.test.ts ...validator-runner-evidence.test.ts`) passed 13/13; `npm run build --workspace=@codeai-hub/core` passed.
4. [DONE] Git Commit: `fix: require sequential quality gates verification evidence` (hash: 4f330636a)
5. [DONE] `qg-restore-isolation.phase2.diagnostics.task1` Update Quality Gates verification repair diagnostics to explain the sequential execution evidence contract and preferred JSON shape (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-diagnostics-explainer.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: explain sequential quality gates evidence`). Result: targeted prompt diagnostics test (`npx tsx --test ...quality-gates-prompt-builder.phase-envelope.test.ts`) passed 2/2; Ultracite check passed for changed diagnostics files.
6. [DONE] Git Commit: `fix: explain sequential quality gates evidence` (hash: 3d13b207c)

### Stream: Provider Prompt Contract

7. [DONE] `qg-restore-isolation.phase2.prompts.task1` Embed the sequential formal verification contract into Core Phase 4 continuation/repair prompts and cover it with prompt tests (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-repair-prompt-dispatch.ts`; expected commit: `fix: serialize quality gates verification prompts`). Result: Phase 4 repair and initial continuation prompts now share the sequential verification contract; targeted prompt test passed 3/3; Ultracite check passed for changed prompt files.
8. [DONE] Git Commit: `fix: serialize quality gates verification prompts` (hash: edfb5a605)
9. [DONE] `qg-restore-isolation.phase2.assets.task1` Sync the bundled Quality Gates agent asset/template contract so generated Phase 4 prompts forbid parallel verification command execution (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `fix: sync quality gates sequential verification asset`). Result: `node scripts/generate-bundled-templates.js` regenerated `bundled-templates.ts`; bundled Quality Gates template test passed 3/3; Ultracite check passed for changed asset/template files.
10. [DONE] Git Commit: `fix: sync quality gates sequential verification asset` (hash: ab3c43750)

## Phase 3 - Documentation Sync (owner: Codex, updated: 2026-06-10)

### Stream: SSOT Update

11. [DONE] `qg-restore-isolation.phase3.docs.task1` Synchronize the implemented sequential Quality Gates verification contract into managed workflow SSOT docs (scope: `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe sequential quality gates verification`). Result: ManagedWorkflowOrchestration and WorkflowSteps Overview now describe Phase 4 as a sequential workspace transaction with exclusive mutation commands and ordered evidence.
12. [DONE] Git Commit: `docs: describe sequential quality gates verification` (hash: 591ed5b3c)

## Phase 4 - Tooling Verification (owner: Codex, updated: 2026-06-10)

### Stream: Targeted Verification

13. [DONE] `qg-restore-isolation.phase4.verify.task1` Run targeted Quality Gates tests and package build/typecheck needed for the changed Core/template surfaces; record results in the plan (scope: `packages/core, packages/agents/quality-gates-agent, doc/TODO/todo-plan.md`; expected commit: `test: verify quality gates restore isolation`). Result: targeted Quality Gates tests (`npx tsx --test ...formal-verification-runner.test.ts ...validator-runner-evidence.test.ts ...prompt-builder.phase-envelope.test.ts ...quality-gates-bundled-templates.test.ts`) passed 19/19; `npm run build --workspace=@codeai-hub/core` passed.
14. [DONE] Git Commit: `test: verify quality gates restore isolation` (hash: f278320fe)

## Phase 5 - Release Build (owner: Codex, updated: 2026-06-10)

### Stream: Release Notes

15. [DONE] `qg-restore-isolation.phase5.release-notes.task1` Prepare release notes for the user-authorized Quality Gates restore-isolation release before version bump/build scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates restore isolation release notes`).
16. [DONE] Git Commit: `docs: prepare quality gates restore isolation release notes` (hash: fb549e4a8)

### Stream: Release Artifacts

17. [DONE] `qg-restore-isolation.phase5.build-all.task1` Run `./scripts/build-all.sh` to bump package versions and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare quality gates restore isolation release artifacts`). Result: `./scripts/build-all.sh` completed successfully for 1.2.487; provider, Core, VS Code webview, Project Manager, and CEF launcher tarballs were generated.
18. [DONE] Git Commit: `build: prepare quality gates restore isolation release artifacts` (hash: 844ecffc5)
19. [DONE] `qg-restore-isolation.phase5.vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency pruning/package output, and copy release artifacts to `doc/tmp/releases/` as needed (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package quality gates restore isolation vsix release`). Result: `./scripts/build-release.sh --use-current-version` completed for 1.2.487; SDK exclusions, local artifact validation, markdown links, duplication check, dev dependency pruning/restoration, VSIX surface verification, and package-size verification passed. VSIX: `codeai-hub-1.2.487.vsix` (5.1M); release tarballs are present in `doc/tmp/releases/`.
20. [DONE] Git Commit: `build: package quality gates restore isolation vsix release` (hash: f6313f800)

## Phase 6 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-10)

### Stream: Retest

21. [DONE] `qg-restore-isolation.phase6.user-retest.task1` User installs the release and retests Quality Gates Baseline Phase 4 with a restore/delete/install-style gate command, then continues through several workflow steps to confirm the agent and orchestrator behavior (scope: `manual retest`; no commit expected). Result: v1.2.487 Quality Gates Phase 4 behaved correctly: sequential evidence was recorded and Core completed the step. Follow-up defect found after QG completion: the post-QG handoff/continuity commit attempted `git add -A` on ignored runtime session paths and released the input.

## Phase 6A - Post-QG Handoff Commit Boundary (owner: Codex, updated: 2026-06-10)

### Stream: Ignored Runtime Path Filtering

22. [DONE] `qg-restore-isolation.phase6a.ignored-runtime.task1` Prevent workflow handoff/continuity commits after Quality Gates completion from attempting to stage ignored runtime session paths while still committing trackable continuity and handoff artifacts; add focused regression coverage for ignored `.codeai-hub/**/runtime` paths (scope: `packages/core/src/remote-bridge/handlers, packages/core/src/workflow/boundary, doc/TODO/todo-plan.md`; expected commit: `fix: skip ignored runtime paths in workflow handoff commits`). Result: `WorkflowBoundaryGit` now filters explicit ignored pathspecs before staging while preserving tracked matches; regression covers ignored `.codeai-hub/**/runtime/sessions` alongside trackable continuity paths. Targeted tests passed 5/5 (`workflow-boundary-git.test.ts`, `session-request-handler-managed-workflow-turn.quality-gates.test.ts`); Ultracite check passed for changed files; `npm run build --workspace=@codeai-hub/core` passed.
23. [DONE] Git Commit: `fix: skip ignored runtime paths in workflow handoff commits` (hash: b9e5dc924)

## Phase 6B - User Workflow Acceptance Testing (owner: User, updated: 2026-06-10)

### Stream: Retest After Handoff Fix

24. [DONE] `qg-restore-isolation.phase6b.user-retest.task1` User retests post-Quality-Gates handoff after the ignored-runtime staging fix: Quality Gates completion should advance into the next workflow step without a Core-side ignored-path git add error (scope: `manual retest`; no commit expected). Result: the post-QG handoff advanced into the lead Product Part workflow, and the Product Part brief/order plan commits were accepted. Follow-up defects found during downstream Development Tree testing: Clear/Undo leaves unified runtime sessions behind on workflow-stage and downstream node clears, and stale Core runtime state can pre-create future Development Tree worktree paths before `git worktree add`.

## Phase 6C - Clear/Undo Runtime Cleanup (owner: Codex, updated: 2026-06-10)

### Stream: Runtime Session Pruning

25. [DONE] `qg-restore-isolation.phase6c.clear-runtime.task1` Add a shared Clear/Undo runtime-session cleanup helper and wire workflow-stage clears to prune matching unified session files and provider-native session files without deleting unrelated sessions (scope: `packages/core/src/remote-bridge/handlers/workflow-clear-session-cleanup.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts`; expected commit: `fix: prune workflow stage clear runtime sessions`).
26. [DONE] Git Commit: `fix: prune workflow stage clear runtime sessions` (hash: e167c48d4)
27. [DONE] `qg-restore-isolation.phase6c.clear-devtree-node.task1` Wire downstream Development Tree node Clear to the shared runtime-session cleanup helper so cluster/module clears remove matching unified and provider-native session files together with in-memory sessions, continuity, and worktrees (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: prune development tree node clear runtime sessions`).
28. [DONE] Git Commit: `fix: prune development tree node clear runtime sessions` (hash: f3a3973ac)

### Stream: Development Tree Worktree Bootstrap Preflight

29. [DONE] `qg-restore-isolation.phase6c.worktree-preflight.task1` Make Development Tree cluster-contract worktree bootstrap idempotent against stale Core runtime-only directories while blocking non-runtime path collisions before `git worktree add -B` mutates branch refs (scope: `packages/core/src/development-tree/node-bootstrap, doc/TODO/todo-plan.md`; expected commit: `fix: self-heal stale development tree worktree paths`).
30. [DONE] Git Commit: `fix: self-heal stale development tree worktree paths` (hash: b30b7fafb)

### Stream: Product Part Root Cleanup Alignment

31. [DONE] `qg-restore-isolation.phase6c.clear-product-part-root.task1` Wire Product Part root Clear to the shared runtime-session cleanup helper so root Product Part restarts prune stale unified session files by stage/part fragments in addition to live session ids (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: align product part clear runtime cleanup`).
32. [DONE] Git Commit: `fix: align product part clear runtime cleanup` (hash: 6d6016896)

## Phase 6D - User Workflow Acceptance Testing (owner: User, updated: 2026-06-10)

### Stream: Retest After Clear/Undo Fix

33. [DONE] `qg-restore-isolation.phase6d.user-retest.task1` User retests Clear/Undo across workflow stages, Product Part root nodes, and downstream Development Tree nodes, then retries the downstream cluster-contract wave that previously failed on an existing worktree path (scope: `manual retest`; no commit expected). Result: Product Part and cluster-contract restart path worked after the Clear/Undo cleanup fix. Follow-up architectural issues were identified for a separate Development Tree refactor planning capture: empty downstream TODO scaffolds in the main workspace, doc-only cluster-contract merge semantics, missing executable wave runner, and cluster/module artifact boundary mismatch.

## Phase 6E - Development Tree Follow-up Planning Capture (owner: Codex, updated: 2026-06-10)

### Stream: Downstream Execution Refactor Intake

34. [DONE] `qg-restore-isolation.phase6e.dev-tree-downstream-planning.task1` Create the active Development Tree downstream execution refactor planning document and capture the first agreed architecture topic: no downstream cluster tree merge before code exists, lead Product Part order plans must drive executable waves, and cluster worktrees should own cluster facade/module boundary/code assembly before mainline integration (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: capture development tree downstream execution refactor`).
35. [DONE] Git Commit: `docs: capture development tree downstream execution refactor` (hash: 30fa09ba0)

## Phase 6F - Development Tree Doc-only Merge Prevention (owner: Codex, updated: 2026-06-10)

### Stream: Strategy Capture

36. [DONE] `qg-restore-isolation.phase6f.downstream-strategy.task1` Update the active downstream execution refactor planning document with the immediate protective strategy: accepted cluster contracts become boundary-accepted checkpoints, not mainline merges; cluster worktrees stay alive until facade/module code exists; full cluster and standalone module contents merge only after code-ready evidence (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: update downstream merge prevention strategy`).
37. [DONE] Git Commit: `docs: update downstream merge prevention strategy` (hash: 8866e758c)

### Stream: Boundary Accepted Without Mainline Doc Merge

38. [DONE] `qg-restore-isolation.phase6f.boundary-accepted.task1` Stop cluster contract review acceptance from copying draft documentation artifacts into the main workspace or marking the cluster as merged; record a boundary-accepted checkpoint instead while leaving the downstream worktree active for future facade/module code work, including removal of the now-dead merged-state helper export required by `check:knip` (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.test.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts, packages/core/src/development-tree/product-part-workflow/development-order-plan-unlock-state.ts`; expected commit: `fix: stop cluster contract doc-only main merge`). Result: cluster review acceptance now writes `.boundary-accepted.json`, does not copy cluster draft artifacts into main, does not mutate unlock-state to `merged`, and tells the user that no mainline documentation merge was performed. Targeted tests passed 2/2 (`development-tree-node-merge-service.test.ts`, `cluster-contract-review-controller.test.ts`); Ultracite check passed for changed files; `npm run build --workspace=@codeai-hub/core` passed.
39. [DONE] Git Commit: `fix: stop cluster contract doc-only main merge` (hash: 11839a871)

## Phase 6G - Release Build (owner: Codex, updated: 2026-06-10)

### Stream: Release Notes

40. [DONE] `qg-restore-isolation.phase6g.release-notes.task1` Prepare release notes for the user-authorized downstream doc-only merge prevention release before version bump/build scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare downstream merge prevention release notes`). Result: README now announces future release `v1.2.488` as Downstream Boundary Acceptance, and CHANGELOG records that cluster contract acceptance writes a boundary checkpoint instead of performing a draft-only mainline merge.
41. [DONE] Git Commit: `docs: prepare downstream merge prevention release notes` (hash: c417a1ea6)

### Stream: Release Artifacts

42. [DONE] `qg-restore-isolation.phase6g.build-all.task1` Run `./scripts/build-all.sh` to bump package versions and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare downstream merge prevention release artifacts`). Result: `./scripts/build-all.sh --allow-dirty` completed successfully, bumped the workspace to `1.2.488`, and copied provider/core/UI/CEF launcher tarballs to `doc/tmp/releases/`.
43. [DONE] Git Commit: `build: prepare downstream merge prevention release artifacts` (hash: f294f6693)
44. [DONE] `qg-restore-isolation.phase6g.vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency pruning/package output, and copy release artifacts to `doc/tmp/releases/` as needed (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package downstream merge prevention vsix release`). Result: `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully for `1.2.488`; Step 7 SDK exclusions, local artifact validation, markdown links, duplication check, production dependency pruning, VSIX package creation, runtime package surface verification, and dev dependency restore passed. VSIX: `codeai-hub-1.2.488.vsix` (5.1M).
45. [DONE] Git Commit: `build: package downstream merge prevention vsix release` (hash: b2e16641a)

## Phase 6H - User Workflow Acceptance Testing (owner: User, updated: 2026-06-10)

### Stream: Retest After Downstream Merge Prevention

46. [DONE] `qg-restore-isolation.phase6h.user-retest.task1` User installs the new release and retests Product Part / cluster-contract acceptance: accepting a cluster contract should leave the worktree active, record boundary acceptance, and avoid main-workspace draft-document copy or merged status until code-ready downstream content exists (scope: `manual retest`; no commit expected). Result: v1.2.488 exposed a downstream Cluster Contract language regression: the first managed assignment bypassed the shared Development Tree node language contract, so the Codex sub-agent inferred English for user-facing chat despite global settings using `reasoning=ru` and `artifactsForTheUser=ru`.

## Phase 6I - Cluster Contract Language Contract Fix (owner: Codex, updated: 2026-06-10)

### Stream: Localized Cluster Contract First Prompt

50. [DONE] `qg-restore-isolation.phase6i.cluster-language.task1` Add the runtime language contract to downstream Cluster Contract first prompts and resolve chat/artifact languages from global localization settings through the cluster-contract bootstrap path (scope: `packages/core/src/development-tree/cluster-workflow/cluster-contract-prompt-builder.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts`; expected commit: `fix: localize cluster contract prompts`). Result: Cluster Contract first prompts now start with a runtime language contract, including a Russian reinforcement block when `reasoning=ru`; bootstrap resolves chat/artifact languages through existing global localization settings loaders before sending the first prompt. Regression test verifies a global `CODEAI_GLOBAL_SETTINGS_PATH` with `reasoning=ru` and `artifactsForTheUser=ru` produces a Russian language contract in the first prompt. Targeted tests passed 3/3; Ultracite check passed for changed files; `npm run build --workspace=@codeai-hub/core` passed.
51. [DONE] Git Commit: `fix: localize cluster contract prompts` (hash: 16a870b66)

## Phase 6J - Release Build (owner: Codex, updated: 2026-06-10)

### Stream: Release Notes

52. [DONE] `qg-restore-isolation.phase6j.release-notes.task1` Prepare release notes for the user-authorized cluster-contract language fix release before version bump/build scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare cluster contract language release notes`). Result: README announces future release `v1.2.489` as Cluster Contract Language, and CHANGELOG records the downstream cluster-contract first prompt language contract fix and verification commands.
53. [DONE] Git Commit: `docs: prepare cluster contract language release notes` (hash: f22f27204)

### Stream: Release Artifacts

54. [DONE] `qg-restore-isolation.phase6j.build-all.task1` Run `./scripts/build-all.sh` to bump package versions and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare cluster contract language release artifacts`). Result: `./scripts/build-all.sh --allow-dirty` completed successfully, bumped the workspace to `1.2.489`, and copied provider/core/UI/CEF launcher tarballs to `doc/tmp/releases/`.
55. [DONE] Git Commit: `build: prepare cluster contract language release artifacts` (hash: 4f07d7bd4)
56. [DONE] `qg-restore-isolation.phase6j.vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency pruning/package output, and copy release artifacts to `doc/tmp/releases/` as needed (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package cluster contract language vsix release`). Result: `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully for `1.2.489`; Step 7 SDK exclusions, local artifact validation, markdown links, duplication check, production dependency pruning, VSIX package creation, runtime package surface verification, and dev dependency restore passed. VSIX: `codeai-hub-1.2.489.vsix` (`5.1M`).
57. [DONE] Git Commit: `build: package cluster contract language vsix release` (hash: 34da575df)

## Phase 6K - User Workflow Acceptance Testing (owner: User, updated: 2026-06-10)

### Stream: Retest After Cluster Contract Language Fix

58. [DONE] `qg-restore-isolation.phase6k.user-retest.task1` User installs the new release and retests downstream Cluster Contract startup: the first agent progress/final chat should be in Russian while canonical file names, ids, JSON keys, method/event names, and status tokens remain English (scope: `manual retest`; no commit expected). Result: v1.2.489 fixed downstream Cluster Contract chat language and stopped non-lead Product Part cluster/module folders from appearing under the main Product Part TODO tree. Follow-up defects found: non-lead Product Part review session `finder-widget-shell` can be absent/empty in Project Manager because Product Part managed review sessions are not projected as first-class Development Tree node sessions and unified history can be missing its primary JSONL while a translation overlay remains; Core also starts lead `DevelopmentOrderPlan` before all non-lead Product Part briefs have reached a user-reviewed terminal state.

## Phase 6L - Product Part Review Session Projection (owner: Codex, updated: 2026-06-11)

### Stream: Project Product Part Sessions

59. [DONE] `qg-restore-isolation.phase6l.session-projection-refactor.task1` Extract Development Tree session projection helpers out of the near-limit snapshot reader before adding Product Part review-session projection (scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/development-tree-session-projection.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: extract development tree session projection`). Result: cluster session projection helpers moved into `development-tree-session-projection.ts`; `development-tree-snapshot.ts` dropped from 495 to 352 lines. Targeted Development Tree snapshot/projected-session tests passed 9/9; Ultracite check passed for the touched files.
60. [DONE] Git Commit: `refactor: extract development tree session projection` (hash: 49b98e74f)
61. [DONE] `qg-restore-isolation.phase6l.product-part-session.task1` Project Product Part managed brief-review sessions from Core-owned managed state/continuity into `DevelopmentTreePartNode.session`, and cover the non-lead Product Part visibility scenario with regression tests (scope: `packages/core/src/remote-bridge/handlers/development-tree-session-projection.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/development-tree-projected-session.test.ts`; expected commit: `fix: project product part review sessions`). Result: Product Part managed state now resolves through main workspace continuity and is attached to the Product Part node as a started session; regression coverage verifies snapshot session projection, dialog list visibility, and history opening for a non-lead Product Part review session. Targeted Development Tree snapshot/projected-session tests passed 10/10; Ultracite check passed for the touched files; `npm run build --workspace=@codeai-hub/core` passed.
62. [DONE] Git Commit: `fix: project product part review sessions` (hash: 108df07f0)

### Stream: Managed History Resilience

63. [DONE] `qg-restore-isolation.phase6l.product-part-history.task1` Make Development Tree managed Product Part startup/history persistence resilient so Project Manager does not end up with a translation overlay but no primary unified dialog history for user-review sessions (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core-start-prompt-role.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: persist product part review dialog history`). Result: Development Tree managed startup now waits for dialog-message persistence after appending the agent start prompt and before the provider turn is dispatched, so primary unified history is written before later translation/provider activity can race ahead. Targeted runtime/event-message tests passed 7/7; Ultracite check passed for touched files; `npm run build --workspace=@codeai-hub/core` passed.
64. [DONE] Git Commit: `fix: persist product part review dialog history` (hash: e9b529ba0)

## Phase 6M - Product Part Brief Barrier (owner: Codex, updated: 2026-06-11)

### Stream: Lead Order Plan Readiness Barrier

65. [DONE] `qg-restore-isolation.phase6m.brief-barrier.task1` Prevent Core from starting the lead Product Part `DevelopmentOrderPlan` turn until every planned Product Part brief has a Core-owned user-reviewed terminal state, and inline all Product Part brief contents/statuses into the lead order-plan prompt when the barrier opens (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-assignment.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.ts`; expected commit: `fix: gate lead order plan on product part briefs`). Result: lead Product Part brief acceptance now resolves a Core-owned all-brief barrier from `product-parts.index.md` and managed Product Part review decisions; when any planned Product Part brief is not accepted, the lead order-plan task is marked `BLOCKED` and no provider prompt is dispatched; when the barrier opens, the lead prompt embeds the full markdown text of every accepted Product Part brief and the JSON example includes all accepted `requiredBriefs` plus the declared leadership order. Targeted Product Part brief/order-plan tests passed 4/4; Ultracite check passed for touched files; `npm run build --workspace=@codeai-hub/core` passed.
66. [DONE] Git Commit: `fix: gate lead order plan on product part briefs` (hash: 621032785)

### Stream: Downstream Planning Documentation

67. [DONE] `qg-restore-isolation.phase6m.brief-barrier-docs.task1` Document the Product Part brief barrier and lead `DevelopmentOrderPlan` all-brief input contract in the active downstream execution refactor planning source (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe product part brief barrier`). Result: downstream execution refactor planning now defines the Product Part Brief Barrier, its Core-owned input sources, blocked behavior, and the requirement that the lead `DevelopmentOrderPlan` prompt inline the full accepted markdown brief for every planned Product Part.
68. [DONE] Git Commit: `docs: describe product part brief barrier` (hash: 350c9da55)

## Phase 6N - Product Part Brief Barrier Dispatch (owner: Codex, updated: 2026-06-11)

### Stream: Cross Session Lead Dispatch

69. [DONE] `qg-restore-isolation.phase6n.brief-barrier-dispatch.task1` When a secondary Product Part brief acceptance opens the all-brief barrier after the lead Product Part was previously blocked, dispatch the lead `DevelopmentOrderPlan` prompt to the lead session instead of the current secondary session (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-assignment.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/development-tree-turn-result-dispatch.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.ts`; expected commit: `fix: dispatch lead order plan after brief barrier`). Result: secondary Product Part acceptance now detects when the all-brief barrier opens, moves the previously blocked lead order-plan task to `IN_PROGRESS`, and returns a target internal message for the lead session. Managed workflow turn dispatch now routes target continuations to the requested session instead of the current secondary session. Targeted Product Part brief/order-plan tests passed 5/5; Ultracite check passed for touched files; `npm run build --workspace=@codeai-hub/core` passed.
70. [DONE] Git Commit: `fix: dispatch lead order plan after brief barrier` (hash: fe7b26a0e)

## Phase 6O - Release Build (owner: Codex, updated: 2026-06-11)

### Stream: Release Notes

71. [DONE] `qg-restore-isolation.phase6o.release-notes.task1` Prepare release notes for the user-authorized Product Part review-session and brief-barrier orchestration release before version bump/build scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare product part brief barrier release notes`). Result: README announces future release `v1.2.490` as Product Part Brief Barrier, and CHANGELOG records Product Part review-session projection, resilient Product Part history persistence, all-brief gating before the lead `DevelopmentOrderPlan`, and cross-session lead continuation dispatch.
72. [DONE] Git Commit: `docs: prepare product part brief barrier release notes` (hash: 435a401cf)

### Stream: Release Artifacts

73. [DONE] `qg-restore-isolation.phase6o.build-all.task1` Run `./scripts/build-all.sh` to bump package versions and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare product part brief barrier release artifacts`). Result: `./scripts/build-all.sh --allow-dirty` completed successfully, bumped the workspace to `1.2.490`, and copied provider/core/UI/CEF launcher tarballs to `doc/tmp/releases/`.
74. [DONE] Git Commit: `build: prepare product part brief barrier release artifacts` (hash: 978f6da18)
75. [DONE] `qg-restore-isolation.phase6o.vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency pruning/package output, and copy release artifacts to `doc/tmp/releases/` as needed (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package product part brief barrier vsix release`). Result: `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully for `1.2.490`; Step 7 SDK exclusions, local artifact validation, markdown links, duplication check, production dependency pruning, VSIX package creation, runtime package surface verification, dev dependency restore, and package-size verification passed. VSIX: `codeai-hub-1.2.490.vsix` (`5.2M`).
76. [PENDING] Git Commit: `build: package product part brief barrier vsix release` (hash: TBD)

## Phase 6P - User Workflow Acceptance Testing (owner: User, updated: 2026-06-11)

### Stream: Retest After Product Part Brief Barrier Release

77. [TODO] `qg-restore-isolation.phase6p.user-retest.task1` User installs the new release and retests Development Tree Product Part orchestration: non-lead Product Part review sessions should appear in Project Manager with persisted history, lead `DevelopmentOrderPlan` should wait for every planned Product Part brief acceptance, and secondary Product Part acceptance should dispatch the unlocked lead continuation into the lead session (scope: `manual retest`; no commit expected).

## Phase 7 - Scope Closeout (owner: Codex, updated: 2026-06-10)

### Stream: Archive And Dispose

47. [TODO] `qg-restore-isolation.phase7.closeout.task1` After explicit user acceptance, archive the active todo plan and dispose the planning source according to the Plans lifecycle (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close quality gates restore isolation plan`).
48. [TODO] Git Commit: `docs: close quality gates restore isolation plan` (hash: TBD)
49. [TODO] `qg-restore-isolation.phase7.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
