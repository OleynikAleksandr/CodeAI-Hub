# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/UI_Localization_And_Local_Glossary_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/UI_Localization_Glossary_Baseline.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- Этот `TODO Plan` реализует один localization scope: English source baseline -> persisted UI localization -> local glossary -> user-managed do-not-translate terms -> release build.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Перед закрытием каждого stream выполнять таргетные проверки затронутых пакетов/клиентов.
- Для UI stream-ов таргетная проверка по умолчанию: `npm run build:webview` + `npm run typecheck:webview`.
- Для localization package stream-ов таргетная проверка по умолчанию: `npm run build --workspace @codeai-hub/localization`.
- Для extension/core integration stream-ов таргетная проверка по умолчанию: `npm run build --workspace @codeai-hub/core`.
- Даже если автоматические тесты вынесены в отдельный stream, после каждой реализации обязателен targeted build и короткий smoke-check затронутого user flow.
- Финальный release stream выполняется только после синхронизации документации и чистого дерева.

## Phase 0 — Scope Bootstrap (owner: Docs, updated: 2026-04-01)
### Stream: Planning Intake
1. [DONE] Create the approved planning docs for UI localization and local glossary, then replace the placeholder TODO plan with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/UI_Localization_And_Local_Glossary_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/UI_Localization_Glossary_Baseline.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define ui localization scope`
2. [DONE] Git Commit: `docs(plan): define ui localization scope` (hash: `a4d542ca`)

## Phase 1 — English Source Baseline (owner: UI, updated: 2026-04-01)
### Stream: Settings And Session Source Copy
1. [DONE] Normalize canonical Settings copy to English and extract the first reusable source-copy owner for General controls/header/footer surfaces. Scope: `src/client/ui/src/components/settings/general-settings.tsx`, `src/client/ui/src/components/settings/settings-header.tsx`, `src/client/ui/src/components/settings/settings-footer.tsx`. Target commit: `refactor(copy): normalize settings source copy to english`
2. [DONE] Git Commit: `refactor(copy): normalize settings source copy to english` (hash: `ebb2dc54`)
3. [DONE] Normalize Session UI product copy to English for dialog/status/empty-state surfaces without touching provider outputs. Scope: `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/empty-state.tsx`. Target commit: `refactor(copy): normalize session source copy to english`
4. [DONE] Git Commit: `refactor(copy): normalize session source copy to english` (hash: `b5732d54`)

### Stream: Workflow Help And Templates
5. [DONE] Normalize workflow step help surfaces to canonical English. Scope: `src/client/project-manager/components/description/description-step-help.tsx`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`. Target commit: `refactor(copy): normalize workflow help to english`
6. [DONE] Git Commit: `refactor(copy): normalize workflow help to english` (hash: `7a1e4ec4`)
7. [DONE] Normalize the bundled questionnaire and questionnaire-side source templates to canonical English. Scope: `packages/agents/description-agent/assets/questionnaire-template.md`, `src/client/ui/src/services/description-questionnaire-template.ts`, `src/client/ui/src/services/idea-questionnaire-template.ts`. Target commit: `refactor(copy): normalize questionnaire source to english`
8. [DONE] Git Commit: `refactor(copy): normalize questionnaire source to english` (hash: `04cdbc40`)
9. [DONE] Normalize flow-continuity built-in templates to canonical English source copy. Scope: `assets/flow/continuity/resume.md`, `assets/flow/continuity/create-report-doc.md`, `assets/flow/continuity/create-report-code.md`. Target commit: `refactor(copy): normalize continuity templates to english`
10. [DONE] Git Commit: `refactor(copy): normalize continuity templates to english` (hash: `00392b09`)

## Phase 2 — Localization Settings Contract (owner: Extension/UI, updated: 2026-04-01)
### Stream: Extension Settings Snapshot
11. [DONE] Extend extension-side settings contracts with `general.localization` defaults and normalization for category languages, `workflowTermsPolicy`, `engineId`, and `glossaryEnabled`. Scope: `src/extension-module/settings/general-settings.ts`, `src/extension-module/settings/types.ts`, `src/extension-module/settings/settings-storage.ts`. Target commit: `feat(settings): add localization settings snapshot`
12. [DONE] Git Commit: `feat(settings): add localization settings snapshot` (hash: `decea16c`)
13. [DONE] Map localization state through the webview raw/model/helper layers. Scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`. Target commit: `refactor(settings): map localization state`
14. [DONE] Git Commit: `refactor(settings): map localization state` (hash: `b915ce7c`)
15. [DONE] Wire localization load/save/reset through settings message handling and settings state hooks. Scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/extension-module/message-handlers/settings-message-handler.ts`. Target commit: `refactor(settings): wire localization settings flow`
16. [DONE] Git Commit: `refactor(settings): wire localization settings flow` (hash: `78b9dde0`)

### Stream: Localization Settings UI
17. [DONE] Add the category-based localization controls to the General settings surface. Scope: `src/client/ui/src/components/settings/general-settings.tsx`, `src/client/ui/src/components/settings/settings-view.tsx`, `src/client/ui/src/components/settings/localization-settings-card.tsx`. Target commit: `feat(ui): add localization category controls`
18. [DONE] Git Commit: `feat(ui): add localization category controls` (hash: `1d8e5f0b`)
19. [DONE] Add a first-wave glossary management entry surface for user-authored English do-not-translate terms. Scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `src/client/ui/src/components/settings/localization-glossary-editor.tsx`, `src/client/ui/src/components/settings/use-settings-state.ts`. Target commit: `feat(ui): add glossary override editor`
20. [DONE] Git Commit: `feat(ui): add glossary override editor` (hash: `cc8a2bf6`)

## Phase 3 — Localization Package Scaffold (owner: Localization, updated: 2026-04-01)
### Stream: Package Bootstrap
21. [DONE] Scaffold the new `@codeai-hub/localization` package manifest, TS config, and public entrypoint. Scope: `packages/localization/package.json`, `packages/localization/tsconfig.json`, `packages/localization/src/index.ts`. Target commit: `feat(localization): scaffold package`
22. [DONE] Git Commit: `feat(localization): scaffold package` (hash: `23dea825`)
23. [DONE] Add the core localization contract, facade, and source-dictionary registry. Scope: `packages/localization/src/localization-contract.ts`, `packages/localization/src/localization-facade.ts`, `packages/localization/src/source-dictionary-registry.ts`. Target commit: `feat(localization): add facade and contract`
24. [DONE] Git Commit: `feat(localization): add facade and contract` (hash: `3443f910`)
25. [DONE] Add bundle-path, bundle-store, and metadata-store primitives backed by `~/.codeai-hub/localization`. Scope: `packages/localization/src/localization-paths.ts`, `packages/localization/src/localization-bundle-store.ts`, `packages/localization/src/localization-metadata-store.ts`. Target commit: `feat(localization): add bundle persistence primitives`
26. [DONE] Git Commit: `feat(localization): add bundle persistence primitives` (hash: `6f729247`)

### Stream: Language Catalog And Materialization
27. [DONE] Add a localization language-catalog surface for the active translation engine capabilities. Scope: `packages/localization/src/language-catalog.ts`, `packages/localization/src/language-catalog-service.ts`, `packages/localization/src/localization-contract.ts`. Target commit: `feat(localization): add language catalog`
28. [DONE] Git Commit: `feat(localization): add language catalog` (hash: `9f8b2258`)
29. [DONE] Add the first materializer pipeline that translates source dictionaries through `@codeai-hub/translation` and persists localized bundles. Scope: `packages/localization/src/localization-materializer.ts`, `packages/localization/src/localization-facade.ts`, `packages/localization/src/localization-bundle-store.ts`. Target commit: `feat(localization): materialize localized bundles`
30. [DONE] Git Commit: `feat(localization): materialize localized bundles` (hash: `c4e713c0`)

## Phase 4 — Local Glossary And User Overrides (owner: Localization, updated: 2026-04-01)
### Stream: Glossary Core
31. [DONE] Add glossary contract, merge service, and protector primitives for protected-term handling. Scope: `packages/localization/src/glossary-contract.ts`, `packages/localization/src/glossary-merge-service.ts`, `packages/localization/src/glossary-protector.ts`. Target commit: `feat(localization): add glossary core`
32. [DONE] Git Commit: `feat(localization): add glossary core` (hash: `bde32902`)
33. [DONE] Seed bundled base glossary and the first language-specific glossary baseline. Scope: `assets/localization/glossary/base.json`, `assets/localization/glossary/ru.json`, `packages/localization/src/glossary-bundle-loader.ts`. Target commit: `feat(localization): seed bundled glossary baseline`
34. [DONE] Git Commit: `feat(localization): seed bundled glossary baseline` (hash: `bf08d15b`)
35. [DONE] Add user override storage and validation for English do-not-translate terms. Scope: `packages/localization/src/user-glossary-store.ts`, `packages/localization/src/glossary-validator.ts`, `packages/localization/src/glossary-merge-service.ts`. Target commit: `feat(localization): add user glossary overrides`
36. [DONE] Git Commit: `feat(localization): add user glossary overrides` (hash: `753b6f1d`)
37. [DONE] Wire glossary protection and glossary-driven invalidation into the materialization pipeline. Scope: `packages/localization/src/glossary-protector.ts`, `packages/localization/src/localization-materializer.ts`, `packages/localization/src/localization-metadata-store.ts`. Target commit: `refactor(localization): apply glossary protection during materialization`
38. [DONE] Git Commit: `refactor(localization): apply glossary protection during materialization` (hash: `5ea158e8`)

## Phase 5 — Bundled Catalogs And UI Consumption (owner: UI/PM, updated: 2026-04-01)
### Stream: Bundled English Source Catalogs
39. [DONE] Seed bundled English source catalogs for interface, system feedback, and user guidance categories. Scope: `assets/localization/source/en/ui_interface.json`, `assets/localization/source/en/system_feedback.json`, `assets/localization/source/en/user_guidance.json`. Target commit: `feat(localization): seed english ui catalogs`
40. [DONE] Git Commit: `feat(localization): seed english ui catalogs` (hash: `1be03c7c`)
41. [DONE] Seed bundled English source catalogs for workflow terms and interactive templates. Scope: `assets/localization/source/en/workflow_terms.json`, `assets/localization/source/en/interactive_templates.json`, `packages/localization/src/source-dictionary-registry.ts`. Target commit: `feat(localization): seed english workflow catalogs`
42. [DONE] Git Commit: `feat(localization): seed english workflow catalogs` (hash: `9fabdff9`)

### Stream: Runtime Lookup Wiring
43. [DONE] Add webview-side localization loading/lookup plumbing for settings-host surfaces. Scope: `src/client/ui/src/app-host/settings-only-host.tsx`, `src/client/ui/src/app-host/use-localization.ts`, `src/client/ui/src/components/settings/settings-view.tsx`. Target commit: `feat(ui): load localized bundles into settings host`
44. [DONE] Git Commit: `feat(ui): load localized bundles into settings host` (hash: `1cef28ba`)
45. [DONE] Switch Settings UI surfaces to dictionary-driven lookup. Scope: `src/client/ui/src/components/settings/settings-header.tsx`, `src/client/ui/src/components/settings/settings-footer.tsx`, `src/client/ui/src/components/settings/general-settings.tsx`. Target commit: `refactor(ui): localize settings surfaces`
46. [DONE] Git Commit: `refactor(ui): localize settings surfaces` (hash: `83a19782`)
47. [DONE] Switch Session system surfaces to dictionary-driven lookup. Scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/empty-state.tsx`, `src/client/ui/src/session/dialog-panel.tsx`. Target commit: `refactor(ui): localize session system surfaces`
48. [DONE] Git Commit: `refactor(ui): localize session system surfaces` (hash: `4fcb9cbc`)
49. [DONE] Switch workflow help and questionnaire surfaces to dictionary-driven lookup. Scope: `src/client/project-manager/components/description/description-step-help.tsx`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`. Target commit: `refactor(pm): localize workflow help surfaces`
50. [DONE] Git Commit: `refactor(pm): localize workflow help surfaces` (hash: `d9aaf7f5`)
51. [DONE] Switch Project Manager shell/navigation labels to dictionary-driven lookup. Scope: `src/client/project-manager/components/layout/sidebar.tsx`, `src/client/project-manager/components/layout/toolbar.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`. Target commit: `refactor(pm): localize shell navigation surfaces`
52. [TODO] Git Commit: `refactor(pm): localize shell navigation surfaces` (hash: TBD)

## Phase 6 — SSOT, Verification, And Release (owner: Docs/Release, updated: 2026-04-01)
### Stream: Documentation And Verification
53. [TODO] Promote the implemented localization architecture into live SSOT docs and sync system navigation. Scope: `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`. Target commit: `docs(architecture): sync localization ssot`
54. [TODO] Git Commit: `docs(architecture): sync localization ssot` (hash: TBD)
55. [TODO] Run targeted verification for touched packages and clients. Scope: `@codeai-hub/localization`, `@codeai-hub/core`, `webview`.

### Stream: Release
56. [TODO] Update release-facing docs for the localization rollout from a clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare ui localization release notes`
57. [TODO] Git Commit: `docs(release): prepare ui localization release notes` (hash: TBD)
58. [TODO] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` from the clean tree. Scope: release-generated version files and manifests. Target commit: `build(release): assemble ui localization release`
59. [TODO] Git Commit: `build(release): assemble ui localization release` (hash: TBD)
60. [TODO] Archive this completed TODO plan and record the session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/SessionXXX.md`. Target commit: `docs(session): record ui localization release`
61. [TODO] Git Commit: `docs(session): record ui localization release` (hash: TBD)
