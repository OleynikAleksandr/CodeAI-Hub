# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_ThinkingTranslation_BootstrapPath_Hotfix_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Стриме - некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение логики или архитектурного контракта требует синхронного обновления связанных `doc/` материалов и `todo-plan.md` до коммита.
- **Phase** завершается на чистом дереве после release wave и архивирования завершённых planning/todo артефактов текущего execution cycle.

## Phase 1 — Codex thinking translation hotfix and release 1.1.983 (owner: Codex, updated: 2026-04-14)

### Stream: Translation Policy Hotfix
1. [DONE] Исправить bootstrap-path resolution в `packages/core/src/session-translation/`, добавить regression coverage и синхронно обновить SSOT runtime translation модуля. Scope: `packages/core/src/session-translation/`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/TODO/todo-plan.md`. Commit: `fix: restore codex thinking translation bootstrap path`
2. [DONE] Git Commit: `fix: restore codex thinking translation bootstrap path` (hash: `c04bf335c`)

### Stream: Release Metadata
3. [DONE] Обновить release-facing документы на будущую версию `1.1.983` и зафиксировать hotfix в changelog перед build wave. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Commit: `docs: prepare release 1.1.983 notes`
4. [DONE] Git Commit: `docs: prepare release 1.1.983 notes` (hash: `b9d480c7b`)

### Stream: Release Wave And Closeout
5. [DONE] Выполнить таргетные проверки и `./scripts/build-all.sh`, затем зафиксировать релизную волну версии `1.1.983` (version bumps + manifests) отдельным коммитом перед финальной упаковкой. Scope: release/build wave, `package.json`, `package-lock.json`, `assets/*/manifest.json`. Commit: `build: prepare release 1.1.983 artifacts`
6. [TODO] Git Commit: `build: prepare release 1.1.983 artifacts` (hash: TBD)
7. [TODO] На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, затем заархивировать завершённые planning/todo артефакты текущего scope и обновить навигационный closeout без нового активного execution scope. Scope: `doc/SolidWorks-WorkFlow/Plans/Archive.zip`, `doc/TODO/Archive.zip`, `doc/SolidWorks-WorkFlow/Docs_Index.md`. Commit: `docs: close thinking translation hotfix scope`
8. [TODO] Git Commit: `docs: close thinking translation hotfix scope` (hash: TBD)
