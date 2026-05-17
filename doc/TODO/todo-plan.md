# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-clean-stage-markers-2026-05-17",
  "branch": "main",
  "baseHead": "e0373dde8",
  "lastRecordedCommit": "2f211de15",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ManagedWorkflow_CleanStageMarkers_Planning.md",
  "currentTaskId": "managed-clean-markers.phase13.release.task3",
  "expectedCommitMessage": "docs: record 1.2.290 release package",
  "debt": {
    "expectedCommitMessage": "docs: record 1.2.290 release package",
    "preCommitHead": "2f211de15",
    "stage": "commit_pending",
    "taskId": "managed-clean-markers.phase13.release.task3"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ManagedWorkflow_CleanStageMarkers_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules

- Scope: make managed workflow stage markers Core-owned and prevent terminal stage completion from leaving a dirty Git tree.
- Do not bypass hooks. Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks.
- Each implementation task must touch no more than 3 files unless this plan is first split into smaller tasks.
- A managed stage marker has exactly three visible states: gray means not started, yellow means Core has sent the first agent prompt or opened the step session, and green means the step has reached its terminal user-return/revision boundary.
- Description and Virtual Simulation do not use managed todo-plans, but they still become yellow when Core starts their session. Their existing green completion behavior must stay intact.
- A green marker must not be published for a managed step while Core-owned or stage-owned Git changes remain uncommitted. Classified managed residue is committed by Core; unclassified residue blocks completion and next-stage transition until resolved through a Core command.
- Release build is in scope for v1.2.288 after the explicit user request on 2026-05-17.
- Release build is in scope for v1.2.289 after the explicit user request on 2026-05-17.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Plan Creation

1. [DONE] `managed-clean-markers.phase0.plan.task1` Create the active todo-plan for the clean Git and stage marker fix (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open clean stage marker planning`).
2. [DONE] Git Commit: `docs: open clean stage marker planning` (hash: 25171dd87)

### Stream: Planning Source

3. [DONE] `managed-clean-markers.phase0.plan.task2` Create the planning source and register the active scope in the documentation index (scope: `doc/SolidWorks-WorkFlow/Plans/ManagedWorkflow_CleanStageMarkers_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan clean stage markers`).
4. [DONE] Git Commit: `docs: plan clean stage markers` (hash: b9794c24a)

## Phase 1 - Terminal Clean Git Guard (owner: Codex, updated: 2026-05-17)

### Stream: Managed Residue Classification

5. [DONE] `managed-clean-markers.phase1.clean.task1` Add a Core-owned terminal dirty-tree classifier for managed stage outputs and runtime metadata (scope: `packages/core/src/managed-workflow-orchestration/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/**/*.test.ts`; expected commit: `fix: classify managed terminal git residue`).
6. [DONE] Git Commit: `fix: classify managed terminal git residue` (hash: 3965c697a)

### Stream: Terminal Commit Boundary

7. [DONE] `managed-clean-markers.phase1.clean.task2` Wire the classifier into managed terminal/user-return transitions so green completion requires a clean tree or a Core commit of classified residue (scope: `packages/core/src/managed-workflow-orchestration/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/**/*.test.ts`; expected commit: `fix: enforce clean git before managed stage completion`).
8. [DONE] Git Commit: `fix: enforce clean git before managed stage completion` (hash: e510bfd2f)

### Stream: Application Skeleton Terminal Boundary

9. [DONE] `managed-clean-markers.phase1.clean.task3` Apply the terminal clean-Git checkpoint before Application Skeleton opens persistent user return (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/**, packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts, packages/core/src/**/*.test.ts`; expected commit: `fix: enforce clean git before application skeleton completion`).
10. [DONE] Git Commit: `fix: enforce clean git before application skeleton completion` (hash: 7de441992)

### Stream: Quality Gates Terminal Boundary

11. [DONE] `managed-clean-markers.phase1.clean.task4` Apply the terminal clean-Git checkpoint before Quality Gates opens persistent user return (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/**, packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/**/*.test.ts`; expected commit: `fix: enforce clean git before quality gates completion`).
12. [DONE] Git Commit: `fix: enforce clean git before quality gates completion` (hash: 8e5994770)

## Phase 2 - Core-Owned Stage Markers (owner: Codex, updated: 2026-05-17)

### Stream: Status Projection

13. [DONE] `managed-clean-markers.phase2.markers.task1` Make Core project trunk stage status from explicit start and terminal completion signals instead of artifact/review side effects (scope: `packages/core/src/workflow/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/**/*.test.ts`; expected commit: `fix: make stage markers core owned`).
14. [DONE] Git Commit: `fix: make stage markers core owned` (hash: db82d6c8b)

### Stream: Project Manager Rendering

15. [DONE] `managed-clean-markers.phase2.markers.task2` Restrict Project Manager tree marker rendering to the Core-provided gray/yellow/green stage status contract (scope: `src/client/project-manager/components/layout/**, src/client/project-manager/services/**, src/client/project-manager/**/*.test.*`; expected commit: `fix: render deterministic project manager step markers`).
16. [DONE] Git Commit: `fix: render deterministic project manager step markers` (hash: 4f73fb75b)

## Phase 3 - Documentation And Verification (owner: Codex, updated: 2026-05-17)

### Stream: Architecture Docs

17. [DONE] `managed-clean-markers.phase3.docs.task1` Document the clean Git completion boundary and the three-state stage marker contract (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `docs: document clean stage marker contract`).
18. [DONE] Git Commit: `docs: document clean stage marker contract` (hash: 1c1dbdf84)

### Stream: Tooling Verification

19. [DONE] `managed-clean-markers.phase3.verify.task1` Run targeted tests/builds for managed workflow Core and Project Manager marker behavior, then record the verification result (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify clean stage marker workflow`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts src/client/project-manager/components/layout/workspace-tree-model.test.ts` passed 23/23.
    - Verification 2026-05-17: `npm run build --workspace=@codeai-hub/core` passed.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
20. [DONE] Git Commit: `test: verify clean stage marker workflow` (hash: 2b6d53316)

## Phase 4 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: Restart Persistence Verification

21. [DONE] `managed-clean-markers.phase4.persistence.task1` Verify marker state recovery after Core or Project Manager restart from persisted Core-owned state (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify marker restart persistence`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts` passed 6/6, including persisted continuity yellow markers and completed ledger green markers after a fresh `WorkflowStateService` instance.
    - Verification 2026-05-17: `npm run build --workspace=@codeai-hub/core` passed.
22. [DONE] Git Commit: `test: verify marker restart persistence` (hash: 1a1d627ed)

### Stream: User Retest

23. [DONE] `managed-clean-markers.phase4.acceptance.task1` User retests the managed workflow: each step becomes yellow on first Core-started session, becomes green only at the terminal User Return And Revisions boundary, and the Git tree stays clean after each step. Scope: user workflow acceptance only; expected commit: none. Disposition: user requested a new release build on 2026-05-17.

## Phase 5 - Release Build (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

24. [DONE] `managed-clean-markers.phase5.release.task1` Update release-facing README/CHANGELOG for v1.2.286 before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.286 release`).
25. [DONE] Git Commit: `docs: prepare 1.2.286 release` (hash: cc86d28f8)

### Stream: Unified Release Artifacts

26. [DONE] `managed-clean-markers.phase5.release.task2` Run `./scripts/build-all.sh`, commit the v1.2.286 version bump and release manifests, then keep the tree clean for VSIX packaging (scope: `package.json, package-lock.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/core/package.json, packages/initiatives/package.json, packages/localization/package.json, packages/translation/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.286 release artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh` completed for v1.2.286.
    - Release artifacts 2026-05-17: `claude-module-1.2.286.tar.bz2`, `codex-module-1.2.286.tar.bz2`, `gemini-module-1.2.286.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.286.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.286.tar.bz2`, `vscode-webview-1.2.286.tar.bz2`, and `project-manager-1.2.286.tar.bz2` were written to `~/.codeai-hub/releases/` and `doc/tmp/releases/`.
27. [DONE] Git Commit: `chore: build 1.2.286 release artifacts` (hash: cb43494dc)

### Stream: VSIX Packaging

28. [DONE] `managed-clean-markers.phase5.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/pruned dependencies/package creation, and record the generated VSIX handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record 1.2.286 release package`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version` completed for v1.2.286.
    - Release checks 2026-05-17: output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
    - Release package 2026-05-17: `codeai-hub-1.2.286.vsix` generated in the repository root (48M).
29. [DONE] Git Commit: `docs: record 1.2.286 release package` (hash: 1c0fb28f1)

## Phase 6 - Release Retest Fixes (owner: Codex, updated: 2026-05-17)

### Stream: Retest Fix Intake

30. [DONE] `managed-clean-markers.phase6.retest-plan.task1` Add retest bugfix streams for direct stage completion markers and actionable dirty-tree completion UX (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan release retest fixes`).
31. [DONE] Git Commit: `docs: plan release retest fixes` (hash: 5148f8cef)

### Stream: Direct Stage Completion Markers

32. [DONE] `managed-clean-markers.phase6.direct-markers.task1` Make Description and Virtual Simulation turn green when their next step becomes available after an active session (scope: `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts, packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: complete direct step markers`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.test.ts` passed.
33. [DONE] Git Commit: `fix: complete direct step markers` (hash: d3b6766ef)

### Stream: Dirty Tree Resolution UX

34. [DONE] `managed-clean-markers.phase6.dirty-ux.task1` Classify Diagram Modules flow sidecars robustly and replace terminal dirty-tree blocker text with clear user actions (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: make dirty tree completion actionable`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts` passed.
35. [DONE] Git Commit: `fix: make dirty tree completion actionable` (hash: 3bf25487d)

### Stream: Retest Fix Verification

36. [DONE] `managed-clean-markers.phase6.verify.task1` Run targeted tests and builds for release retest fixes, then record verification results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify release retest fixes`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.test.ts packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts src/client/project-manager/components/layout/workspace-tree-model.test.ts` passed 29 tests.
    - Verification 2026-05-17: `npm run build --workspace=@codeai-hub/core` passed.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
37. [DONE] Git Commit: `test: verify release retest fixes` (hash: 4a7f37ed4)

## Phase 7 - Release Build For Retest (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

38. [DONE] `managed-clean-markers.phase7.release.task1` Update release-facing README/CHANGELOG for v1.2.287 before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.287 release`).
39. [DONE] Git Commit: `docs: prepare 1.2.287 release` (hash: fbc5d5d54)

### Stream: Unified Release Artifacts

40. [DONE] `managed-clean-markers.phase7.release.task2` Run `./scripts/build-all.sh`, commit the v1.2.287 version bump and release manifests, then keep the tree clean for VSIX packaging (scope: `package.json, package-lock.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/core/package.json, packages/initiatives/package.json, packages/localization/package.json, packages/translation/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.287 release artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh` completed for v1.2.287.
    - Release artifacts 2026-05-17: `claude-module-1.2.287.tar.bz2`, `codex-module-1.2.287.tar.bz2`, `gemini-module-1.2.287.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.287.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.287.tar.bz2`, `vscode-webview-1.2.287.tar.bz2`, and `project-manager-1.2.287.tar.bz2` were written to `~/.codeai-hub/releases/` and `doc/tmp/releases/`.
41. [DONE] Git Commit: `chore: build 1.2.287 release artifacts` (hash: d6163ae97)

### Stream: VSIX Packaging

42. [DONE] `managed-clean-markers.phase7.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/pruned dependencies/package creation, and record the generated VSIX handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record 1.2.287 release package`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version` completed for v1.2.287.
    - Release checks 2026-05-17: output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
    - Release package 2026-05-17: `codeai-hub-1.2.287.vsix` generated in the repository root (48M).
43. [DONE] Git Commit: `docs: record 1.2.287 release package` (hash: b3760a129)

## Phase 8 - Diagram Modules Sidecar Completion Fix (owner: Codex, updated: 2026-05-17)

### Stream: Hidden Sidecar Commit

44. [DONE] `managed-clean-markers.phase8.sidecar.task1` Stage managed dot-directory sidecars without Git exclude pathspecs so Diagram Modules `module-map.flow.json` is committed automatically (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-managed-git-boundary.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: stage managed dot-directory sidecars`).
    - Root cause 2026-05-17: `git add -- .codeai-hub/.../module-map.flow.json :(exclude,glob)**/dist/**` did not stage nested files under a dot-prefixed managed directory, so Core saw a standard sidecar but committed no staged changes.
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts` passed, including the generated dot-directory sidecar commit regression.
45. [DONE] Git Commit: `fix: stage managed dot-directory sidecars` (hash: e13e67248)

### Stream: Classified Residue Retry UX

46. [DONE] `managed-clean-markers.phase8.sidecar.task2` Retry classified terminal residue commits and replace empty dirty-tree blockers with a generated-file auto-save failure message (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: prevent empty managed dirty blockers`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts` passed.
    - Verification 2026-05-17: `npm exec -- ultracite check packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts` passed.
47. [DONE] Git Commit: `fix: prevent empty managed dirty blockers` (hash: 185026633)

### Stream: Sidecar Retest Verification

48. [DONE] `managed-clean-markers.phase8.verify.task1` Run targeted tests/builds for Diagram Modules terminal sidecar completion, then record verification results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify diagram modules sidecar completion`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts` passed 20 tests.
    - Verification 2026-05-17: `npm run build --workspace=@codeai-hub/core` passed.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
49. [DONE] Git Commit: `test: verify diagram modules sidecar completion` (hash: a945b70d5)

## Phase 9 - Release Build For Sidecar Fix (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

50. [DONE] `managed-clean-markers.phase9.release.task1` Update release-facing README/CHANGELOG for v1.2.288 before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.288 release`).
51. [DONE] Git Commit: `docs: prepare 1.2.288 release` (hash: 26391b25c)

### Stream: Unified Release Artifacts

52. [DONE] `managed-clean-markers.phase9.release.task2` Run `./scripts/build-all.sh`, commit the v1.2.288 version bump and release manifests, then keep the tree clean for VSIX packaging (scope: `package.json, package-lock.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/core/package.json, packages/initiatives/package.json, packages/localization/package.json, packages/translation/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.288 release artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh` completed for v1.2.288.
    - Artifacts staged in `doc/tmp/releases/` and `~/.codeai-hub/releases/`: `claude-module-1.2.288.tar.bz2`, `codex-module-1.2.288.tar.bz2`, `gemini-module-1.2.288.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.288.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.288.tar.bz2`, `vscode-webview-1.2.288.tar.bz2`, `project-manager-1.2.288.tar.bz2`.
53. [DONE] Git Commit: `chore: build 1.2.288 release artifacts` (hash: 71667a0e0)

### Stream: VSIX Packaging

54. [DONE] `managed-clean-markers.phase9.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/pruned dependencies/package creation, and record the generated VSIX handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record 1.2.288 release package`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version` completed for v1.2.288.
    - Release output confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
    - Handoff artifact: `codeai-hub-1.2.288.vsix` in the repository root (49M package, 48.32MB VSIX payload).
55. [DONE] Git Commit: `docs: record 1.2.288 release package` (hash: 2bdab0f86)

## Phase 10 - Terminal Metadata Cleanup Fix (owner: Codex, updated: 2026-05-17)

### Stream: Retest Bugfix Intake

56. [DONE] `managed-clean-markers.phase10.metadata-plan.task1` Add the final retest bugfix stream for Core-owned metadata and local runtime state that can dirty Git after a managed step reaches the user-return boundary (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan terminal metadata cleanup fix`).
57. [DONE] Git Commit: `docs: plan terminal metadata cleanup fix` (hash: 5a679badb)

### Stream: Terminal Metadata Classifier

58. [DONE] `managed-clean-markers.phase10.metadata-clean.task1` Make terminal completion ignore local volatile timer state through Git ignore enforcement, auto-commit classified Core metadata, and keep unclassified files blocking completion (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts`; expected commit: `fix: clean terminal metadata residue`).
59. [DONE] Git Commit: `fix: clean terminal metadata residue` (hash: b090cc2f5)

### Stream: Local State Ignore Contract

60. [DONE] `managed-clean-markers.phase10.metadata-clean.task2` Enforce `.codeai-hub/state/` as ignored local runtime state in Application Skeleton environment readiness checks (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-output-hygiene.ts, packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: require local runtime state ignore`).
61. [DONE] Git Commit: `fix: require local runtime state ignore` (hash: 863bb0715)

### Stream: Architecture Docs

62. [DONE] `managed-clean-markers.phase10.docs.task1` Document the terminal metadata cleanup rule and the `.codeai-hub/state/` local-state boundary (scope: `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/TODO/todo-plan.md`; expected commit: `docs: document terminal metadata cleanup`).
63. [DONE] Git Commit: `docs: document terminal metadata cleanup` (hash: 0115940c2)

### Stream: Tooling Verification

64. [DONE] `managed-clean-markers.phase10.verify.task1` Run targeted tests and builds for terminal metadata cleanup, then record verification results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify terminal metadata cleanup`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts` passed 23 tests.
    - Verification 2026-05-17: `npm run build --workspace=@codeai-hub/core` passed.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
65. [DONE] Git Commit: `test: verify terminal metadata cleanup` (hash: 3a680625b)

## Phase 11 - Release Build For Terminal Metadata Fix (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

66. [DONE] `managed-clean-markers.phase11.release.task1` Update release-facing README/CHANGELOG for v1.2.289 before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.289 release`).
67. [DONE] Git Commit: `docs: prepare 1.2.289 release` (hash: fabcb21fd)

### Stream: Unified Release Artifacts

68. [DONE] `managed-clean-markers.phase11.release.task2` Run `./scripts/build-all.sh`, commit the v1.2.289 version bump and release manifests, then keep the tree clean for VSIX packaging (scope: `package.json, package-lock.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/core/package.json, packages/initiatives/package.json, packages/localization/package.json, packages/translation/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.289 release artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh` completed for v1.2.289 and produced provider, core, launcher, vscode-webview, and project-manager archives in `doc/tmp/releases/`.
69. [DONE] Git Commit: `chore: build 1.2.289 release artifacts` (hash: 9789d1235)

### Stream: VSIX Packaging

70. [DONE] `managed-clean-markers.phase11.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/pruned dependencies/package creation, and record the generated VSIX handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record 1.2.289 release package`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version` completed for v1.2.289 with `Step 7: Verifying SDK exclusions`, production dependency pruning, `Package created`, and VSIX runtime package surface verification.
    - Release handoff 2026-05-17: generated `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.289.vsix`.
71. [DONE] Git Commit: `docs: record 1.2.289 release package` (hash: 53411230e)

## Phase 12 - Quality Gates Artifact Consistency Fix (owner: Codex, updated: 2026-05-17)

### Stream: Planning Update

72. [DONE] `managed-clean-markers.phase12.qg-consistency-plan.task1` Record the post-release Quality Gates artifact consistency bug and implementation scope before code changes (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan quality gates artifact consistency fix`).
73. [DONE] Git Commit: `docs: plan quality gates artifact consistency fix` (hash: d1770a2ad)

### Stream: Core Validator

74. [DONE] `managed-clean-markers.phase12.qg-consistency.task1` Enforce Quality Gates integrated-state consistency across JSON required gates, Markdown projection, package scripts, and hook wiring (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts`; expected commit: `fix: validate quality gates artifact consistency`).
75. [DONE] Git Commit: `fix: validate quality gates artifact consistency` (hash: 475e6694e)

### Stream: Architecture Docs

76. [DONE] `managed-clean-markers.phase12.qg-consistency-docs.task1` Document the Quality Gates artifact consistency rule in the managed workflow SSOT (scope: `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/TODO/todo-plan.md`; expected commit: `docs: document quality gates artifact consistency`).
77. [DONE] Git Commit: `docs: document quality gates artifact consistency` (hash: 1ffde32a1)

### Stream: Tooling Verification

78. [DONE] `managed-clean-markers.phase12.qg-consistency-verify.task1` Run targeted Quality Gates validator tests and core/typecheck builds, then record verification evidence (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify quality gates artifact consistency`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts` passed 17/17.
    - Verification 2026-05-17: `npm exec -- ultracite check packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts` passed.
    - Verification 2026-05-17: `npm run build --workspace=@codeai-hub/core` passed.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
79. [DONE] Git Commit: `test: verify quality gates artifact consistency` (hash: 1541756de)

## Phase 13 - Release Build For Quality Gates Consistency Fix (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

80. [DONE] `managed-clean-markers.phase13.release.task1` Update release-facing README/CHANGELOG for v1.2.290 before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.290 release`).
    - Release docs 2026-05-17: README and CHANGELOG now describe v1.2.290 as the Quality Gates consistency guard release before the version bump.
81. [DONE] Git Commit: `docs: prepare 1.2.290 release` (hash: dfd17612d)

### Stream: Unified Release Artifacts

82. [DONE] `managed-clean-markers.phase13.release.task2` Run `./scripts/build-all.sh`, commit the v1.2.290 version bump and release manifests, then keep the tree clean for VSIX packaging (scope: `package.json, package-lock.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/core/package.json, packages/initiatives/package.json, packages/localization/package.json, packages/translation/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.290 release artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh` completed for v1.2.290.
    - Release artifacts 2026-05-17: `claude-module-1.2.290.tar.bz2`, `codex-module-1.2.290.tar.bz2`, `gemini-module-1.2.290.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.290.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.290.tar.bz2`, `vscode-webview-1.2.290.tar.bz2`, and `project-manager-1.2.290.tar.bz2` were written to `~/.codeai-hub/releases/` and `doc/tmp/releases/`.
83. [DONE] Git Commit: `chore: build 1.2.290 release artifacts` (hash: 2f211de15)

### Stream: VSIX Packaging

84. [DONE] `managed-clean-markers.phase13.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/pruned dependencies/package creation, and record the generated VSIX handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record 1.2.290 release package`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version` completed for v1.2.290.
    - Release checks 2026-05-17: output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
    - Release package 2026-05-17: `codeai-hub-1.2.290.vsix` generated in the repository root (48M).
85. [PENDING] Git Commit: `docs: record 1.2.290 release package` (hash: TBD)

## Phase 14 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Closeout

86. [TODO] `managed-clean-markers.phase14.closeout.task1` After explicit user acceptance of the retested package, archive this todo-plan and dispose of the planning source according to the docs lifecycle (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close clean stage marker scope`).
87. [TODO] Git Commit: `docs: close clean stage marker scope` (hash: TBD)
