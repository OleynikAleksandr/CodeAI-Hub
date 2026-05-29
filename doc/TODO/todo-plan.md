# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-lmstudio-module-2026-05-28",
  "branch": "main",
  "baseHead": "f4bc0e6a1",
  "lastRecordedCommit": "8e58e1535",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Local_Models_LMStudio_Module_Planning.md",
  "currentTaskId": "local-models.phase7.provider-ui.task1",
  "expectedCommitMessage": "feat: show local models in step provider picker",
  "debt": {
    "expectedCommitMessage": "feat: show local models in step provider picker",
    "preCommitHead": "8e58e1535",
    "stage": "commit_pending",
    "taskId": "local-models.phase7.provider-ui.task1"
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
32. [PENDING] Git Commit: `feat: show local models in step provider picker` (hash: TBD)
33. [TODO] `local-models.phase7.verify.task1` Run targeted builds/tests and real LM Studio visibility checks for provider picker plus translation-engine dropdown catalogs (scope: `packages/core, src/client/project-manager, src/client/ui, doc/TODO/todo-plan.md`; expected commit: `test: verify local provider visibility`).
34. [TODO] Git Commit: `test: verify local provider visibility` (hash: TBD)

## Phase 8 — Scope Closeout (owner: Codex, updated: 2026-05-29)
### Stream: Closeout
35. [TODO] `local-models.phase8.closeout.task1` After explicit user acceptance, archive this todo plan, dispose the planning document, update Docs Index, and leave terminal NONE state (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models module scope`).
36. [TODO] Git Commit: `docs: close local models module scope` (hash: TBD)
