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
49. [TODO] Git Commit: `fix(settings-localization): localize claude thinking sync helper copy` (hash: TBD)
