# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session057.md`
  - `doc/Sessions/Session058.md` (после создания)
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Phase 284 — Project Manager: Unified Workflow Navigation (owner: Oleksandr, updated: 2026-03-05)

**Problem (repro):**
- Выбор шага/сессии/артефакта в разных местах UI (верхний Toolbar vs левое дерево) приводит к разному состоянию правой панели и подсветки шага.
- Наблюдаемый эффект: в Toolbar выбран `Description`, а фактически открыты `Virtual Simulation` session + `virtual-simulation.md` artifact; header правой панели может показывать не тот шаг.

**Target UX (invariant):**
- Где бы ни был выполнен клик (Toolbar / левое дерево: шаг / артефакт / сессия / авто-выбор), Project Manager должен приходить к одному и тому же состоянию:
  - в Toolbar подсвечен выбранный шаг;
  - слева header всегда `Sessions`, ниже — UI сессии выбранного шага;
  - справа header: `<Step Name>` и две кнопки справа `Artifacts` и `Help`;
  - ниже — имя артефакта выбранного шага и его текст (если доступен).

### Stream 0: Design (SSOT + contract)
1. [DONE] Зафиксировать SSOT навигации/selection в PM: единый термин `activeStage` + маршрутизация событий из Toolbar/Tree/auto-select, правила синхронизации `activeStage → (dialogIntent, selectedArtifact, headerMode)` (scope: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(pm): add workflow navigation SSOT contract`).
2. [DONE] Git Commit: `docs(pm): add workflow navigation SSOT contract` (hash: `3731ff1d`)
3. [DONE] Синхронизировать SSOT документов системы под новый инвариант (любой route в dialog-session обязан обновлять `activeStage` в UI) (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(pm): document workflow navigation invariants`).
4. [DONE] Git Commit: `docs(pm): document workflow navigation invariants` (hash: `71a65599`)

### Stream 1: Stage selection SSOT (Toolbar ↔ Tree ↔ auto-select)
1. [DONE] Сделать `MainArea` реактивным к “навигационному событию” (stage) и выставлять `activeTool` из stage (подсветка Toolbar + заголовок правой панели) (scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-utils.ts`; expected commit: `fix(pm): sync toolbar stage with navigation events`).
2. [DONE] Git Commit: `fix(pm): sync toolbar stage with navigation events` (hash: `70af1927`)
3. [DONE] Привести клики по stage в дереве к одному маршруту с Toolbar (через единое stage-событие, без прямого “ручного” рассинхрона) (scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit: `refactor(pm): route tree stage clicks through navigation event`).
4. [DONE] Git Commit: `refactor(pm): route tree stage clicks through navigation event` (hash: `e2d07b04`)
5. [DONE] Синхронизировать клики по artifact/session nodes в дереве: перед открытием артефакта/сессии всегда выставлять `activeStage` (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `fix(pm): sync tree artifact/session clicks with active stage`).
6. [DONE] Git Commit: `fix(pm): sync tree artifact/session clicks with active stage` (hash: `1e5a5394`)
7. [DONE] Синхронизировать auto-select при смене workspace (latest chain) с `activeStage`, чтобы Toolbar/headers не показывали “старый” шаг (scope: `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`; expected commit: `fix(pm): sync auto-select stage with toolbar`).
8. [DONE] Git Commit: `fix(pm): sync auto-select stage with toolbar` (hash: `0333ac19`)
9. [DONE] Унифицировать семантику выбора шага: “выбор шага” должен открывать соответствующую dialog-сессию (без stage-specific исключений типа `skipSession`), либо зафиксировать чёткое правило и применить везде одинаково (scope: `src/client/project-manager/components/layout/main-area-utils.ts`, `src/client/project-manager/components/layout/use-stage-panel-sync.ts`, `src/client/project-manager/components/layout/use-workflow-tool-select.ts`; expected commit: `fix(pm): unify stage activation semantics`).
10. [DONE] Git Commit: `fix(pm): unify stage activation semantics` (hash: `cdb2d066`)

### Stream 2: Right panel header SSOT (Step name + Artifacts/Help)
1. [DONE] Ввести универсальный header для правой панели: `<Step Name>` + toggle `Artifacts/Help` (не только для `Description`) (scope: `src/client/project-manager/components/layout/stage-artifact-header-toggle.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit: `feat(pm): add stage artifact header toggle`).
2. [DONE] Git Commit: `feat(pm): add stage artifact header toggle` (hash: `31493aa4`)
3. [DONE] Распространить режимы `Artifacts/Help` на все шаги (а не только `Description`), сохраняя корректный выбранный артефакт и контент (scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`; expected commit: `fix(pm): apply artifacts/help mode across stages`).
4. [DONE] Git Commit: `fix(pm): apply artifacts/help mode across stages` (hash: `206df0f0`)
5. [DONE] Добавить help-экраны для non-description шагов (VS/Diagrams), чтобы `Help` всегда был полезным и одинаковым по UX (scope: `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-help.tsx`; expected commit: `feat(pm): add workflow step help panels`).
6. [DONE] Git Commit: `feat(pm): add workflow step help panels` (hash: `b781eaac`)

### Stream 3: Guards (регрессии)
1. [DONE] Добавить тест(ы), которые ловят рассинхрон: stage selection из дерева обязан обновлять Toolbar/highlight и header правой панели (scope: `src/client/project-manager/components/layout/workflow-navigation.test.ts`, `src/client/project-manager/components/layout/main-area-utils.ts`; expected commit: `test(pm): guard workflow navigation sync`).
2. [DONE] Git Commit: `test(pm): guard workflow navigation sync` (hash: `f58e258b`)

### Stream 4: Bug registry + docs sync
1. [DONE] Завести запись в Bug Registry (OPEN → FIXED) и привязать guards/релиз (scope: `doc/BugRegistry.md`; expected commit: `docs(bug): register pm workflow navigation desync`).
2. [DONE] Git Commit: `docs(bug): register pm workflow navigation desync` (hash: `7a0c5ab1`)

### Stream 5: Release build (по чеклисту)
1. [DONE] Обновить Session-отчёт с результатами валидации и списком коммитов (scope: `doc/Sessions/Session059.md`; expected commit: `docs(session): record Session059 pm navigation sync`).
2. [IN_PROGRESS] Git Commit: `docs(session): record Session059 pm navigation sync` (hash: TBD)
3. [TODO] Выполнить релизный цикл: `./scripts/build-all.sh` → проверка чистого дерева → `./scripts/build-release.sh --use-current-version` → верификация строк `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created` (scope: release manifests + docs; expected commit: `chore(release): build-all vX.Y.Z`).
4. [TODO] Git Commit: `chore(release): build-all vX.Y.Z` (hash: TBD)
