# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_InitialAutolayout_HierarchicalPacker_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_SharedVisualBounds_And_ManualAutolayout_Architecture.md`
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

## Phase 1 — Initial Autolayout Hierarchical Packer (owner: Codex, updated: 2026-04-08)
### Stream: Planning Baseline
1. [DONE] Открыть corrective scope под measured-first initial autolayout packer, новый active `todo-plan` и навигационный индекс; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_InitialAutolayout_HierarchicalPacker_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; ожидаемый commit message: `docs(plan): open initial autolayout packer scope`
2. [DONE] Git Commit: `docs(plan): open initial autolayout packer scope` (hash: 516fdf0dd)
3. [DONE] Создать continuation report новой corrective wave; scope: `doc/Sessions/Session016.md`; ожидаемый commit message: `docs(session): start initial autolayout packer cycle`
4. [DONE] Git Commit: `docs(session): start initial autolayout packer cycle` (hash: 28ee638e9)

### Stream: Layout Source Split
5. [DONE] Добавить projection-level layout source для различения seed autolayout и persisted sidecar path; scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `feat(diagram): tag projection layout source`
6. [DONE] Git Commit: `feat(diagram): tag projection layout source` (hash: 73aa01a6c)
7. [DONE] Переключить shell measured path на layout-source-aware branch без изменения manual drag contract; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.ts`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `fix(diagram): gate measured autolayout by layout source`
8. [TODO] Git Commit: `fix(diagram): gate measured autolayout by layout source` (hash: TBD)

### Stream: Measured Initial Packer
9. [DONE] Ввести pure hierarchical packer для seed autolayout и перевести measured normalizer на fixed-point pack-and-validate loop; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-initial-autolayout-packer.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.ts`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `fix(diagram): rebuild initial autolayout from measured hierarchy`
10. [TODO] Git Commit: `fix(diagram): rebuild initial autolayout from measured hierarchy` (hash: TBD)
11. [TODO] Добавить regression evidence для seed autolayout safety и persisted-layout preservation; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `test(diagram): cover measured initial autolayout solver`
12. [TODO] Git Commit: `test(diagram): cover measured initial autolayout solver` (hash: TBD)

### Stream: SSOT And Release Docs
13. [TODO] Синхронизировать Diagram Modules SSOT и planning-doc с новым measured-first initial autolayout contract; scope: `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramModules_InitialAutolayout_HierarchicalPacker_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(diagram): record measured initial autolayout contract`
14. [TODO] Git Commit: `docs(diagram): record measured initial autolayout contract` (hash: TBD)
15. [TODO] Подготовить release-facing docs для нового corrective release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(release): prepare initial autolayout packer release`
16. [TODO] Git Commit: `docs(release): prepare initial autolayout packer release` (hash: TBD)

### Stream: Release Build
17. [TODO] Прогнать таргетные diagram-editor tests и `./scripts/build-all.sh` для нового release baseline; scope: рабочее дерево + `doc/TODO/todo-plan.md`; ожидаемый commit message: `build(release): capture initial autolayout packer version bump`
18. [TODO] Git Commit: `build(release): capture initial autolayout packer version bump` (hash: TBD)
19. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` и зафиксировать packaged release artifacts; scope: рабочее дерево + `doc/TODO/todo-plan.md`; ожидаемый commit message: `build(release): package initial autolayout packer release`
20. [TODO] Git Commit: `build(release): package initial autolayout packer release` (hash: TBD)
