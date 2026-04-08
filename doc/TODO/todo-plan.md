# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_ReleaseRebuild_1.1.913_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
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
  - Ручной прогон этих команд обычно не нужен (только для диагностики).
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация:** 
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве: 
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 1 — Project Manager release rebuild 1.1.913 (owner: Codex, updated: 2026-04-08)
### Stream: Scope Setup
1. [DONE] Создать planning-doc, новый `todo-plan.md` и стартовый `Session018.md` для release-only cycle; scope: `doc/SolidWorks-WorkFlow/Plans/ProjectManager_ReleaseRebuild_1.1.913_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session018.md`; expected commit: `docs(plan): open project manager release rebuild scope`
2. [DONE] Git Commit: `docs(plan): open project manager release rebuild scope` (hash: `b30107a48`)
3. [DONE] Зарегистрировать новый active scope в `Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(index): register project manager release rebuild scope`
4. [TODO] Git Commit: `docs(index): register project manager release rebuild scope` (hash: TBD)

### Stream: Release Notes
5. [TODO] Обновить release-facing docs под новый релизный rebuild; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare project manager rebuild release`
6. [TODO] Git Commit: `docs(release): prepare project manager rebuild release` (hash: TBD)

### Stream: Release Build
7. [TODO] Прогнать таргетные webview проверки перед релизом и зафиксировать readiness; scope: runtime verification only + `doc/TODO/todo-plan.md`; expected commit: `build(release): verify project manager rebuild prerequisites`
8. [TODO] Git Commit: `build(release): verify project manager rebuild prerequisites` (hash: TBD)
9. [TODO] Выполнить `./scripts/build-all.sh` и зафиксировать новый version bump; scope: release version outputs + `doc/TODO/todo-plan.md`; expected commit: `build(release): capture project manager rebuild version bump`
10. [TODO] Git Commit: `build(release): capture project manager rebuild version bump` (hash: TBD)
11. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить новый `VSIX` и свежий `project-manager` tarball; scope: release packaging outputs + `doc/TODO/todo-plan.md`; expected commit: `build(release): package project manager rebuild release`
12. [TODO] Git Commit: `build(release): package project manager rebuild release` (hash: TBD)

### Stream: Closeout
13. [TODO] Заархивировать planning-doc и todo-plan, обновить `Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_ReleaseRebuild_1.1.913_Architecture.md`, `doc/TODO/Archive/todo-plan-phase1-project-manager-release-rebuild-1.1.913.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(closeout): archive project manager release rebuild scope`
14. [TODO] Git Commit: `docs(closeout): archive project manager release rebuild scope` (hash: TBD)
