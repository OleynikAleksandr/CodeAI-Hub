# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_LiveMeasurement_Stabilization_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
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

## Phase 1 — Diagram Modules live measurement stabilization fix (owner: Codex, updated: 2026-04-08)
### Stream: Scope Setup
1. [DONE] Создать planning-doc, новый `todo-plan.md` и стартовый `Session020.md` для corrective cycle; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_LiveMeasurement_Stabilization_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session020.md`; expected commit: `docs(plan): open live measurement stabilization scope`
2. [DONE] Git Commit: `docs(plan): open live measurement stabilization scope` (hash: `d2efeade5`)
3. [DONE] Зарегистрировать новый active scope в `Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(index): register live measurement stabilization scope`
4. [DONE] Git Commit: `docs(index): register live measurement stabilization scope` (hash: `da1ef605e`)

### Stream: Bridge Stabilization
5. [DONE] Стабилизировать measurement bridge для поздней DOM-геометрии и синхронизировать bridge regression coverage; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-bridge.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram): stabilize live measurement bridge`
6. [DONE] Git Commit: `fix(diagram): stabilize live measurement bridge` (hash: `065b29895`)

### Stream: SSOT And Release Notes
7. [DONE] Обновить Diagram Modules SSOT под stabilized live measurement contract; scope: `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(diagram): record live measurement stabilization contract`
8. [DONE] Git Commit: `docs(diagram): record live measurement stabilization contract` (hash: `a4b85849e`)
9. [DONE] Обновить release-facing docs под новый corrective release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare live measurement stabilization release`
10. [TODO] Git Commit: `docs(release): prepare live measurement stabilization release` (hash: TBD)

### Stream: Release Build
11. [TODO] Прогнать таргетные diagram tests и webview сборки перед релизом; scope: runtime verification only + `doc/TODO/todo-plan.md`; expected commit: `build(release): verify live measurement stabilization prerequisites`
12. [TODO] Git Commit: `build(release): verify live measurement stabilization prerequisites` (hash: TBD)
13. [TODO] Выполнить `./scripts/build-all.sh` и зафиксировать новый version bump; scope: release version outputs + `doc/TODO/todo-plan.md`; expected commit: `build(release): capture live measurement stabilization version bump`
14. [TODO] Git Commit: `build(release): capture live measurement stabilization version bump` (hash: TBD)
15. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить новый `VSIX` и tarball-артефакты; scope: release packaging outputs + `doc/TODO/todo-plan.md`; expected commit: `build(release): package live measurement stabilization release`
16. [TODO] Git Commit: `build(release): package live measurement stabilization release` (hash: TBD)

### Stream: Closeout
17. [TODO] Заархивировать planning-doc и todo-plan, обновить `Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_LiveMeasurement_Stabilization_Architecture.md`, `doc/TODO/Archive/todo-plan-phase1-live-measurement-stabilization.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(closeout): archive live measurement stabilization scope`
18. [TODO] Git Commit: `docs(closeout): archive live measurement stabilization scope` (hash: TBD)
