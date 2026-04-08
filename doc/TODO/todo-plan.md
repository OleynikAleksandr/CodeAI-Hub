# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_InitialAutolayout_OverlapAwarePacking_Architecture.md`
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

## Phase 1 — Diagram Modules initial autolayout overlap-aware packing (owner: Codex, updated: 2026-04-08)
### Stream: Scope Setup
1. [DONE] Создать planning-doc, новый `todo-plan.md` и стартовый `Session017.md` для corrective cycle; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_InitialAutolayout_OverlapAwarePacking_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session017.md`; expected commit: `docs(plan): open overlap-aware initial autolayout scope`
2. [DONE] Git Commit: `docs(plan): open overlap-aware initial autolayout scope` (hash: `bcdb87418`)
3. [DONE] Зарегистрировать новый active scope в `Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(index): register overlap-aware initial autolayout scope`
4. [DONE] Git Commit: `docs(index): register overlap-aware initial autolayout scope` (hash: `6b9b5da0d`)

### Stream: Seed Autolayout Solver
5. [DONE] Исправить измерение `bodyStartY` под zoom/transform в measured layout bridge, чтобы верхние границы children стартовали от unscaled header boundary; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-bridge.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram): correct measured body start under zoom`
6. [DONE] Git Commit: `fix(diagram): correct measured body start under zoom` (hash: `906f4f7c7`)
7. [DONE] Заменить exact-column packing на overlap-aware sibling packing в initial packer; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-initial-autolayout-packer.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram): pack initial autolayout by overlapping bounds`
8. [DONE] Git Commit: `fix(diagram): pack initial autolayout by overlapping bounds` (hash: `35ec7db98`)
9. [DONE] Добавить regression tests на wide-cluster / overlapping-footprint packing; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram): cover overlap-aware initial autolayout`
10. [DONE] Git Commit: `test(diagram): cover overlap-aware initial autolayout` (hash: `b3d69cb57`)

### Stream: SSOT And Release Notes
11. [DONE] Обновить SSOT по Diagram Modules autolayout contract; scope: `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(diagram): record overlap-aware autolayout contract`
12. [DONE] Git Commit: `docs(diagram): record overlap-aware autolayout contract` (hash: `21ffab113`)
13. [DONE] Обновить release-facing docs под новый corrective scope; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare overlap-aware autolayout release`
14. [DONE] Git Commit: `docs(release): prepare overlap-aware autolayout release` (hash: `dedd87bf7`)

### Stream: Release Build
15. [DONE] Прогнать таргетные тесты и webview сборки перед релизом; scope: runtime verification only + `doc/TODO/todo-plan.md`; expected commit: `build(release): capture overlap-aware autolayout version bump`
16. [DONE] Git Commit: `build(release): capture overlap-aware autolayout version bump` (hash: `a7342a7b8`)
17. [DONE] Выполнить `./scripts/build-all.sh` и затем `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты; scope: release build outputs + `doc/TODO/todo-plan.md`; expected commit: `build(release): package overlap-aware autolayout release`
18. [TODO] Git Commit: `build(release): package overlap-aware autolayout release` (hash: TBD)

### Stream: Closeout
19. [IN_PROGRESS] Заархивировать planning-doc и todo-plan, обновить `Docs_Index.md`, подготовить финальный `Session017.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/...`, `doc/TODO/Archive/...`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(closeout): archive overlap-aware autolayout scope`
20. [TODO] Git Commit: `docs(closeout): archive overlap-aware autolayout scope` (hash: TBD)
