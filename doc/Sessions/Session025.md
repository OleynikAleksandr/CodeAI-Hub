# Session 025 — Four-Category Localization Release `1.1.870`

**Date:** 2026-04-03 10:48 CEST
**Branch:** main
**Version:** 1.1.870

---

# 1. Work Done in This Session

## Work summary
- Completed the approved four-category localization rollout end-to-end and built a new local release baseline `1.1.870`.
- Reworked the runtime taxonomy around 4 user-facing categories:
  - `UI Labels`
  - `UI Helper Text`
  - `Messages for the User`
  - `Artifacts for the User`
- Preserved the English-only internal boundary via explicit `Internal Agent Instructions` classification for bundled prompts, appendices, and agent-only templates.
- Removed the intended user-facing `Default language` / `Workflow Terms Policy` model and replaced it with independent category selectors where clearing any override restores `Default Language (English)`.
- Migrated the existing Settings, Session, and Project Manager user-facing text into explicit category-owned lookup paths and backfilled the new English source dictionaries.
- Threaded `Artifacts for the User` language through prompt-pack assembly and workflow start/submit flows so final user-facing artifacts can be emitted in the selected language while internal prompts stay English-only.
- Added focused verification for:
  - artifact-language threading in workflow/runtime prompt pack assembly;
  - internal-instruction classification in Core workflow contracts.
- Found and fixed one release-time blocker: `build-release` regenerates `packages/core/src/templates/bundled-templates.ts`, and the generator originally dropped the new `audience` metadata. This was fixed before the final release build.
- Ran targeted verification successfully:
  - `npm run build --workspace @codeai-hub/localization`
  - `npm run build --workspace @codeai-hub/core`
  - `npm run build:webview`
  - `npm run build:project-manager`
  - `npm run compile`
  - `npm exec -- tsx --test src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts`
  - `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`
- Ran a headless Russian materialization smoke via `LocalizationFacade.resolveRuntimePayload(...)` and confirmed representative entries resolved as Russian materialized bundles:
  - `settings.footer.save_idle_label` -> `Сохранить изменения`
  - `settings.localization.intro` -> Russian helper copy
  - `session.empty_state.pending_title` -> `Создание сеанса…`
  - `pm.description.questionnaire.submit_label` -> `Отправить анкету`
- Built release artifacts successfully:
  - `./scripts/build-release.sh --use-current-version`
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.870.vsix`
  - tarballs: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*1.1.870*.tar.bz2`
- Verified the packaged VSIX surface contains the localized source catalogs required for the release:
  - `artifacts_for_the_user.json`
  - `messages_for_the_user.json`
  - `ui_helper_text.json`
  - `ui_labels.json`
  - legacy bridge catalogs remain present for compatibility during migration.

## Release artifacts prepared for next-session testing
- VSIX to install/test:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.870.vsix`
- Release tarballs copied for the same version:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.870.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/claude-module-1.1.870.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.870.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/codex-module-1.1.870.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/gemini-module-1.1.870.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/project-manager-1.1.870.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/vscode-webview-1.1.870.tar.bz2`

## Git commits
- `67defc55 docs(plan): define four-category localization release scope`
- `b97ccc9c feat(localization): define four-category text taxonomy`
- `0e3ba5e5 feat(localization): bridge four-category runtime mapping`
- `3400cd51 feat(settings): simplify persisted localization controls`
- `3364bb2c feat(core): hydrate four-category localization settings`
- `61be1b35 feat(settings-ui): define four-category browser localization model`
- `0701dd80 feat(settings-ui): normalize category reset to english default`
- `d5e2af1c feat(settings-ui): expose four-category localization controls`
- `7a65eb66 feat(localization): add ui label and helper dictionaries`
- `6b51e2ab feat(localization): add user message and artifact dictionaries`
- `c34ccc31 feat(localization): exclude internal instructions from user bundles`
- `62e1f2a9 refactor(localization): mark settings shell text`
- `5d977f00 refactor(localization): mark session user messages`
- `53aaf34b refactor(localization): mark project manager labels`
- `bba1f974 refactor(localization): mark workflow help text`
- `c3f9f36a refactor(localization): mark remaining project manager strings`
- `5b61bc81 refactor(localization): backfill project manager user messages dictionary`
- `d7472f5c refactor(localization): backfill project manager label dictionary`
- `416c0bc9 refactor(localization): mark questionnaire user artifacts`
- `c6a77ee7 refactor(localization): classify internal agent templates`
- `8847a47e feat(workflow): inject artifact language into core prompts`
- `4b97130c feat(workflow): inject artifact language into diagram prompts`
- `cf60397c feat(workflow): pass artifact language through prompt pack`
- `8dc574de test(workflow): verify artifact language threading`
- `c04a72ff test(core): verify internal instruction classification`
- `b72463d5 docs(release): prepare four-category localization release notes`
- `107ad4e6 build(webview): refresh localization webview bundle`
- `85287303 fix(release): preserve bundled template audience metadata`
- `6f7b65ed build(release): assemble four-category localization release`

---

# 2. Instructions for Next Session

## Required documents to review before testing
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Category_Current_Semantics_And_Authoring_Boundary.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session024.md`
6. `doc/Sessions/Session025.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
8. `doc/SolidWorks-WorkFlow/Modules/Localization.md`

## Required code files to open before testing if behavior looks wrong
1. `packages/localization/src/localization-facade.ts`
2. `packages/localization/src/source-dictionary-registry.ts`
3. `src/client/ui/src/components/settings/localization-settings-card.tsx`
4. `src/client/project-manager/services/prompt-pack-builder.ts`
5. `src/client/project-manager/services/workflow-step-start-service.ts`
6. `src/client/project-manager/services/description-submit-service.ts`
7. `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
8. `packages/core/src/templates/bundled-templates.ts`
9. `scripts/generate-bundled-templates.js`

## Exact testing target for next session
- Use release `1.1.870`, not `1.1.869`.
- Install and validate `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.870.vsix`.
- Test from the packaged extension/runtime surface, not only from the workspace checkout.

## Release test checklist for next session
1. Open `Settings -> Localization` and verify the visible category model is:
   - `UI Labels`
   - `UI Helper Text`
   - `Messages for the User`
   - `Artifacts for the User`
2. Verify that an empty category selector displays `Default Language (English)`.
3. Change `UI Labels` to Russian and verify short interface text becomes Russian:
   - Settings buttons such as `Save Changes`
   - short Project Manager navigation labels
   - artifact/help/source mode toggles
4. Change `UI Helper Text` to Russian and verify explanatory copy becomes Russian:
   - Settings localization helper descriptions
   - descriptive helper copy around options and controls
5. Change `Messages for the User` to Russian and verify user-directed status/help copy becomes Russian:
   - Session empty states / status labels
   - Project Manager help panels
   - warnings, errors, and runtime user-facing status text when available
6. Change `Artifacts for the User` to Russian and verify user-facing artifact shells become Russian:
   - Description questionnaire shell text
   - questionnaire button labels and helper copy
7. Run at least one real workflow path and verify generated final user-facing artifacts follow Russian when `Artifacts for the User = ru`:
   - `Description -> Final_Description.md`
   - `Virtual Simulation` staged artifact outputs if produced
   - `Diagram Modules` staged user-facing artifact text if produced
8. Verify the internal prompt boundary is preserved:
   - agent-facing prompts/templates remain English;
   - only user-facing artifact text switches to Russian.
9. If a regression appears after packaging, inspect first:
   - generated prompt-pack language block;
   - bundled template audiences;
   - packaged source dictionaries inside the VSIX;
   - manifest pointers for `1.1.870`.

## Known release-specific note
- If a post-release bug touches workflow contract generation, inspect `85287303` first. That commit fixed the generator so release-time bundled template regeneration no longer strips `audience` metadata.

## Plan for next session
- Do not restart implementation planning.
- Start directly with release testing of `1.1.870`.
- If testing is green, then finish the remaining session-closure docs stream and archive the completed TODO plan.
- If testing finds regressions, create the next TODO from that validated bug list instead of reopening the approved localization design discussion.
