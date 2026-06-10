# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-restore-isolation-2026-06-10",
  "branch": "main",
  "baseHead": "df0341147",
  "lastRecordedCommit": "30fa09ba0",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md",
  "currentTaskId": "qg-restore-isolation.phase6f.downstream-strategy.task1",
  "expectedCommitMessage": "docs: update downstream merge prevention strategy",
  "debt": {
    "expectedCommitMessage": "docs: update downstream merge prevention strategy",
    "preCommitHead": "30fa09ba0",
    "stage": "commit_pending",
    "taskId": "qg-restore-isolation.phase6f.downstream-strategy.task1"
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
37. [PENDING] Git Commit: `docs: update downstream merge prevention strategy` (hash: TBD)

### Stream: Boundary Accepted Without Mainline Doc Merge

38. [TODO] `qg-restore-isolation.phase6f.boundary-accepted.task1` Stop cluster contract review acceptance from copying draft documentation artifacts into the main workspace or marking the cluster as merged; record a boundary-accepted checkpoint instead while leaving the downstream worktree active for future facade/module code work (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.test.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts`; expected commit: `fix: stop cluster contract doc-only main merge`).
39. [TODO] Git Commit: `fix: stop cluster contract doc-only main merge` (hash: TBD)

## Phase 6G - Release Build (owner: Codex, updated: 2026-06-10)

### Stream: Release Notes

40. [TODO] `qg-restore-isolation.phase6g.release-notes.task1` Prepare release notes for the user-authorized downstream doc-only merge prevention release before version bump/build scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare downstream merge prevention release notes`).
41. [TODO] Git Commit: `docs: prepare downstream merge prevention release notes` (hash: TBD)

### Stream: Release Artifacts

42. [TODO] `qg-restore-isolation.phase6g.build-all.task1` Run `./scripts/build-all.sh` to bump package versions and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare downstream merge prevention release artifacts`).
43. [TODO] Git Commit: `build: prepare downstream merge prevention release artifacts` (hash: TBD)
44. [TODO] `qg-restore-isolation.phase6g.vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency pruning/package output, and copy release artifacts to `doc/tmp/releases/` as needed (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package downstream merge prevention vsix release`).
45. [TODO] Git Commit: `build: package downstream merge prevention vsix release` (hash: TBD)

## Phase 6H - User Workflow Acceptance Testing (owner: User, updated: 2026-06-10)

### Stream: Retest After Downstream Merge Prevention

46. [TODO] `qg-restore-isolation.phase6h.user-retest.task1` User installs the new release and retests Product Part / cluster-contract acceptance: accepting a cluster contract should leave the worktree active, record boundary acceptance, and avoid main-workspace draft-document copy or merged status until code-ready downstream content exists (scope: `manual retest`; no commit expected).

## Phase 7 - Scope Closeout (owner: Codex, updated: 2026-06-10)

### Stream: Archive And Dispose

47. [TODO] `qg-restore-isolation.phase7.closeout.task1` After explicit user acceptance, archive the active todo plan and dispose the planning source according to the Plans lifecycle (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close quality gates restore isolation plan`).
48. [TODO] Git Commit: `docs: close quality gates restore isolation plan` (hash: TBD)
49. [TODO] `qg-restore-isolation.phase7.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
