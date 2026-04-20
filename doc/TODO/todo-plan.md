# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionDialog_ThinkingUnifiedChrome_Release_1.2.34.md`
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

## Phase 1 — Shared Thinking Chrome Unification (owner: Codex, updated: 2026-04-20)
### Stream: Styling and SSOT
1. [DONE] Унифицировать chrome для `.session-dialog__message--thinking` и `.session-dialog__message--assistant-thinking`: общий fill `rgba(44, 50, 48, 0.45)`, общий stroke `rgba(71, 71, 74, 0.45)`, общий shadow `0px 6px 14.1px 3px rgba(0, 0, 0, 0.5)`; SSOT синхронизирован, таргетные сборки `npm run build:webview` + `npm run build:project-manager` прошли успешно; scope: `media/session-view.css`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/TODO/todo-plan.md`; commit: `fix: unify thinking bubble chrome`
2. [DONE] Git Commit: `fix: unify thinking bubble chrome` (hash: `7dcaac132`)

## Phase 2 — Release 1.2.34 (owner: Codex, updated: 2026-04-20)
### Stream: Packaging
1. [DONE] Обновить release-facing docs под `1.2.34` для unified thinking chrome; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare 1.2.34 release notes`
2. [DONE] Git Commit: `docs: prepare 1.2.34 release notes` (hash: `9b769ede2`)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать массовые version/manifest updates release-пайплайна `1.2.34`; unified version поднята до `1.2.34`, provider/core/ui/launcher tarball артефакты собраны успешно; scope: release packaging surface, version manifests, generated bundle metadata; commit: `build: release 1.2.34`
4. [TODO] Git Commit: `build: release 1.2.34` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball артефакты и закрыть scope архивированием planning/todo; expected commit: `docs: close 1.2.34 release scope`
6. [TODO] Git Commit: `docs: close 1.2.34 release scope` (hash: TBD)
