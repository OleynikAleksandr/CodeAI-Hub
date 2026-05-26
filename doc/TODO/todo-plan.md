# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "workflow-clear-git-boundary-rollback-implementation-2026-05-25",
  "branch": "main",
  "baseHead": "cdb74cc45",
  "lastRecordedCommit": "b097d8f17",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md",
  "currentTaskId": "phase65.stream3.task1",
  "expectedCommitMessage": "fix: use workspace settings paths for provider bootstrap",
  "debt": {
    "expectedCommitMessage": "fix: use workspace settings paths for provider bootstrap",
    "preCommitHead": "b097d8f17",
    "stage": "commit_pending",
    "taskId": "phase65.stream3.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md`
- **Release build confirmation:** user explicitly requested the new task to be planned and executed through a new release build on 2026-05-25.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_GitBoundaryRollback_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`
  - `packages/core/src/remote-bridge/handlers/workspace-session-service.ts`
  - `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts`
  - `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-managed-git-boundary.ts`
- Only this list is the recovery context for this implementation cycle.

## Execution Rules

- **Required reading before each code fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task touches no more than 3 tracked files/packages unless the task is split first.
- Each tracked task is paired with a separate `Git Commit: ...` item.
- Architecture changes must update the relevant `doc/SolidWorks-WorkFlow/**` document in the same commit.
- Quality gates run through Husky via `npm run plan:commit -- "<expected commit message>"`.
- Targeted verification is required for touched packages before their stream is closed.
- The release build is authorized by the user for this cycle, but the scope remains `ACTIVE` after release until user acceptance testing completes.
- Scope Closeout runs only after explicit post-release user acceptance.

## Phase 1 - Plan Setup (owner: Codex, updated: 2026-05-25)

### Stream: Implementation Plan Setup
1. [DONE] `phase1.stream1.task1` Create the active implementation todo plan for Git-boundary workflow Clear based on the accepted architecture document and current repository state (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open git boundary clear implementation`).
2. [DONE] Git Commit: `docs: open git boundary clear implementation` (hash: 583c4b066)

## Phase 2 - Workflow Boundary Core (owner: Codex, updated: 2026-05-25)

### Stream: Boundary Registry And Git Service
3. [DONE] `phase2.stream1.task1` Add workflow boundary model, registry persistence, managed Git operations, facade and focused coverage for rollback anchors (scope: `packages/core/src/workflow/boundary/**`; scope exception reason: `check:knip` has no green intermediate while the new internal boundary model/registry/git files are not yet imported by a facade/test; expected commit: `feat: add workflow boundary git registry`).
4. [DONE] Git Commit: `feat: add workflow boundary git registry` (hash: 3a0104819)
## Phase 3 - Boundary Creation Hooks (owner: Codex, updated: 2026-05-25)

### Stream: Workspace And Step Boundaries
7. [DONE] `phase3.stream1.task1` Create or verify the Description boundary during workspace activation before questionnaire work starts (scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts, packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts`; expected commit: `feat: create description boundary on workspace activation`).
8. [DONE] Git Commit: `feat: create description boundary on workspace activation` (hash: 16068e1e1)
9. [DONE] `phase3.stream1.task2` Create or verify a boundary before Project Manager starts each workflow stage session (scope: `packages/core/src/remote-bridge/handlers/workspace-session-service.ts, packages/core/src/remote-bridge/handlers/workspace-session-service.test.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts`; expected commit: `feat: create workflow boundaries before stage sessions`).
10. [DONE] Git Commit: `feat: create workflow boundaries before stage sessions` (hash: dc96bef7b)
11. [DONE] `phase3.stream1.task3` Wire managed technical-stage starts to the same boundary facade so Diagram Modules and later managed stages use one Core-owned rollback model (scope: `packages/core/src/managed-workflow-orchestration/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/workflow/boundary/workflow-boundary-facade.ts`; expected commit: `feat: create boundaries for managed workflow stages`).
12. [DONE] Git Commit: `feat: create boundaries for managed workflow stages` (hash: 76eb27c66)

## Phase 4 - Clear Restore Endpoint (owner: Codex, updated: 2026-05-25)

### Stream: Workflow Stage Restore
13. [DONE] `phase4.stream1.task1` Replace the fail-closed workflow stage Clear endpoint with restore-to-boundary, registry pruning and projection reset while keeping development-tree clear fail-closed (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts`; expected commit: `feat: restore workflow steps from git boundaries`).
14. [DONE] Git Commit: `feat: restore workflow steps from git boundaries` (hash: 8044e910b)

## Phase 5 - Architecture Documentation (owner: Codex, updated: 2026-05-25)

### Stream: SSOT Sync
15. [DONE] `phase5.stream1.task1` Move stable Git-boundary Clear decisions into canonical workflow architecture documents and update the docs index if needed (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document git boundary workflow clear`).
16. [DONE] Git Commit: `docs: document git boundary workflow clear` (hash: a8408fcf1)

## Phase 6 - Tooling Verification (owner: Codex, updated: 2026-05-25)

### Stream: Targeted Verification
17. [DONE] `phase6.stream1.task1` Run targeted validation for Core boundary and Clear behavior: core build, focused node tests, plan validation and relevant diagnostics (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed: @codeai-hub/core build, focused boundary/workspace/session/managed/Clear node tests (9 tests), plan validation, check:knip, and markdown link check completed.

## Phase 7 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
18. [DONE] `phase7.stream1.task1` Update release-facing docs for the next version before build-all, as required by the release checklist (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare git boundary clear release`).
19. [DONE] Git Commit: `docs: prepare git boundary clear release` (hash: d9a5a5a2b)

### Stream: Release Build
20. [DONE] `phase7.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build git boundary clear release`). Result: Release 1.2.354 built successfully with `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX `codeai-hub-1.2.354.vsix` created at 4.7M; tarballs copied to `doc/tmp/releases/`; release build verified SDK exclusions, local artefacts, markdown links, duplication threshold, package surface, and restored development dependencies.
21. [DONE] Git Commit: `chore: build git boundary clear release` (hash: c78fccfee)

## Phase 8 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
22. [DONE] `phase8.stream1.task1` User installs the generated VSIX and verifies that clearing Virtual Simulation restores persisted workflow state to the pre-Virtual-Simulation boundary and removes downstream artifacts through Git restore (scope: user workflow acceptance; no commit expected). Result: failed retest for release `1.2.354`; Git boundaries are created, but session/runtime slices are not captured and provider-direct step outputs can leave the workspace Git dirty before the next step.

## Phase 9 - Dirty Tree And Runtime Slice Fixes (owner: Codex, updated: 2026-05-25)

### Stream: Runtime Slice Snapshot
23. [DONE] `phase9.stream1.task1` Add a Core-owned runtime slice snapshot service for per-workspace unified session history and provider-native session files needed by workflow rollback (scope: `packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.ts, packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.test.ts`; expected commit: `feat: snapshot workflow runtime session slices`).
24. [DONE] Git Commit: `feat: snapshot workflow runtime session slices` (hash: 03a00e850)

### Stream: Accepted Step Commits
25. [DONE] `phase9.stream2.task1` Add a workflow step commit facade that captures runtime slices, commits accepted step outputs, ignores local runtime timers, and fails if classified step completion leaves dirty Git (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts`; expected commit: `feat: commit accepted workflow step snapshots`).
26. [DONE] Git Commit: `feat: commit accepted workflow step snapshots` (hash: b30c271b5)
27. [DONE] `phase9.stream2.task2` Wire preliminary Description and Virtual Simulation review acceptance through the step commit facade before Core opens the next-step return path (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-review-committer.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts`; expected commit: `feat: keep preliminary workflow steps git clean`).
28. [DONE] Git Commit: `feat: keep preliminary workflow steps git clean` (hash: 0dafd4abe)

### Stream: Clear Runtime Restore
29. [DONE] `phase9.stream3.task1` Restore captured runtime session slices after Git boundary reset so Clear rolls back workspace files and user-space session histories together (scope: `packages/core/src/workflow/boundary/workflow-boundary-facade.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts, packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.ts`; expected commit: `feat: restore workflow runtime slices from boundaries`).
30. [DONE] Git Commit: `feat: restore workflow runtime slices from boundaries` (hash: 9057a79b7)

## Phase 10 - Architecture Documentation And Verification (owner: Codex, updated: 2026-05-25)

### Stream: SSOT And Targeted Checks
31. [DONE] `phase10.stream1.task1` Update workflow architecture docs for Git history as the development timeline, accepted-step commits, session slice snapshots, and clean-tree next-step gating (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document clean git workflow history`).
32. [DONE] Git Commit: `docs: document clean git workflow history` (hash: 4a417dd15)
33. [DONE] `phase10.stream2.task1` Run targeted verification for boundary snapshot, preliminary review acceptance, Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed

## Phase 11 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
34. [DONE] `phase11.stream1.task1` Update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare clean git workflow release`).
35. [DONE] Git Commit: `docs: prepare clean git workflow release` (hash: 4e3b479b0)

### Stream: Release Build
36. [DONE] `phase11.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build clean git workflow release`).
37. [DONE] Git Commit: `chore: build clean git workflow release` (hash: 72cdc7f4c)

## Phase 12 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
38. [DONE] `phase12.stream1.task1` User installs the generated VSIX and verifies that Git is initialized at workspace activation, accepted steps commit all workflow/session history needed for agent recovery, the next step cannot start on dirty Git, and Clear restores selected/downstream workflow state from the correct boundary (scope: user workflow acceptance; no commit expected). Result: Failed release 1.2.355 retest: Diagram Modules Clear restored to a boundary that already contained managed scaffold files, provider-native Codex sessions created after the boundary were not pruned, and workflow/state.json remained dirty after Clear.

## Phase 13 - Boundary Anchor And Runtime Prune Fixes (owner: Codex, updated: 2026-05-25)

### Stream: Clean Boundary Anchors
39. [DONE] `phase13.stream1.task1` Make workflow boundary commits empty pre-step anchors, fail before stage start if the workspace Git tree is dirty, and preserve explicit path commits for accepted-step snapshots (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`; expected commit: `fix: enforce clean workflow boundary anchors`).
40. [DONE] Git Commit: `fix: enforce clean workflow boundary anchors` (hash: 5ea9d033e)

### Stream: Strict Runtime Restore
41. [DONE] `phase13.stream2.task1` Make runtime slice restore prune provider-native session files created after the captured boundary within the recorded provider session directories, while keeping restore allowlisted to CodeAI Hub runtime roots (scope: `packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.ts, packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.test.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`; expected commit: `fix: prune restored workflow runtime sessions`).
42. [DONE] Git Commit: `fix: prune restored workflow runtime sessions` (hash: 5c4e819c2)

### Stream: Managed Stage Acceptance
43. [DONE] `phase13.stream3.task1` Route Diagram Modules user acceptance through the accepted-step commit facade before Core unlocks Application Skeleton, so final managed-stage outputs and runtime slices are committed and Git-clean (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`; expected commit: `fix: commit diagram modules acceptance snapshots`).
44. [DONE] Git Commit: `fix: commit diagram modules acceptance snapshots` (hash: a39fd41b4)

## Phase 14 - Architecture Documentation And Verification (owner: Codex, updated: 2026-05-25)

### Stream: SSOT And Targeted Checks
45. [DONE] `phase14.stream1.task1` Update workflow architecture docs for clean pre-step boundary anchors, strict runtime restore pruning, and managed-stage accepted-step commits (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document strict workflow boundary restore`).
46. [DONE] Git Commit: `docs: document strict workflow boundary restore` (hash: 55f3f949a)
47. [DONE] `phase14.stream2.task1` Run targeted Core build and focused tests for boundary anchors, runtime slice pruning, Clear restore, and managed Diagram Modules acceptance (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed: @codeai-hub/core build, focused boundary/runtime slice/accepted-step/preliminary/Diagram Modules acceptance tests (10 tests), and plan validation completed.

## Phase 15 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
48. [DONE] `phase15.stream1.task1` Update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare strict boundary restore release`).
49. [DONE] Git Commit: `docs: prepare strict boundary restore release` (hash: 37eec0b24)

### Stream: Release Build
50. [DONE] `phase15.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build strict boundary restore release`).
51. [DONE] Git Commit: `chore: build strict boundary restore release` (hash: 260793041)

## Phase 16 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
52. [DONE] `phase16.stream1.task1` User installs the generated VSIX and verifies that clearing Diagram Modules removes stage bootstrap/scaffold files, restores workflow state to Virtual Simulation, prunes provider-native sessions created by Diagram Modules, and leaves the workspace Git tree clean (scope: user workflow acceptance; no commit expected). Result: Failed release `1.2.356` smoke test: a new workspace cannot load the Description questionnaire because workspace activation creates `.codeai-hub/<workspaceSlug>` before the strict Description boundary check, making the brand-new Git tree dirty and returning activation/session startup errors.

## Phase 17 - Description Activation Regression Fix (owner: Codex, updated: 2026-05-25)

### Stream: New Workspace Bootstrap
53. [DONE] `phase17.stream1.task1` Move Description workspace activation boundary creation before any `.codeai-hub/<workspaceSlug>` filesystem bootstrap and add functional coverage for a brand-new workspace activation (scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts, packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: allow description activation on new workspaces`).
54. [DONE] Git Commit: `fix: allow description activation on new workspaces` (hash: 7150da640)

## Phase 18 - Regression Verification (owner: Codex, updated: 2026-05-25)

### Stream: Targeted Checks
55. [DONE] `phase18.stream1.task1` Run targeted Core build and activation/boundary tests for new workspace Description questionnaire bootstrap (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed: @codeai-hub/core build, new workspace activation regression test, boundary facade tests, and plan validation completed.

## Phase 19 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
56. [DONE] `phase19.stream1.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare description activation regression release`).
57. [DONE] Git Commit: `docs: prepare description activation regression release` (hash: 51ea352bb)

### Stream: Release Build
58. [DONE] `phase19.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build description activation regression release`).
59. [DONE] Git Commit: `chore: build description activation regression release` (hash: 6f288714c)

## Phase 20 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
60. [DONE] `phase20.stream1.task1` User installs the generated VSIX and verifies that a new workspace loads/submits the Description questionnaire and that clearing Diagram Modules still removes downstream scaffold/runtime state cleanly (scope: user workflow acceptance; no commit expected). Result: Failed release `1.2.357` retest: Project Manager still cannot show a sendable Description questionnaire. Core logs show `workspace-activate` and `workspace-session` racing through `ensureBoundary`, causing concurrent `git init` failure and then dirty-tree rejection on `.DS_Store` / `.codeai-hub/`.

## Phase 21 - Boundary Startup Race Fix (owner: Codex, updated: 2026-05-25)

### Stream: Serialized Boundary Startup
61. [DONE] `phase21.stream1.task1` Serialize workflow boundary creation per workspace, make Git repository initialization queue-safe, and remove macOS metadata before dirty-tree checks (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`; expected commit: `fix: serialize workflow boundary startup`).
62. [DONE] Git Commit: `fix: serialize workflow boundary startup` (hash: 3dc81cf32)

## Phase 22 - Regression Verification (owner: Codex, updated: 2026-05-25)

### Stream: Targeted Checks
63. [DONE] `phase22.stream1.task1` Run targeted Core build and boundary/workspace activation tests for concurrent Project Manager startup (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed: @codeai-hub/core build, concurrent boundary startup test, pre-submit Description bootstrap self-heal test, workspace activation/session tests, accepted-step commit test, and plan validation completed.

## Phase 23 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
64. [DONE] `phase23.stream1.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare boundary startup race release`).
65. [DONE] Git Commit: `docs: prepare boundary startup race release` (hash: f81885495)

### Stream: Release Build
66. [DONE] `phase23.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build boundary startup race release`).
67. [DONE] Git Commit: `chore: build boundary startup race release` (hash: f8decc490)

## Phase 24 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
68. [DONE] `phase24.stream1.task1` User installs the generated VSIX and verifies that a new workspace loads/submits the Description questionnaire and that clearing Diagram Modules still removes downstream scaffold/runtime state cleanly (scope: user workflow acceptance; no commit expected). Result: Failed release `1.2.358` retest: Description loads, but Diagram Modules Start times out because websocket `session:create` preflight installs managed scaffold files before the Diagram Modules Git boundary can be created, leaving the workspace tree dirty.

## Phase 26 - Diagram Modules Startup Regression Fix (owner: Codex, updated: 2026-05-25)

### Stream: Boundary-First Managed Start
71. [DONE] `phase26.stream1.task1` Move Diagram Modules managed scaffold installation fully behind the Core-owned managed start boundary and add regression coverage for websocket `session:create` preflight plus managed session startup order (scope: `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`; expected commit: `fix: start diagram modules after boundary`).
72. [DONE] Git Commit: `fix: start diagram modules after boundary` (hash: 5342db787)

## Phase 27 - Regression Verification (owner: Codex, updated: 2026-05-25)

### Stream: Targeted Checks
73. [DONE] `phase27.stream1.task1` Run targeted Core build and focused tests for Diagram Modules websocket start, managed scaffold checkpointing, boundary order, and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed: `npm run build --workspace @codeai-hub/core`, `npm run plan:validate`, `node --test dist/remote-bridge/remote-bridge-session-create-router.test.js`, `node --test dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js`, and `node --test dist/workflow/boundary/workflow-boundary-facade.test.js`.

## Phase 28 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
74. [DONE] `phase28.stream1.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare diagram modules startup release`).
75. [DONE] Git Commit: `docs: prepare diagram modules startup release` (hash: f2e466c76)

### Stream: Release Build
76. [DONE] `phase28.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build diagram modules startup release`). Result: Release `1.2.359` built with `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX `codeai-hub-1.2.359.vsix` created at 4.8M; tarballs copied to `doc/tmp/releases/`; release build verified SDK exclusions, local artefacts, markdown links, duplication threshold, VSIX runtime package surface, and restored development dependencies.
77. [DONE] Git Commit: `chore: build diagram modules startup release` (hash: 5379f8dab)

## Phase 29 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
78. [DONE] `phase29.stream1.task1` User installs the generated VSIX and verifies the full `Description -> Virtual Simulation -> Diagram Modules Start -> Clear Diagram Modules` workflow, including clean Git after each accepted step and removal of scaffold/runtime state on Clear (scope: user workflow acceptance; no commit expected). Result: Failed release `1.2.359` retest. Clear Diagram Modules did not behave as a full rollback from the user's point of view, Clear Virtual Simulation failed because no `codeai-boundary: Virtual Simulation` was created, Clear Description left Core-created untracked `description-step.json` and `workflow/state.json`, and external unified/provider session files remained outside real Git rollback control.

## Phase 31 - Workspace-Owned Git Rollback Redesign Planning (owner: Codex, updated: 2026-05-25)

### Stream: Architecture Planning
81. [DONE] `phase31.stream1.task1` Create a replacement planning document for full Git-only workflow rollback, including the workspace-owned runtime capsule, external state inventory, non-goals for manual projection/restore, and implementation phases that remove the hybrid runtime-slice rollback system (scope: `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan workspace owned git rollback capsule`).
82. [DONE] Git Commit: `docs: plan workspace owned git rollback capsule` (hash: 34d41651e)

## Phase 32 - Workspace Runtime Ownership Clarification (owner: Codex, updated: 2026-05-25)

### Stream: Architecture Planning
83. [DONE] `phase32.stream1.task1` Expand the replacement planning document with the accepted per-workspace provider home/settings decision, current `~/.codeai-hub` inventory, secrets/auth boundaries, Project Manager workspace settings behavior, and missing-risk checklist for implementation (scope: `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: expand workspace owned runtime plan`).
84. [DONE] Git Commit: `docs: expand workspace owned runtime plan` (hash: bb95c690a)

## Phase 33 - Legacy Clear Undo Removal Audit (owner: Codex, updated: 2026-05-25)

### Stream: Architecture Planning
85. [DONE] `phase33.stream1.task1` Expand the replacement planning document with a concrete audit of legacy Clear/Undo code paths to delete, rewrite, preserve, and test so the next implementation plan can be sliced into file-bounded microtasks (scope: `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: audit legacy clear undo removal`).
86. [DONE] Git Commit: `docs: audit legacy clear undo removal` (hash: 9546a873e)

## Phase 34 - Workspace-Owned Rollback Implementation Plan (owner: Codex, updated: 2026-05-25)

### Stream: Execution Plan Slicing
87. [DONE] `phase34.stream1.task1` Replace the old closeout handoff with a concrete implementation plan for workspace-owned Git rollback, split into phases, streams and file-bounded microtasks based on the approved architecture audit (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan workspace owned rollback implementation`).
88. [DONE] Git Commit: `docs: plan workspace owned rollback implementation` (hash: 2f3b88b96)

## Phase 35 - Runtime Capsule Foundation (owner: Codex, updated: 2026-05-25)

### Stream: Capsule Path Contract
89. [DONE] `phase35.stream1.task1` Add a `WorkspaceRuntimeCapsule` path resolver with deterministic workspace slug, runtime root, settings root, sessions root and provider home roots (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.test.ts, doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md`; expected commit: `feat: add workspace runtime capsule paths`).
90. [DONE] Git Commit: `feat: add workspace runtime capsule paths` (hash: 3cdb12ba2)
91. [DONE] `phase35.stream1.task2` Add capsule `.gitignore` contract generation for auth/cache/tmp exclusions while keeping rollback-relevant session/settings files trackable (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `feat: define runtime capsule gitignore`).
92. [DONE] Git Commit: `feat: define runtime capsule gitignore` (hash: 6e3ed07a9)

### Stream: Workspace Settings Baseline
93. [DONE] `phase35.stream2.task1` Add workspace settings seed/read/write helpers that resolve settings through the active workspace capsule and use global settings only as defaults (scope: `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts, packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `feat: seed workspace settings from capsule`).
94. [DONE] Git Commit: `feat: seed workspace settings from capsule` (hash: 72b4853e5)
95. [DONE] `phase35.stream2.task2` Add focused tests proving settings changed in one workspace do not affect another workspace and Description baseline contains workspace settings (scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts, packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts, packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts`; expected commit: `test: cover workspace scoped settings`).
96. [DONE] Git Commit: `test: cover workspace scoped settings` (hash: 6b1c9c938)

## Phase 36 - Git Timeline And Boundary Authority (owner: Codex, updated: 2026-05-25)

### Stream: Git History Lookup
97. [DONE] `phase36.stream1.task1` Add stable boundary commit parsing and Git-log lookup so `codeai-boundary: <Stage>` history is the rollback authority instead of tracked `boundaries.json` (scope: `packages/core/src/workflow/boundary/workflow-boundary-model.ts, packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`; expected commit: `feat: resolve workflow boundaries from git log`).
98. [DONE] Git Commit: `feat: resolve workflow boundaries from git log` (hash: c7885325b)
99. [DONE] `phase36.stream1.task2` Demote `workflow-boundary-registry` to rebuildable projection or remove it from rollback decision paths (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`; expected commit: `refactor: demote boundary registry authority`).
100. [DONE] Git Commit: `refactor: demote boundary registry authority` (hash: a1eafa595)

### Stream: Full Git Rollback Primitive
101. [DONE] `phase36.stream2.task1` Replace path-scoped `cleanPaths` with full-worktree clean and remove stage-specific cleanup lists from boundary restore params (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`; expected commit: `refactor: use full git clean for workflow rollback`).
102. [DONE] Git Commit: `refactor: use full git clean for workflow rollback` (hash: 3ccd02982)
103. [DONE] `phase36.stream2.task2` Introduce a workflow rollback coordinator that runs stop/quiesce, reset hard, full clean, projection rebuild and clean-tree assert as one Core-owned transaction (scope: `packages/core/src/workflow/boundary/workflow-rollback-coordinator.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`; expected commit: `feat: coordinate workflow git rollback`).
104. [DONE] Git Commit: `feat: coordinate workflow git rollback` (hash: 1db6bc6f2)

## Phase 37 - Boundary-First Workspace And Stage Starts (owner: Codex, updated: 2026-05-25)

### Stream: Description Baseline
105. [DONE] `phase37.stream1.task1` Move workspace capsule bootstrap before the Description boundary so the boundary contains questionnaire, workspace settings, capsule ignore rules and minimal tracked UI state (scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts, packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `feat: bootstrap capsule before description boundary`).
106. [DONE] Git Commit: `feat: bootstrap capsule before description boundary` (hash: b193fa2dd)
107. [DONE] `phase37.stream1.task2` Remove Description post-clear untracked projection writes or make them rebuildable without dirtying Git (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/workflow/description/description-step-store.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.ts`; expected commit: `fix: keep description clear tree clean`).
108. [DONE] Git Commit: `fix: keep description clear tree clean` (hash: d734c8f5b)

### Stream: Stage Start Ordering
109. [DONE] `phase37.stream2.task1` Move Project Manager stage session creation behind target-stage boundary creation and capsule directory preparation (scope: `packages/core/src/remote-bridge/handlers/workspace-session-service.ts, packages/core/src/remote-bridge/handlers/workspace-session-service.test.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `feat: create stage sessions after boundaries`).
110. [DONE] Git Commit: `feat: create stage sessions after boundaries` (hash: 690b40909)
111. [DONE] `phase37.stream2.task2` Ensure websocket workflow `session:create` preflight cannot install scaffold, provider homes or session files before the selected stage boundary exists (scope: `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`; expected commit: `fix: gate websocket stage preflight by boundary`).
112. [DONE] Git Commit: `fix: gate websocket stage preflight by boundary` (hash: dc8f8e8c1)

## Phase 38 - Remove Runtime-Slices And Directly Commit Capsule State (owner: Codex, updated: 2026-05-25)

### Stream: Runtime-Slice Deletion
113. [DONE] `phase38.stream1.task1` Remove runtime-slice restore from the rollback transaction and delete restore-side tests while capture imports remain only until the accepted-step commit rewrite (scope: `packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.ts, packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.test.ts, packages/core/src/workflow/boundary/workflow-rollback-coordinator.ts`; expected commit: `refactor: remove workflow runtime slice snapshots`).
114. [DONE] Git Commit: `refactor: remove workflow runtime slice snapshots` (hash: 2dd7d06fe)
115. [DONE] `phase38.stream1.task2` Replace old runtime-slice tests and preliminary routing expectations with capsule/direct-commit expectations (scope: `packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts`; expected commit: `test: replace runtime slice rollback coverage`).
116. [DONE] Git Commit: `test: replace runtime slice rollback coverage` (hash: 6090ceacb)

### Stream: Accepted Step Commits
117. [DONE] `phase38.stream2.task1` Rewrite accepted-step commit logic to stage accepted artifacts and tracked capsule state directly without editing root `.gitignore` or copying external sessions, and delete the now-unused runtime-slice snapshot helper (scope: `packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts, packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.ts`; expected commit: `refactor: commit workflow capsule state directly`).
118. [DONE] Git Commit: `refactor: commit workflow capsule state directly` (hash: 1efad3513)
119. [DONE] `phase38.stream2.task2` Keep the accepted-step clean-tree assertion in the facade, remove the runtime-slice count/result field, and replace downstream test expectations with direct capsule state expectations (scope: `packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts`; expected commit: `fix: require clean tree after accepted step commits`).
120. [DONE] Git Commit: `fix: require clean tree after accepted step commits` (hash: 58ef91139)

## Phase 39 - Clear Endpoint As Pure Git Rollback (owner: Codex, updated: 2026-05-25)

### Stream: Clear Coordinator Wiring
121. [DONE] `phase39.stream1.task1` Rewrite the Core Clear endpoint to call the workflow rollback coordinator and stop active downstream sessions without manual file delete/restore side channels (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts, packages/core/src/workflow/boundary/workflow-rollback-coordinator.ts`; expected commit: `refactor: clear workflow steps through git rollback`).
122. [DONE] Git Commit: `refactor: clear workflow steps through git rollback` (hash: fbc4cca6c)
123. [DONE] `phase39.stream1.task2` Add regression coverage for Clear Diagram Modules, Clear Virtual Simulation and Clear Description clean-tree behavior through the HTTP handler contract (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.ts`; expected commit: `test: cover pure git workflow clear`).
124. [DONE] Git Commit: `test: cover pure git workflow clear` (hash: 4abeaaf1b)

## Phase 40 - Workspace-Owned Unified Sessions (owner: Codex, updated: 2026-05-25)

### Stream: Unified Session Storage
125. [DONE] `phase40.stream1.task1` Move workflow unified session storage from global `~/.codeai-hub/sessions` into the active workspace runtime capsule while preserving non-workflow/global callers as explicit legacy paths (scope: `packages/core/src/unified-session/storage.ts, packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.ts, packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.test.ts`; expected commit: `feat: store workflow sessions in runtime capsule`).
126. [DONE] Git Commit: `feat: store workflow sessions in runtime capsule` (hash: 4410ec820)
127. [DONE] `phase40.stream1.task2` Retarget dialog history/list/open services to read workflow sessions from the active workspace capsule and keep global reads only for explicit legacy/non-workflow dialogs (scope: `packages/core/src/remote-bridge/handlers/dialog-history-service.ts, packages/core/src/remote-bridge/handlers/dialog-list-service.ts, packages/core/src/remote-bridge/handlers/dialog-list-service.test.ts`; expected commit: `refactor: read workflow dialogs from capsule sessions`).
128. [DONE] Git Commit: `refactor: read workflow dialogs from capsule sessions` (hash: e78096ee7)
129. [DONE] `phase40.stream1.task3` Retarget Description dialog sync and dialog segment metadata to capsule session roots so Clear removes native and unified workflow session history through Git (scope: `packages/core/src/remote-bridge/handlers/session-description-dialog-sync.ts, packages/core/src/remote-bridge/handlers/session-request-handler-dialog-segment-meta.ts, packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`; expected commit: `refactor: sync workflow dialogs through capsule`).
130. [DONE] Git Commit: `refactor: sync workflow dialogs through capsule` (hash: 1a4bef13b)

## Phase 41 - Workspace-Owned Provider Homes (owner: Codex, updated: 2026-05-25)

### Stream: Codex And Claude Homes
131. [DONE] `phase41.stream1.task1` Resolve Codex workflow provider home/session state under `runtime/providers/codex/home` while keeping auth/installed binaries global or ignored (scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts, packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.test.ts`; expected commit: `feat: use workspace codex home for workflow sessions`).
132. [DONE] Git Commit: `feat: use workspace codex home for workflow sessions` (hash: b4c8a228d)
133. [DONE] `phase41.stream1.task2` Resolve Claude workflow provider home under `runtime/providers/claude/home` while preserving the auth bridge and secret-safe ignore rules (scope: `packages/Claude_Module/src/sdk/claude-provider-home.ts, packages/Claude_Module/src/sdk/claude-provider-home.test.ts`; expected commit: `feat: use workspace claude home for workflow sessions`).
134. [DONE] Git Commit: `feat: use workspace claude home for workflow sessions` (hash: 17be6d06e)

### Stream: Gemini And Kimi Homes
135. [DONE] `phase41.stream2.task1` Resolve Gemini workflow `HOME` / `.gemini` roots under `runtime/providers/gemini/home` without mutating process-global `HOME` in Core (scope: `packages/Gemini_Module/src/runtime/cli-bridge-provider-home.ts, packages/Gemini_Module/src/runtime/cli-bridge-module-loader.ts, packages/Gemini_Module/src/runtime/cli-bridge.test.ts`; expected commit: `feat: use workspace gemini home for workflow sessions`).
136. [DONE] Git Commit: `feat: use workspace gemini home for workflow sessions` (hash: 74c297192)
137. [DONE] `phase41.stream2.task2` Resolve Kimi managed-agent workflow home under `runtime/providers/kimi/home` and add focused provider-home tests (scope: `packages/core/src/provider-registry/index.ts, packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts, packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts`; expected commit: `feat: use workspace kimi home for workflow sessions`).
138. [DONE] Git Commit: `feat: use workspace kimi home for workflow sessions` (hash: 1080a7cfb)

## Phase 42 - Managed Workflow Git Consolidation (owner: Codex, updated: 2026-05-25)

### Stream: Shared Git Service Adoption
139. [DONE] `phase42.stream1.task1` Replace Diagram Modules managed Git helper operations with the shared workspace Git timeline service without changing managed artifact validation semantics (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-managed-git-boundary.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`; expected commit: `refactor: share managed workflow git timeline`).
140. [DONE] Git Commit: `refactor: share managed workflow git timeline` (hash: f829a20f7)
141. [DONE] `phase42.stream1.task2` Migrate Diagram Modules stage/review/repair controllers to the shared Git dependency and remove direct `DiagramModulesManagedGitBoundary` construction where possible (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.ts`; expected commit: `refactor: migrate diagram controllers to shared git timeline`).
142. [DONE] Git Commit: `refactor: migrate diagram controllers to shared git timeline` (hash: 838d999bf)
143. [DONE] `phase42.stream1.task3` Migrate Application Skeleton, Quality Gates and scaffold installer managed commits to the shared Git dependency, including the fresh-repo no-HEAD shared Git no-op path exposed by those controllers (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-scaffold-installer.ts, packages/core/src/workflow/boundary/workflow-boundary-git.ts`; expected commit: `refactor: migrate managed stages to shared git timeline`).
144. [DONE] Git Commit: `refactor: migrate managed stages to shared git timeline` (hash: 18499e180)

## Phase 43 - Project Manager Clear And Workspace Settings Surface (owner: Codex, updated: 2026-05-25)

### Stream: Clear UI Retargeting
145. [DONE] `phase43.stream1.task1` Retarget Project Manager Clear menu/client to the pure Git rollback response semantics and add explicit warning for untracked non-ignored files removed by `git clean -fd` (scope: `src/client/project-manager/services/workflow-step-clear-client.ts, src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx, src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`; expected commit: `refactor: retarget project manager clear to git rollback`).
146. [DONE] Git Commit: `refactor: retarget project manager clear to git rollback` (hash: 664e3ce08)

### Stream: Workspace Settings Surface
147. [DONE] `phase43.stream2.task1` Make Project Manager settings load/save against the active workspace settings snapshot and reload on workspace switch across the Project Manager settings client and Core settings message route (scope: `src/client/project-manager/api.ts, src/client/project-manager/components/settings/use-project-manager-settings.ts, src/client/project-manager/components/settings/use-project-manager-settings-state.ts, src/client/project-manager/services/project-manager-settings-client.ts, packages/core/src/remote-bridge/handlers/settings-request-handler.ts, packages/core/src/remote-bridge/handlers/incoming-message-validator.ts, packages/core/src/remote-bridge/remote-bridge-message-router.ts`; expected commit: `feat: scope project manager settings to workspace`).
148. [DONE] Git Commit: `feat: scope project manager settings to workspace` (hash: 4ab24a7ca)

## Phase 44 - Cleanup Gates And Invariants (owner: Codex, updated: 2026-05-25)

### Stream: Legacy Rollback Removal Gates
149. [DONE] `phase44.stream1.task1` Add automated checks or targeted tests that fail on `runtime-slices`, `cleanPaths`, registry-authority commits, global workflow session roots and direct managed Git helper usage (scope: `scripts/check-workflow-rollback-architecture.mjs, scripts/check-architecture.sh, package.json, doc/SolidWorks-WorkFlow/Plans/WorkflowClear_WorkspaceOwnedGitRollback_Architecture.md`; expected commit: `test: guard workflow rollback architecture`).
150. [DONE] Git Commit: `test: guard workflow rollback architecture` (hash: e63ee819f)
151. [DONE] `phase44.stream1.task2` Update canonical system documentation and docs index with stable workspace-owned rollback architecture decisions after code migration is in place (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document workspace owned git rollback`).
152. [DONE] Git Commit: `docs: document workspace owned git rollback` (hash: 3f40c8018)

## Phase 45 - Targeted Verification And Regression Walkthrough (owner: Codex, updated: 2026-05-25)

### Stream: Core Verification
153. [DONE] `phase45.stream1.task1` Run targeted Core build and focused tests for capsule paths, boundary lookup, Clear coordinator, workspace activation/session ordering and managed workflow Git consolidation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification ran after core build: 53/55 focused tests passed; workflow-state rewrite-boundary fixtures failed against the current Diagram Modules/Application Skeleton contracts, and ignored core dist still contained retired Clear/Undo compiled files. Opened follow-up fix task before release.
154. [DONE] `phase45.stream1.task2` Fix targeted verification findings by refreshing workflow-state regression fixtures for current Diagram Modules/Application Skeleton contracts and making the Core package build clean ignored `dist` before `tsc` (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.ts, packages/core/package.json, doc/TODO/todo-plan.md`; expected commit: `test: harden workflow rollback verification`).
155. [DONE] Git Commit: `test: harden workflow rollback verification` (hash: 4b94405a7)

### Stream: Workflow Rollback Walkthrough
156. [DONE] `phase45.stream2.task1` Run a real local workflow regression on a disposable workspace: Description, Virtual Simulation, Diagram Modules, Clear Diagram Modules, Clear Virtual Simulation, Clear Description, checking clean Git and capsule-owned sessions after every step (scope: local workflow verification; expected commit: no commit expected). Result: Regression verification passed after the hardening fix: clean @codeai-hub/core build, 55/55 focused rollback/capsule/boundary/Clear/workspace/managed tests, workflow rollback architecture guard, plan validation, and disposable workspace walkthrough for Description -> Virtual Simulation -> Diagram Modules -> Clear Diagram Modules -> Clear Virtual Simulation -> Clear Description. The walkthrough confirmed clean Git after every boundary/accepted step/Clear, capsule-owned unified/provider sessions removed by rollback, Virtual/Description upstream artifacts preserved at the right boundaries, and Description returned to a sendable questionnaire.

## Phase 46 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Confirmation Gate
157. [DONE] `phase46.stream1.task1` Stop after implementation and verification, report results, and request explicit user confirmation before preparing release notes or running release scripts (scope: release gate; expected commit: no commit expected). Result: Release build confirmation was already provided by the user in this thread on 2026-05-25: continue without pauses through building the new release.

### Stream: Release Docs
158. [DONE] `phase46.stream2.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workspace rollback release`).
159. [DONE] Git Commit: `docs: prepare workspace rollback release` (hash: eefa3cbf2)

### Stream: Release Build
160. [DONE] `phase46.stream3.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build workspace rollback release`). Result: Release `1.2.360` built successfully with `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX `codeai-hub-1.2.360.vsix` created at 4.2M; tarballs copied to `doc/tmp/releases/`; release build verified architecture, type-check, compile, SDK exclusions, local artefacts, markdown links, duplication threshold, VSIX runtime package surface, and restored development dependencies.
161. [DONE] Git Commit: `chore: build workspace rollback release` (hash: 8ab908c54)

## Phase 47 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
162. [DONE] `phase47.stream1.task1` User installs the generated VSIX and verifies the full workspace-owned rollback workflow including clean Git, removed downstream artifacts, removed unified/provider sessions and sendable Description after Clear Description (scope: user workflow acceptance; no commit expected). Result: Failed release `1.2.360` retest: Description completed, but Virtual Simulation session creation timed out because the Description accepted-step commit left the workspace Git tree dirty with Codex SQLite WAL residue and a post-commit unified-session Core completion message; the Virtual Simulation start-card model selection also did not persist to the workspace runtime settings file.

## Phase 48 - Virtual Simulation Startup Regression Fix (owner: Codex, updated: 2026-05-25)

### Stream: Acceptance Clean Tree
163. [DONE] `phase48.stream1.task1` Keep preliminary Description/Virtual Simulation acceptance Git-clean by recording the Core completion message before the accepted-step commit and excluding volatile provider runtime residue from future capsule commits (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-review-committer.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.ts`; expected commit: `fix: keep preliminary acceptance git clean`).
164. [DONE] Git Commit: `fix: keep preliminary acceptance git clean` (hash: 695edf548)

### Stream: Workspace Settings Start Card
165. [DONE] `phase48.stream2.task1` Persist workflow start-card model/reasoning selections through the active workspace settings scope so `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` is updated before session creation (scope: `src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts`; expected commit: `fix: persist workflow start settings to workspace`).
166. [DONE] Git Commit: `fix: persist workflow start settings to workspace` (hash: f5e94c038)

## Phase 49 - Regression Verification (owner: Codex, updated: 2026-05-25)

### Stream: Targeted Checks
167. [DONE] `phase49.stream1.task1` Run targeted Core/Project Manager tests and plan validation for clean preliminary acceptance and workspace-scoped start settings (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed: @codeai-hub/core build, preliminary routing clean-tree regression test, build:webview, typecheck:webview, workflow start settings-barrier test, and plan validation completed.

## Phase 50 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Confirmation Gate
168. [DONE] `phase50.stream1.task1` Stop after regression fixes and targeted verification, report results, and request explicit user confirmation before preparing release notes or running release scripts (scope: release gate; expected commit: no commit expected). Result: Release build explicitly confirmed by user on 2026-05-25: build the next release for Virtual Simulation startup regression retest.

### Stream: Release Docs
169. [DONE] `phase50.stream2.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare virtual simulation startup release`).
170. [DONE] Git Commit: `docs: prepare virtual simulation startup release` (hash: cc64f488f)

### Stream: Release Build
171. [DONE] `phase50.stream3.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build virtual simulation startup release`). Result: Release `1.2.361` built successfully with `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX `codeai-hub-1.2.361.vsix` created at 4.2M; tarballs copied to `doc/tmp/releases/`; release build verified architecture, type-check, compile, SDK exclusions, local artefacts, markdown links, duplication threshold, VSIX runtime package surface, and restored development dependencies.
172. [DONE] Git Commit: `chore: build virtual simulation startup release` (hash: 04c6db5bc)

## Phase 51 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
173. [DONE] `phase51.stream1.task1` User installs the generated VSIX and verifies Description acceptance leaves clean Git, Virtual Simulation session starts, start-card model changes persist to workspace runtime settings, and the full Clear rollback workflow remains clean (scope: user workflow acceptance; no commit expected). Result: Failed release `1.2.361` retest: Virtual Simulation now starts, but Diagram Modules start is blocked because the Diagram Modules start-card model selection saves `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` before Core can create the clean `codeai-boundary: Diagram Modules` pre-step anchor.

## Phase 52 - Start-Card Settings Boundary Regression Fix (owner: Codex, updated: 2026-05-25)

### Stream: Boundary Preflight Settings Commit
174. [DONE] `phase52.stream1.task1` Commit explicit workflow start-card settings changes before creating the next stage boundary so model selection does not dirty the pre-step anchor for Diagram Modules or later stages (scope: `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `fix: commit workflow start settings before boundaries`).
175. [DONE] Git Commit: `fix: commit workflow start settings before boundaries` (hash: 43ccb5282)

### Stream: Full Start Walkthrough Verification
176. [DONE] `phase52.stream2.task1` Run a local disposable workflow start walkthrough that exercises Description, Virtual Simulation, Diagram Modules, Application Skeleton and Quality Gates start preflight/boundary paths at least once without user-driven release retest gaps (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Failed local disposable walkthrough before release: actual `git status --porcelain` output for the first modified tracked settings line is trimmed to `M .codeai-hub/.../runtime/settings/settings.json`, so the pre-boundary settings commit did not recognize the dirty settings path and Virtual Simulation boundary creation was blocked.

## Phase 53 - Workflow Settings Dirty Status Regression Fix (owner: Codex, updated: 2026-05-25)

### Stream: Dirty Status Parsing
177. [DONE] `phase53.stream1.task1` Parse real trimmed Git porcelain status entries for workflow runtime settings before boundary creation so modified tracked settings and untracked settings are both recognized (scope: `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: parse workflow settings dirty status before boundaries`).
178. [DONE] Git Commit: `fix: parse workflow settings dirty status before boundaries` (hash: 8be5b2014)

### Stream: Full Start Walkthrough Verification
179. [DONE] `phase53.stream2.task1` Re-run the disposable workflow start walkthrough across Description, Virtual Simulation, Diagram Modules, Application Skeleton and Quality Gates with dirty settings before each post-Description boundary, plus targeted Core/PM checks (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Full workflow start verification passed after the dirty-status parser fix: disposable walkthrough reached provider dispatch exactly once for Description, Virtual Simulation, Diagram Modules, Application Skeleton and Quality Gates; settings commits were created before all post-Description boundaries; the disposable workspace ended Git-clean with no warnings; targeted Core router, managed-workspace, workspace-session, workspace-activation, Project Manager settings-barrier, build:webview, typecheck:webview, and plan validation checks passed.

## Phase 54 - Release Build Confirmation (owner: Codex, updated: 2026-05-25)

### Stream: Release Confirmation Gate
180. [DONE] `phase54.stream1.task1` Stop after full workflow start verification, report results, and request explicit user confirmation before preparing release notes or running release scripts (scope: release gate; expected commit: no commit expected). Result: Release build explicitly confirmed by user on 2026-05-25: build the next release for the full workflow start regression retest after successful disposable walkthrough verification.

## Phase 55 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
181. [DONE] `phase55.stream1.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare full workflow start release`).
182. [DONE] Git Commit: `docs: prepare full workflow start release` (hash: af197a7d2)

### Stream: Release Build
183. [DONE] `phase55.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build full workflow start release`). Result: Release `1.2.362` built successfully with `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX `codeai-hub-1.2.362.vsix` created at 4.2M; tarballs copied to `doc/tmp/releases/`; release build verified architecture, type-check, compile, SDK exclusions, local artefacts, markdown links, duplication threshold, VSIX runtime package surface, and restored development dependencies.
184. [DONE] Git Commit: `chore: build full workflow start release` (hash: a5a97da57)

## Phase 56 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
185. [DONE] `phase56.stream1.task1` User installs the generated VSIX and verifies Description, Virtual Simulation, Diagram Modules, Application Skeleton and Quality Gates start without session creation timeouts after start-card model changes (scope: user workflow acceptance; expected commit: no commit expected). Result: Failed release `1.2.362` retest: Application Skeleton is blocked after Diagram Modules acceptance. The upstream file `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md` exists, but Project Manager reports it as `not found` because Core gating sees a dirty Git tree with runtime provider residue and post-review session files.

## Phase 57 - Application Skeleton Unlock Regression Fix (owner: Codex, updated: 2026-05-25)

### Stream: Diagram Modules Acceptance Clean Tree
186. [DONE] `phase57.stream1.task1` Keep accepted workflow-step commits clean when provider homes already contain volatile Codex runtime files by excluding/untracking provider SQLite/cache/shell-snapshot residue from the workspace runtime capsule commit (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts`; expected commit: `fix: keep diagram modules acceptance git clean`).
187. [DONE] Git Commit: `fix: keep diagram modules acceptance git clean` (hash: f4cd63508)
188. [DONE] `phase57.stream1.task2` Persist Diagram Modules user-return completion messages before the accepted-step commit and classify workspace-owned runtime sessions/provider homes as managed committable state so Application Skeleton unlocks from a clean tree (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts`; expected commit: `fix: commit diagram modules completion messages`).
189. [DONE] Git Commit: `fix: commit diagram modules completion messages` (hash: e228022c4)

### Stream: Regression Verification
190. [DONE] `phase57.stream2.task1` Run targeted Core build and focused regression tests for Diagram Modules acceptance clean-tree behavior and Application Skeleton gating readiness (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted verification passed: @codeai-hub/core build, accepted-step commit regression tests, managed terminal dirty classifier tests, Diagram Modules review acceptance clean-tree test, technical stage dirty-gate tests, and workflow-state rewrite-boundary Application Skeleton readiness tests completed successfully (24 focused node tests).

## Phase 58 - Release Build Confirmation (owner: Codex, updated: 2026-05-25)

### Stream: Release Confirmation Gate
191. [DONE] `phase58.stream1.task1` Stop after Application Skeleton unlock regression fixes and targeted verification, report results, and request explicit user confirmation before preparing release notes or running release scripts (scope: release gate; expected commit: no commit expected). Result: Release build explicitly confirmed by user on 2026-05-25: build the next release for Application Skeleton unlock retest after successful Diagram Modules acceptance clean-tree verification.

## Phase 59 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
192. [DONE] `phase59.stream1.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton unlock release`).
193. [DONE] Git Commit: `docs: prepare application skeleton unlock release` (hash: c92cafb0e)

### Stream: Release Build
194. [DONE] `phase59.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build application skeleton unlock release`). Result: Release `1.2.363` built successfully with `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX `codeai-hub-1.2.363.vsix` created at 4.2M; tarballs copied to `doc/tmp/releases/`; release build verified architecture, type-check, compile, SDK exclusions, local artefacts, markdown links, duplication threshold, VSIX runtime package surface, and restored development dependencies.
195. [DONE] Git Commit: `chore: build application skeleton unlock release` (hash: 8e8b5dfe0)

## Phase 60 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
196. [DONE] `phase60.stream1.task1` User installs the generated VSIX and verifies Application Skeleton starts after Diagram Modules acceptance and the full workflow remains Git-clean through Quality Gates start (scope: user workflow acceptance; expected commit: no commit expected). Result: failed release 1.2.363 retest: settings are split between workspace runtime and legacy/global reads, so saved selections can reset or be ignored

## Phase 61 - Workspace Settings Authority Regression Fix (owner: Codex, updated: 2026-05-25)

### Stream: Settings Runtime Authority
197. [DONE] `phase61.stream1.task1` Make workflow start-card settings reads and default-model persistence use the active workspace runtime settings snapshot instead of the singleton last settings payload (scope: `src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/workflow-step-settings-transport.ts, src/client/project-manager/services/**settings*.test.ts`; expected commit: `fix: use workspace settings for workflow starts`).
198. [DONE] Git Commit: `fix: use workspace settings for workflow starts` (hash: 97b572dc4)
199. [DONE] `phase61.stream1.task2` Make Core session model binding resolve default/effective provider identity from the active workspace runtime settings file and carry that path on the session binding (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/session-model-binding/session-model-binding-resolver.ts, packages/core/src/session-model-binding/session-model-binding-types.ts`; expected commit: `fix: resolve workflow sessions from workspace settings`).
200. [DONE] Git Commit: `fix: resolve workflow sessions from workspace settings` (hash: 865f693c2)
202. [DONE] `phase61.stream1.task3` Make applied provider turn config consume the session binding settings path so model metadata and reasoning translation policy stay workspace-scoped after session creation (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts, packages/core/src/session-model-binding/session-model-binding-resolver.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: apply workspace settings to provider turns`).
203. [DONE] Git Commit: `fix: apply workspace settings to provider turns` (hash: fa6000aa2)

### Stream: Regression Verification
201. [DONE] `phase61.stream2.task1` Run focused settings authority regression tests plus targeted Project Manager/Core builds before requesting the next release build confirmation (scope: `src/client/project-manager, packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: passed settings authority verification: focused Project Manager workflow-start tests (9), session model binding tests (5), @codeai-hub/core build, build:webview, typecheck:webview, and plan validation completed

## Phase 62 - Release Build Confirmation (owner: Codex, updated: 2026-05-25)

### Stream: Release Confirmation Gate
204. [DONE] `phase62.stream1.task1` Stop after workspace settings authority fixes and targeted verification, report results, and request explicit user confirmation before preparing release notes or running release scripts (scope: release gate; expected commit: no commit expected). Result: release build explicitly confirmed by user on 2026-05-25 for workspace settings authority retest

## Phase 63 - Release Build (owner: Codex, updated: 2026-05-25)

### Stream: Release Docs
205. [DONE] `phase63.stream1.task1` After explicit release confirmation, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workspace settings authority release`).
206. [DONE] Git Commit: `docs: prepare workspace settings authority release` (hash: 24ccdfb0f)

### Stream: Release Build
207. [DONE] `phase63.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build workspace settings authority release`). Result: Release `1.2.364` built successfully with `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX `codeai-hub-1.2.364.vsix` created at 4.2M; tarballs copied to `doc/tmp/releases/`; release build verified architecture, type-check, compile, SDK exclusions, local artefacts, markdown links, duplication threshold, VSIX runtime package surface, and restored development dependencies.
208. [DONE] Git Commit: `chore: build workspace settings authority release` (hash: 3983d3e8c)

## Phase 64 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
209. [DONE] `phase64.stream1.task1` User installs the generated VSIX and verifies workspace settings persist in `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json`, workflow start cards do not reset provider/model defaults, and sessions use workspace-scoped model/reasoning policy (scope: user workflow acceptance; expected commit: no commit expected). Result: failed release 1.2.364 retest: Settings still behaves inconsistently because runtime truth is split between legacy global settings and workspace runtime settings. New requirement: global ~/.codeai-hub/settings/settings.json must not be runtime truth; workspace settings are the only mutable source, and newly created workspaces should inherit settings from an existing configured workspace before falling back to in-code defaults.

## Phase 65 - Workspace Settings Single Source Regression Fix (owner: Codex, updated: 2026-05-26)

### Stream: Workspace Settings Materialization
210. [DONE] `phase65.stream1.task1` Remove global settings file creation from Core settings persistence and seed a missing workspace settings file from the most recently used existing workspace settings, falling back only to the in-code default template (scope: `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts, packages/core/src/remote-bridge/handlers/workspace-settings-seed-resolver.ts, packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts`; expected commit: `fix: materialize workspace settings from workspace sources`).
211. [DONE] Git Commit: `fix: materialize workspace settings from workspace sources` (hash: 56a28ffc2)
212. [DONE] `phase65.stream1.task2` Make settings bridge load/save/reset events carry workspace scope through small Core broadcaster classes instead of growing the settings request handler (scope: `packages/core/src/remote-bridge/handlers/settings-loaded-broadcaster.ts, packages/core/src/remote-bridge/handlers/settings-request-handler.ts, packages/core/src/remote-bridge/handlers/settings-saved-broadcaster.ts`; expected commit: `fix: scope project manager settings events`).
213. [DONE] Git Commit: `fix: scope project manager settings events` (hash: 2b0362087)
214. [DONE] `phase65.stream1.task3` Make workflow settings transport ignore unscoped or wrong-workspace settings replies before workflow starts persist defaults (scope: `src/client/project-manager/services/workflow-step-settings-transport.ts, src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/**settings*.test.ts`; expected commit: `fix: filter workflow settings by workspace`).
215. [DONE] Git Commit: `fix: filter workflow settings by workspace` (hash: 232023b70)
216. [DONE] `phase65.stream1.task4` Make Project Manager settings consumers and start-card model defaults resolve the active workspace settings payload instead of singleton unscoped settings state (scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/services/workspace-settings-payload-hook.ts`; expected commit: `fix: read workspace settings in project manager ui`).
217. [DONE] Git Commit: `fix: read workspace settings in project manager ui` (hash: 58420ee81)
218. [DONE] `phase65.stream1.task5` Remove remaining runtime reads of `~/.codeai-hub/settings/settings.json` from workflow/provider paths or convert them to in-memory defaults until workspace scope is known, including the provider settings exports that become unused after the global read is removed (scope: `packages/core/src/config/index.ts, packages/core/src/config/provider-settings-snapshot.ts, packages/core/src/config/provider-turn-config-resolver.ts, packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts, packages/core/src/remote-bridge/handlers/session-request-handler-turn-threshold-resolver.ts`; expected commit: `fix: remove global settings runtime reads`).
219. [DONE] Git Commit: `fix: remove global settings runtime reads` (hash: b097d8f17)

### Stream: Regression Verification
220. [DONE] `phase65.stream2.task1` Run focused workspace settings authority tests, scan for global settings runtime references, run targeted Project Manager/Core builds, and request/use confirmed release build for the next retest (scope: `src/client/project-manager, packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: focused settings tests passed; scan found remaining runtime references in provider/localization/node bootstrap and session fallback paths, so follow-up cleanup tasks were added before release

### Stream: Remaining Global Reference Cleanup
221. [DONE] `phase65.stream3.task1` Route provider, localization and node bootstrap settings paths through workspace runtime capsules instead of `~/.codeai-hub/settings/settings.json` fallbacks (scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/core/src/translation/core-localization-facade-factory.ts, packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`; expected commit: `fix: use workspace settings paths for provider bootstrap`).
222. [PENDING] Git Commit: `fix: use workspace settings paths for provider bootstrap` (hash: TBD)
223. [TODO] `phase65.stream3.task2` Remove session runtime and applied turn config fallback derivation from global settings directory when no binding is available (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`; expected commit: `fix: remove global settings fallback paths`).
224. [TODO] Git Commit: `fix: remove global settings fallback paths` (hash: TBD)
225. [TODO] `phase65.stream3.task3` Re-run settings reference scan, focused tests and targeted Core/webview builds after remaining global reference cleanup (scope: `src/client/project-manager, packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: TBD.

## Phase 66 - Release Build (owner: Codex, updated: 2026-05-26)

### Stream: Release Docs
226. [TODO] `phase66.stream1.task1` After explicit release confirmation from the user request, update release-facing docs for the next version before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workspace settings ssot release`).
227. [TODO] Git Commit: `docs: prepare workspace settings ssot release` (hash: TBD)

### Stream: Release Build
228. [TODO] `phase66.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build workspace settings ssot release`). Result: TBD.
229. [TODO] Git Commit: `chore: build workspace settings ssot release` (hash: TBD)

## Phase 67 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-26)

### Stream: User Retest
230. [TODO] `phase67.stream1.task1` User installs the generated VSIX and verifies settings are materialized only inside each workspace runtime, new workspaces inherit configured workspace settings when available, Project Manager changes persist to the active workspace file, and workflow sessions use those workspace settings (scope: user workflow acceptance; expected commit: no commit expected). Result: TBD.

## Phase 30 - Scope Closeout (owner: Codex, updated: 2026-05-25)

### Stream: Closeout
79. [TODO] `phase30.stream1.task1` After explicit user acceptance, archive this todo plan and dispose the planning document according to its final SSOT status (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close git boundary clear implementation`).
80. [TODO] Git Commit: `docs: close git boundary clear implementation` (hash: TBD)
