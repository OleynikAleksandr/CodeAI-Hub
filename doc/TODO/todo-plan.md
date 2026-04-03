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
11. [TODO] Mark response-mode option copy so remaining settings explanatory text no longer stays hardcoded. Scope: `src/client/ui/src/components/settings/general-response-mode/response-mode-copy.ts`, `assets/localization/source/en/ui_helper_text.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(settings-localization): localize response mode copy`
12. [TODO] Git Commit: `fix(settings-localization): localize response mode copy` (hash: TBD)

## Phase 2 — Project Manager Shell And Workflow Entry Surfaces (owner: PM, updated: 2026-04-03)
### Stream: Description Provider Picker
13. [DONE] Mark Description provider picker shell labels and picker title through explicit localization categories. Scope: `src/client/project-manager/components/description/description-provider-picker.tsx`, `assets/localization/source/en/ui_labels.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize description provider picker labels`
14. [TODO] Git Commit: `fix(pm-localization): localize description provider picker labels` (hash: TBD)
15. [TODO] Mark Description provider picker guidance/status copy through explicit user-facing categories. Scope: `src/client/project-manager/components/description/description-provider-picker.tsx`, `assets/localization/source/en/messages_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize description provider picker messages`
16. [TODO] Git Commit: `fix(pm-localization): localize description provider picker messages` (hash: TBD)

### Stream: PM Shell Placeholders And Modals
17. [TODO] Mark panel container headers and empty placeholders so generic PM shell copy no longer stays hardcoded. Scope: `src/client/project-manager/components/layout/panel-container.tsx`, `assets/localization/source/en/ui_labels.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize panel container shell`
18. [TODO] Git Commit: `fix(pm-localization): localize panel container shell` (hash: TBD)
19. [TODO] Mark add-workspace modal labels, placeholders, and validation copy with explicit categories. Scope: `src/client/project-manager/components/layout/main-layout.tsx`, `assets/localization/source/en/messages_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize add workspace modal`
20. [TODO] Git Commit: `fix(pm-localization): localize add workspace modal` (hash: TBD)
21. [TODO] Mark status-bar shell copy with explicit categories. Scope: `src/client/project-manager/components/layout/status-bar.tsx`, `assets/localization/source/en/ui_labels.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize status bar shell`
22. [TODO] Git Commit: `fix(pm-localization): localize status bar shell` (hash: TBD)

### Stream: Shared Artifact Helpers
23. [TODO] Mark shared artifact repair CTA and error copy with explicit categories. Scope: `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`, `assets/localization/source/en/messages_for_the_user.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(pm-localization): localize artifact repair copy`
24. [TODO] Git Commit: `fix(pm-localization): localize artifact repair copy` (hash: TBD)

## Phase 3 — Verification, Release, And Handoff (owner: QA/Release/Docs, updated: 2026-04-03)
### Stream: Targeted Verification
25. [TODO] Run targeted builds for touched localization/settings/PM surfaces and verify the packaged-fix candidates from the workspace before release packaging. Scope: `@codeai-hub/localization`, webview/project-manager builds, `doc/TODO/todo-plan.md`.
26. [TODO] Update release-facing docs for the post-release localization follow-up. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare post-release localization fix notes`
27. [TODO] Git Commit: `docs(release): prepare post-release localization fix notes` (hash: TBD)

### Stream: Build And Session Closure
28. [TODO] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`, and confirm the packaged follow-up release shows the newly marked surfaces under the correct categories. Scope: release-generated version files and manifests. Target commit: `build(release): assemble post-release localization fix release`
29. [TODO] Git Commit: `build(release): assemble post-release localization fix release` (hash: TBD)
30. [TODO] Record the completed fixes, the new release target, and the remaining manual packaged-test checklist in the active session report. Scope: `doc/Sessions/Session026.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(session): record post-release localization fix release`
31. [TODO] Git Commit: `docs(session): record post-release localization fix release` (hash: TBD)
