# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_SharedVisualBounds_And_ManualAutolayout_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_MeasuredOwnershipReflow_Architecture.md`
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

## Phase 1 — Shared Visual Bounds Corrective Scope (owner: Codex, updated: 2026-04-08)
### Stream: Planning Baseline
1. [DONE] Открыть corrective scope для `Diagram Modules` под shared visual bounds и unified auto/manual layout contract; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_SharedVisualBounds_And_ManualAutolayout_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; ожидаемый commit message: `docs(plan): open shared visual bounds corrective scope`
2. [DONE] Git Commit: `docs(plan): open shared visual bounds corrective scope` (hash: TBD)

### Stream: Shared Visual Bounds Engine
3. [TODO] Ввести shared visual-bounds helper и перевести measured autolayout на вычисление container bottoms по deepest direct child visual bound; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-layout-bounds.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`; ожидаемый commit message: `fix(diagram): derive measured layout from visual bounds`
4. [TODO] Git Commit: `fix(diagram): derive measured layout from visual bounds` (hash: TBD)

### Stream: Unified Manual Drag
5. [TODO] Вынести manual drag resize в pure helper и перевести shell на тот же shared geometry contract, что и autolayout; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-manual-layout-normalizer.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-manual-layout-normalizer.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`; ожидаемый commit message: `fix(diagram): unify manual drag container bounds`
6. [TODO] Git Commit: `fix(diagram): unify manual drag container bounds` (hash: TBD)
7. [TODO] Обновить shell regression evidence под новый manual-layout contract; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `test(diagram): cover unified manual layout contract`
8. [TODO] Git Commit: `test(diagram): cover unified manual layout contract` (hash: TBD)

### Stream: Sidecar And SSOT Sync
9. [TODO] Поднять layout metric version sidecar под shared visual-bounds contract и зафиксировать pure regression evidence; scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `fix(diagram): invalidate sidecars for visual bounds contract`
10. [TODO] Git Commit: `fix(diagram): invalidate sidecars for visual bounds contract` (hash: TBD)
11. [TODO] Синхронизировать Diagram Modules SSOT и активный planning-doc с принятым shared visual-bounds contract; scope: `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramModules_SharedVisualBounds_And_ManualAutolayout_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(diagram): record shared visual bounds contract`
12. [TODO] Git Commit: `docs(diagram): record shared visual bounds contract` (hash: TBD)
13. [TODO] Подготовить release-facing docs для нового corrective release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(release): prepare shared visual bounds release`
14. [TODO] Git Commit: `docs(release): prepare shared visual bounds release` (hash: TBD)

### Stream: Release Build
15. [TODO] Прогнать таргетные diagram-editor tests и `./scripts/build-all.sh` для нового release baseline; scope: рабочее дерево + `doc/TODO/todo-plan.md`; ожидаемый commit message: `build(release): capture shared visual bounds version bump`
16. [TODO] Git Commit: `build(release): capture shared visual bounds version bump` (hash: TBD)
17. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` и зафиксировать packaged release artifacts; scope: рабочее дерево + `doc/TODO/todo-plan.md`; ожидаемый commit message: `build(release): package shared visual bounds release`
18. [TODO] Git Commit: `build(release): package shared visual bounds release` (hash: TBD)
