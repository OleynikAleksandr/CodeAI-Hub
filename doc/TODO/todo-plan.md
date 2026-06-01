# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-thinking-default-and-pm-startup-audit-2026-06-01",
  "branch": "main",
  "baseHead": "b5c00288f",
  "lastRecordedCommit": "ae615fbee",
  "planningSource": "user request 2026-06-01: enable Claude thinking by default and analyze first Project Manager startup latency",
  "currentTaskId": "provider-refresh-release-docs",
  "expectedCommitMessage": "docs: prepare 1.2.431 release notes",
  "debt": {
    "expectedCommitMessage": "docs: prepare 1.2.431 release notes",
    "preCommitHead": "ae615fbee",
    "stage": "commit_pending",
    "taskId": "provider-refresh-release-docs"
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
12. [DONE] Git Commit: `chore: sync webview bundle after startup fixes` (hash: 5ea744cfd)
13. [DONE] `release-docs` Update README and CHANGELOG for the next release before packaging — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.430 release notes`
14. [DONE] Git Commit: `docs: prepare 1.2.430 release notes` (hash: 1227268c8)
15. [DONE] `release-build` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.430 release`
16. [DONE] Git Commit: `chore: build 1.2.430 release` (hash: dfb964fd0)
17. [DONE] `release-vsix` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.430 vsix`
18. [DONE] Git Commit: `chore: package 1.2.430 vsix` (hash: 4e82ba05c)

### Stream: User Workflow Acceptance Testing
19. [DONE] `release-acceptance` Hand off the new VSIX and wait for explicit user retest acceptance — scope: user acceptance gate Result: User retest accepted Project Manager startup speed but found Claude/Gemini provider picker rows stuck in startup warmup state even after Core provider initialization completed.

### Stream: Provider Warmup State Refresh
20. [DONE] `provider-warmup-state-refresh` Broadcast a fresh Core state/provider snapshot after provider warmup and retry status changes, so Project Manager replaces early "starting" provider rows with the final provider state — scope: `packages/core/src/remote-bridge/index.ts, packages/core/src/remote-bridge/remote-bridge-provider-state-broadcast.test.ts`; expected commit: `fix: refresh provider status after warmup`
21. [DONE] Git Commit: `fix: refresh provider status after warmup` (hash: ae615fbee)
22. [DONE] `provider-warmup-state-refresh-verify` Run targeted provider state broadcast test, core build, and webview typecheck/build — scope: `core + webview verification` Result: Verification passed: provider state broadcast regression test, @codeai-hub/core build, webview typecheck, and build:webview passed.

### Stream: Release Build Confirmation
23. [DONE] `provider-refresh-release-confirmation` Wait for explicit user confirmation before building a follow-up release for provider warmup state refresh — scope: user confirmation gate Result: User explicitly requested building a new release for the provider warmup state refresh fix.

### Stream: Provider Refresh Release Build
24. [DONE] `provider-refresh-release-docs` Update README and CHANGELOG for 1.2.431 before packaging — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.431 release notes`
25. [PENDING] Git Commit: `docs: prepare 1.2.431 release notes` (hash: TBD)
26. [TODO] `provider-refresh-release-build` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.431 release`
27. [TODO] Git Commit: `chore: build 1.2.431 release` (hash: TBD)
28. [TODO] `provider-refresh-release-vsix` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.431 vsix`
29. [TODO] Git Commit: `chore: package 1.2.431 vsix` (hash: TBD)

### Stream: User Workflow Acceptance Testing
30. [TODO] `release-acceptance-431` Hand off the new VSIX and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
31. [TODO] `scope-closeout` Close out todo-plan only after explicit user acceptance — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/`
