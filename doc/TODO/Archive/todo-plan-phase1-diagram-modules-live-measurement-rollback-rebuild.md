# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_LiveMeasurement_Rollback_Rebuild_Architecture.md`
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
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 1 — Diagram Modules rollback rebuild after 1.1.915 (owner: Codex, updated: 2026-04-08)
### Stream: Scope bootstrap
1. [DONE] Открыть rollback rebuild scope и зарегистрировать его в навигации; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_LiveMeasurement_Rollback_Rebuild_Architecture.md`, `doc/TODO/Archive/todo-plan-phase1-diagram-modules-live-measurement-rollback-rebuild.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs(plan): open rollback rebuild scope`
2. [DONE] Git Commit: `docs(plan): open rollback rebuild scope` (hash: `9ba2ed370`)

### Stream: Code rollback
3. [DONE] Откатить measurement bridge к контракту релиза `1.1.914` и выровнять regression expectations; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-bridge.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; commit: `fix(diagram): rollback live measurement bridge`
4. [DONE] Git Commit: `fix(diagram): rollback live measurement bridge` (hash: `75ca21e07`)

### Stream: SSOT rollback
5. [DONE] Убрать из active SSOT принятие `Live Measurement Stabilization` как текущего контракта; scope: `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`; commit: `docs(diagram): rollback live measurement stabilization contract`
6. [DONE] Git Commit: `docs(diagram): rollback live measurement stabilization contract` (hash: `942edef3b`)

### Stream: Release docs
7. [DONE] Подготовить release docs для rollback rebuild `1.1.916`; scope: `README.md`, `CHANGELOG.md`; commit: `docs(release): prepare rollback rebuild release`
8. [DONE] Git Commit: `docs(release): prepare rollback rebuild release` (hash: `f82d278e5`)

### Stream: Verification
9. [DONE] Прогнать таргетные проверки rollback-базы и зафиксировать статус в плане; scope: repo verification (`npx tsx --test ...`, `npm run build:webview`, `npm run typecheck:webview`) + `doc/TODO/todo-plan.md`; commit: `build(release): verify rollback rebuild prerequisites`
10. [DONE] Git Commit: `build(release): verify rollback rebuild prerequisites` (hash: `6beeff754`)

### Stream: Release build
11. [DONE] Выполнить `./scripts/build-all.sh`, принять version bump и обновить статус плана; scope: versioned release files + `doc/TODO/todo-plan.md`; commit: `build(release): capture rollback rebuild version bump`
12. [DONE] Git Commit: `build(release): capture rollback rebuild version bump` (hash: `20cc4bb73`)
13. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить артефакты и отметить completion в плане; scope: release artifacts + `doc/TODO/todo-plan.md`; commit: `build(release): package rollback rebuild release`
14. [DONE] Git Commit: `build(release): package rollback rebuild release` (hash: `1e2ceb11f`)

### Stream: Closeout
15. [DONE] Заархивировать planning-doc и execution plan, обновить `Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_LiveMeasurement_Rollback_Rebuild_Architecture.md`, `doc/TODO/Archive/todo-plan-phase1-diagram-modules-live-measurement-rollback-rebuild.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs(closeout): archive rollback rebuild scope`
16. [DONE] Git Commit: `docs(closeout): archive rollback rebuild scope` (hash: `6b94b6147`)
