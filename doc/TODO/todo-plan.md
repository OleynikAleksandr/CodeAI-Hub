# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/Localization_Release_1.1.870_PostRelease_Fixes.md`, `doc/Sessions/Session025.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`.
- Этот `TODO Plan` закрывает post-release scope после user testing release `1.1.870`: нужно добрать отсутствующие category markers / dictionary entries для оставшегося user-facing текста, пересобрать релиз и снова проверить packaged VSIX.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Любое изменение логики или архитектуры требует синхронного обновления `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md` и связанных active-docs в том же commit, если они затронуты данным изменением.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Таргетные проверки в ходе stream: `npm run build --workspace @codeai-hub/localization`, `npm run build:webview`, `npm run build:project-manager`, `npm run compile` — запускать по затронутым поверхностям и обязательно перед новым release build.

## Phase 0 — Post-Release Scope Bootstrap (owner: Docs, updated: 2026-04-03)
### Stream: Planning Intake
1. [DONE] Archive the completed `1.1.870` release TODO and create an execution-ready planning doc for packaged post-release localization fixes. Scope: `doc/TODO/Archive/todo-plan-up-to-phase6-four-category-localization-release-1.1.870-2026-04-03.md`, `doc/SolidWorks-WorkFlow/Plans/Localization_Release_1.1.870_PostRelease_Fixes.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define post-release localization fix scope`
2. [DONE] Git Commit: `docs(plan): define post-release localization fix scope` (hash: `811d8a80`)
3. [DONE] Create the new active session report early and record the packaged-release symptom plus the new fix stream so context survives session compaction. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): bootstrap post-release localization fix report`
4. [DONE] Git Commit: `docs(session): bootstrap post-release localization fix report` (hash: `6484106d`)

## Phase 1 — Settings Surfaces Missing Localization Ownership (owner: Settings/Localization, updated: 2026-04-03)
### Stream: Localization Settings Card
5. [DONE] Mark the remaining Localization settings labels so card title/row labels/reset placeholder resolve through `UI Labels`. Scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `assets/localization/source/en/ui_labels.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize localization card labels`
6. [DONE] Git Commit: `fix(settings-localization): localize localization card labels` (hash: `4f320934`)
7. [DONE] Mark the remaining Localization settings explanatory copy so intro/helper/engine/glossary descriptions resolve through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize localization card helper text`
8. [DONE] Git Commit: `fix(settings-localization): localize localization card helper text` (hash: `9d6edca9`)

### Stream: Glossary And Response-Mode Copy
9. [DONE] Mark glossary editor validation and status copy so remaining Localization helper surfaces resolve through explicit dictionaries. Scope: `src/client/ui/src/components/settings/localization-glossary-editor.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize glossary editor copy`
10. [DONE] Git Commit: `fix(settings-localization): localize glossary editor copy` (hash: `4b3959c4`)
11. [DONE] Mark response-mode option copy so remaining settings explanatory text no longer stays hardcoded. Scope: `src/client/ui/src/components/settings/general-response-mode/response-mode-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize response mode copy`
12. [DONE] Git Commit: `fix(settings-localization): localize response mode copy` (hash: `20fa5ccf`)

## Phase 2 — Project Manager Shell And Workflow Entry Surfaces (owner: PM, updated: 2026-04-03)
### Stream: Description Provider Picker
13. [DONE] Mark Description provider picker shell labels and picker title through explicit localization categories. Scope: `src/client/project-manager/components/description/description-provider-picker.tsx`, `assets/localization/source/en/ui_labels.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize description provider picker labels`
14. [DONE] Git Commit: `fix(pm-localization): localize description provider picker labels` (hash: `8c3466f0`)
15. [DONE] Mark Description provider picker guidance/status copy through explicit user-facing categories. Scope: `src/client/project-manager/components/description/description-provider-picker.tsx`, `assets/localization/source/en/messages_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize description provider picker messages`
16. [DONE] Git Commit: `fix(pm-localization): localize description provider picker messages` (hash: `bfb33e98`)

### Stream: PM Shell Placeholders And Modals
17. [DONE] Mark panel container headers and empty placeholders so generic PM shell copy no longer stays hardcoded. Scope: `src/client/project-manager/components/layout/panel-container.tsx`, `assets/localization/source/en/ui_labels.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize panel container shell`
18. [DONE] Git Commit: `fix(pm-localization): localize panel container shell` (hash: `11c7d4c0`)
19. [TODO] Mark add-workspace modal labels, placeholders, and validation copy with explicit categories. Scope: `src/client/project-manager/components/layout/main-layout.tsx`, `assets/localization/source/en/messages_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize add workspace modal`
20. [TODO] Git Commit: `fix(pm-localization): localize add workspace modal` (hash: TBD)
21. [TODO] Mark status-bar shell copy with explicit categories. Scope: `src/client/project-manager/components/layout/status-bar.tsx`, `assets/localization/source/en/ui_labels.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize status bar shell`
22. [TODO] Git Commit: `fix(pm-localization): localize status bar shell` (hash: TBD)

### Stream: Shared Artifact Helpers
23. [TODO] Mark shared artifact repair CTA and error copy with explicit categories. Scope: `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`, `assets/localization/source/en/messages_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize artifact repair copy`
24. [TODO] Git Commit: `fix(pm-localization): localize artifact repair copy` (hash: TBD)

## Phase 3 — Verification, Release, And Handoff (owner: QA/Release/Docs, updated: 2026-04-03)
### Stream: Targeted Verification
25. [DONE] Run targeted builds for touched localization/settings/PM surfaces and verify the packaged-fix candidates from the workspace before release packaging. Scope: `@codeai-hub/localization`, webview/project-manager builds, `doc/TODO/todo-plan.md`.
26. [DONE] Refresh the tracked webview bundle after targeted verification so release packaging starts from a clean tree. Scope: `media/react-chat.js`, `doc/TODO/todo-plan.md`. Target commit: `build(webview): refresh localization follow-up bundle`
27. [DONE] Git Commit: `build(webview): refresh localization follow-up bundle` (hash: `0a79b9df`)
28. [DONE] Update release-facing docs for the post-release localization follow-up. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare post-release localization fix notes`
29. [DONE] Git Commit: `docs(release): prepare post-release localization fix notes` (hash: `fb6d2e38`)

### Stream: Build And Session Closure
30. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged follow-up release shows the newly marked surfaces under the correct categories. Scope: release-generated version files and manifests. Target commit: `build(release): assemble post-release localization fix release`
31. [DONE] Git Commit: `build(release): assemble post-release localization fix release` (hash: `34e3ef6e`)
32. [DONE] Record the completed fixes, the new release target, and the remaining manual packaged-test checklist in the active session report. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record post-release localization fix release`
33. [DONE] Git Commit: `docs(session): record post-release localization fix release` (hash: `7871891c`)
34. [DONE] Localize Description questionnaire field titles and inline helper hints so `Artifacts for the User` affects the full questionnaire body instead of only the shell. Scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `assets/localization/source/en/artifacts_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize description questionnaire fields`
35. [DONE] Git Commit: `fix(pm-localization): localize description questionnaire fields` (hash: `92161466`)

## Phase 4 — Localization Authoring Guardrail (owner: Docs/Architecture, updated: 2026-04-03)
### Stream: Text Ownership SSOT
36. [DONE] Add a permanent SSOT contract that requires explicit localization ownership for every new product-authored text surface and link it from the system-level architecture entrypoints. Scope: `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(localization): codify text ownership boundary`
37. [DONE] Git Commit: `docs(localization): codify text ownership boundary` (hash: `cea35e79`)
38. [DONE] Mark shared session-continuity helper copy so Claude, Codex, and Gemini tabs resolve that explanatory paragraph through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/session-continuity-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize session continuity helper copy`
39. [DONE] Git Commit: `fix(settings-localization): localize session continuity helper copy` (hash: `0f55096a`)
40. [DONE] Mark shared provider auto-update helper copy so Claude, Codex, and Gemini tabs resolve that explanatory text through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/provider-versions-ui.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize provider auto-update helper copy`
41. [DONE] Git Commit: `fix(settings-localization): localize provider auto-update helper copy` (hash: `4e604f2f`)
42. [DONE] Mark the `Claude Default model` explanatory copy so the top card description and note resolve through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/claude-default-model/claude-default-model-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize claude model helper copy`
43. [DONE] Git Commit: `fix(settings-localization): localize claude model helper copy` (hash: `245ea638`)
44. [DONE] Mark the `Codex Default model` explanatory copy so the top card description, reasoning helper text, and note resolve through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/codex-default-model/codex-default-model-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize codex model helper copy`
45. [DONE] Git Commit: `fix(settings-localization): localize codex model helper copy` (hash: `a4ebd135`)
46. [DONE] Mark the `Gemini Default model` explanatory copy so the top card description, thinking helper text, and note resolve through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/gemini-default-model/gemini-default-model-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize gemini model helper copy`
47. [DONE] Git Commit: `fix(settings-localization): localize gemini model helper copy` (hash: `aa678d81`)
48. [DONE] Mark the `Claude Thinking Settings` dialog-sync helper copy so that explanatory text resolves through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/thinking-settings.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize claude thinking sync helper copy`
49. [DONE] Git Commit: `fix(settings-localization): localize claude thinking sync helper copy` (hash: `8c378a65`)
50. [DONE] Mark the `Enable thinking mode` explanatory copy so the main Claude thinking helper block resolves through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/thinking/thinking-toggle.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize claude thinking toggle copy`
51. [DONE] Git Commit: `fix(settings-localization): localize claude thinking toggle copy` (hash: `8ed50baf`)
52. [DONE] Mark the Claude thinking token helper legend so that depth guidance resolves through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/thinking/thinking-token-input.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize claude thinking token helper copy`
53. [DONE] Git Commit: `fix(settings-localization): localize claude thinking token helper copy` (hash: `3da4f2ef`)
54. [DONE] Mark the Claude thinking pro-tip body so that the remaining tip helper copy resolves through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/thinking/thinking-pro-tip.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize claude thinking pro tip`
55. [DONE] Git Commit: `fix(settings-localization): localize claude thinking pro tip` (hash: `8c7157ef`)
56. [DONE] Mark the Codex reasoning dialog guidance so the modal subtitle resolves through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/codex-default-model/codex-reasoning-dialog.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize codex reasoning dialog helper copy`
57. [DONE] Git Commit: `fix(settings-localization): localize codex reasoning dialog helper copy` (hash: `11923358`)
58. [DONE] Mark the Gemini thinking dialog guidance so the modal subtitle resolves through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/gemini-default-model/gemini-thinking-dialog.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize gemini thinking dialog helper copy`
59. [DONE] Git Commit: `fix(settings-localization): localize gemini thinking dialog helper copy` (hash: `adb74198`)

## Phase 5 — Provider Helper Follow-Up Release (owner: QA/Release/Docs, updated: 2026-04-03)
### Stream: Release Notes And Packaging
60. [DONE] Prepare release-facing docs for the provider-settings helper follow-up and record the new packaged target in the active TODO. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare provider helper localization follow-up notes`
61. [DONE] Git Commit: `docs(release): prepare provider helper localization follow-up notes` (hash: `ba0f45bd`)
62. [DONE] Refresh the tracked `media/react-chat.js` bundle after the helper-copy sweep so packaging starts from a clean tree. Scope: `media/react-chat.js`, `doc/TODO/todo-plan.md`. Target commit: `build(webview): refresh provider helper localization bundle`
63. [DONE] Git Commit: `build(webview): refresh provider helper localization bundle` (hash: `57564a96`)
64. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged follow-up release includes the expanded provider/helper localization coverage. Scope: release-generated version files and manifests. Target commit: `build(release): assemble provider helper localization release`
65. [DONE] Git Commit: `build(release): assemble provider helper localization release` (hash: `3e670f83`)
66. [DONE] Update the active session report with the helper-surface fix chain, the new SSOT guardrail, and the packaged follow-up release output. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record provider helper localization release`
67. [DONE] Git Commit: `docs(session): record provider helper localization release` (hash: `3881ea42`)
68. [DONE] Tighten the Description questionnaire translation lookup typing so release `typecheck:webview` no longer fails on dynamic field-id access. Scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): tighten questionnaire translation lookup typing`
69. [DONE] Git Commit: `fix(pm-localization): tighten questionnaire translation lookup typing` (hash: `02aab669`)
70. [DONE] Mark the `Settings only` explanatory copy so that the standalone settings shell body/hint no longer stay English-only. Scope: `src/client/ui/src/app-host/settings-only-host.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize settings-only shell copy`
71. [DONE] Git Commit: `fix(settings-localization): localize settings-only shell copy` (hash: `224b5c49`)
72. [DONE] Mark the provider update warning banner so that the per-provider risk notice resolves through `Messages for the User` instead of staying English-only. Scope: `src/client/ui/src/components/settings/provider-versions-ui.tsx`, `assets/localization/source/en/messages_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize provider warning banner`
73. [DONE] Git Commit: `fix(settings-localization): localize provider warning banner` (hash: `d3f89a56`)
74. [DONE] Mark the Claude per-model descriptions so the explanatory sentences under each Claude alias resolve through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/claude-default-model/claude-default-model-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize claude model option descriptions`
75. [DONE] Git Commit: `fix(settings-localization): localize claude model option descriptions` (hash: `7169378c`)
76. [DONE] Mark the Codex per-model descriptions so the explanatory sentences under each recommended Codex model resolve through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/codex-default-model/codex-default-model-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize codex model option descriptions`
77. [DONE] Git Commit: `fix(settings-localization): localize codex model option descriptions` (hash: `1fc26c74`)
78. [DONE] Mark the Gemini per-model descriptions so the explanatory sentences under each recommended Gemini model resolve through `UI Helper Text`. Scope: `src/client/ui/src/components/settings/gemini-default-model/gemini-default-model-card.tsx`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize gemini model option descriptions`
79. [DONE] Git Commit: `fix(settings-localization): localize gemini model option descriptions` (hash: `a948f346`)

## Phase 6 — Provider Settings Tail Release (owner: QA/Release/Docs, updated: 2026-04-03)
### Stream: Release Notes And Packaging
80. [DONE] Prepare release-facing docs for the packaged provider-settings tail fixes and record the next patch release target in the active TODO. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare provider settings tail release notes`
81. [DONE] Git Commit: `docs(release): prepare provider settings tail release notes` (hash: `5f18f8fe`)
82. [DONE] Refresh the tracked `media/react-chat.js` bundle after the provider-settings tail sweep so release packaging starts from a clean tree. Scope: `media/react-chat.js`, `doc/TODO/todo-plan.md`. Target commit: `build(webview): refresh provider settings tail bundle`
83. [DONE] Git Commit: `build(webview): refresh provider settings tail bundle` (hash: `1e4294d0`)
84. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged follow-up release includes the provider warning/model-description/settings-only fixes. Scope: release-generated version files and manifests. Target commit: `build(release): assemble provider settings tail release`
85. [DONE] Git Commit: `build(release): assemble provider settings tail release` (hash: `e5ac4645`)
86. [DONE] Update the active session report with the provider-settings tail fix chain and the new packaged release output. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record provider settings tail release`
87. [DONE] Git Commit: `docs(session): record provider settings tail release` (hash: `4f68fb2f`)

## Phase 7 — Internal Prompt English Boundary And Thinking Language Fix (owner: PM/Providers/Docs, updated: 2026-04-03)
### Stream: Runtime Prompt Scaffolding
88. [DONE] Convert workflow runtime prompt scaffolding and file-first fallback copy to English so prompt-pack metadata stays inside the `Internal Agent Instructions` English-only boundary. Scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/description-submit-service.ts`, `doc/TODO/todo-plan.md`. Target commit: `fix(workflow-prompts): enforce english runtime scaffolding`
89. [DONE] Git Commit: `fix(workflow-prompts): enforce english runtime scaffolding` (hash: `95e801e6`)
90. [DONE] Convert Description agent prompt/template assets to English source so bundled internal instructions no longer ship Russian text into runtime prompt packs. Scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/agents/description-agent/assets/description-template.md`, `doc/TODO/todo-plan.md`. Target commit: `fix(description-agent): enforce english internal templates`
91. [DONE] Git Commit: `fix(description-agent): enforce english internal templates` (hash: `4b095d83`)
92. [DONE] Convert Diagram Modules prompt/reference assets to English source so bundled staged-contract instructions stay English-only. Scope: `packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md`, `packages/agents/diagram-modules-agent/assets/diagram-modules-field-reference.md`, `doc/TODO/todo-plan.md`. Target commit: `fix(diagram-agent): enforce english prompt assets`
93. [DONE] Git Commit: `fix(diagram-agent): enforce english prompt assets` (hash: `41d29ba6`)
94. [DONE] Convert Diagram Modules merge rules and any remaining staged internal guidance assets to English source, then refresh affected prompt-pack tests if expectations changed. Scope: `packages/agents/diagram-modules-agent/assets/diagram-modules-merge-rules.md`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`. Target commit: `fix(diagram-agent): enforce english staged guidance`
95. [DONE] Git Commit: `fix(diagram-agent): enforce english staged guidance` (hash: `d8291f19`)

### Stream: Thinking Language Contract
96. [DONE] Remove the hardcoded Russian thinking/reasoning translation target so Codex and Gemini fall back to original provider-language thoughts instead of forcing Russian regardless of settings. Scope: `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts`, `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`, `doc/TODO/todo-plan.md`. Target commit: `fix(provider-thinking): stop forcing russian thought translation`
97. [DONE] Git Commit: `fix(provider-thinking): stop forcing russian thought translation` (hash: `53c3e3e4`)
98. [DONE] Convert the bundled `virtual-simulation` internal prompt source to English and refresh the generated bundled snapshot so runtime no longer ships stale Russian base64 prompt content. Scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/core/src/templates/bundled-templates.ts`, `doc/TODO/todo-plan.md`. Target commit: `fix(virtual-simulation): enforce english internal prompt`
99. [DONE] Git Commit: `fix(virtual-simulation): enforce english internal prompt` (hash: `f72c9186`)
100. [DONE] Refresh template-sync and bundled-contract tests so internal-template expectations no longer assume Russian source text for Description and Virtual Simulation assets. Scope: `packages/core/src/templates/template-sync-service.test.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`. Target commit: `test(workflow-contracts): expect english internal templates`
101. [DONE] Git Commit: `test(workflow-contracts): expect english internal templates` (hash: `55999af4`)

## Phase 8 — Internal Prompt English Release Follow-Up (owner: QA/Release/Docs, updated: 2026-04-03)
### Stream: Release Notes And Packaging
102. [DONE] Prepare release-facing docs for the internal-prompt English boundary and thinking-language follow-up so the next packaged patch release is documented before version bump. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare internal prompt english follow-up notes`
103. [DONE] Git Commit: `docs(release): prepare internal prompt english follow-up notes` (hash: `b01c1326`)
104. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged follow-up release includes English internal workflow prompts and no longer forces Russian thinking translation. Scope: release-generated version files and manifests. Target commit: `build(release): assemble internal prompt english release`
105. [DONE] Git Commit: `build(release): assemble internal prompt english release` (hash: `940fb78a`)
106. [DONE] Update the active session report with the internal-prompt/t thinking fix chain and the new packaged release output. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record internal prompt english release`
107. [DONE] Git Commit: `docs(session): record internal prompt english release` (hash: `6785f44c`)

## Phase 9 — Claude Provider-Home Memory Isolation Follow-Up (owner: Claude/Release/Docs, updated: 2026-04-03)
### Stream: Runtime Isolation Fix
108. [DONE] Stop Claude query options from exposing the real user home as an additional `CLAUDE.md` discovery root and lock provider sessions to workspace-scoped `project/local` Claude setting sources. Scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, Claude module tests, `doc/SolidWorks-WorkFlow/Modules/Claude.md`. Target commit: `fix(claude): isolate provider-home memory discovery`
109. [DONE] Git Commit: `fix(claude): isolate provider-home memory discovery` (hash: `2701887a`)

### Stream: Release Notes And Packaging
110. [DONE] Prepare release-facing docs for the Claude provider-home memory-isolation follow-up before the next patch build. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare claude memory isolation release notes`
111. [DONE] Git Commit: `docs(release): prepare claude memory isolation release notes` (hash: `7397bba5`)
112. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged follow-up release no longer lets Claude import global `~/.claude/CLAUDE.md` into provider-home sessions. Scope: release-generated version files and manifests. Target commit: `build(release): assemble claude memory isolation release`
113. [DONE] Git Commit: `build(release): assemble claude memory isolation release` (hash: `9007cb25`)
114. [DONE] Update the active session report with the Claude provider-home memory-isolation fix chain, the packaged validation target, and the new release output. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record claude memory isolation release`
115. [DONE] Git Commit: `docs(session): record claude memory isolation release` (hash: `84d78510`)

## Phase 10 — Claude SDK Isolation Mode Follow-Up (owner: Claude/Release/Docs, updated: 2026-04-03)
### Stream: Runtime Isolation Fix
116. [DONE] Switch CodeAI Hub-managed Claude sessions to SDK isolation mode so provider turns stop auto-loading filesystem settings and `CLAUDE.md` memory from parent directories above the active workspace. Scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`, `doc/TODO/todo-plan.md`. Target commit: `fix(claude): disable filesystem claude discovery`
117. [DONE] Git Commit: `fix(claude): disable filesystem claude discovery` (hash: `fd3b4261`)
118. [DONE] Update the Claude module SSOT to record that provider-driven Claude turns run in SDK isolation mode with no filesystem `CLAUDE.md` / settings discovery. Scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(claude): record sdk isolation mode`
119. [DONE] Git Commit: `docs(claude): record sdk isolation mode` (hash: `21618bd2`)

### Stream: Release Notes And Packaging
120. [DONE] Prepare release-facing docs for the Claude SDK isolation-mode follow-up before the next patch build. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare claude sdk isolation release notes`
121. [DONE] Git Commit: `docs(release): prepare claude sdk isolation release notes` (hash: `03b79213`)
122. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged follow-up release keeps Claude provider sessions out of filesystem `CLAUDE.md` discovery entirely. Scope: release-generated version files and manifests. Target commit: `build(release): assemble claude sdk isolation release`
123. [DONE] Git Commit: `build(release): assemble claude sdk isolation release` (hash: `6b3361a2`)
124. [DONE] Update the active session report with the Claude SDK isolation-mode fix chain, the packaged validation target, and the new release output. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record claude sdk isolation release`
125. [DONE] Git Commit: `docs(session): record claude sdk isolation release` (hash: `1a8119c3`)

## Phase 11 — Release 1.1.876 Architecture Sync And Publish (owner: Docs/Release, updated: 2026-04-03)
### Stream: Architecture SSOT Sweep
126. [DONE] Sync the live architecture SSOT and localization contract so release `1.1.876` documents Claude full SDK isolation mode and the finalized `Artifacts for the User` vs `Internal Agent Instructions` boundary. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`. Target commit: `docs(architecture): sync localization and claude isolation ssot`
127. [DONE] Git Commit: `docs(architecture): sync localization and claude isolation ssot` (hash: `eea77470`)
128. [DONE] Refresh docs navigation and session closure records so the next context restore starts from the finalized release `1.1.876` architecture baseline. Scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record architecture sync and release publish`
129. [DONE] Git Commit: `docs(session): record architecture sync and release publish` (hash: `2671a405`)

## Phase 12 — Gemini CLI 0.36 Runtime Compatibility Hotfix (owner: Gemini/Release/Docs, updated: 2026-04-04)
### Stream: Runtime Bridge Compatibility
130. [DONE] Restore Gemini provider runtime compatibility with global `@google/gemini-cli@0.36.x` by supporting the bundle-only CLI layout, safe settings loading, and the relocated scheduler contract. Scope: `packages/Gemini_Module/src/runtime/cli-bridge-module-loader.ts`, `packages/Gemini_Module/src/runtime/cli-bridge.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`. Target commit: `fix(gemini): restore cli 0.36 runtime compatibility`
131. [DONE] Git Commit: `fix(gemini): restore cli 0.36 runtime compatibility` (hash: `5543f798`)

### Stream: Release Notes And Packaging
132. [DONE] Prepare release-facing docs for the Gemini CLI runtime-compatibility hotfix before the next patch build. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare gemini cli compatibility release notes`
133. [DONE] Git Commit: `docs(release): prepare gemini cli compatibility release notes` (hash: `a6d6dcc6`)
134. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged patch release restores Gemini provider availability with global `@google/gemini-cli@0.36.x`. Scope: release-generated version files and manifests. Target commit: `build(release): assemble gemini cli compatibility release`
135. [DONE] Git Commit: `build(release): assemble gemini cli compatibility release` (hash: `57eb642e`)
136. [DONE] Record the Gemini CLI compatibility hotfix chain and packaged validation in a new session report. Scope: `doc/Sessions/Session027.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record gemini cli compatibility release`
137. [DONE] Git Commit: `docs(session): record gemini cli compatibility release` (hash: `75fd324c`)

## Phase 13 — Provider Thinking Language Sync Hotfix (owner: Providers/Release/Docs, updated: 2026-04-04)
### Stream: Runtime Language Threading
138. [DONE] Thread the shared `Messages for the User` language through Core applied turn config and into Codex/Gemini thinking translation runtime so visible reasoning follows the selected user-facing language instead of staying English-only. Scope: `packages/core/src/config/provider-settings-snapshot.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `packages/core/src/remote-bridge/types.ts`, `packages/Codex_Module/src/messaging/*`, `packages/Codex_Module/src/session/types.ts`, `packages/Gemini_Module/src/messaging/*`, `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts`, `packages/Gemini_Module/src/session/types.ts`, provider tests, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`. Target commit: `fix(provider-thinking): sync visible thought language with settings`
139. [TODO] Git Commit: `fix(provider-thinking): sync visible thought language with settings` (hash: TBD)

### Stream: Release Notes And Packaging
140. [TODO] Prepare release-facing docs for the provider thinking-language sync hotfix before the next patch build. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare provider thinking language sync notes`
141. [TODO] Git Commit: `docs(release): prepare provider thinking language sync notes` (hash: TBD)
142. [TODO] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged patch release localizes Codex/Gemini visible thinking according to the selected `Messages for the User` language. Scope: release-generated version files and manifests. Target commit: `build(release): assemble provider thinking language sync release`
143. [TODO] Git Commit: `build(release): assemble provider thinking language sync release` (hash: TBD)
144. [TODO] Record the provider thinking-language sync hotfix chain and packaged validation in a new session report. Scope: `doc/Sessions/Session028.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record provider thinking language sync release`
145. [TODO] Git Commit: `docs(session): record provider thinking language sync release` (hash: TBD)
