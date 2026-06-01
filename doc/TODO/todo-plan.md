# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-thinking-default-and-pm-startup-audit-2026-06-01",
  "branch": "main",
  "baseHead": "b5c00288f",
  "lastRecordedCommit": "9e60c8596",
  "planningSource": "user request 2026-06-01: enable Claude thinking by default and analyze first Project Manager startup latency",
  "currentTaskId": "webview-bundle-sync",
  "expectedCommitMessage": "chore: sync webview bundle after startup fixes",
  "debt": {
    "expectedCommitMessage": "chore: sync webview bundle after startup fixes",
    "preCommitHead": "9e60c8596",
    "stage": "commit_pending",
    "taskId": "webview-bundle-sync"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** user request 2026-06-01
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Do not migrate existing workspace settings for this scope; only change defaults for missing/new settings.
- Do not run release build without explicit user confirmation.
- Scope closeout requires explicit user acceptance.

## Phase 1 - Claude Thinking Default + Startup Analysis (owner: Codex, updated: 2026-06-01)
### Stream: Claude Thinking Default
1. [DONE] `claude-thinking-default` Enable Claude thinking mode by default for new/missing settings only, without migrating explicit existing workspace values — scope: `src/client/ui/src/components/settings/claude-thinking-state.ts, packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `fix: enable claude thinking by default`
2. [DONE] Git Commit: `fix: enable claude thinking by default` (hash: 144b9e6ce)

### Stream: Tooling Verification
3. [DONE] `claude-thinking-default-verify` Run targeted settings default tests and type-safe checks if needed — scope: `settings tests, core settings tests` Result: Verification passed: targeted Settings UI auto-update defaults test and Core provider auto-update service test passed after the Claude thinking default commit.

### Stream: User Workflow Acceptance Testing
4. [DONE] `user-acceptance` Report implementation result and Project Manager startup analysis; wait for explicit user acceptance — scope: user acceptance gate Result: User accepted the Claude thinking default and requested implementing the Project Manager startup optimization plus building a new release for verification.

## Phase 2 - Project Manager Startup Optimization + Release (owner: Codex, updated: 2026-06-01)
### Stream: Core Bridge Startup
5. [DONE] `pm-startup-early-bridge` Open the Core remote bridge before heavy provider warmup, while keeping provider actions unavailable until provider initialization succeeds — scope: `packages/core/src/orchestrator/core-orchestrator.ts, packages/core/src/orchestrator/core-orchestrator.test.ts, packages/core/src/provider-registry/index.ts`; expected commit: `fix: open project manager before provider warmup`
6. [DONE] Git Commit: `fix: open project manager before provider warmup` (hash: 7395566ba)

### Stream: Project Manager Startup Requests
7. [DONE] `pm-startup-lazy-version-check` Stop eager provider version checks on first Project Manager socket open; keep manual/settings-triggered version reloads — scope: `src/client/project-manager/api.ts`; expected commit: `fix: defer provider version checks on startup`
8. [DONE] Git Commit: `fix: defer provider version checks on startup` (hash: 9e60c8596)

### Stream: Tooling Verification
9. [DONE] `pm-startup-verify` Run targeted Core orchestrator/startup request tests plus core/webview builds — scope: `core + project-manager startup tests` Result: Verification passed: targeted Core orchestrator startup test, provider auto-update tests, Settings UI default test, @codeai-hub/core build, webview typecheck, and build:webview passed.

### Stream: Release Build Confirmation
10. [DONE] `release-confirmation` User explicitly requested building a new release after the startup optimization — scope: user confirmation gate Result: User asked to implement the startup change and build a new release for verification.

### Stream: Release Build
11. [DONE] `webview-bundle-sync` Commit the tracked webview bundle generated by build:webview after the Claude thinking default and Project Manager startup source changes — scope: `media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `chore: sync webview bundle after startup fixes`
12. [PENDING] Git Commit: `chore: sync webview bundle after startup fixes` (hash: TBD)
13. [TODO] `release-docs` Update README and CHANGELOG for the next release before packaging — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare next release notes`
14. [TODO] Git Commit: `docs: prepare next release notes` (hash: TBD)
15. [TODO] `release-build` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build next release`
16. [TODO] Git Commit: `chore: build next release` (hash: TBD)
17. [TODO] `release-vsix` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package next vsix`
18. [TODO] Git Commit: `chore: package next vsix` (hash: TBD)

### Stream: User Workflow Acceptance Testing
19. [TODO] `release-acceptance` Hand off the new VSIX and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
20. [TODO] `scope-closeout` Close out todo-plan only after explicit user acceptance — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/`
