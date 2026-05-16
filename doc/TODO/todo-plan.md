# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-return-marker-release-2026-05-16",
  "branch": "main",
  "baseHead": "8254f5c4e",
  "lastRecordedCommit": "8254f5c4e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_ProjectFoundation_Planning_RU.md",
  "currentTaskId": "quality-gates-return-release.phase0.plan.task1",
  "expectedCommitMessage": "docs: open quality gates return marker release",
  "debt": {
    "expectedCommitMessage": "docs: open quality gates return marker release",
    "preCommitHead": "8254f5c4e",
    "stage": "commit_pending",
    "taskId": "quality-gates-return-release.phase0.plan.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_ProjectFoundation_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules

- Scope: package the already-implemented Quality Gates return marker fix into a new release.
- Do not make additional product behavior changes in this scope unless the release build exposes a blocker.
- Do not bypass hooks. Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks.
- Release build confirmation has already been given by the user in this turn: "И в конце собери новый релиз."
- The release phase remains open until the user installs the produced VSIX and explicitly accepts it.

## Phase 0 — Release Scope Registration (owner: Codex, updated: 2026-05-16)

### Stream: Active Plan Creation

1. [DONE] `quality-gates-return-release.phase0.plan.task1` Create the active release todo-plan for packaging the Quality Gates return marker fix (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open quality gates return marker release`).
2. [PENDING] Git Commit: `docs: open quality gates return marker release` (hash: TBD)

## Phase 1 — Release Build (owner: Codex, updated: 2026-05-16)

### Stream: Release Notes Preparation

3. [TODO] `quality-gates-return-release.phase1.docs.task1` Update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates return marker release`).
4. [TODO] Git Commit: `docs: prepare quality gates return marker release` (hash: TBD)

### Stream: Unified Artifact Build

5. [TODO] `quality-gates-return-release.phase1.build.task1` Run `./scripts/build-all.sh` from a clean tree, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build quality gates return marker release artifacts`).
6. [TODO] Git Commit: `chore: build quality gates return marker release artifacts` (hash: TBD)

### Stream: VSIX Packaging

7. [TODO] `quality-gates-return-release.phase1.package.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record quality gates return marker release package`).
8. [TODO] Git Commit: `docs: record quality gates return marker release package` (hash: TBD)

## Phase 2 — User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-16)

### Stream: User Retest

9. [TODO] `quality-gates-return-release.phase2.acceptance.task1` User installs the produced release and retests that completed Quality Gates stays green after the persistent `User Return And Revisions` stream is created. Scope: user workflow acceptance only; expected commit: none.

## Phase 3 — Scope Closeout (owner: Codex, updated: 2026-05-16)

### Stream: Closeout

10. [TODO] `quality-gates-return-release.phase3.closeout.task1` After explicit user acceptance, archive this todo-plan and close the release scope (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**`; expected commit: `docs: close quality gates return marker release`).
11. [TODO] Git Commit: `docs: close quality gates return marker release` (hash: TBD)
