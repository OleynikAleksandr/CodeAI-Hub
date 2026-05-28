# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "provider-workspace-home-readiness-repair-2026-05-27",
  "branch": "main",
  "baseHead": "82b4a5113",
  "lastRecordedCommit": "3d1bd8874",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md",
  "currentTaskId": "provider-readiness.phase8o.release-vsix.task1",
  "expectedCommitMessage": "test: verify glm config bootstrap vsix",
  "debt": {
    "expectedCommitMessage": "test: verify glm config bootstrap vsix",
    "preCommitHead": "3d1bd8874",
    "stage": "commit_pending",
    "taskId": "provider-readiness.phase8o.release-vsix.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery/context source for this execution cycle.

## Execution Rules
- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation microtask must touch no more than 3 files/packages.
- Every implementation microtask is followed by its own `Git Commit: ...` item.
- Do not bypass Husky hooks; use `npm run plan:commit -- "<expected commit message>"`.
- Run targeted tests/builds for touched packages before closing the relevant stream.
- Do not start release notes, version bumps, `build-all.sh`, or `build-release.sh` without explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-27)
### Stream: Planning Package
1. [DONE] `provider-readiness.phase0.plan.task1` Create the provider readiness planning source, register it in Docs Index, and replace the NONE stub with this active execution todo plan (scope: `doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan provider workspace readiness repair`).
2. [DONE] Git Commit: `docs: plan provider workspace readiness repair` (hash: 34e6fadc2)

## Phase 1 — Reproduce And Guard Failures (owner: Codex, updated: 2026-05-27)
### Stream: Provider Readiness Regression Coverage
3. [DONE] `provider-readiness.phase1.tests.task1` Add focused regression tests for the known readiness failures: Gemini workspace-home auth is missing while UI says available, Kimi must not resolve provider home from `/`, and GLM must not ignore workspace settings/config precedence (scope: `packages/Gemini_Module/src/**, packages/Kimi_Module/src/**, packages/Claude_Module/src/glm-claude-code/**`; expected commit: `test: cover provider workspace readiness failures`).
4. [DONE] Git Commit: `test: cover provider workspace readiness failures` (hash: df77fd1be)

## Phase 2 — Gemini Workspace Auth Readiness (owner: Codex, updated: 2026-05-27)
### Stream: Gemini Provider Home Bootstrap
5. [DONE] `provider-readiness.phase2.gemini.task1` Implement Gemini workspace provider-home auth bootstrap from existing user Gemini auth/settings, keep storage resolution scoped to the active workspace, and fail readiness clearly when auth is unavailable (scope: `packages/Gemini_Module/src/runtime/cli-bridge-provider-home.ts, packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts, packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`; expected commit: `fix: bootstrap gemini workspace provider home`).
6. [DONE] Git Commit: `fix: bootstrap gemini workspace provider home` (hash: 141cba600)

## Phase 3 — Kimi Workspace Path And Config (owner: Codex, updated: 2026-05-27)
### Stream: Kimi Runtime Home
7. [DONE] `provider-readiness.phase3.kimi.task1` Pass the active workspace path into Kimi adapter construction, resolve `KIMI_SHARE_DIR` inside the workspace capsule, and preserve the existing `~/.kimi/config.toml` credential source unless an explicit config path is provided (scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`; expected commit: `fix: resolve kimi workspace provider home`).
8. [DONE] Git Commit: `fix: resolve kimi workspace provider home` (hash: 4f803f0fe)

## Phase 4 — GLM-Claude-Code Settings/Auth Resolution (owner: Codex, updated: 2026-05-27)
### Stream: GLM API Key Source
9. [DONE] `provider-readiness.phase4.glm.task1` Thread workspace `providers.glmClaudeCode` settings into the GLM runtime profile without persisting secrets to tracked files, preserve env/config precedence, and make empty settings values non-overriding (scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.ts, packages/Claude_Module/src/glm-claude-code/glm-claude-code-sdk-auth-manager.ts`; expected commit: `fix: resolve glm workspace auth settings`).
10. [DONE] Git Commit: `fix: resolve glm workspace auth settings` (hash: 01f97fafe)

## Phase 5 — Provider Picker Truthfulness (owner: Codex, updated: 2026-05-27)
### Stream: Availability Projection
11. [DONE] `provider-readiness.phase5.status.task1` Make provider picker availability reflect Core readiness after provider preflight/recovery, so Gemini cannot be selectable as available when auth/session bootstrap is known to fail, while Kimi/GLM show actionable messages (scope: `packages/core/src/provider-registry/**, src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/components/description/description-provider-picker.tsx`; expected commit: `fix: show truthful provider readiness`).
12. [DONE] Git Commit: `fix: show truthful provider readiness` (hash: afe2a0590)

## Phase 6 — Tooling Verification (owner: Codex, updated: 2026-05-27)
### Stream: Targeted Verification
13. [DONE] `provider-readiness.phase6.verify.task1` Run targeted provider/core/UI checks for Gemini, Kimi, GLM, and provider picker readiness; record exact commands/results in this plan (scope: `packages/Gemini_Module, packages/Kimi_Module, packages/Claude_Module, packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify provider readiness repair`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/gemini-module` — PASS.
    - Result 2026-05-27: `node --test packages/Gemini_Module/dist/runtime/cli-bridge-provider-home.test.js packages/Gemini_Module/dist/session/gemini-session-bootstrapper.test.js` — PASS (4 tests).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/kimi-module` — PASS.
    - Result 2026-05-27: `node --test packages/Kimi_Module/dist/provider/kimi-managed-agent-profile.test.js` — PASS (2 tests).
    - Result 2026-05-27: `npm run test --workspace @codeai-hub/kimi-module` — PASS.
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-27: `node --test packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js` — PASS (1 test).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
14. [DONE] Git Commit: `test: verify provider readiness repair` (hash: 99e0e820c)

## Phase 7 — Release Build (owner: Codex, updated: 2026-05-27)
### Stream: Release Preparation And Packaging
15. [DONE] `provider-readiness.phase7.release-prep.task1` User explicitly confirmed release build on 2026-05-27; update README/CHANGELOG for future release v1.2.379 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare provider readiness release build`).
16. [DONE] Git Commit: `docs: prepare provider readiness release build` (hash: 01247fc99)
17. [DONE] `provider-readiness.phase7.release-build.task1` Run release build scripts using the committed future-version docs, collect generated VSIX/tarballs, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build provider readiness release`).
    - Result 2026-05-27: release build version bump/artifact generation — PASS for v1.2.379.
    - Generated tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.379.tar.bz2`, `codex-module-1.2.379.tar.bz2`, `gemini-module-1.2.379.tar.bz2`, `kimi-module-1.2.379.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.379.tar.bz2`, `vscode-webview-1.2.379.tar.bz2`, `project-manager-1.2.379.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.379.tar.bz2`.
    - Artifact SHA1 check: Gemini `470c30b4e817069773c241834b07f1448ce95bc3`; Kimi `cb14720bbe98d32b5df7c5f0eab088afff0c93bd`; Claude `e61515bb16cd0774c8a687e9189ac2d86609422f`; Core `5d34b631de4ff30213cf9a3785788b5c1766ee06`; Launcher `659ac26ea139aa6935974f2d9dd7b374b7987e35`.
18. [DONE] Git Commit: `chore: build provider readiness release` (hash: 7504787f4)
19. [DONE] `provider-readiness.phase7.vsix.task1` Run final VSIX packaging from the committed release version with `./scripts/build-release.sh --use-current-version`, verify SDK exclusions and package creation output, and record the VSIX path in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify provider readiness vsix package`).
    - Result 2026-05-27: `./scripts/build-release.sh --use-current-version` — PASS.
    - Verified release output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`.
    - VSIX: `codeai-hub-1.2.379.vsix` (4.3M), SHA1 `b1c7a32057a64f1dcff04ef4d8fbaf95a285ffa8`.
20. [DONE] Git Commit: `test: verify provider readiness vsix package` (hash: 1976475ee)

## Phase 8 — User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-27)
### Stream: Manual Provider Retest
21. [DONE] `provider-readiness.phase8.user-acceptance.task1` User installs the new release, restarts Core, opens the Description provider picker, verifies provider statuses, and retests Gemini first-turn startup plus Kimi/GLM readiness after credentials are available (scope: user workflow observation; expected commit: none). Result: Retest failed: captured GLM artifact/home, System/Reasoning translation, Gemini timeout/recovery, and cross-step provider startup blockers for implementation.

## Phase 8A — Retest Findings Fix Backlog (owner: Codex, updated: 2026-05-27)
### Stream: GLM Standalone Provider Artifact And Home
22. [DONE] `provider-readiness.phase8a.glm-artifact.task1` Retest finding 2026-05-27: installed release still has no GLM provider under `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/runtime/providers/`; diagnose and implement a standalone GLM provider runtime artifact/manifest even though GLM executes through the Claude-compatible client (scope: `scripts/build-all.sh, scripts/build-release.sh, scripts/build-glm-claude-code-module.sh, assets/providers/glm*/manifest.json, doc/TODO/todo-plan.md`; expected commit: `fix: package glm provider runtime artifact`).
23. [DONE] Git Commit: `fix: package glm provider runtime artifact` (hash: 70dcc39a5)
24. [DONE] `provider-readiness.phase8a.glm-home.task1` Ensure GLM gets its own provider home/runtime capsule distinct from original Claude home while preserving the Claude Agent SDK-compatible execution path and GLM-specific settings/API key source (scope: `packages/core/src/provider-registry, packages/core/src/workflow/runtime, packages/Claude_Module/src/glm-claude-code, doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md, doc/TODO/todo-plan.md`; expected commit: `fix: isolate glm provider workspace home`).
25. [DONE] Git Commit: `fix: isolate glm provider workspace home` (hash: bb53a2d2c)
26. [DONE] `provider-readiness.phase8a.glm-verify.task1` Add/adjust targeted checks proving the installed runtime exposes GLM as its own provider artifact, uses a separate GLM home, and still launches through the Claude-compatible runtime (scope: `packages/core, packages/Claude_Module, doc/TODO/todo-plan.md`; expected commit: `test: verify glm standalone provider runtime`).
    - Result 2026-05-27: `node -e` manifest check for `assets/providers/glm-claude-code/manifest.json` — PASS (`glm-claude-code-module-1.2.379.tar.bz2`, SHA1 `b38ed8e4582668d476f4d464cf9148b2b79793f9`).
    - Result 2026-05-27: `node -e` load check for `/Users/oleksandroliinyk/.codeai-hub/providers/glm-claude-code/1.2.379/dist/index.js` — PASS (`GlmClaudeCodeProviderAdapter` export present).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/workflow/runtime/workspace-runtime-capsule.test.js packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js` — PASS (6 tests).
27. [DONE] Git Commit: `test: verify glm standalone provider runtime` (hash: a3229cce7)

### Stream: System And Reasoning Translation Routing
28. [DONE] `provider-readiness.phase8a.translation-diagnose.task1` Retest finding 2026-05-27: System orchestrator messages in Project Manager appear to translate slowly through the UI/interface translation engine, while the latest System messages may remain untranslated; inspect message metadata/translation labels for System, Reasoning, and interface text to confirm the routing mismatch shown in the screenshot (scope: `src/client/project-manager, packages/core/src/session-translation, packages/localization, doc/TODO/todo-plan.md`; expected commit: `test: characterize system message translation routing`).
    - Diagnostic 2026-05-27: `packages/core/src/session-translation/session-translation-facade.ts` maps `role === "system"` to `messages_for_the_user`; `packages/core/src/session-translation/session-translation-policy-resolver.ts` then resolves that category through `loadUITranslationEngineId()`, while Reasoning uses `loadReasoningTranslationEngineId()`.
    - Diagnostic 2026-05-27: the screenshot's slow System translation matches this routing mismatch; System workflow/status/error cards are not using the same engine path as Reasoning.
29. [DONE] Git Commit: `test: characterize system message translation routing` (hash: 4a5d56865)
30. [DONE] `provider-readiness.phase8a.translation-system-tags.task1` Align System orchestrator message labels with the same translation category/engine path used for Reasoning, so System workflow/status/error messages do not use the interface/UI translation engine (scope: `packages/core/src/session-translation, src/client/project-manager/services, src/client/project-manager/components/sessions, doc/TODO/todo-plan.md`; expected commit: `fix: route system messages through reasoning translation`).
31. [DONE] Git Commit: `fix: route system messages through reasoning translation` (hash: 041e432e6)
32. [DONE] `provider-readiness.phase8a.translation-latest-system.task1` Fix the untranslated-tail case where the latest System messages are not passed through the session translation pipeline after workflow state updates/errors, including the dirty Git blocker message path from the screenshot (scope: `packages/core/src/remote-bridge/handlers, src/client/project-manager/services, src/client/project-manager/components/sessions, doc/TODO/todo-plan.md`; expected commit: `fix: translate latest system workflow messages`).
33. [DONE] Git Commit: `fix: translate latest system workflow messages` (hash: 8285b81c3)
34. [DONE] `provider-readiness.phase8a.translation-verify.task1` Add targeted verification that System and Reasoning messages carry equivalent translation labels/engine selection, last System messages are translated, and UI/interface labels still use the interface translation engine (scope: `packages/core, src/client/project-manager, packages/localization, doc/TODO/todo-plan.md`; expected commit: `test: verify system and reasoning translation routing`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js` — PASS (9 tests).
35. [DONE] Git Commit: `test: verify system and reasoning translation routing` (hash: dd6bb71f5)

### Stream: Gemini Session Creation Timeout
36. [DONE] `provider-readiness.phase8a.gemini-timeout-diagnose.task1` Retest finding 2026-05-27: Gemini is selectable for the Virtual Simulation step with model `Gemini 3.1 Pro`, but `Start Step` fails with `Session creation timed out`; inspect Gemini session creation timing, process readiness signals, auth bootstrap, and first-turn startup logs from the installed runtime path (scope: `packages/Gemini_Module/src/session, packages/Gemini_Module/src/runtime, packages/core/src/remote-bridge/handlers, packages/core/src/provider-registry, src/client/project-manager/services, doc/TODO/todo-plan.md`; expected commit: `test: characterize gemini session creation timeout`).
    - Diagnostic 2026-05-27: `src/client/project-manager/services/description-submit-service.ts` owns the visible `Session creation timed out.` error after its session-create watchdog expires.
    - Diagnostic 2026-05-27: `packages/core/src/remote-bridge/handlers/session-request-handler-session-bootstrap.ts` only creates an early shell for the Description stage. Virtual Simulation waits for `resolveProviderSessionId()` before broadcasting `session:created`, so a slow Gemini `adapter.createSession()` leaves the client without a Core session id or binding failure.
    - Diagnostic 2026-05-27: `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts` runs provider-home auth bootstrap, `config.refreshAuth()`, and `config.initialize()` without a Core-visible startup deadline or readiness failure classification.
37. [DONE] Git Commit: `test: characterize gemini session creation timeout` (hash: 6e46b8769)
38. [DONE] `provider-readiness.phase8a.gemini-startup.task1` Fix Gemini startup readiness so provider selection is not reported as usable until the workspace-home auth/bootstrap and CLI bridge are able to create a session within the expected lifecycle window, with a clear non-timeout error when auth or CLI readiness is missing (scope: `packages/core/src/remote-bridge/handlers, packages/Gemini_Module/src/session, packages/Gemini_Module/src/runtime, packages/core/src/provider-registry, doc/TODO/todo-plan.md`; expected commit: `fix: resolve gemini session creation timeout`).
39. [DONE] Git Commit: `fix: resolve gemini session creation timeout` (hash: 905f273ac)
40. [DONE] `provider-readiness.phase8a.gemini-ui-gating.task1` Ensure Project Manager disables or explains Gemini when Core readiness predicts session startup failure, so the user cannot reach a generic `Session creation timed out` after selecting an apparently available Gemini provider (scope: `packages/core/src/remote-bridge/handlers, src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/components/description, packages/core/src/provider-registry, doc/TODO/todo-plan.md`; expected commit: `fix: gate gemini provider on startup readiness`).
41. [DONE] Git Commit: `fix: gate gemini provider on startup readiness` (hash: efd13b6f2)
42. [DONE] `provider-readiness.phase8a.gemini-verify.task1` Add targeted checks for Gemini session startup success/failure projection and timeout-free UI error handling on the Virtual Simulation start path (scope: `packages/Gemini_Module, packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify gemini startup readiness gating`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/remote-bridge/handlers/session-provider-session-resolver.test.js packages/core/dist/remote-bridge/handlers/session-shell-factory.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-session-bootstrap.test.js` — PASS (5 tests).
43. [DONE] Git Commit: `test: verify gemini startup readiness gating` (hash: 69ff31e07)

### Stream: Failed Provider Startup Recovery
44. [DONE] `provider-readiness.phase8a.failed-startup-recovery-diagnose.task1` Retest finding 2026-05-27: after Gemini times out on the Virtual Simulation start path, Codex cannot be started either, even after Restart Core; diagnose leaked session/provider locks, pending workflow state, runtime process state, workspace capsule state, and client-side provider selection state after failed startup (scope: `packages/core/src/remote-bridge/handlers, packages/core/src/provider-registry, src/client/project-manager/services, doc/TODO/todo-plan.md`; expected commit: `test: characterize failed provider startup recovery`).
    - Diagnostic 2026-05-27: after the Gemini fixes, failed bootstrap enters `SessionProviderFailureRecovery`, but `applyClassifiedSessionCleanup()` only closes/marks failed sessions when a provider binding already exists.
    - Diagnostic 2026-05-27: failed provider creation has a Core shell session but no provider binding yet, so the existing cleanup path can leave the session/binding projection in a pending state and block a later Codex start in the same workflow step.
45. [DONE] Git Commit: `test: characterize failed provider startup recovery` (hash: 4a9243a4b)
46. [DONE] `provider-readiness.phase8a.failed-startup-cleanup.task1` Ensure failed provider session creation always releases workflow/session locks, cancels or kills partial provider startup processes, clears pending start markers, and returns the step to a state where another provider such as Codex can start without a full workspace reset (scope: `packages/core/src/remote-bridge/handlers, packages/core/src/session-continuity, packages/core/src/provider-registry, doc/TODO/todo-plan.md`; expected commit: `fix: recover after failed provider startup`).
47. [DONE] Git Commit: `fix: recover after failed provider startup` (hash: 98adf222f)
48. [DONE] `provider-readiness.phase8a.failed-startup-restart.task1` Verify Restart Core fully rebuilds provider registry/runtime capsules and does not preserve stale failed Gemini startup state that blocks Codex or other providers after restart (scope: `packages/core/src/workspace-runtime, packages/core/src/provider-registry, src/client/project-manager/services, doc/TODO/todo-plan.md`; expected commit: `fix: reset provider startup state on core restart`).
    - Disposition 2026-05-27: restart-specific stale provider state is not persisted in `ProviderRegistry`; a restarted Core creates a fresh registry/runtime capsule set.
    - Disposition 2026-05-27: the restart-visible blocker was the same pre-restart pending shell/session cleanup defect fixed in `fix: recover after failed provider startup`; after that fix there is no additional restart-state mutation required.
49. [DONE] Git Commit: `fix: reset provider startup state on core restart` (hash: e20782544)
50. [DONE] `provider-readiness.phase8a.failed-startup-verify.task1` Add targeted tests covering Gemini timeout/failure followed by successful Codex start in the same workflow step and after Restart Core (scope: `packages/core, src/client/project-manager, packages/Gemini_Module, doc/TODO/todo-plan.md`; expected commit: `test: verify provider startup failure recovery`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/remote-bridge/handlers/session-provider-session-resolver.test.js packages/core/dist/remote-bridge/handlers/session-shell-factory.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-session-bootstrap.test.js packages/core/dist/remote-bridge/handlers/session-provider-failure-recovery.test.js` — PASS (6 tests).
51. [DONE] Git Commit: `test: verify provider startup failure recovery` (hash: 7efdd8b7e)

### Stream: Cross-Step Provider Start After Kimi Description
52. [DONE] `provider-readiness.phase8a.cross-step-kimi-diagnose.task1` Retest finding 2026-05-27: after Kimi succeeds on the Description step, the Virtual Simulation step cannot start any provider; diagnose workflow stage transition state, accepted Description artifact state, provider/session cleanup after Kimi, and next-step provider start gating (scope: `packages/core/src/remote-bridge/handlers, packages/core/src/workflow, src/client/project-manager/services, doc/TODO/todo-plan.md`; expected commit: `test: characterize provider start block after kimi description`).
    - Diagnostic 2026-05-27: the screenshot's blocker text is emitted by `SessionRequestHandlerPreliminaryReviewCommitter` after `WorkflowStepCommitFacade.commitAcceptedStep()` throws.
    - Diagnostic 2026-05-27: `WorkflowStepCommitFacade` commits the workspace capsule and then checks raw `git status`; unlike `ensureManagedTerminalGitClean()`, it does not enforce `.codeai-hub/state/` ignore before the dirty check, so local timer state can leave `.codeai-hub/state/` untracked and block the next preliminary step.
53. [DONE] Git Commit: `test: characterize provider start block after kimi description` (hash: 7c7aafe45)
54. [DONE] `provider-readiness.phase8a.cross-step-kimi-cleanup.task1` Ensure successful Kimi completion on Description releases provider/session resources, clears step-local active provider markers, and persists only workflow-owned artifact acceptance state before entering Virtual Simulation (scope: `packages/core/src/workflow/boundary, packages/core/src/remote-bridge/handlers, packages/core/src/session-continuity, packages/Kimi_Module/src/provider, doc/TODO/todo-plan.md`; expected commit: `fix: clear kimi session state before next step`).
55. [DONE] Git Commit: `fix: clear kimi session state before next step` (hash: f6aa6490b)
56. [DONE] `provider-readiness.phase8a.cross-step-start-gate.task1` Fix Virtual Simulation provider start gating so a clean accepted Description result allows any available provider to start, and blockers identify the exact dirty workflow/provider state instead of generically preventing all providers (scope: `packages/core/src/workflow, packages/core/src/provider-registry, src/client/project-manager/components/sessions, doc/TODO/todo-plan.md`; expected commit: `fix: unblock providers after description acceptance`).
    - Disposition 2026-05-27: the start gate itself already depends on clean workflow/Git state; the blocker was the Description acceptance commit leaving `.codeai-hub/state/` visible as dirty local runtime state.
    - Disposition 2026-05-27: `fix: clear kimi session state before next step` moved the local runtime-state ignore enforcement into the preliminary acceptance commit path, so a clean accepted Description result now reaches Virtual Simulation without a provider-wide blocker.
57. [DONE] Git Commit: `fix: unblock providers after description acceptance` (hash: 0d79affe3)
58. [DONE] `provider-readiness.phase8a.cross-step-verify.task1` Add targeted workflow tests for Kimi Description success followed by Virtual Simulation startup with Codex, Claude, Gemini-readiness-gated, and Kimi, including Restart Core behavior (scope: `packages/core, packages/Kimi_Module, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify cross-step provider startup after kimi`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/kimi-module` — PASS.
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/remote-bridge/handlers/technical-stage-dirty-gate.test.js` — PASS (11 tests).
59. [DONE] Git Commit: `test: verify cross-step provider startup after kimi` (hash: 5d396e189)

## Phase 8b — Release Build (owner: Codex, updated: 2026-05-27)
### Stream: Release Packaging
60. [DONE] `provider-readiness.phase8b.release-prep.task1` Prepare release metadata for the approved provider readiness retest fixes by updating README/CHANGELOG to the next release version and recording release intent (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare provider readiness repair release`).
61. [DONE] Git Commit: `docs: prepare provider readiness repair release` (hash: 3343c99f7)
62. [DONE] `provider-readiness.phase8b.release-build.task1` Run the approved unified release build for the provider readiness fixes, including GLM standalone provider runtime artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, scripts/release-utils.sh, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build provider readiness repair release`).
    - Result 2026-05-27: `./scripts/build-all.sh` — PASS, produced unified release artifacts for `1.2.380`.
    - Result 2026-05-27: Verified `doc/tmp/releases/glm-claude-code-module-1.2.380.tar.bz2` is retained with the other provider tarballs.
63. [DONE] Git Commit: `chore: build provider readiness repair release` (hash: 43eba22dc)
64. [DONE] `provider-readiness.phase8b.release-package.task1` Run the approved VSIX packaging step for the current release version, verify SDK exclusions/package output, and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package provider readiness repair vsix`).
    - Result 2026-05-27: `./scripts/build-release.sh --use-current-version` — PASS.
    - Result 2026-05-27: Verified release output lines: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`.
    - Result 2026-05-27: VSIX ready at `codeai-hub-1.2.380.vsix` (4.3M).
65. [DONE] Git Commit: `chore: package provider readiness repair vsix` (hash: 33e593648)
66. [BLOCKED] `provider-readiness.phase8b.user-retest.task1` User installs the produced release and retests GLM provider artifact/home, Gemini startup, provider recovery after failed startup, System/Reasoning translation routing, and Kimi Description to Virtual Simulation handoff (scope: chat/process observation only; no commit required).
    - Finding 2026-05-27: GLM-Claude-Code runtime is packaged and loads, but availability remains `UNAVAILABLE` because no API key is present and the GLM settings card does not expose an editable API key/config input despite backend support for `providers.glmClaudeCode.apiKey`.

## Phase 8c — GLM Retest Fixes (owner: Codex, updated: 2026-05-27)
### Stream: GLM Settings Source
67. [DONE] `provider-readiness.phase8c.glm-settings-card.task1` Expose editable GLM-Claude-Code API key/config controls in the shared provider settings card without logging or rendering saved secrets as plain text (scope: `src/client/ui/src/components/settings/glm-claude-code-settings-card.tsx, src/client/ui/src/components/settings/settings-provider-tab-content.tsx`; expected commit: `fix: expose glm api key controls`).
68. [DONE] Git Commit: `fix: expose glm api key controls` (hash: 36a0d8d95)
69. [DONE] `provider-readiness.phase8c.glm-settings-persist.task1` Wire Project Manager GLM settings changes into persisted workspace settings so `providers.glmClaudeCode.apiKey` reaches the backend availability check after Save and Restart Core (scope: `src/client/project-manager/components/settings/use-project-manager-kimi-settings-handlers.ts, src/client/project-manager/components/settings/use-project-manager-settings-state.ts, doc/TODO/todo-plan.md`; expected commit: `fix: persist glm api key settings`).
70. [DONE] Git Commit: `fix: persist glm api key settings` (hash: a12c4fe78)
71. [DONE] `provider-readiness.phase8c.glm-settings-verify.task1` Add targeted tests/build verification for GLM settings persistence and availability key routing without logging secrets (scope: `src/client/ui/src/components/settings, packages/Claude_Module/src/glm-claude-code, doc/TODO/todo-plan.md`; expected commit: `test: verify glm api key settings`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
    - Result 2026-05-27: `node --test packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js` — PASS (2 tests).
72. [DONE] Git Commit: `test: verify glm api key settings` (hash: 2eba0d9e2)
73. [DONE] `provider-readiness.phase8c.release-prep.task1` Prepare release metadata for the GLM settings repair replacement release by updating README/CHANGELOG to the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare glm settings repair release`).
74. [DONE] Git Commit: `docs: prepare glm settings repair release` (hash: a215b6c3e)
75. [DONE] `provider-readiness.phase8c.release-rebuild.task1` Run the approved unified release build for the GLM settings repair replacement release (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build glm settings repair release`).
    - Result 2026-05-27: `./scripts/build-all.sh` — PASS, produced unified release artifacts for `1.2.381`.
76. [DONE] Git Commit: `chore: build glm settings repair release` (hash: 59524158a)
77. [DONE] `provider-readiness.phase8c.release-package.task1` Run VSIX packaging for the current GLM settings repair release version, verify SDK exclusions/package output, and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package glm settings repair vsix`).
    - Result 2026-05-27: `./scripts/build-release.sh --use-current-version` — PASS.
    - Result 2026-05-27: Verified release output lines: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`.
    - Result 2026-05-27: VSIX ready at `codeai-hub-1.2.381.vsix` (4.3M).
78. [DONE] Git Commit: `chore: package glm settings repair vsix` (hash: 874721a19)
79. [BLOCKED] `provider-readiness.phase8c.user-retest.task1` User installs the produced replacement release and retests GLM API key entry, GLM availability after Restart Core, and GLM provider startup (scope: chat/process observation only; no commit required).
    - Finding 2026-05-27: During broader retest, Gemini completed Virtual Simulation and Core allowed next-step transition, but Diagram Modules could not start because canonical `virtual-simulation.md` was missing; rerunning Virtual Simulation with Claude materialized the expected artifact and unblocked the next step.

## Phase 8d — Gemini Virtual Simulation Artifact Handoff (owner: Codex, updated: 2026-05-27)
### Stream: Canonical Artifact Acceptance
80. [DONE] `provider-readiness.phase8d.gemini-artifact-diagnose.task1` Characterize why Gemini Virtual Simulation can be accepted without canonical `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`, leaving the tree marker incomplete and Diagram Modules blocked (scope: `packages/core/src/workflow, packages/core/src/remote-bridge/handlers, src/client/project-manager/services, doc/TODO/todo-plan.md`; expected commit: `test: characterize gemini virtual simulation artifact handoff`).
    - Diagnostic 2026-05-27: `SessionRequestHandlerManagedWorkflowTurn.handleTurnCompleted()` emits the Virtual Simulation `managed-workflow-user-review` handoff unconditionally after provider turn completion; it does not check that `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md` exists before the user can accept the step.
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.js` — PASS (2 tests, including characterization of missing-artifact review handoff).
81. [DONE] Git Commit: `test: characterize gemini virtual simulation artifact handoff` (hash: 9c9516639)
82. [DONE] `provider-readiness.phase8d.gemini-artifact-fix.task1` Ensure Virtual Simulation acceptance and next-step readiness require or materialize the canonical artifact path for every provider, including Gemini, before Core reports the step ready for Diagram Modules (scope: `packages/core/src/workflow, packages/core/src/remote-bridge/handlers, doc/TODO/todo-plan.md`; expected commit: `fix: require virtual simulation artifact before next step`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.js` — PASS (2 tests).
83. [DONE] Git Commit: `fix: require virtual simulation artifact before next step` (hash: 851363173)
84. [DONE] `provider-readiness.phase8d.gemini-artifact-verify.task1` Verify Gemini/Claude Virtual Simulation handoff, tree marker status, and Diagram Modules start gating against missing/mislocated `virtual-simulation.md` (scope: `packages/core, src/client/project-manager/services, doc/TODO/todo-plan.md`; expected commit: `test: verify virtual simulation artifact handoff`).
    - Result 2026-05-27: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-27: `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-artifact-gate.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.js` — PASS (5 tests).
85. [DONE] Git Commit: `test: verify virtual simulation artifact handoff` (hash: c23ee6034)

### Stream: Session Wait Copy Classification
86. [DONE] `provider-readiness.phase8d.wait-copy-diagnose.task1` Retest finding 2026-05-27: normal Kimi work can show `Agent is resuming your session... Please wait.`; characterize how `connectionState=blocked`, `continuityLockActive`, and lock reasons are mapped to input placeholder copy (scope: `src/client/ui/src/session/input-panel-placeholders.ts, src/client/ui/src/session/session-view.tsx, src/client/ui/src/session/input-panel.test.tsx, doc/TODO/todo-plan.md`; expected commit: `test: characterize session wait copy classification`).
    - Diagnostic 2026-05-27: `resolveInputPlaceholder()` maps any `connectionState === "blocked"` to `Agent is resuming your session... Please wait.`, while Project Manager uses `blocked` for ordinary non-editable waits beyond context rollover/resume.
    - Result 2026-05-27: `npx tsx --test src/client/ui/src/session/input-panel.test.tsx` — PASS (13 tests).
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
87. [DONE] Git Commit: `test: characterize session wait copy classification` (hash: a3181e765)
88. [DONE] `provider-readiness.phase8d.wait-copy-fix.task1` Make `Agent is resuming your session... Please wait.` appear only for context continuity/resume reasons, while ordinary active/blocked provider work shows `Agent is working... Please wait.` (scope: `src/client/ui/src/session/input-panel.tsx, src/client/ui/src/session/session-view.tsx, src/client/ui/src/session/input-panel.test.tsx`; expected commit: `fix: separate session working and resume placeholders`).
    - Result 2026-05-27: `npx tsx --test src/client/ui/src/session/input-panel.test.tsx` — PASS (13 tests).
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
89. [DONE] Git Commit: `fix: separate session working and resume placeholders` (hash: 5dbfc4ffd)
90. [DONE] `provider-readiness.phase8d.wait-copy-verify.task1` Verify running, generic blocked, managed review, binding-pending, and resume-bootstrap input placeholder states so non-rollover waits cannot regress to resume copy (scope: `src/client/ui/src/session/input-panel.test.tsx, src/client/project-manager/components/sessions/session-stream.test.ts, src/client/project-manager/components/sessions/session-stream-rollover-pending.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify session wait placeholder states`).
    - Result 2026-05-27: `npx tsx --test src/client/ui/src/session/input-panel.test.tsx` — PASS (15 tests).
    - Result 2026-05-27: `npm run typecheck:webview` — PASS.
91. [DONE] Git Commit: `test: verify session wait placeholder states` (hash: adfe71cc0)

### Stream: Deferred Release Rebuild
92. [DONE] `provider-readiness.phase8d.release-prep.task1` User explicitly confirmed replacement release build on 2026-05-27; update README/CHANGELOG for future release v1.2.382 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare virtual simulation handoff repair release`).
    - Result 2026-05-27: README Current Release and CHANGELOG updated for future v1.2.382 before running release scripts.
93. [DONE] Git Commit: `docs: prepare virtual simulation handoff repair release` (hash: 6da68fb23)
94. [DONE] `provider-readiness.phase8d.release-build.task1` Run `./scripts/build-all.sh` for the Virtual Simulation artifact handoff and wait-copy fixes, collect generated tarballs, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build virtual simulation handoff repair release`).
    - Result 2026-05-27: `./scripts/build-all.sh` — PASS for v1.2.382.
    - Generated tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.382.tar.bz2`, `codex-module-1.2.382.tar.bz2`, `gemini-module-1.2.382.tar.bz2`, `kimi-module-1.2.382.tar.bz2`, `glm-claude-code-module-1.2.382.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.382.tar.bz2`, `vscode-webview-1.2.382.tar.bz2`, `project-manager-1.2.382.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.382.tar.bz2`.
95. [DONE] Git Commit: `chore: build virtual simulation handoff repair release` (hash: 0dc1758f9)
96. [DONE] `provider-readiness.phase8d.release-vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/package output, and record the replacement VSIX path in this plan (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `test: verify virtual simulation handoff repair vsix`).
    - Result 2026-05-27: `./scripts/build-release.sh --use-current-version` — PASS.
    - Verified release output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and VSIX runtime package surface verification.
    - VSIX: `codeai-hub-1.2.382.vsix` (4.3M), SHA1 `1f605cdd2181f9b75ddac6198f6c39da620f4199`.
97. [DONE] Git Commit: `test: verify virtual simulation handoff repair vsix` (hash: 6b8eee65c)
98. [BLOCKED] `provider-readiness.phase8d.user-retest.task1` User installs the produced replacement release and retests Gemini Virtual Simulation completion, tree marker status, Diagram Modules startup, and session wait copy behavior (scope: chat/process observation only; no commit required).
    - Finding 2026-05-28: Description acceptance can still leave the workspace blocked when legacy local runtime state is already tracked and modified as `M .codeai-hub/state/task-timers.json`; after that Virtual Simulation start does not create a provider session and the Project Manager surfaces a generic `Session creation timed out.` for every provider.
    - Finding 2026-05-28: The blocker Core message is still visible as untranslated English in the latest System card, and it should not appear for local timer state at all.

## Phase 8e — Description To Virtual Simulation Regression Repair (owner: Codex, updated: 2026-05-28)
### Stream: Tracked Local Runtime State Blocker
99. [DONE] `provider-readiness.phase8e.local-state-diagnose.task1` Characterize the retest regression where tracked local runtime state (`M .codeai-hub/state/task-timers.json`) survives Description acceptance, emits the dirty Core blocker, and makes Virtual Simulation start time out for every provider (scope: `packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: characterize tracked local runtime state blocker`).
    - Diagnostic 2026-05-28: The user's retest workspace has `.codeai-hub/state/task-timers.json` tracked in Git and modified, so adding `.codeai-hub/state/` to `.gitignore` is insufficient; the step acceptance path must also untrack already-indexed local runtime state before the clean-Git gate.
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-28: `node --test packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js` — PASS (5 tests).
100. [DONE] Git Commit: `test: characterize tracked local runtime state blocker` (hash: ab0e9024d)
101. [DONE] `provider-readiness.phase8e.local-state-fix.task1` Untrack and ignore legacy workspace-local `.codeai-hub/state/` runtime files before the clean-Git gate, including files that were already tracked, so Description acceptance leaves Git clean and Virtual Simulation can start normally (scope: `packages/core/src/workflow/boundary, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: untrack local runtime state before step commit`).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-28: `node --test packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-routing.test.js` — PASS (10 tests).
102. [DONE] Git Commit: `fix: untrack local runtime state before step commit` (hash: 8add47029)
103. [DONE] `provider-readiness.phase8e.timeout-error.task1` Ensure workflow step start reports the Core blocker/error directly instead of falling through to generic `Session creation timed out.` when Core rejects session creation before `session:created` (scope: `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: surface workflow session creation errors`).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-28: `node --test packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js` — PASS (4 tests).
104. [DONE] Git Commit: `fix: surface workflow session creation errors` (hash: 3cea22311)
105. [DONE] `provider-readiness.phase8e.translation-verify.task1` Verify that any remaining Core workflow blocker message is carried through the System/Reasoning translation route and that the tracked timer-state case no longer emits the blocker at all (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify workflow blocker translation and cleanup`).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-28: `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-routing.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js` — PASS (20 tests).
106. [DONE] Git Commit: `test: verify workflow blocker translation and cleanup` (hash: af9ee944f)

## Phase 8f — Release Build Gate (owner: Oleksandr, updated: 2026-05-28)
### Stream: Await Explicit Release Confirmation
107. [DONE] `provider-readiness.phase8f.release-confirmation.task1` Await explicit user confirmation before preparing metadata or building the next replacement release for the Description-to-Virtual-Simulation regression fixes (scope: chat/process observation only; expected commit: none).
    - Result 2026-05-28: User explicitly requested a new release build.
108. [DONE] `provider-readiness.phase8f.release-prep.task1` If the user confirms release build, update README/CHANGELOG for the next version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow blocker repair release`).
    - Result 2026-05-28: README Current Release and CHANGELOG updated for future v1.2.383 before running release scripts.
109. [DONE] Git Commit: `docs: prepare workflow blocker repair release` (hash: d8d7f4027)
110. [DONE] `provider-readiness.phase8f.release-build.task1` Run the approved unified release build for the workflow blocker/session-create repair (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build workflow blocker repair release`).
    - Result 2026-05-28: `./scripts/build-all.sh --allow-dirty` — PASS for v1.2.383. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-build transition.
    - Generated tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.383.tar.bz2`, `codex-module-1.2.383.tar.bz2`, `gemini-module-1.2.383.tar.bz2`, `kimi-module-1.2.383.tar.bz2`, `glm-claude-code-module-1.2.383.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.383.tar.bz2`, `vscode-webview-1.2.383.tar.bz2`, `project-manager-1.2.383.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.383.tar.bz2`.
111. [DONE] Git Commit: `chore: build workflow blocker repair release` (hash: 2a57345ad)
112. [DONE] `provider-readiness.phase8f.release-vsix.task1` Run the approved VSIX packaging step, verify SDK exclusions/package output, and record the replacement VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `test: verify workflow blocker repair vsix`).
    - Result 2026-05-28: `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-vsix transition.
    - Verified release output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and VSIX runtime package surface verification.
    - VSIX: `codeai-hub-1.2.383.vsix` (4.3M), SHA1 `fc7ab883fa33e58590f781a81a8dca915602a1f6`.
113. [DONE] Git Commit: `test: verify workflow blocker repair vsix` (hash: d267f1829)
114. [BLOCKED] `provider-readiness.phase8f.user-retest.task1` User installs the produced replacement release and retests Description acceptance, Virtual Simulation startup with multiple providers, and absence/translation of Core workflow blocker messages (scope: chat/process observation only; expected commit: none).
    - Finding 2026-05-28: GLM-Claude-Code is still shown as `UNAVAILABLE` in release v1.2.383 with `apiKeySource=missing`; continue in Phase 8g before any new release build.

## Phase 8g — GLM Availability Retest Repair (owner: Codex, updated: 2026-05-28)
### Stream: GLM Settings-To-Runtime Source
115. [DONE] `provider-readiness.phase8g.glm-availability-diagnose.task1` Characterize why GLM-Claude-Code remains unavailable after the settings-card/persistence repair by tracing masked credential presence across workspace settings, global config/env, provider descriptor env, and installed runtime probe path (scope: `packages/Claude_Module/src/glm-claude-code, packages/core/src/provider-registry, doc/TODO/todo-plan.md`; expected commit: `test: characterize glm availability after settings repair`).
    - Diagnostic 2026-05-28: Installed GLM runtime `~/.codeai-hub/providers/glm-claude-code/1.2.383/dist/index.js` exists and exports the GLM adapter/probe.
    - Diagnostic 2026-05-28: Workspace settings at `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/runtime/settings/settings.json` contain `providers.glmClaudeCode`, but the saved `apiKey` length is `0`.
    - Diagnostic 2026-05-28: `~/.codeai-hub/providers/glm-claude-code/config.json` does not exist, and `CODEAI_GLM_CLAUDE_CODE_API_KEY`, `GLM_CLAUDE_CODE_API_KEY`, `ZAI_API_KEY`, and `Z_AI_API_KEY` are not present in the current environment.
    - Diagnostic 2026-05-28: Installed runtime `1.2.383` resolves a synthetic `providers.glmClaudeCode.apiKey` from workspace settings as `apiKeySource=workspace_settings`, so the remaining retest failure is a missing/unclear credential source rather than a missing provider runtime artifact.
116. [DONE] Git Commit: `test: characterize glm availability after settings repair` (hash: 19bc0d871)
117. [DONE] `provider-readiness.phase8g.glm-availability-fix.task1` Fix the confirmed GLM availability source break so a saved workspace/global GLM key reaches Core readiness and provider startup without exposing the secret, and improve the unavailable message if no key is configured (scope: `packages/Claude_Module/src/glm-claude-code/glm-claude-code-sdk-auth-manager.ts, packages/core/src/provider-registry/provider-recovery-coordinator.ts, packages/core/src/provider-registry/provider-descriptor-factory.ts, doc/TODO/todo-plan.md`; expected commit: `fix: resolve glm availability after settings repair`).
    - Result 2026-05-28: GLM unavailable reason now says a separate Z.AI/GLM API key is required and Claude login is not reused.
    - Result 2026-05-28: Provider descriptor now labels GLM as requiring a separate Z.AI/GLM API key while still running through the Claude Agent SDK-compatible runtime.
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS after rerunning once the parallel Claude build had restored its `dist` package surface.
118. [DONE] Git Commit: `fix: resolve glm availability after settings repair` (hash: de9914465)
119. [DONE] `provider-readiness.phase8g.glm-availability-verify.task1` Verify masked GLM key routing, provider readiness projection, and settings persistence with targeted builds/tests; do not build a release in this stream (scope: `packages/Claude_Module, packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify glm availability repair`).
    - Result 2026-05-28: Masked runtime probe with empty env/settings reports `apiKeyAvailable=false`, `apiKeySource=missing`.
    - Result 2026-05-28: Masked runtime probe with synthetic workspace `providers.glmClaudeCode.apiKey` reports `apiKeyAvailable=true`, `apiKeySource=workspace_settings`, and sets the Anthropic-compatible auth env without printing the secret.
    - Result 2026-05-28: Source checks confirmed the GLM auth error, Core recovery hint, and provider descriptor all state that a separate Z.AI/GLM key is required and Claude login is not reused.
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS when run sequentially after Claude build; the earlier parallel attempt hit a transient workspace `dist` race.
    - Result 2026-05-28: `node --test packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js` — PASS (2 tests).
120. [DONE] Git Commit: `test: verify glm availability repair` (hash: 90afb6d82)
121. [BLOCKED] `provider-readiness.phase8g.user-retest-handoff.task1` Wait for the user's continuing retest notes and explicit release confirmation; no release build is allowed from this phase without a separate user command (scope: chat/process observation only; expected commit: none).
    - Finding 2026-05-28: When Application Skeleton starts with Kimi, the left marker becomes red instead of the expected in-progress/yellow marker; continue in Phase 8h before any release build.

## Phase 8h — Active Stage Marker Retest Repair (owner: Codex, updated: 2026-05-28)
### Stream: Documentation Tree Progress Marker
122. [DONE] `provider-readiness.phase8h.stage-marker-diagnose.task1` Characterize why Application Skeleton renders as blocked/red while the stage is already running, including the interaction between workflow stage status and stale blocked gating (scope: `src/client/project-manager/components/layout/workspace-tree-model.test.ts, src/client/project-manager/components/layout/workspace-tree-model.ts, doc/TODO/todo-plan.md`; expected commit: `test: characterize active stage marker color`).
    - Diagnostic 2026-05-28: `resolveTreeStatus("in_progress", true)` currently returns `blocked`, so a running Application Skeleton stage can render the red marker when the dependency `blocked` flag has not cleared yet.
    - Result 2026-05-28: `npx tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts` — PASS (3 tests).
123. [DONE] Git Commit: `test: characterize active stage marker color` (hash: 245b47405)
124. [DONE] `provider-readiness.phase8h.stage-marker-fix.task1` Make an active `in_progress` workflow stage render as progress/yellow even if a stale dependency `blocked` flag is still present, without changing invalid/completed blocked semantics (scope: `src/client/project-manager/components/layout/workspace-tree-model.ts, src/client/project-manager/components/layout/workspace-tree-model.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: render active workflow stage marker as progress`).
    - Result 2026-05-28: `resolveTreeStatus("in_progress", true)` now returns `progress`; invalid remains `blocked`, and completed-with-blocker remains `blocked`.
    - Result 2026-05-28: `npx tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts` — PASS (3 tests).
    - Result 2026-05-28: `npm run typecheck:webview` — PASS.
125. [DONE] Git Commit: `fix: render active workflow stage marker as progress` (hash: 8f1414257)
126. [DONE] `provider-readiness.phase8h.stage-marker-verify.task1` Verify workflow tree marker status mapping and Project Manager typecheck; do not build a release in this stream (scope: `src/client/project-manager/components/layout, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify active stage marker repair`).
    - Result 2026-05-28: `npx tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts` — PASS (3 tests).
    - Result 2026-05-28: `npm run typecheck:webview` — PASS.
127. [DONE] Git Commit: `test: verify active stage marker repair` (hash: a9d1f2e77)
128. [BLOCKED] `provider-readiness.phase8h.user-retest-handoff.task1` Wait for the user's continuing retest notes and explicit release confirmation; no release build is allowed from this phase without a separate user command (scope: chat/process observation only; expected commit: none).
    - Finding 2026-05-28: Application Skeleton with Kimi repeatedly fails to create the managed artifacts because `.codeai-hub/<workspaceSlug>/application_skeleton/` is missing; Core records English `managed-workflow-validation` repair prompts in the user-visible session log instead of translating or summarizing them. Continue in Phase 8i before any release build.

## Phase 8i — Application Skeleton Managed Repair Retest (owner: Codex, updated: 2026-05-28)
### Stream: Managed Repair Prompt And Artifact Directory
129. [DONE] `provider-readiness.phase8i.app-skeleton-diagnose.task1` Characterize why Kimi Application Skeleton repair loops on missing artifact parent directories and why Core `managed-workflow-validation` messages are persisted in English instead of translated/user-facing text (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, doc/TODO/todo-plan.md`; expected commit: `test: characterize application skeleton repair loop`).
    - Diagnostic 2026-05-28: The Kimi unified session contains three Core `system` messages tagged `managed-workflow-validation`; each stores the full English Application Skeleton repair prompt in the user-visible JSONL stream while the same text is sent as the provider internal repair instruction.
    - Diagnostic 2026-05-28: Kimi correctly identified the target artifacts, but `WriteFile` failed because `.codeai-hub/codeai-hub-codex-5-4/application_skeleton/` did not exist; Core validation then treated the missing files as generic artifact repair instead of preparing the Core-owned workflow artifact directory.
    - Result 2026-05-28: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts` — PASS (3 tests, including the current raw-prompt/missing-directory characterization).
130. [DONE] Git Commit: `test: characterize application skeleton repair loop` (hash: 9b0f74f95)
131. [DONE] `provider-readiness.phase8i.app-skeleton-directory.task1` Ensure Core prepares managed Application Skeleton artifact directories before dispatching or repairing the provider turn, so WriteFile-capable agents do not fail on missing parent directories (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts, packages/core/src/workflow/runtime/workflow-runtime.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: prepare application skeleton artifact directory`).
    - Result 2026-05-28: `WorkflowRuntime.connectWorkspace()` now prepares canonical workflow stage roots, including `.codeai-hub/<workspaceSlug>/application_skeleton/`, before any provider prompt can ask an agent to write Application Skeleton artifacts.
    - Result 2026-05-28: `npx tsx --test packages/core/src/workflow/runtime/workflow-runtime.test.ts` — PASS (9 tests).
    - Result 2026-05-28: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts` — PASS (3 tests).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
132. [DONE] Git Commit: `fix: prepare application skeleton artifact directory` (hash: 97a7283cd)
133. [DONE] `provider-readiness.phase8i.validation-message.task1` Split provider-internal repair prompts from user-visible Core System messages so managed validation cards are concise, Russian/translation-routed, and do not display raw English repair instructions while the agent still receives the full internal prompt (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: localize managed validation system messages`).
    - Result 2026-05-28: Application Skeleton repair handling now writes a concise Russian Core System card and sends the full English provider repair prompt only through `sendInternalMessage()`.
    - Result 2026-05-28: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts` — PASS (3 tests).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
134. [DONE] Git Commit: `fix: localize managed validation system messages` (hash: 13216e16e)
135. [DONE] `provider-readiness.phase8i.app-skeleton-verify.task1` Verify Application Skeleton managed repair, artifact directory preparation, and user-visible validation message routing; do not build a release in this stream (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify application skeleton managed repair`).
    - Result 2026-05-28: `npx tsx --test packages/core/src/workflow/runtime/workflow-runtime.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts` — PASS (17 tests).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-28: No release build was started; Phase 8i remains in user retest handoff after this verification.
136. [DONE] Git Commit: `test: verify application skeleton managed repair` (hash: 03aa0dde2)
137. [DONE] `provider-readiness.phase8i.user-retest-handoff.task1` Wait for the user's continuing retest notes and explicit release confirmation; no release build is allowed from this phase without a separate user command (scope: chat/process observation only; expected commit: none).
    - Result 2026-05-28: User explicitly requested that all current fixes be included and a new release be built.

## Phase 8j — Release Build (owner: Codex, updated: 2026-05-28)
### Stream: Application Skeleton Repair Release
138. [DONE] `provider-readiness.phase8j.release-prep.task1` User explicitly confirmed release build on 2026-05-28; update README/CHANGELOG for future release v1.2.384 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton repair release`).
    - Result 2026-05-28: README Current Release and CHANGELOG updated for future v1.2.384 before running release scripts.
139. [DONE] Git Commit: `docs: prepare application skeleton repair release` (hash: 7679d28ed)
140. [DONE] `provider-readiness.phase8j.release-build.task1` Run the approved unified release build for the Application Skeleton managed repair fixes, collect generated tarballs, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build application skeleton repair release`).
    - Result 2026-05-28: `./scripts/build-all.sh --allow-dirty` — PASS for v1.2.384. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-build transition.
    - Generated tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.384.tar.bz2`, `codex-module-1.2.384.tar.bz2`, `gemini-module-1.2.384.tar.bz2`, `glm-claude-code-module-1.2.384.tar.bz2`, `kimi-module-1.2.384.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.384.tar.bz2`, `vscode-webview-1.2.384.tar.bz2`, `project-manager-1.2.384.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.384.tar.bz2`.
141. [DONE] Git Commit: `chore: build application skeleton repair release` (hash: cd262baac)
142. [DONE] `provider-readiness.phase8j.release-vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/package output, and record the replacement VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `test: verify application skeleton repair vsix`).
    - Result 2026-05-28: `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-vsix transition.
    - Verified release output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and `✅ VSIX runtime package surface verified`.
    - VSIX: `codeai-hub-1.2.384.vsix` (4.3M), SHA1 `176a2c6b92b4f49868ca332a9d5400f912f8d052`.
143. [DONE] Git Commit: `test: verify application skeleton repair vsix` (hash: 7ba79bc2f)
144. [BLOCKED] `provider-readiness.phase8j.user-retest.task1` User installs the produced replacement release and retests Application Skeleton with Kimi, managed System message language, and artifact handoff (scope: chat/process observation only; expected commit: none).
    - Finding 2026-05-28: GLM-Claude-Code remains `UNAVAILABLE` in v1.2.384. Live runtime inspection shows the workspace GLM settings `apiKey` is empty and no GLM env/global config key is present, while the running Core stack loads GLM through the Claude module path instead of the standalone `glm-claude-code` provider runtime. Continue in Phase 8k without building a release.

## Phase 8k — GLM Live Runtime Retest Fixes (owner: Codex, updated: 2026-05-28)
### Stream: Standalone GLM Runtime Loading
145. [DONE] `provider-readiness.phase8k.glm-live-diagnose.task1` Characterize the v1.2.384 live GLM failure from the installed Project Manager/Core runtime, including workspace key presence, standalone provider artifact presence, and whether Core loads GLM from the standalone provider runtime or the Claude module fallback (scope: `packages/core/src/provider-registry, packages/Claude_Module/src/glm-claude-code, doc/TODO/todo-plan.md`; expected commit: `test: characterize glm live runtime loading`).
    - Diagnostic 2026-05-28: Installed Project Manager/Core is running v1.2.384 from `/Users/oleksandroliinyk/.codeai-hub/core/darwin-arm64/1.2.384`.
    - Diagnostic 2026-05-28: Workspace settings at `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/runtime/settings/settings.json` contain `providers.glmClaudeCode.apiKey` with length `0`; `~/.codeai-hub/providers/glm-claude-code/config.json` is absent; GLM env keys are absent in the shell and running Core process.
    - Diagnostic 2026-05-28: Installed standalone GLM runtime exists at `/Users/oleksandroliinyk/.codeai-hub/providers/glm-claude-code/1.2.384/dist/index.js` and a synthetic workspace key resolves to `apiKeySource=workspace_settings`.
    - Diagnostic 2026-05-28: Live Core log stack still loads GLM classes from `/Users/oleksandroliinyk/.codeai-hub/providers/claude/1.2.384/dist/glm-claude-code/...`, proving Core does not prefer the standalone GLM provider runtime even when it is installed.
146. [DONE] Git Commit: `test: characterize glm live runtime loading` (hash: afd449de6)
147. [DONE] `provider-readiness.phase8k.glm-standalone-loader.task1` Make Core resolve and load `~/.codeai-hub/providers/glm-claude-code/<version>` as the GLM adapter source before any Claude-module fallback, while preserving the Claude Agent SDK-compatible execution path and GLM-specific home/settings (scope: `packages/core/src/provider-registry/provider-installed-path-resolver.ts, packages/core/src/provider-registry/index.ts, doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md`; expected commit: `fix: load glm standalone provider runtime`).
    - Result 2026-05-28: Core now resolves GLM with `resolveGlmClaudeCodeModulePath()` instead of reusing `resolveClaudeModulePath()`, so an installed standalone GLM provider runtime is selected independently from the original Claude provider package.
148. [DONE] Git Commit: `fix: load glm standalone provider runtime` (hash: 839b56006)
149. [DONE] `provider-readiness.phase8k.glm-live-verify.task1` Verify GLM standalone runtime loading and readiness diagnostics with installed v1.2.384 artifacts plus targeted core/module tests; do not run release build scripts (scope: `packages/core, packages/Claude_Module, doc/TODO/todo-plan.md`; expected commit: `test: verify glm standalone runtime loading`).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-28: `node --test packages/core/dist/provider-registry/provider-installed-path-resolver.test.js` — PASS (1 test).
    - Result 2026-05-28: Core loader smoke test resolved GLM module path to `/Users/oleksandroliinyk/.codeai-hub/providers/glm-claude-code/1.2.384`, loaded a function constructor, and confirmed the override path came from `/providers/glm-claude-code/`.
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-28: `node --test packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js` — PASS (2 tests).
    - Result 2026-05-28: Installed v1.2.384 runtime probe with actual workspace settings reports `apiKeyAvailable=false`, `apiKeySource=missing`; the same probe with a synthetic workspace key reports `apiKeyAvailable=true`, `apiKeySource=workspace_settings`, `ANTHROPIC_API_KEY=true`, and `ANTHROPIC_AUTH_TOKEN=true`.
    - Release build intentionally not run for this retest fix stream.
150. [DONE] Git Commit: `test: verify glm standalone runtime loading` (hash: 56c8638f6)
151. [BLOCKED] `provider-readiness.phase8k.user-retest.task1` User continues testing the current work-in-progress fixes without a new release build; collect any further feedback before release packaging is requested (scope: chat/process observation only; expected commit: none).
    - Finding 2026-05-28: Kimi visible `Thinking` bubbles in `kimicode-3ef41b7d-adec-47da-bb35-6e279a6d79eb-virtual-simulation.jsonl` are persisted/displayed in English at the beginning of the turn. Core logs show each Kimi `thinking` message enters the session translation pipeline, but translation is skipped with `skipReason=missing_target_language` and `targetLanguage=null`, while the runtime prompt for the same session correctly uses `Chat language code: ru`.

## Phase 8l — Kimi Reasoning Translation Retest Repair (owner: Codex, updated: 2026-05-28)
### Stream: Session Translation Settings Path
152. [DONE] `provider-readiness.phase8l.kimi-reasoning-diagnose.task1` Characterize why Kimi visible `Thinking`/reasoning bubbles use the fallback translation settings path instead of the workflow session settings path, causing Core to resolve the target language as `en` and skip translation (scope: `packages/core/src/session-translation, packages/core/src/remote-bridge/handlers, doc/TODO/todo-plan.md`; expected commit: `test: characterize kimi reasoning translation settings path`).
    - Diagnostic 2026-05-28: Live Core log for `kimicode-3ef41b7d-adec-47da-bb35-6e279a6d79eb-virtual-simulation` shows Kimi `thinking` messages enter the translation pipeline and are accepted by the dispatcher, then skip with `skipReason=missing_target_language`, `targetLanguage=null`, and fallback `engineId=google-gtx`.
    - Diagnostic 2026-05-28: The same workspace settings file contains `general.localization.categories.reasoning=ru` and `reasoningEngineId=apple-native`, and the provider prompt correctly included `Chat language code: ru`, proving the prompt path and translation path read different settings.
    - Diagnostic 2026-05-28: `SessionRequestHandlerRuntimeCore` constructs `SessionTranslationFacade` with only `defaultSettingsPath`; `SessionRequestHandlerEventMessages` does not pass `session.modelBinding.settingsPath` to thinking visibility or `translateDialogMessage()`.
    - Result 2026-05-28: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts` — PASS (6 tests, including the current missing settings-path characterization).
153. [DONE] Git Commit: `test: characterize kimi reasoning translation settings path` (hash: b6fa87a82)
154. [DONE] `provider-readiness.phase8l.kimi-reasoning-fix.task1` Route session translation policy and thinking-visibility decisions through the active session's `modelBinding.settingsPath` when available, so Kimi `thinking` uses the same Reasoning language/engine as the workflow prompt (scope: `packages/core/src/session-translation/session-translation-facade.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: use session settings for reasoning translation`).
    - Result 2026-05-28: `SessionRequestHandlerEventMessages` now passes `session.modelBinding.settingsPath` into thinking visibility checks and translation candidates when available.
    - Result 2026-05-28: `SessionTranslationFacade` now resolves reasoning target language/engine from the candidate settings path before falling back to the default settings path.
    - Result 2026-05-28: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts` — PASS (6 tests).
155. [DONE] Git Commit: `fix: use session settings for reasoning translation` (hash: eb6bf3cc9)
156. [DONE] `provider-readiness.phase8l.kimi-reasoning-verify.task1` Verify Kimi `thinking`, Core system messages, and fallback/default sessions choose the correct translation target and still preserve hidden-thinking behavior; do not build a release in this stream (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify kimi reasoning translation settings`).
    - Result 2026-05-28: `npx tsx --test packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-policy-resolver.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts` — PASS (17 tests).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS after tightening the Kimi settings-path assertion so TypeScript build and source tests agree.
    - Result 2026-05-28: `node --test packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-policy-resolver.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js` — PASS (17 tests).
    - Release build intentionally not run for this retest fix stream.
157. [DONE] Git Commit: `test: verify kimi reasoning translation settings` (hash: f3571e80c)
158. [DONE] `provider-readiness.phase8l.user-retest-handoff.task1` Wait for the user's continuing retest notes and explicit release confirmation; no release build is allowed from this phase without a separate user command (scope: chat/process observation only; expected commit: none).
    - Result 2026-05-28: User explicitly requested a new release build after the GLM standalone loader and Kimi reasoning translation fixes.

## Phase 8m — Release Build (owner: Codex, updated: 2026-05-28)
### Stream: GLM Loader And Kimi Reasoning Release
159. [DONE] `provider-readiness.phase8m.release-prep.task1` User explicitly confirmed release build on 2026-05-28; update README/CHANGELOG for future release v1.2.385 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi reasoning repair release`).
    - Result 2026-05-28: README Current Release and CHANGELOG updated for future v1.2.385 before running release scripts.
160. [DONE] Git Commit: `docs: prepare kimi reasoning repair release` (hash: 6803716fc)
161. [DONE] `provider-readiness.phase8m.release-build.task1` Run the approved unified release build for the GLM standalone loader and Kimi reasoning translation fixes, collect generated tarballs, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build kimi reasoning repair release`).
    - Result 2026-05-28: `./scripts/build-all.sh --allow-dirty` — PASS for v1.2.385. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-build transition.
    - Generated tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.385.tar.bz2`, `codex-module-1.2.385.tar.bz2`, `gemini-module-1.2.385.tar.bz2`, `glm-claude-code-module-1.2.385.tar.bz2`, `kimi-module-1.2.385.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.385.tar.bz2`, `vscode-webview-1.2.385.tar.bz2`, `project-manager-1.2.385.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.385.tar.bz2`.
162. [DONE] Git Commit: `chore: build kimi reasoning repair release` (hash: 1f3238aa0)
163. [DONE] `provider-readiness.phase8m.release-vsix.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/package output, and record the replacement VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `test: verify kimi reasoning repair vsix`).
    - Result 2026-05-28: `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-vsix transition.
    - Verified release output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and `✅ VSIX runtime package surface verified`.
    - VSIX: `codeai-hub-1.2.385.vsix` (4.3M), SHA1 `6fef47fcbbf684feebfb5a9c8b60f93a281cc22b`.
164. [DONE] Git Commit: `test: verify kimi reasoning repair vsix` (hash: aaf0a3f08)
165. [DONE] `provider-readiness.phase8m.user-retest.task1` User installs the replacement release and retests GLM standalone runtime loading plus Kimi reasoning/System translation (scope: chat/process observation only; expected commit: none).
    - Finding 2026-05-28: v1.2.385 loads GLM from the standalone runtime, but GLM remains unavailable because the global config file `~/.codeai-hub/providers/glm-claude-code/config.json` is not created automatically and the provider picker does not show a concrete edit path/API-key field instruction. Continue in Phase 8n without building a release.

## Phase 8n — GLM Global Config Retest Repair (owner: Codex, updated: 2026-05-28)
### Stream: Config Template And Recovery Copy
169. [DONE] `provider-readiness.phase8n.glm-config-bootstrap.task1` Create the global GLM-Claude-Code config template automatically during install/runtime bootstrap without overwriting user secrets, and verify missing-template creation plus preserved existing config behavior (scope: `packages/Claude_Module/src/auth/glm-claude-code-auth-profile.ts, packages/Claude_Module/src/auth/glm-claude-code-auth-profile.test.ts, scripts/build-glm-claude-code-module.sh`; expected commit: `fix: bootstrap glm global config template`).
    - Result 2026-05-28: runtime auth resolution now creates `~/.codeai-hub/providers/glm-claude-code/config.json` with only `{ "apiKey": "" }` when the file is missing.
    - Result 2026-05-28: install script creates the same template next to GLM runtime versions and preserves any existing config file.
    - Result 2026-05-28: `npx tsx --test packages/Claude_Module/src/auth/glm-claude-code-auth-profile.test.ts packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.test.ts` — PASS (5 tests).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-28: `node --test packages/Claude_Module/dist/auth/glm-claude-code-auth-profile.test.js packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js` — PASS (5 tests).
170. [DONE] Git Commit: `fix: bootstrap glm global config template` (hash: b9ebd149b)
171. [DONE] `provider-readiness.phase8n.glm-card-copy.task1` Update GLM provider recovery text/card copy so the user sees the exact config path and JSON field where the Z.AI/GLM API key must be pasted (scope: `packages/core/src/provider-registry/provider-recovery-coordinator.ts, packages/core/src/provider-registry/provider-recovery-coordinator.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: show exact glm api key instructions`).
    - Result 2026-05-28: GLM recovery message now says Claude login is not reused, points to `~/.codeai-hub/providers/glm-claude-code/config.json`, and names JSON field `"apiKey"` with an example.
    - Result 2026-05-28: `npx tsx --test packages/core/src/provider-registry/provider-recovery-coordinator.test.ts` — PASS (1 test).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Result 2026-05-28: `node --test packages/core/dist/provider-registry/provider-recovery-coordinator.test.js` — PASS (1 test).
172. [DONE] Git Commit: `fix: show exact glm api key instructions` (hash: adef33ef0)
173. [DONE] `provider-readiness.phase8n.glm-config-verify.task1` Verify GLM config bootstrap, recovery-card copy, Claude module build, and Core build; do not build a release until explicitly requested (scope: `packages/Claude_Module, packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify glm config bootstrap`).
    - Result 2026-05-28: live config exists at `/Users/oleksandroliinyk/.codeai-hub/providers/glm-claude-code/config.json` with only the `apiKey` field and empty value for the user to fill.
    - Result 2026-05-28: `npx tsx --test packages/Claude_Module/src/auth/glm-claude-code-auth-profile.test.ts packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.test.ts packages/core/src/provider-registry/provider-recovery-coordinator.test.ts` — PASS (6 tests).
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/claude-module` — PASS.
    - Result 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS after rerunning sequentially once the Claude module build had restored its `dist` outputs.
    - Result 2026-05-28: `node --test packages/Claude_Module/dist/auth/glm-claude-code-auth-profile.test.js packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js packages/core/dist/provider-registry/provider-recovery-coordinator.test.js` — PASS (6 tests).
174. [DONE] Git Commit: `test: verify glm config bootstrap` (hash: 6820c1068)
175. [TODO] `provider-readiness.phase8n.user-retest.task1` User installs the eventual replacement release and retests that GLM card points to the generated global config file and that GLM becomes available after the user fills `apiKey` and restarts Core (scope: chat/process observation only; expected commit: none).

## Phase 8o — GLM Config Bootstrap Release Build (owner: Codex, updated: 2026-05-28)
### Stream: Release Packaging
179. [DONE] `provider-readiness.phase8o.release-prep.task1` User explicitly confirmed release build on 2026-05-28; update README/CHANGELOG for future release v1.2.386 and record release intent before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare glm config bootstrap release`).
    - Result 2026-05-28: README Current Release and CHANGELOG updated for future v1.2.386 before running release scripts.
180. [DONE] Git Commit: `docs: prepare glm config bootstrap release` (hash: 68247aceb)
181. [DONE] `provider-readiness.phase8o.release-build.task1` Run the approved unified release build for the GLM config bootstrap and recovery-card copy fixes, collect generated tarballs, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build glm config bootstrap release`).
    - Result 2026-05-28: `./scripts/build-all.sh --allow-dirty` — PASS for v1.2.386. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-build transition.
    - Result 2026-05-28: GLM install step created `/Users/oleksandroliinyk/.codeai-hub/providers/glm-claude-code/config.json` with only the `apiKey` field and an empty value.
    - Generated tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.386.tar.bz2`, `codex-module-1.2.386.tar.bz2`, `gemini-module-1.2.386.tar.bz2`, `glm-claude-code-module-1.2.386.tar.bz2`, `kimi-module-1.2.386.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.386.tar.bz2`, `vscode-webview-1.2.386.tar.bz2`, `project-manager-1.2.386.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.386.tar.bz2`.
    - Artifact SHA1 check: GLM `9390cc07c85345b5a766020f1c5287971c284aa9`; Core `025ab1ab5627f267211c57acaa40bd2023f552cd`; Launcher `b40c5a397b10e3e2a70269aab4cf4d5016ae4fd0`; Claude `65e457582fd741e6c8b72000798017008a3511e7`; Codex `b6ec4fc9852995f088b88b36478ffbad18432b05`; Gemini `4cd5d1d32f968ac878601ecfbcff1f8495002483`; Kimi `b45451d24b076c6f088806a03827a7ba09826856`.
182. [DONE] Git Commit: `chore: build glm config bootstrap release` (hash: 3d1bd8874)
183. [DONE] `provider-readiness.phase8o.release-vsix.task1` Run final VSIX packaging for the current release version, verify SDK exclusions/package output, and record the replacement VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `test: verify glm config bootstrap vsix`).
    - Result 2026-05-28: `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the machine-managed post-commit `doc/TODO/todo-plan.md` release-vsix transition.
    - Result 2026-05-28: Verified release output lines: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and `✅ VSIX runtime package surface verified`.
    - Result 2026-05-28: VSIX ready at `codeai-hub-1.2.386.vsix` (4.3M), SHA1 `f776a2ab411c6ccd9a8625f1f46e794cded13987`.
    - Result 2026-05-28: live GLM config remains `/Users/oleksandroliinyk/.codeai-hub/providers/glm-claude-code/config.json` with only empty `apiKey` for the user to fill.
184. [PENDING] Git Commit: `test: verify glm config bootstrap vsix` (hash: TBD)
185. [TODO] `provider-readiness.phase8o.user-retest.task1` User installs the replacement release and retests that GLM card points to the generated global config file and that GLM becomes available after the user fills `apiKey` and restarts Core (scope: chat/process observation only; expected commit: none).

## Phase 9 — Scope Closeout (owner: Codex, updated: 2026-05-27)
### Stream: Closeout After Acceptance
186. [TODO] `provider-readiness.phase9.closeout.task1` After explicit user acceptance only, sync stable outcomes into provider/module SSOT docs as needed, update Docs Index, archive the planning source and active todo plan, and leave terminal NONE state (scope: `doc/SolidWorks-WorkFlow/Modules/Gemini.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Archive/, doc/TODO/todo-plan.md, doc/TODO/Archive/`; expected commit: `docs: close provider readiness repair scope`).
187. [TODO] Git Commit: `docs: close provider readiness repair scope` (hash: TBD)
188. [TODO] `provider-readiness.phase9.post-closeout.anchor` Reserved post-closeout handoff anchor; no implementation work belongs here (scope: `doc/TODO/todo-plan.md`; expected commit: none).
