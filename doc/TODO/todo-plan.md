# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/Localization_Category_Current_Semantics_And_Authoring_Boundary.md`, `doc/Sessions/Session024.md`, `doc/Sessions/Session025.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`.
- Этот `TODO Plan` закрывает release scope: следующая сборка должна принести 4-category localization model (`UI Labels`, `UI Helper Text`, `Messages for the User`, `Artifacts for the User`), полную маркировку существующего текста и гарантировать, что весь user-facing text, отмеченный для русского языка, реально отображается/генерируется на русском, а `Internal Agent Instructions` остаются English-only.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Любое изменение логики или архитектуры требует синхронного обновления `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md` и связанных active-docs в том же commit, если они затронуты данным изменением.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Таргетные проверки в ходе stream: `npm run build --workspace @codeai-hub/localization`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run build:project-manager`, `npm run compile` — запускать по затронутым поверхностям и обязательно перед релизной фазой.

## Phase 0 — Scope Bootstrap (owner: Docs, updated: 2026-04-03)
### Stream: Planning Intake
1. [DONE] Freeze the approved four-category localization architecture, mark the planning document as execution-ready, and replace the placeholder TODO with this phase-based plan. Scope: `doc/SolidWorks-WorkFlow/Plans/Localization_Category_Current_Semantics_And_Authoring_Boundary.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session025.md`. Target commit: `docs(plan): define four-category localization release scope`
2. [DONE] Git Commit: `docs(plan): define four-category localization release scope` (hash: `67defc55`)

## Phase 1 — Settings Model And Runtime Contract (owner: Localization/Settings, updated: 2026-04-03)
### Stream: Package Contract
3. [DONE] Define the four user-facing category ids plus the English-only `Internal Agent Instructions` marker in the package contract and module SSOT. Scope: `packages/localization/src/localization-contract.ts`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/TODO/todo-plan.md`. Target commit: `feat(localization): define four-category text taxonomy`
4. [DONE] Git Commit: `feat(localization): define four-category text taxonomy` (hash: `b97ccc9c`)
5. [DONE] Rewire source registry and facade normalization around the four user-facing categories while keeping a temporary bridge for legacy saved snapshots. Scope: `packages/localization/src/source-dictionary-registry.ts`, `packages/localization/src/localization-facade.ts`, `doc/TODO/todo-plan.md`. Target commit: `feat(localization): bridge four-category runtime mapping`
6. [TODO] Git Commit: `feat(localization): bridge four-category runtime mapping` (hash: TBD)

### Stream: Persisted Settings And Core Hydration
7. [TODO] Simplify persisted general localization settings so user-visible controls are independent category selectors with English default instead of `Default language` / `Workflow Terms Policy`. Scope: `src/extension-module/settings/general-settings.ts`, `src/extension-module/settings/settings-storage.ts`, `doc/TODO/todo-plan.md`. Target commit: `feat(settings): simplify persisted localization controls`
8. [TODO] Git Commit: `feat(settings): simplify persisted localization controls` (hash: TBD)
9. [TODO] Update Core and extension settings hydration to emit and consume the four-category snapshot while keeping legacy saved data readable. Scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `src/extension-module/settings/localization-runtime-service.ts`, `doc/TODO/todo-plan.md`. Target commit: `feat(core): hydrate four-category localization settings`
10. [TODO] Git Commit: `feat(core): hydrate four-category localization settings` (hash: TBD)

### Stream: Browser Settings State
11. [TODO] Rework browser raw/model settings types for the four categories and explicit `Default Language (English)` reset semantics. Scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `doc/TODO/todo-plan.md`. Target commit: `feat(settings-ui): define four-category browser localization model`
12. [TODO] Git Commit: `feat(settings-ui): define four-category browser localization model` (hash: TBD)
13. [TODO] Update settings state support and selector behavior so clearing a category restores `Default Language (English)` and the old default/policy controls disappear. Scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `doc/TODO/todo-plan.md`. Target commit: `feat(settings-ui): normalize category reset to english default`
14. [TODO] Git Commit: `feat(settings-ui): normalize category reset to english default` (hash: TBD)
15. [TODO] Replace the localization settings card with the four approved categories and align the browser lookup bindings with the new category model. Scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `src/client/ui/src/app-host/use-localization.ts`, `doc/TODO/todo-plan.md`. Target commit: `feat(settings-ui): expose four-category localization controls`
16. [TODO] Git Commit: `feat(settings-ui): expose four-category localization controls` (hash: TBD)

## Phase 2 — English Source Dictionaries And Lookup Runtime (owner: Localization, updated: 2026-04-03)
### Stream: Bundled Dictionaries
17. [TODO] Introduce English source dictionaries for `UI Labels` and `UI Helper Text` and wire them into runtime lookup. Scope: `assets/localization/source/en/ui_labels.json`, `assets/localization/source/en/ui_helper_text.json`, `packages/localization/src/source-dictionary-registry.ts`. Target commit: `feat(localization): add ui label and helper dictionaries`
18. [TODO] Git Commit: `feat(localization): add ui label and helper dictionaries` (hash: TBD)
19. [TODO] Introduce English source dictionaries for `Messages for the User` and `Artifacts for the User` and wire them into runtime lookup. Scope: `assets/localization/source/en/messages_for_the_user.json`, `assets/localization/source/en/artifacts_for_the_user.json`, `packages/localization/src/source-dictionary-registry.ts`. Target commit: `feat(localization): add user message and artifact dictionaries`
20. [TODO] Git Commit: `feat(localization): add user message and artifact dictionaries` (hash: TBD)
21. [TODO] Update materializer/runtime payload behavior so four-category bundles resolve correctly and `Internal Agent Instructions` stay outside user-facing materialization. Scope: `packages/localization/src/localization-materializer.ts`, `src/client/ui/src/app-host/localization-runtime-contract.ts`, `doc/TODO/todo-plan.md`. Target commit: `feat(localization): exclude internal instructions from user bundles`
22. [TODO] Git Commit: `feat(localization): exclude internal instructions from user bundles` (hash: TBD)

## Phase 3 — Mandatory Migration Of Existing Text (owner: UI/PM/Core, updated: 2026-04-03)
### Stream: Shared Settings And Session Surfaces
23. [TODO] Mark shared Settings shell text with explicit `UI Labels` / `UI Helper Text` categories. Scope: `src/client/ui/src/components/settings/settings-header.tsx`, `src/client/ui/src/components/settings/settings-footer.tsx`, `src/client/ui/src/components/settings/general-settings.tsx`. Target commit: `refactor(localization): mark settings shell text`
24. [TODO] Git Commit: `refactor(localization): mark settings shell text` (hash: TBD)
25. [TODO] Mark session shell/status text with explicit `Messages for the User` categories. Scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/empty-state.tsx`, `src/client/ui/src/session/dialog-panel.tsx`. Target commit: `refactor(localization): mark session user messages`
26. [TODO] Git Commit: `refactor(localization): mark session user messages` (hash: TBD)

### Stream: Project Manager Navigation And Help
27. [TODO] Mark Project Manager navigation, toolbar, and workspace tree terms with explicit `UI Labels` categories. Scope: `src/client/project-manager/components/layout/sidebar.tsx`, `src/client/project-manager/components/layout/toolbar.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`. Target commit: `refactor(localization): mark project manager labels`
28. [TODO] Git Commit: `refactor(localization): mark project manager labels` (hash: TBD)
29. [TODO] Mark Description and Virtual Simulation explanatory surfaces with explicit `Messages for the User` categories. Scope: `src/client/project-manager/components/description/description-step-help.tsx`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`, `doc/TODO/todo-plan.md`. Target commit: `refactor(localization): mark workflow help text`
30. [TODO] Git Commit: `refactor(localization): mark workflow help text` (hash: TBD)
31. [TODO] Mark remaining diagram/help raw strings and artifact-header shell labels with explicit categories. Scope: `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/layout/stage-artifact-header-toggle.tsx`, `doc/TODO/todo-plan.md`. Target commit: `refactor(localization): mark remaining project manager strings`
32. [TODO] Git Commit: `refactor(localization): mark remaining project manager strings` (hash: TBD)

### Stream: Forms And Existing User-Facing Artifacts
33. [TODO] Mark questionnaire shell and form-copy entrypoints with explicit `Artifacts for the User` categories. Scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/project-manager/services/description-questionnaire-service.ts`, `doc/TODO/todo-plan.md`. Target commit: `refactor(localization): mark questionnaire user artifacts`
34. [TODO] Git Commit: `refactor(localization): mark questionnaire user artifacts` (hash: TBD)

## Phase 4 — Internal Agent Instructions And Artifact Language Pipeline (owner: Workflow/Core, updated: 2026-04-03)
### Stream: Internal Agent Instruction Classification
35. [TODO] Classify workflow contract templates and bundled prompt assets as `Internal Agent Instructions` and document their English-only boundary. Scope: `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `doc/TODO/todo-plan.md`. Target commit: `refactor(localization): classify internal agent templates`
36. [TODO] Git Commit: `refactor(localization): classify internal agent templates` (hash: TBD)
37. [TODO] Parameterize Description and Virtual Simulation prompt entrypoints so user-facing artifact language is injected while internal instructions remain English. Scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/core/src/templates/source/virtual-simulation-prompt.md`, `doc/TODO/todo-plan.md`. Target commit: `feat(workflow): inject artifact language into core prompts`
38. [TODO] Git Commit: `feat(workflow): inject artifact language into core prompts` (hash: TBD)
39. [TODO] Parameterize Diagram Modules prompt assets so final user-facing outputs follow `Artifacts for the User` while internal prompt text stays English. Scope: `packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md`, `packages/agents/diagram-modules-agent/assets/product-parts-index-template.md`, `doc/TODO/todo-plan.md`. Target commit: `feat(workflow): inject artifact language into diagram prompts`
40. [TODO] Git Commit: `feat(workflow): inject artifact language into diagram prompts` (hash: TBD)

### Stream: Session Start / Prompt Pack
41. [TODO] Thread `Artifacts for the User` language from Settings into Project Manager session start / submit flows and prompt-pack assembly. Scope: `src/client/project-manager/services/description-submit-service.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`. Target commit: `feat(workflow): pass artifact language through prompt pack`
42. [TODO] Git Commit: `feat(workflow): pass artifact language through prompt pack` (hash: TBD)

## Phase 5 — Verification And Russian Localization Acceptance (owner: QA/Release, updated: 2026-04-03)
### Stream: Focused Tests
43. [TODO] Add or refresh focused tests for artifact-language threading in prompt pack and workflow start services. Scope: `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`, `doc/TODO/todo-plan.md`. Target commit: `test(workflow): verify artifact language threading`
44. [TODO] Git Commit: `test(workflow): verify artifact language threading` (hash: TBD)
45. [TODO] Add or refresh focused tests for internal-instruction classification at the Core contract layer. Scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`, `doc/TODO/todo-plan.md`. Target commit: `test(core): verify internal instruction classification`
46. [TODO] Git Commit: `test(core): verify internal instruction classification` (hash: TBD)

### Stream: Targeted Verification
47. [TODO] Run targeted builds and manual Russian-surface verification for localization, Core, webview, and Project Manager before release packaging. Scope: `@codeai-hub/localization`, `@codeai-hub/core`, webview/project-manager builds, `doc/TODO/todo-plan.md`.
48. [TODO] Update release-facing docs for the four-category localization release from the clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare four-category localization release notes`
49. [TODO] Git Commit: `docs(release): prepare four-category localization release notes` (hash: TBD)

## Phase 6 — Release Build And Closure (owner: Release/Docs, updated: 2026-04-03)
### Stream: Build And Ship
50. [TODO] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm that a Russian-localized profile loads translated marked text while `Internal Agent Instructions` remain English-only. Scope: release-generated version files and manifests. Target commit: `build(release): assemble four-category localization release`
51. [TODO] Git Commit: `build(release): assemble four-category localization release` (hash: TBD)
52. [TODO] Archive this TODO plan, update the active session report, and record post-release validation notes. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/`. Target commit: `docs(session): record four-category localization release`
53. [TODO] Git Commit: `docs(session): record four-category localization release` (hash: TBD)
