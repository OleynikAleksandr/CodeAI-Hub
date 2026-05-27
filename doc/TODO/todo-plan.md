# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "provider-workspace-home-readiness-repair-2026-05-27",
  "branch": "main",
  "baseHead": "82b4a5113",
  "lastRecordedCommit": "a215b6c3e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md",
  "currentTaskId": "provider-readiness.phase8c.release-rebuild.task1",
  "expectedCommitMessage": "chore: build glm settings repair release",
  "debt": {
    "expectedCommitMessage": "chore: build glm settings repair release",
    "preCommitHead": "a215b6c3e",
    "stage": "commit_pending",
    "taskId": "provider-readiness.phase8c.release-rebuild.task1"
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
76. [PENDING] Git Commit: `chore: build glm settings repair release` (hash: TBD)
77. [TODO] `provider-readiness.phase8c.release-package.task1` Run VSIX packaging for the current GLM settings repair release version, verify SDK exclusions/package output, and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package glm settings repair vsix`).
78. [TODO] Git Commit: `chore: package glm settings repair vsix` (hash: TBD)
79. [TODO] `provider-readiness.phase8c.user-retest.task1` User installs the produced replacement release and retests GLM API key entry, GLM availability after Restart Core, and GLM provider startup (scope: chat/process observation only; no commit required).

## Phase 9 — Scope Closeout (owner: Codex, updated: 2026-05-27)
### Stream: Closeout After Acceptance
80. [TODO] `provider-readiness.phase9.closeout.task1` After explicit user acceptance only, sync stable outcomes into provider/module SSOT docs as needed, update Docs Index, archive the planning source and active todo plan, and leave terminal NONE state (scope: `doc/SolidWorks-WorkFlow/Modules/Gemini.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Archive/, doc/TODO/todo-plan.md, doc/TODO/Archive/`; expected commit: `docs: close provider readiness repair scope`).
81. [TODO] Git Commit: `docs: close provider readiness repair scope` (hash: TBD)
82. [TODO] `provider-readiness.phase9.post-closeout.anchor` Reserved post-closeout handoff anchor; no implementation work belongs here (scope: `doc/TODO/todo-plan.md`; expected commit: none).
