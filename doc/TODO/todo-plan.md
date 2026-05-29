# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-lmstudio-module-2026-05-28",
  "branch": "main",
  "baseHead": "f4bc0e6a1",
  "lastRecordedCommit": "9cd55b4c7",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md",
  "currentTaskId": "local-models.phase11.lmstudio-stderr.task1",
  "expectedCommitMessage": "fix: capture lm studio server status output",
  "debt": {
    "expectedCommitMessage": "fix: capture lm studio server status output",
    "preCommitHead": "9cd55b4c7",
    "stage": "commit_pending",
    "taskId": "local-models.phase11.lmstudio-stderr.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery/context source for this execution cycle.

## Execution Rules
- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation microtask must touch no more than 3 files/packages.
- Every implementation microtask is followed by its own `Git Commit: ...` item.
- Do not bypass Husky hooks; use `npm run plan:commit -- "<expected commit message>"`.
- Run targeted tests/builds for touched packages before closing the relevant stream.
- Do not start release notes, version bumps, `build-all.sh`, or `build-release.sh` without separate explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-28)
### Stream: Planning Package
1. [DONE] `local-models.phase0.plan.task1` Create the local models planning source, register it in Docs Index, and replace the NONE stub with this active execution todo plan (scope: `doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan local models lm studio module`).
2. [DONE] Git Commit: `docs: plan local models lm studio module` (hash: 31bc5b6f2)

## Phase 1 — Local Models Translation Boundary (owner: Codex, updated: 2026-05-28)
### Stream: Core Local Models Module
3. [DONE] `local-models.phase1.core.task1` Add the Core local-model discovery facade and LM Studio translation engine with model-key engine ids and fail-closed OpenAI-compatible calls (scope: `packages/core/src/local-models/**, packages/core/src/translation/core-translation-facade-factory.ts, packages/core/src/translation/core-localization-facade-factory.ts`; expected commit: `feat: add lm studio local translation engine`).
4. [DONE] Git Commit: `feat: add lm studio local translation engine` (hash: 6e755df66)
5. [DONE] `local-models.phase1.tests.task1` Add focused Core tests for model discovery, engine catalog exposure, and translation request/response handling including `/no_think` for Qwen-family models (scope: `packages/core/src/local-models/**, packages/core/src/translation/core-translation-facade-factory.test.ts, packages/core/src/translation/core-localization-facade-factory.test.ts`; expected commit: `test: cover lm studio local translation engine`).
6. [DONE] Git Commit: `test: cover lm studio local translation engine` (hash: 7c9a126e3)

## Phase 2 — Settings Selection Surface (owner: Codex, updated: 2026-05-28)
### Stream: Local Engine Settings
7. [DONE] `local-models.phase2.settings.task1` Preserve `lmstudio:*` engine ids in Settings state and render local model engine labels in the UI/Reasoning translation engine selectors (scope: `src/client/ui/src/components/settings/use-settings-state-support.ts, src/client/ui/src/components/settings/localization-settings-card.tsx, src/client/ui/src/components/settings/localization-engine-availability.ts`; expected commit: `feat: expose local models in translation settings`).
8. [DONE] Git Commit: `feat: expose local models in translation settings` (hash: 1c3a96765)
9. [DONE] `local-models.phase2.defaults.task1` Normalize persisted settings snapshots so local engine ids round-trip through Core load/save without fallback while keeping old snapshots compatible (scope: `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, src/client/ui/src/components/settings/settings-state-model.ts, src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts`; expected commit: `fix: persist local translation engine selections`).
10. [DONE] Git Commit: `fix: persist local translation engine selections` (hash: e26bdc2c1)

## Phase 3 — Documentation Sync (owner: Codex, updated: 2026-05-28)
### Stream: SSOT Updates
11. [DONE] `local-models.phase3.docs.task1` Update canonical architecture/module docs for the LM Studio local translation boundary, Settings selection semantics, and release-gated limitation that download/delete remains deferred (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md, doc/SolidWorks-WorkFlow/Modules/Localization.md`; expected commit: `docs: document local models translation boundary`).
12. [DONE] Git Commit: `docs: document local models translation boundary` (hash: 5b3f5ab7c)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-28)
### Stream: Targeted Verification
13. [DONE] `local-models.phase4.verify.task1` Run targeted package builds/tests for Core, translation/localization settings, and Project Manager typecheck; record exact commands/results in this plan (scope: `packages/core, packages/localization, packages/translation, src/client/ui, src/client/project-manager, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `test: verify local models module`).
    - Verification 2026-05-28: `npm run build --workspace @codeai-hub/translation` — PASS.
    - Verification 2026-05-28: `npm run build --workspace @codeai-hub/localization` — PASS.
    - Verification 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-28: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-28: `npm run build:webview` — PASS.
    - Verification 2026-05-28: `npm run build:project-manager` — PASS.
    - Verification 2026-05-28: `node --test dist/local-models/local-models-facade.test.js` from `packages/core` — PASS (3 tests).
    - Verification 2026-05-28: `node --test dist/translation/core-translation-facade-factory.test.js` from `packages/core` — PASS (9 tests).
    - Verification 2026-05-28: `node --test dist/translation/core-localization-facade-factory.test.js` from `packages/core` — PASS (3 tests).
    - Verification 2026-05-28: `npx tsx --test src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts` — PASS (2 tests).
14. [DONE] Git Commit: `test: verify local models module` (hash: 83505a48d)

## Phase 5 — Local Runtime Acceptance Testing (owner: Codex + Oleksandr, updated: 2026-05-28)
### Stream: Local Runtime Smoke Fix
15. [DONE] `local-models.phase5.smoke-fix.task1` Fix the LM Studio prompt language naming after real Gemma smoke returned English prompt-help text instead of Russian translation; add regression coverage for human-readable language names (scope: `packages/core/src/local-models/**, doc/TODO/todo-plan.md`; expected commit: `fix: improve local model translation prompt`).
    - Smoke 2026-05-28: `lmstudio:gemma-4-26b-a4b-it` through `createCoreTranslationFacade` returned `Please provide the text you would like me to translate.` for a Russian translation request when the prompt used raw target code `ru`; acceptance blocked until prompt repair is verified.
    - Verification 2026-05-28: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-28: `node --test dist/local-models/local-models-facade.test.js` from `packages/core` — PASS (3 tests).
    - Smoke 2026-05-28: Reasoning/local translation through `lmstudio:gemma-4-26b-a4b-it` — PASS; returned Russian translation and preserved `API`, `JSON`, and `{providerId}`.
    - Smoke 2026-05-28: Localization bundle materialization through `createCoreLocalizationFacade` + `lmstudio:gemma-4-26b-a4b-it` — PASS; produced Russian `ui_interface` bundle and preserved `{providerId}`.
    - Smoke 2026-05-28: unavailable LM Studio API (`CODEAI_LMSTUDIO_BASE_URL=http://127.0.0.1:9`) — PASS; explicit local engine returned fallback with `errorCode = "lmstudio_request_failed"` and did not substitute another engine.
16. [DONE] Git Commit: `fix: improve local model translation prompt` (hash: ff2ea2380)

### Stream: Local Runtime Retest
17. [DONE] `local-models.phase5.user-acceptance.task1` User retests three local-model scenarios in Project Manager: Reasoning translation, UI localization bundle materialization, and unavailable LM Studio failure handling (scope: user workflow observation; expected commit: none). Result: User approved release build after local-model smoke tests passed

## Phase 6 — Release Build (owner: Codex, updated: 2026-05-28)
### Stream: Release Confirmation And Packaging
18. [DONE] `local-models.phase6.release-confirm.task1` Ask for and receive separate explicit user confirmation for release build after implementation and verification pass (scope: chat/process gate; expected commit: none). Result: User explicitly confirmed release build in chat on 2026-05-28
19. [DONE] `local-models.phase6.release-prep.task1` After confirmation only, update README/CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare local models release build`).
    - Release prep 2026-05-28: future release version is `1.2.392` (current root `package.json` version `1.2.391` + 1).
    - Release prep 2026-05-28: `README.md` Current Release updated to `v1.2.392` and `CHANGELOG.md` entry `## [1.2.392] - 2026-05-28` added before release scripts.
20. [DONE] Git Commit: `docs: prepare local models release build` (hash: 6426dae90)
21. [DONE] `local-models.phase6.release-build.task1` Run approved release build scripts, collect generated artifacts, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build local models release`).
    - Release build 2026-05-28: `./scripts/build-all.sh` completed successfully for version `1.2.392`.
    - Release build artifacts copied to `doc/tmp/releases/`: `claude-module-1.2.392.tar.bz2`, `codex-module-1.2.392.tar.bz2`, `gemini-module-1.2.392.tar.bz2`, `kimi-module-1.2.392.tar.bz2`, `glm-claude-code-module-1.2.392.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.392.tar.bz2`, `vscode-webview-1.2.392.tar.bz2`, `project-manager-1.2.392.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.392.tar.bz2`.
22. [DONE] Git Commit: `chore: build local models release` (hash: f4491a4af)
23. [DONE] `local-models.phase6.release-package.task1` Run final VSIX packaging from the committed release version and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package local models vsix`).
    - Release package 2026-05-28: `./scripts/build-release.sh --use-current-version` completed successfully for version `1.2.392`.
    - Release package 2026-05-28: VSIX created at `codeai-hub-1.2.392.vsix` (`4.4M`); runtime package surface verification passed.
    - Release package 2026-05-28: output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
24. [DONE] Git Commit: `chore: package local models vsix` (hash: b347645b3)

## Phase 7 — Release Retest Regression Fixes (owner: Codex, updated: 2026-05-29)
### Stream: Local Provider Visibility
25. [DONE] `local-models.phase7.discovery.task1` Make LM Studio discovery work from GUI-launched Core and preserve dynamic `lmstudio:*` translation engine catalogs for Settings (scope: `packages/core/src/local-models/**`; expected commit: `fix: discover lm studio models from app runtime`).
    - Regression 2026-05-29: release `1.2.392` did not show downloaded local models in translation selectors; shell check confirmed `lms` lives at `~/.lmstudio/bin/lms`, which GUI-launched Core may not inherit in `PATH`.
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `node --test dist/local-models/local-models-facade.test.js dist/local-models/local-models-cli.test.js` from `packages/core` — PASS (4 tests).
    - Smoke 2026-05-29: `LocalModelsFacade().listModels()` from built Core discovered `ruadaptqwen3-32b-instruct-mlx`, `gemma-4-26b-a4b-it`, and `mistral-small-3.2-24b-instruct-2506-mlx`.
26. [DONE] Git Commit: `fix: discover lm studio models from app runtime` (hash: 97a5a1c43)
27. [DONE] `local-models.phase7.core-provider.task1` Add a Core Local Models provider descriptor and chat adapter backed by LM Studio/OpenAI-compatible calls (scope: `packages/core/src/local-models/**, packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/core/src/config/provider-turn-config-resolver.ts`; expected commit: `feat: add lm studio local provider runtime`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `node --test dist/local-models/local-models-provider-adapter.test.js` from `packages/core` — PASS (1 test).
28. [DONE] Git Commit: `feat: add lm studio local provider runtime` (hash: eb6a0f6e2)
29. [DONE] `local-models.phase7.provider-snapshot.task1` Carry Local Models provider/model metadata through Core state into Project Manager provider snapshots and resolver allowlists (scope: `src/types/provider.ts, src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/services/workflow-provider-resolver.ts`; expected commit: `feat: expose local models provider metadata`).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
30. [DONE] Git Commit: `feat: expose local models provider metadata` (hash: 8e58e1535)
31. [DONE] `local-models.phase7.provider-ui.task1` Render Local Models in step provider cards with downloaded model options and default selections (scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/shared/stage-confirmation-card-provider-tint.ts`; expected commit: `feat: show local models in step provider picker`).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
32. [DONE] Git Commit: `feat: show local models in step provider picker` (hash: e9b468425)
33. [DONE] `local-models.phase7.verify.task1` Run targeted builds/tests and real LM Studio visibility checks for provider picker plus translation-engine dropdown catalogs (scope: `packages/core, src/client/project-manager, src/client/ui, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `test: verify local provider visibility`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Verification 2026-05-29: `node --test dist/local-models/local-models-facade.test.js dist/local-models/local-models-cli.test.js dist/local-models/local-models-provider-adapter.test.js` from `packages/core` — PASS (5 tests).
    - Verification 2026-05-29: `npm run build:webview` — PASS.
    - Smoke 2026-05-29: built Core + Project Manager model-selection helpers expose downloaded LM Studio models as translation engines `lmstudio:ruadaptqwen3-32b-instruct-mlx`, `lmstudio:gemma-4-26b-a4b-it`, `lmstudio:mistral-small-3.2-24b-instruct-2506-mlx` and as Local Models provider options `ruadaptqwen3-32b-instruct-mlx`, `gemma-4-26b-a4b-it`, `mistral-small-3.2-24b-instruct-2506-mlx`; Local Models provider snapshot is connected.
34. [DONE] Git Commit: `test: verify local provider visibility` (hash: 38ce2a5c1)

## Phase 8 — Regression Release Build (owner: Codex, updated: 2026-05-29)
### Stream: Release Confirmation And Packaging
35. [DONE] `local-models.phase8.release-confirm.task1` Ask for and receive separate explicit user confirmation for a new release build after the provider/translation visibility regression fix is verified (scope: chat/process gate; expected commit: none). Result: User explicitly confirmed new release build in chat on 2026-05-29 after local provider/translation visibility regression fixes were verified.
36. [DONE] `local-models.phase8.release-prep.task1` After confirmation only, update README/CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare local provider visibility release`).
    - Release prep 2026-05-29: future release version is `1.2.393` (current root `package.json` version `1.2.392` + 1).
    - Release prep 2026-05-29: `README.md` Current Release updated to `v1.2.393` and `CHANGELOG.md` entry `## [1.2.393] - 2026-05-29` added before release scripts.
37. [DONE] Git Commit: `docs: prepare local provider visibility release` (hash: 0ab5d41c2)
38. [DONE] `local-models.phase8.release-build.task1` Run approved release build scripts, collect generated artifacts, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build local provider visibility release`).
    - Release build 2026-05-29: `./scripts/build-all.sh` completed successfully for version `1.2.393`.
    - Release build artifacts copied to `doc/tmp/releases/`: `claude-module-1.2.393.tar.bz2`, `codex-module-1.2.393.tar.bz2`, `gemini-module-1.2.393.tar.bz2`, `kimi-module-1.2.393.tar.bz2`, `glm-claude-code-module-1.2.393.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.393.tar.bz2`, `vscode-webview-1.2.393.tar.bz2`, `project-manager-1.2.393.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.393.tar.bz2`.
39. [DONE] Git Commit: `chore: build local provider visibility release` (hash: 75a33496c)
40. [DONE] `local-models.phase8.release-package.task1` Run final VSIX packaging from the committed release version and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package local provider visibility vsix`).
    - Release package 2026-05-29: `./scripts/build-release.sh --use-current-version` completed successfully for version `1.2.393`.
    - Release package 2026-05-29: VSIX created at `codeai-hub-1.2.393.vsix` (`4.4M`); runtime package surface verification passed.
    - Release package 2026-05-29: output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
41. [DONE] Git Commit: `chore: package local provider visibility vsix` (hash: 437d0889b)
42. [DONE] `local-models.phase8.user-acceptance.task1` User retests the new release and confirms Local Models are visible in provider cards and UI Translation Engine selectors (scope: user workflow observation; expected commit: none). Result: release `1.2.393` shows downloaded LM Studio models in `UI Translation Engine`, but Local Models is still missing from Settings as a separate provider and may be missing from some provider cards.

## Phase 9 — Settings And Card Visibility Regression Fixes (owner: Codex, updated: 2026-05-29)
### Stream: Local Provider Surfaces
43. [DONE] `local-models.phase9.settings-surface.task1` Add Local Models to Settings provider identity/fallback catalogs and render a Settings provider tab that lists downloaded LM Studio models (scope: `src/client/ui/src/session/session-candidates.ts, src/client/ui/src/core-bridge/constants.ts, src/client/ui/src/components/settings/settings-provider-tab-content.tsx`; expected commit: `fix: expose local provider in settings surfaces`).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
44. [DONE] Git Commit: `fix: expose local provider in settings surfaces` (hash: 7652e0719)
45. [DONE] `local-models.phase9.pm-cards.task1` Add Local Models to Project Manager provider cards that still use local allowlists and update the Description provider picker text (scope: `src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/components/description/description-provider-picker.tsx, doc/TODO/todo-plan.md`; expected commit: `fix: expose local provider in project manager cards`).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
46. [DONE] Git Commit: `fix: expose local provider in project manager cards` (hash: 9fb7edfa2)
47. [DONE] `local-models.phase9.verify.task1` Run targeted typecheck/build and smoke checks for Settings provider tab, Project Manager cards, and translation engine catalog visibility (scope: `src/client/ui, src/client/project-manager, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `test: verify local provider settings visibility`).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Verification 2026-05-29: `npm run build:webview` — PASS.
    - Smoke 2026-05-29: built `packages/ui/project-manager/dist/app.js` contains `Local Models` Settings tab, `localModels` provider allowlists for provider cards, Description picker copy mentioning Local Models, and `lmstudio:` local model catalog handling.
    - Smoke 2026-05-29: built `media/react-chat.js` contains `localModels` in UI provider catalogs and `lmstudio:` translation engine handling.
48. [DONE] Git Commit: `test: verify local provider settings visibility` (hash: 975d54c1d)

## Phase 10 — Settings/Card Visibility Release Build (owner: Codex, updated: 2026-05-29)
### Stream: Release Confirmation And Packaging
49. [BLOCKED] `local-models.phase10.release-confirm.task1` Ask for and receive separate explicit user confirmation for a new release build after Settings/provider-card visibility fixes are verified (scope: chat/process gate; expected commit: none). Result: release build postponed after user runtime retest found local translation/localization still failing or remaining English.
50. [TODO] `local-models.phase10.release-prep.task1` After confirmation only, update README/CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare local provider settings release`).
51. [TODO] Git Commit: `docs: prepare local provider settings release` (hash: TBD)
52. [TODO] `local-models.phase10.release-build.task1` Run approved release build scripts, collect generated artifacts, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build local provider settings release`).
53. [TODO] Git Commit: `chore: build local provider settings release` (hash: TBD)
54. [TODO] `local-models.phase10.release-package.task1` Run final VSIX packaging from the committed release version and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package local provider settings vsix`).
55. [TODO] Git Commit: `chore: package local provider settings vsix` (hash: TBD)
56. [TODO] `local-models.phase10.user-acceptance.task1` User retests the new release and confirms Local Models are visible in Settings, provider cards, and UI Translation Engine selectors (scope: user workflow observation; expected commit: none).

## Phase 11 — Local Runtime Reliability Regression Fixes (owner: Codex, updated: 2026-05-29)
### Stream: LM Studio Runtime Ownership
57. [DONE] `local-models.phase11.lmstudio-preflight.task1` Start and verify the LM Studio local server before local translation/provider requests, so Project Manager does not depend on a manually started LM Studio server (scope: `packages/core/src/local-models/local-models-cli.ts, packages/core/src/local-models/local-models-facade.ts, packages/core/src/local-models/local-models-provider-adapter.ts`; expected commit: `fix: start lm studio server for local models`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
58. [DONE] Git Commit: `fix: start lm studio server for local models` (hash: 03e7a962b)
59. [DONE] `local-models.phase11.lmstudio-tests.task1` Add regression coverage for LM Studio server status/start before translation and provider turns (scope: `packages/core/src/local-models/local-models-facade.test.ts, packages/core/src/local-models/local-models-provider-adapter.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover lm studio server preflight`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `node --test dist/local-models/local-models-facade.test.js dist/local-models/local-models-provider-adapter.test.js` from `packages/core` — PASS (6 tests).
60. [DONE] Git Commit: `test: cover lm studio server preflight` (hash: f923375df)
61. [DONE] `local-models.phase11.localization-sync.task1` Verify and, if needed, fix localization runtime settings so saved `uiEngineId` and non-English UI categories rebuild the browser bootstrap with the selected local model (scope: `packages/core/src/remote-bridge/handlers/**, packages/localization/src/**, src/client/**`; expected commit: `fix: sync local ui translation settings`).
    - Finding 2026-05-29: current user settings have `uiInterface`, `uiLabels`, and `workflowTerms` set to `en`, so the main UI categories intentionally remain source English until those categories are switched to `ru`.
    - Finding 2026-05-29: generated `ru` catalogs can contain unchanged English entries when a local model returns source text with a translated status; this must fail closed instead of being saved as a ready localized bundle.
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/localization` — PASS.
    - Verification 2026-05-29: `node --test dist/localization-translation-quality.test.js dist/localization-materializer.test.js` from `packages/localization` — PASS (8 tests).
62. [DONE] Git Commit: `fix: sync local ui translation settings` (hash: 9cd55b4c7)
63. [DONE] `local-models.phase11.lmstudio-stderr.task1` Capture LM Studio CLI stderr output so `lms server status` can be recognized when the server reports readiness on stderr (scope: `packages/core/src/local-models/local-models-cli.ts, packages/core/src/local-models/local-models-cli.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: capture lm studio server status output`).
    - Finding 2026-05-29: LM Studio `lms server status` reports `The server is running on port 1234.` on stderr, while the previous command runner ignored stderr and misclassified the ready server as unavailable.
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `node --test dist/local-models/local-models-cli.test.js dist/local-models/local-models-facade.test.js dist/local-models/local-models-provider-adapter.test.js` from `packages/core` — PASS (8 tests).
64. [PENDING] Git Commit: `fix: capture lm studio server status output` (hash: TBD)
65. [TODO] `local-models.phase11.verify.task1` Run targeted Core tests/builds plus real LM Studio smoke for direct translation and localized runtime bootstrap with local engine (scope: `packages/core, packages/localization, src/client/project-manager, src/client/ui, doc/TODO/todo-plan.md`; expected commit: `test: verify local translation runtime reliability`).
66. [TODO] Git Commit: `test: verify local translation runtime reliability` (hash: TBD)

## Phase 12 — Scope Closeout (owner: Codex, updated: 2026-05-29)
### Stream: Closeout
67. [TODO] `local-models.phase12.closeout.task1` After explicit user acceptance, archive this todo plan, dispose the planning document, update Docs Index, and leave terminal NONE state (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models module scope`).
68. [TODO] Git Commit: `docs: close local models module scope` (hash: TBD)
