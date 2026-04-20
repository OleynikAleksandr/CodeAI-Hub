# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionDialog_BubbleVisualTone_Release_1.2.29.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `README.md`
  - `CHANGELOG.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run build:project-manager`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.

## Phase 1 — Release 1.2.29 (owner: Codex, updated: 2026-04-20)
### Stream: Packaging
1. [TODO] Обновить release-facing docs под `1.2.29` для visual tuning Session dialog bubbles; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare 1.2.29 release notes`
2. [TODO] Git Commit: `docs: prepare 1.2.29 release notes` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh` и зафиксировать массовые version/manifest updates release-пайплайна `1.2.29`; scope: release packaging surface, version manifests, generated bundle metadata; commit: `build: release 1.2.29`
4. [TODO] Git Commit: `build: release 1.2.29` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball артефакты и закрыть scope архивированием planning/todo; expected commit: `docs: close 1.2.29 release scope`
6. [TODO] Git Commit: `docs: close 1.2.29 release scope` (hash: TBD)
