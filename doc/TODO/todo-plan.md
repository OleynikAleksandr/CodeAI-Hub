# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Release target:** `1.2.57`
**Planning source:** `doc/SolidWorks-WorkFlow/Plans/PM_StatusBar_OpenSettings_Cleanup_Architecture.md`

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/PM_StatusBar_OpenSettings_Cleanup_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§33 — Settings ownership invariant)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Required reading перед каждым фиксом: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача ≤ 3 файла, пара (реализация + Git Commit).
- Husky hooks автоматически: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix` (pre-commit); `npm run check:dup`, `npm run check:links` (pre-push).
- Таргетные сборки: `npm run build:webview`, `npm run typecheck:webview`, `npm run build --workspace <package>` при необходимости.
- Real-time: todo-plan обновляется после каждого коммита (hash проставляется, статус меняется).

## Phase 1 — PM Footer Cleanup + Open Settings Prominence (owner: CodeAI Hub Bot, updated: 2026-04-23)

### Stream 1: Left-side context cleanup
1. [DONE] Удалить `pm-status-bar__left` блок (CONTEXT pill + workspace name) в `status-bar.tsx`, убрать prop `workspaceName` + его проброс у родителя — scope: `src/client/project-manager/components/layout/status-bar.tsx`, `src/client/project-manager/components/layout/main-area.tsx`, planning artifacts.
2. [DONE] Git Commit: `fix(pm): drop duplicate workspace context from footer` (hash: b45315e72)

### Stream 2: Open Settings visual contract + localization cleanup
1. [DONE] Добавить CSS-класс `pm-status-open-settings` с default/hover/active/focus-visible фазами, переключить кнопку на новый класс, удалить неиспользуемые ключи `pm.status_bar.context_label`, `pm.status_bar.no_workspace_label` из `assets/localization/source/en/ui_labels.json` — scope: `packages/ui/project-manager/styles.css`, `assets/localization/source/en/ui_labels.json`.
2. [DONE] Git Commit: `feat(pm): promote Open Settings action in footer` (hash: 7a8060ec7)

### Stream 3: SSOT sync + architectural doc update
1. [IN_PROGRESS] Обновить `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` и `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md` — footer contract больше не содержит workspace duplication, Open Settings выведен в отдельный CSS-класс и имеет visible фазы — scope: 2 doc файла.
2. [TODO] Git Commit: `docs: sync PM footer cleanup contract` (hash: TBD)

### Stream 4: Release 1.2.57 build
1. [TODO] Обновить `README.md` (`Current Release — v1.2.57`) и `CHANGELOG.md` (`## [1.2.57]`) на upcoming версию; убедиться в чистом `git status` — scope: `README.md`, `CHANGELOG.md`.
2. [TODO] Git Commit: `docs: prepare 1.2.57 release metadata` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` (версии поднимаются скриптом, tarball'ы попадают в `doc/tmp/releases/`).
4. [TODO] Git Commit: `chore: release 1.2.57` (hash: TBD — создаётся скриптом)
5. [TODO] `./scripts/build-release.sh --use-current-version` → VSIX `codeai-hub-1.2.57.vsix`; проверить `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`.
6. [TODO] Закрыть cycle: архивировать planning doc в `Plans/Archive/`, переместить todo-plan в `doc/TODO/Archive/todo-plan-phase1-pm-footer-cleanup-release-1.2.57.md`, создать новый пустой `todo-plan.md`, обновить `Docs_Index.md`, дописать Session096 report.
7. [TODO] Git Commit: `docs: archive PM footer cleanup release scope` (hash: TBD)

