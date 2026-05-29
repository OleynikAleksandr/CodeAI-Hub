# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-lmstudio-module-2026-05-28",
  "branch": "main",
  "baseHead": "f4bc0e6a1",
  "lastRecordedCommit": "561155745",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md",
  "currentTaskId": "local-models.phase20.catalog-verify.task1",
  "expectedCommitMessage": "test: verify local model catalog loading",
  "debt": {
    "expectedCommitMessage": "test: verify local model catalog loading",
    "preCommitHead": "561155745",
    "stage": "commit_pending",
    "taskId": "local-models.phase20.catalog-verify.task1"
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
64. [DONE] Git Commit: `fix: capture lm studio server status output` (hash: 87a5382ae)
65. [DONE] `local-models.phase11.verify.task1` Run targeted Core tests/builds plus real LM Studio smoke for direct translation and localized runtime bootstrap with local engine (scope: `packages/core, packages/localization, src/client/project-manager, src/client/ui, doc/TODO/todo-plan.md`; expected commit: `test: verify local translation runtime reliability`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/localization` — PASS.
    - Verification 2026-05-29: `node --test dist/local-models/local-models-cli.test.js dist/local-models/local-models-facade.test.js dist/local-models/local-models-provider-adapter.test.js` from `packages/core` — PASS (8 tests).
    - Verification 2026-05-29: `node --test dist/localization-translation-quality.test.js dist/localization-materializer.test.js` from `packages/localization` — PASS (8 tests).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Verification 2026-05-29: `npm run build:webview` — PASS.
    - Smoke 2026-05-29: direct `lmstudio:gemma-4-26b-a4b-it` translation through built Core returned Russian in 7276 ms and preserved `API`, `JSON`, `CodeAI Hub`, and `{providerId}`.
    - Smoke 2026-05-29: `createCoreLocalizationFacade().synchronizeRuntimePayload()` with `ui_interface=ru`, `engineId=lmstudio:gemma-4-26b-a4b-it`, and temp localization root produced a materialized Russian `ui_interface` bundle in 8564 ms with `activeEngineId=lmstudio:gemma-4-26b-a4b-it`.
66. [DONE] Git Commit: `test: verify local translation runtime reliability` (hash: eb4749dea)

## Phase 12 — Runtime Reliability Release Build (owner: Codex, updated: 2026-05-29)
### Stream: Release Confirmation And Packaging
67. [DONE] `local-models.phase12.release-confirm.task1` Ask for and receive separate explicit user confirmation for a new release build after local runtime reliability fixes are verified (scope: chat/process gate; expected commit: none). Result: user explicitly confirmed release build in chat on 2026-05-29.
68. [DONE] `local-models.phase12.release-prep.task1` After confirmation only, update README/CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare local runtime reliability release`).
    - Release prep 2026-05-29: future release version is `1.2.394` (current root `package.json` version `1.2.393` + 1).
    - Release prep 2026-05-29: `README.md` Current Release updated to `v1.2.394` and `CHANGELOG.md` entry `## [1.2.394] - 2026-05-29` added before release scripts.
69. [DONE] Git Commit: `docs: prepare local runtime reliability release` (hash: 5604dc0ff)
70. [DONE] `local-models.phase12.release-build.task1` Run approved release build scripts, collect generated artifacts, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build local runtime reliability release`).
    - Release build 2026-05-29: `./scripts/build-all.sh` completed successfully for version `1.2.394`.
    - Release build artifacts copied to `doc/tmp/releases/`: `claude-module-1.2.394.tar.bz2`, `codex-module-1.2.394.tar.bz2`, `gemini-module-1.2.394.tar.bz2`, `kimi-module-1.2.394.tar.bz2`, `glm-claude-code-module-1.2.394.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.394.tar.bz2`, `vscode-webview-1.2.394.tar.bz2`, `project-manager-1.2.394.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.394.tar.bz2`.
71. [DONE] Git Commit: `chore: build local runtime reliability release` (hash: 0b03bddaa)
72. [DONE] `local-models.phase12.release-package.task1` Run final VSIX packaging from the committed release version and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package local runtime reliability vsix`).
    - Release package 2026-05-29: `./scripts/build-release.sh --use-current-version` completed successfully for version `1.2.394`.
    - Release package 2026-05-29: verified output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
    - Release package 2026-05-29: VSIX created at `codeai-hub-1.2.394.vsix` (`4.4M`); runtime package surface verification passed.
73. [DONE] Git Commit: `chore: package local runtime reliability vsix` (hash: 1a706c229)
74. [BLOCKED] `local-models.phase12.user-acceptance.task1` User retests the new release and confirms Local Models provider, translation engine, LM Studio auto-start, and UI localization behavior (scope: user workflow observation; expected commit: none). Result: release `1.2.394` shows the Local Models settings tab, but Project Manager UI remains English after local LM Studio engines and `ru` localization categories are selected.

## Phase 13 — Local Bundle Materialization Fix (owner: Codex, updated: 2026-05-29)
### Stream: Bounded Local Model Localization Batches
75. [DONE] `local-models.phase13.batch-planner.task1` Add a reusable structured batch planner with coverage for entry-count and character-count limits (scope: `packages/localization/src/structured-batch-entry-recovery.ts, packages/localization/src/structured-batch-entry-recovery.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover localization structured batch planning`).
    - Investigation 2026-05-29: global settings persisted `uiEngineId=lmstudio:gemma-4-26b-a4b-it` and several `ru` categories, but `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json` still contained an English startup snapshot.
    - Investigation 2026-05-29: a small LM Studio structured-marker sample translated successfully in 7395 ms, but a single `user_guidance` bundle materialization did not return promptly; the current materializer sends each bundle as one structured batch, which is too coarse for local models and leaves the browser on English fallback while materialization is pending or fails.
76. [DONE] Git Commit: `test: cover localization structured batch planning` (hash: 6fc15eb96)
77. [DONE] `local-models.phase13.local-bundle-batching.task1` Use bounded structured batches during localization materialization so local LM Studio models are not asked to translate an entire runtime bundle in one slow request (scope: `packages/localization/src/localization-materializer.ts, packages/localization/src/localization-materializer.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: batch local model localization bundles`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/localization` — PASS.
    - Verification 2026-05-29: `node --test packages/localization/dist/localization-materializer.test.js packages/localization/dist/structured-batch-entry-recovery.test.js` — PASS (8 tests).
    - Smoke 2026-05-29: built `LocalizationMaterializer` with real `lmstudio:gemma-4-26b-a4b-it` materialized a 13-entry `user_guidance` bundle as 2 bounded requests (`1762` and `791` chars), completed in `15837` ms, returned `fallback=0`, `partial=0`, and preserved `API`, `JSON`, `CodeAI Hub`, and `{providerId}`.
78. [DONE] Git Commit: `fix: batch local model localization bundles` (hash: 74be29102)
79. [BLOCKED] `local-models.phase13.user-acceptance.task1` User retests the fixed release and confirms Local Models provider, translation engine, LM Studio auto-start, and UI localization behavior (scope: user workflow observation; expected commit: none). Result: pending a new release build for user retest after the bounded local model localization batch fix.

## Phase 14 — Local Bundle Batching Release Build (owner: Codex, updated: 2026-05-29)
### Stream: Release Confirmation And Packaging
80. [DONE] `local-models.phase14.release-confirm.task1` Ask for and receive separate explicit user confirmation for a new release build after bounded local model localization batching is verified (scope: chat/process gate; expected commit: none). Result: user explicitly confirmed new release build in chat on 2026-05-29.
81. [DONE] `local-models.phase14.release-prep.task1` After confirmation only, update README/CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare local bundle batching release`).
    - Release prep 2026-05-29: future release version is `1.2.395` (current root `package.json` version `1.2.394` + 1).
    - Release prep 2026-05-29: `README.md` Current Release updated to `v1.2.395` and `CHANGELOG.md` entry `## [1.2.395] - 2026-05-29` added before release scripts.
82. [DONE] Git Commit: `docs: prepare local bundle batching release` (hash: e0fabebd9)
83. [DONE] `local-models.phase14.release-build.task1` Run approved release build scripts, collect generated artifacts, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build local bundle batching release`).
    - Release build 2026-05-29: `./scripts/build-all.sh --allow-dirty` completed successfully for version `1.2.395`; `--allow-dirty` was used because the only pre-existing dirty path was the orchestrator's post-commit advancement in `doc/TODO/todo-plan.md`.
    - Release build artifacts copied to `doc/tmp/releases/`: `claude-module-1.2.395.tar.bz2`, `codex-module-1.2.395.tar.bz2`, `gemini-module-1.2.395.tar.bz2`, `kimi-module-1.2.395.tar.bz2`, `glm-claude-code-module-1.2.395.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.395.tar.bz2`, `vscode-webview-1.2.395.tar.bz2`, `project-manager-1.2.395.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.395.tar.bz2`.
84. [DONE] Git Commit: `chore: build local bundle batching release` (hash: 58d4513be)
85. [DONE] `local-models.phase14.release-package.task1` Run final VSIX packaging from the committed release version and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package local bundle batching vsix`).
    - Release package 2026-05-29: `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully for version `1.2.395`; `--allow-dirty` was used because the only pre-existing dirty path was the orchestrator's post-commit advancement in `doc/TODO/todo-plan.md`.
    - Release package 2026-05-29: verified output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
    - Release package 2026-05-29: VSIX created at `codeai-hub-1.2.395.vsix` (`4.4M`); runtime package surface verification passed.
86. [DONE] Git Commit: `chore: package local bundle batching vsix` (hash: 64f85568f)
87. [DONE] `local-models.phase14.user-acceptance.task1` User retests the new release and confirms Local Models provider, translation engine, LM Studio auto-start, and UI localization behavior (scope: user workflow observation; expected commit: none). Result: release `1.2.395` confirms Local Models translation and reasoning localization work well with `LM Studio • gemma-4-26b-a4b-it`; remaining gap is full provider model parity for default settings, step-card selection, and per-turn dialog switching.

## Phase 16 — Local Provider Model Selection Parity (owner: Codex, updated: 2026-05-29)
### Stream: Settings Defaults
88. [DONE] `local-models.phase16.settings-default.task1` Persist a Local Models provider default model in Settings state without changing translation-engine selections (scope: `src/client/ui/src/components/settings/local-models-settings-state.ts, src/client/ui/src/components/settings/settings-state-model.ts, doc/TODO/todo-plan.md`; expected commit: `feat: persist local model provider defaults`).
89. [DONE] Git Commit: `feat: persist local model provider defaults` (hash: a81640f65)
90. [DONE] `local-models.phase16.settings-handlers.task1` Add Settings update handlers for Local Models default model changes in UI settings state (scope: `src/client/ui/src/components/settings/settings-state-helpers.ts, src/client/ui/src/components/settings/use-settings-state-support.ts, src/client/ui/src/components/settings/use-settings-state.ts, doc/TODO/todo-plan.md`; expected commit: `feat: update local model settings handlers`).
91. [DONE] Git Commit: `feat: update local model settings handlers` (hash: 770295792)
92. [DONE] `local-models.phase16.settings-hooks.task1` Wire Local Models default handlers through Settings hooks and the Local Models Settings tab control (scope: `src/client/ui/src/components/settings/use-settings-state.ts, src/client/project-manager/components/settings/use-project-manager-settings-state.ts, src/client/ui/src/components/settings/settings-provider-tab-content.tsx`; expected commit: `feat: select local default model in settings`).
93. [DONE] Git Commit: `feat: select local default model in settings` (hash: 7c9e7bb55)

### Stream: Step And Turn Selection
94. [DONE] `local-models.phase16.step-selection.task1` Use the saved Local Models default in step provider cards and persist explicit card model choices as provider defaults (scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/services/workflow-step-start-settings-defaults.ts, doc/TODO/todo-plan.md`; expected commit: `feat: use local model defaults in step cards`).
95. [DONE] Git Commit: `feat: use local model defaults in step cards` (hash: 6e37585ba)
96. [DONE] `local-models.phase16.dialog-picker.task1` Show downloaded Local Models in the dialog turn model picker and route local picker selections from Project Manager to Core (scope: `src/client/ui/src/session/status-panel-model-picker.tsx, src/client/ui/src/session/status-panel.tsx, src/client/ui/src/session/session-view.tsx`; expected commit: `feat: show local models in dialog picker`).
97. [DONE] Git Commit: `feat: show local models in dialog picker` (hash: 2602f856c)
98. [DONE] `local-models.phase16.dialog-switch-api.task1` Add Project Manager switch API messages for Local Models turn-level model changes (scope: `src/client/project-manager/services/switch-api.ts, src/client/project-manager/api.ts, src/client/project-manager/core-stream-message-types.ts`; expected commit: `feat: route local model switch requests`).
99. [DONE] Git Commit: `feat: route local model switch requests` (hash: 06dceffbe)
100. [DONE] `local-models.phase16.dialog-switch-core.task1` Handle Local Models switch requests in Core and update the session model binding for the next turn (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-local-models-model-switch.ts, packages/core/src/remote-bridge/handlers/session-request-handler.ts, packages/core/src/remote-bridge/handlers/incoming-message-validator.ts, packages/core/src/remote-bridge/session-stream-contracts.ts, packages/core/src/remote-bridge/remote-bridge-message-router.ts, packages/core/src/remote-bridge/remote-bridge-session-scope-validator.ts, doc/TODO/todo-plan.md`; expected commit: `feat: switch local model sessions`).
101. [DONE] Git Commit: `feat: switch local model sessions` (hash: e0f2eba54)

102. [DONE] `local-models.phase16.dialog-bridge.task1` Wire Project Manager dialog sessions to pass downloaded Local Models into the picker and call the Local Models switch API (scope: `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx, src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts, doc/TODO/todo-plan.md`; expected commit: `feat: connect local dialog model switching`).
103. [DONE] Git Commit: `feat: connect local dialog model switching` (hash: 406935306)

### Stream: Provider Config And Verification
104. [DONE] `local-models.phase16.provider-config.task1` Resolve Local Models provider defaults from persisted settings for Core-created sessions and model info labels (scope: `packages/core/src/config/provider-settings-snapshot.ts, packages/core/src/config/provider-turn-config-resolver.ts, src/client/ui/src/session/model-info-builder.ts`; expected commit: `feat: resolve local model defaults from settings`).
105. [DONE] Git Commit: `feat: resolve local model defaults from settings` (hash: 3fbd95ce2)
106. [DONE] `local-models.phase16.verify.task1` Run targeted tests/builds and smoke checks for Settings default model, step-card model selection, and per-turn Local Models switching (scope: `packages/core, src/client/project-manager, src/client/ui, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `test: verify local provider model selection`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Verification 2026-05-29: `npm run build:webview` — PASS.
    - Smoke 2026-05-29: built Project Manager bundle contains `requestLocalModelsModelSwitch`, `session:local-models:model-switch`, Local Models dialog picker handling, Local Models Settings default selection, and step-card default persistence.
    - Smoke 2026-05-29: built Core resolves `providers.localModels.defaultModel=gemma-4-26b-a4b-it` into Local Models provider turn config and exposes the local model switch route through validator/router/session handler.
107. [DONE] Git Commit: `test: verify local provider model selection` (hash: 1d0f7e627)

## Phase 17 — Clear Rollback Localization Regression Fix (owner: Codex, updated: 2026-05-29)
### Stream: Project Manager Localization Runtime
108. [DONE] `local-models.phase17.clear-localization.task1` Diagnose and fix the clear/rollback path that leaves Project Manager on English runtime text despite persisted Russian localization settings (scope: `packages/core/src/remote-bridge/handlers/**, packages/localization/src/**, src/client/project-manager/**, doc/TODO/todo-plan.md`; expected commit: `fix: preserve localization after clear rollback`).
    - Finding 2026-05-29: `SettingsLoadedBroadcaster` intentionally emits an immediate `settings:loaded` event with `localizationRuntime: null` before resolving the next runtime payload. Project Manager treated that intermediate event as an instruction to drop the current runtime, so clear/reload could visibly fall back to English while LM Studio rebuilt or resolved localization payloads.
    - Fix 2026-05-29: Project Manager now preserves the active localization runtime until Core sends a non-null replacement payload, while still applying the incoming settings snapshot.
    - Verification 2026-05-29: `npx tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts` — PASS (2 tests).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
109. [DONE] Git Commit: `fix: preserve localization after clear rollback` (hash: 038749308)
110. [DONE] `local-models.phase17.clear-localization-verify.task1` Run targeted tests/builds and smoke checks for settings-backed localization bootstrap after clear rollback (scope: `packages/core, packages/localization, src/client/project-manager, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `test: verify localization after clear rollback`).
    - Verification 2026-05-29: `npx tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts` — PASS (2 tests).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Smoke 2026-05-29: built Project Manager bundle `packages/ui/project-manager/dist/app.js` contains `if (payload.localizationRuntime) setLocalizationRuntime(payload.localizationRuntime);`, confirming intermediate null localization payloads no longer clear the active translated runtime.
111. [DONE] Git Commit: `test: verify localization after clear rollback` (hash: 2e9957ab6)

## Phase 18 — Localization Runtime Surface Hardening (owner: Codex, updated: 2026-05-29)
### Stream: Settings Runtime Null Guard
112. [DONE] `local-models.phase18.localization-runtime-hardening.task1` Apply the same non-null localization runtime reload guard to the shared Settings surface so intermediate Core reload events cannot clear active translated runtime outside Project Manager shell (scope: `src/client/ui/src/components/settings/use-settings-state.ts, src/client/ui/src/components/settings/use-settings-state-support.ts, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `fix: keep settings localization runtime during reload`).
    - Fix 2026-05-29: shared Settings state now preserves the active browser localization runtime across intermediate `settings:loaded` / `settings:saved` events whose `localizationRuntime` is null, matching the Project Manager shell behavior.
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Smoke 2026-05-29: built `media/react-chat.js` and `packages/ui/project-manager/dist/app.js` contain non-null localization runtime guards.
113. [DONE] Git Commit: `fix: keep settings localization runtime during reload` (hash: 41ef58338)
114. [DONE] `local-models.phase18.localization-runtime-hardening-verify.task1` Run targeted tests/builds and bundle smoke checks for shared and Project Manager localization runtime guards (scope: `src/client/ui, src/client/project-manager, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `test: verify localization runtime reload guards`).
    - Verification 2026-05-29: `npx tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts` — PASS (2 tests).
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Smoke 2026-05-29: built `media/react-chat.js` preserves current runtime on null localization payloads, and built `packages/ui/project-manager/dist/app.js` keeps the Project Manager non-null runtime guard.
115. [DONE] Git Commit: `test: verify localization runtime reload guards` (hash: 2d9729259)

## Phase 19 — Localization Runtime Guard Release Build (owner: Codex, updated: 2026-05-29)
### Stream: Release Confirmation And Packaging
116. [DONE] `local-models.phase19.release-confirm.task1` Ask for and receive separate explicit user confirmation for a new release build after localization runtime guard fixes are verified (scope: chat/process gate; expected commit: none). Result: user explicitly confirmed "Исправишь всё и собери новый релиз" in chat on 2026-05-29.
117. [DONE] `local-models.phase19.release-prep.task1` After confirmation only, update README/CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare localization runtime guard release`).
    - Release prep 2026-05-29: future release version is `1.2.396` (current root `package.json` version `1.2.395` + 1).
    - Release prep 2026-05-29: `README.md` Current Release updated to `v1.2.396` and `CHANGELOG.md` entry `## [1.2.396] - 2026-05-29` added before release scripts.
118. [DONE] Git Commit: `docs: prepare localization runtime guard release` (hash: 71c08b3f6)
119. [DONE] `local-models.phase19.release-build.task1` Run approved release build scripts, collect generated artifacts, and record exact outputs/results in this plan (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore: build localization runtime guard release`).
    - Release build 2026-05-29: `./scripts/build-all.sh --allow-dirty` completed successfully for version `1.2.396`; `--allow-dirty` was used because the only pre-existing dirty path was the orchestrator's post-commit advancement in `doc/TODO/todo-plan.md`.
    - Release build artifacts copied to `doc/tmp/releases/`: `claude-module-1.2.396.tar.bz2`, `codex-module-1.2.396.tar.bz2`, `gemini-module-1.2.396.tar.bz2`, `kimi-module-1.2.396.tar.bz2`, `glm-claude-code-module-1.2.396.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.396.tar.bz2`, `vscode-webview-1.2.396.tar.bz2`, `project-manager-1.2.396.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.396.tar.bz2`.
120. [DONE] Git Commit: `chore: build localization runtime guard release` (hash: 933d90dd5)
121. [DONE] `local-models.phase19.release-package.task1` Run final VSIX packaging from the committed release version and record the VSIX path for user retest (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package localization runtime guard vsix`).
    - Release package 2026-05-29: `./scripts/build-release.sh --use-current-version --allow-dirty` completed successfully for version `1.2.396`; `--allow-dirty` was used because the only pre-existing dirty path was the orchestrator's post-commit advancement in `doc/TODO/todo-plan.md`.
    - Release package 2026-05-29: verified output included `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
    - Release package 2026-05-29: VSIX created at `codeai-hub-1.2.396.vsix` (`4.4M`); runtime package surface verification passed.
122. [DONE] Git Commit: `chore: package localization runtime guard vsix` (hash: c2058e7ff)
123. [BLOCKED] `local-models.phase19.user-acceptance.task1` User retests the new release and confirms localization remains Russian after clear/rollback and Local Models provider/model selection remains available (scope: user workflow observation; expected commit: none). Result: release `1.2.396` can load Core, but Project Manager shows "No downloaded LM Studio models are currently visible to Core" and local engines disappear from Localization Engine while LM Studio CLI/Core discovery can list the models.

## Phase 20 — Local Model Catalog Load Regression Fix (owner: Codex, updated: 2026-05-29)
### Stream: Fast Local Model Catalog
124. [DONE] `local-models.phase20.catalog-load.task1` Send a fast localization engine catalog with settings load events and let Project Manager preserve translated runtime while updating downloaded LM Studio model lists before slow localization materialization completes (scope: `packages/core/src/remote-bridge/**, src/client/project-manager/components/settings/**, doc/TODO/todo-plan.md`; expected commit: `fix: restore local model catalog loading`).
    - Finding 2026-05-29: `lms ls --json` returns 5 local LLM records, and built `LocalModelsFacade.listModels()` exposes all five as `lmstudio:*` engines.
    - Finding 2026-05-29: the first `settings:loaded` payload contains `localizationRuntime: null`; the downloaded local model list is only available inside the later full `localizationRuntime.availableEngines`, which can be delayed by local LM Studio runtime materialization.
    - Fix 2026-05-29: `settings:loaded` now carries `availableEngines` immediately, and Project Manager merges that catalog into the current localization runtime without clearing translated bundles.
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Verification 2026-05-29: `node --test --test-name-pattern "resolves loaded localization" packages/core/dist/remote-bridge/handlers/settings-request-handler.localization-runtime.test.js` — PASS.
    - Verification 2026-05-29: `npx tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts` — PASS (2 tests).
    - Smoke 2026-05-29: built `SettingsLoadedBroadcaster` emits `availableEngines=["google-gtx","lmstudio:gemma-4-26b-a4b-it"]` before full runtime resolution when `resolveRuntimePayload` is still pending.
125. [DONE] Git Commit: `fix: restore local model catalog loading` (hash: 561155745)
126. [DONE] `local-models.phase20.catalog-verify.task1` Run targeted tests/builds and live Core WebSocket smoke checks proving local LM Studio engines are visible before full localization runtime materialization finishes (scope: `packages/core, src/client/project-manager, packages/ui/project-manager/dist/app.js, doc/TODO/todo-plan.md`; expected commit: `test: verify local model catalog loading`).
    - Verification 2026-05-29: `npm run build --workspace @codeai-hub/core` — PASS.
    - Verification 2026-05-29: `npm run typecheck:webview` — PASS.
    - Verification 2026-05-29: `npm run build:project-manager` — PASS.
    - Verification 2026-05-29: `node --test --test-name-pattern "resolves loaded localization" packages/core/dist/remote-bridge/handlers/settings-request-handler.localization-runtime.test.js` — PASS.
    - Verification 2026-05-29: `npx tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts` — PASS (2 tests).
    - Smoke 2026-05-29: built `LocalModelsFacade.listModels()` sees 5 downloaded LM Studio LLM engines: `lmstudio:openai/gpt-oss-20b`, `lmstudio:rugpt-3.5-13b`, `lmstudio:hy-mt2-30b-a3b-mlx`, `lmstudio:gemma-4-26b-a4b-it`, `lmstudio:mistral-small-3.2-24b-instruct-2506-mlx`.
    - Smoke 2026-05-29: built `SettingsLoadedBroadcaster` emits the 5 `lmstudio:*` engines in the first `settings:loaded` payload within 50 ms while `localizationRuntime` is still null and full local materialization is still pending.
127. [PENDING] Git Commit: `test: verify local model catalog loading` (hash: TBD)

## Phase 15 — Scope Closeout (owner: Codex, updated: 2026-05-29)
### Stream: Closeout
128. [TODO] `local-models.phase15.closeout.task1` After explicit user acceptance, archive this todo plan, dispose the planning document, update Docs Index, and leave terminal NONE state (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models module scope`).
129. [TODO] Git Commit: `docs: close local models module scope` (hash: TBD)
