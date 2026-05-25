# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "workflow-clear-git-boundary-rollback-implementation-2026-05-25",
  "branch": "main",
  "baseHead": "cdb74cc45",
  "lastRecordedCommit": "4a417dd15",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/WorkflowClear_GitBoundaryRollback_Architecture.md",
  "currentTaskId": "phase11.stream1.task1",
  "expectedCommitMessage": "docs: prepare clean git workflow release",
  "debt": {
    "expectedCommitMessage": "docs: prepare clean git workflow release",
    "preCommitHead": "4a417dd15",
    "stage": "commit_pending",
    "taskId": "phase11.stream1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_GitBoundaryRollback_Architecture.md`
- **Release build confirmation:** user explicitly requested the new task to be planned and executed through a new release build on 2026-05-25.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_GitBoundaryRollback_Architecture.md`
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
35. [PENDING] Git Commit: `docs: prepare clean git workflow release` (hash: TBD)

### Stream: Release Build
36. [TODO] `phase11.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build clean git workflow release`).
37. [TODO] Git Commit: `chore: build clean git workflow release` (hash: TBD)

## Phase 12 - User Workflow Acceptance Testing (owner: User, updated: 2026-05-25)

### Stream: User Retest
38. [TODO] `phase12.stream1.task1` User installs the generated VSIX and verifies that Git is initialized at workspace activation, accepted steps commit all workflow/session history needed for agent recovery, the next step cannot start on dirty Git, and Clear restores selected/downstream workflow state from the correct boundary (scope: user workflow acceptance; no commit expected).

## Phase 13 - Scope Closeout (owner: Codex, updated: 2026-05-25)

### Stream: Closeout
39. [TODO] `phase13.stream1.task1` After explicit user acceptance, archive this todo plan and dispose the planning document according to its final SSOT status (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close git boundary clear implementation`).
40. [TODO] Git Commit: `docs: close git boundary clear implementation` (hash: TBD)
