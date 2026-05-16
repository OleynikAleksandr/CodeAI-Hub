# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "main-merge-release-retest-1.2.275",
  "branch": "main",
  "baseHead": "39d486a8d",
  "lastRecordedCommit": "716722ab8",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Main_Merge_Release_Verification_1.2.275.md",
  "currentTaskId": "main-merge-release.phase2.build.task1",
  "expectedCommitMessage": "chore: build 1.2.275 release artifacts",
  "debt": {
    "expectedCommitMessage": "chore: build 1.2.275 release artifacts",
    "preCommitHead": "716722ab8",
    "stage": "commit_pending",
    "taskId": "main-merge-release.phase2.build.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Main_Merge_Release_Verification_1.2.275.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules

- Required reading before code or architecture changes: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Scope: build a fresh release after the merge of the rewritten Core managed orchestration work into `main`.
- User already requested the release build in chat on 2026-05-16; this satisfies the Release Build Confirmation Gate for this scope.
- No product-code edits are planned. If build or verification exposes a defect, add a new investigation stream before changing code.
- Use `npm run plan:commit -- "<expected commit message>"` for tracked changes; do not bypass hooks.
- Keep the scope `ACTIVE` after packaging until the user finishes workflow retest and explicitly accepts the release.

## Phase 0 — Release Retest Intake (owner: Codex, updated: 2026-05-16)

### Stream: Scope Registration

1. [DONE] `main-merge-release.phase0.plan.task1` Create the planning source, active todo-plan, and docs index entry for the merged orchestrator release retest scope (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Main_Merge_Release_Verification_1.2.275.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: open merged orchestrator release retest`).
2. [DONE] Git Commit: `docs: open merged orchestrator release retest` (hash: abb776146)

## Phase 1 — Release Notes Preparation (owner: Codex, updated: 2026-05-16)

### Stream: User-Facing Release Docs

3. [DONE] `main-merge-release.phase1.docs.task1` Update README and CHANGELOG for the future `1.2.275` retest release before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.275 merged orchestrator retest release`). Result: README and CHANGELOG now describe `1.2.275` as a fresh merged orchestrator retest build before release automation bumps package manifests.
4. [DONE] Git Commit: `docs: prepare 1.2.275 merged orchestrator retest release` (hash: 716722ab8)

## Phase 2 — Release Build (owner: Codex, updated: 2026-05-16)

### Stream: Unified Artifact Build

5. [DONE] `main-merge-release.phase2.build.task1` Run `./scripts/build-all.sh` from a clean tree, verify version and runtime tarball outputs, and commit generated version and manifest changes (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.275 release artifacts`). Result: `./scripts/build-all.sh --allow-dirty --version 1.2.275` passed with only machine-managed active plan state dirty before the build; root, Core, and provider package versions report `1.2.275`; generated tarballs exist under `doc/tmp/releases/` and `~/.codeai-hub/releases/` for Claude, Codex, Gemini, Core darwin-arm64, CEF launcher macos-arm64, vscode-webview, and project-manager.
6. [PENDING] Git Commit: `chore: build 1.2.275 release artifacts` (hash: TBD)

### Stream: VSIX Packaging

7. [TODO] `main-merge-release.phase2.package.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions, dev dependency prune/restore, VSIX creation, and record release handoff evidence (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record 1.2.275 release package`).
8. [TODO] Git Commit: `docs: record 1.2.275 release package` (hash: TBD)

## Phase 3 — User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-16)

### Stream: User Retest

9. [TODO] `main-merge-release.phase3.acceptance.task1` User installs `codeai-hub-1.2.275.vsix` and retests the merged Core managed orchestration workflow. Scope: user workflow acceptance only; expected commit: none.

## Phase 4 — Scope Closeout (owner: Codex, updated: 2026-05-16)

### Stream: Closeout

10. [TODO] `main-merge-release.phase4.closeout.task1` After explicit user acceptance, archive this todo-plan and planning source, update Docs Index disposition, and close the release retest scope (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close merged orchestrator release retest`).
11. [TODO] Git Commit: `docs: close merged orchestrator release retest` (hash: TBD)
12. [TODO] `main-merge-release.phase4.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. Scope: handoff only; expected commit: none.
