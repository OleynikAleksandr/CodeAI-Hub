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
2. [DONE] Git Commit: `docs(session): record Session059 pm navigation sync` (hash: `2dcc8b38`)
3. [DONE] Выполнить релизный цикл: `./scripts/build-all.sh` → проверка чистого дерева → `./scripts/build-release.sh --use-current-version` → верификация строк `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created` (scope: release manifests + docs; expected commit: `chore(release): build-all vX.Y.Z`).
4. [DONE] Git Commit: `chore(release): build-all vX.Y.Z` (hash: `37d799fa`)

---

## Phase 285 — Project Manager: First-open dialog hydration race (owner: Oleksandr, updated: 2026-03-05)

**Problem (repro):**
- После открытия Workspace в Project Manager выбранный workflow-session может отображаться без истории (`No messages yet`) до ручного повторного клика по stage в левом дереве.
- Симптом проявляется на первом входе и выглядит как гонка между `dialog:list:result` и первым `dialog:history:result` (история из JSONL подтягивается не всегда).

**Target UX (invariant):**
- Первое открытие workflow-stage обязано сразу гидратировать dialog history без дополнительного клика по stage/session node.
- Если список диалогов уже найден, первый `dialog:history:result` не должен теряться из-за несинхронного обновления ссылки на активную session.

### Stream 0: Design (routing invariant)
1. [DONE] Обновить контракт Dialog Routing: зафиксировать последовательность cold-open (`dialog:list:result` → фиксация session identity → `dialog:history`) и запрет на потерю первого history payload (scope: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(pm): document first-open dialog hydration contract`).
2. [DONE] Git Commit: `docs(pm): document first-open dialog hydration contract` (hash: `0b33084b`)

### Stream 1: Implementation (sequential hydration)
1. [DONE] Устранить race в dialog-controller: гарантировать синхронную фиксацию `sessionRef` на этапе `dialog:list:result` и очистку ref при смене intent/workspace (scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; expected commit: `fix(pm): prevent first-open dialog history race`).
2. [DONE] Git Commit: `fix(pm): prevent first-open dialog history race` (hash: `092e73e4`)

### Stream 2: Guards (regression)
1. [DONE] Добавить guard на race первого history payload (source-level test на обязательную синхронную фиксацию `sessionRef` до запроса history) (scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; expected commit: `test(pm): guard first-open dialog history hydration`).
2. [DONE] Git Commit: `test(pm): guard first-open dialog history hydration` (hash: `e5e6daf9`)

### Stream 3: Bug registry sync
1. [DONE] Зафиксировать баг первого открытия dialog-history в Bug Registry с root-cause и списком guard-коммитов (scope: `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(bug): register pm first-open dialog hydration race`).
2. [DONE] Git Commit: `docs(bug): register pm first-open dialog hydration race` (hash: `7aad030f`)

### Stream 4: Release build (v1.1.710)
1. [DONE] Подготовить release-stream в `todo-plan.md` и вернуть clean working tree перед `build-all` (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(pm): prepare v1.1.710 release stream`).
2. [DONE] Git Commit: `docs(pm): prepare v1.1.710 release stream` (hash: `aa5d775a`)
3. [DONE] Выполнить релизный цикл для фикса first-open hydration: `./scripts/build-all.sh` с фиксацией новых версий/манифестов (scope: release manifests + packages; expected commit: `chore(release): build-all v1.1.710`).
4. [DONE] Git Commit: `chore(release): build-all v1.1.710` (hash: `f3cfc4ca`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created`, синхронизировать release-доки (scope: `README.md`, `CHANGELOG.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync v1.1.710 notes`).
6. [DONE] Git Commit: `docs(release): sync v1.1.710 notes` (hash: `93f6da39`)

---

## Phase 286 — Project Manager: Intermittent dialog history miss on workspace open (owner: Oleksandr, updated: 2026-03-05)

**Problem (repro):**
- В релизе `1.1.710` баг с пустой лентой диалога остаётся интермиттирующим: в части запусков при первом открытии Workspace (`Virtual Simulation`/другие этапы) панель `Sessions` показывает `No messages yet`, хотя история есть.
- Ручной повторный клик по session node в левом tree сразу подтягивает историю.

**Target UX (invariant):**
- Даже при race на старте первый cold-open route не должен оставлять историю в pending-состоянии.
- Если initial full-history запрос (`cursor=0`) завис/потерялся, PM обязан автоматически сделать forced retry без участия пользователя.

### Stream 0: Design (watchdog contract)
1. [DONE] Дополнить контракт Dialog Routing watchdog-правилом: один автоматический forced retry для cold-open history при зависшем pending запросе (scope: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(pm): define dialog history watchdog retry contract`).
2. [DONE] Git Commit: `docs(pm): define dialog history watchdog retry contract` (hash: `f19ffd7a`)

### Stream 1: Implementation (pending timeout recovery)
1. [DONE] Добавить watchdog в `requestDialogHistory`: если первый `cursor=0` запрос остаётся pending по таймауту, очищать pending/loaded markers и делать forced retry, чтобы восстановить историю без ручного клика (scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; expected commit: `fix(pm): retry stalled dialog history on workspace open`).
2. [DONE] Git Commit: `fix(pm): retry stalled dialog history on workspace open` (hash: `b8370e93`)

### Stream 2: Guards (regression)
1. [DONE] Расширить guard-тесты для фиксации watchdog-инварианта (source-level assertions на retry при pending timeout) (scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; expected commit: `test(pm): guard dialog history watchdog retry`).
2. [DONE] Git Commit: `test(pm): guard dialog history watchdog retry` (hash: `650e33f9`)

### Stream 3: Bug registry sync
1. [DONE] Обновить запись BUG-2026-03-05-03: добавить второй root-cause (intermittent pending timeout) и коммиты watchdog-фикса (scope: `doc/BugRegistry.md`; expected commit: `docs(bug): update pm dialog history watchdog fix`).
2. [DONE] Git Commit: `docs(bug): update pm dialog history watchdog fix` (hash: `17e77d36`)

### Stream 4: Release build (v1.1.711)
1. [DONE] Подготовить release-stream в `todo-plan.md` и вернуть clean working tree перед `build-all` (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(pm): prepare v1.1.711 release stream`).
2. [DONE] Git Commit: `docs(pm): prepare v1.1.711 release stream` (hash: `25122b77`)
3. [DONE] Выполнить релизный цикл для watchdog-фикса: `./scripts/build-all.sh` с фиксацией новых версий/манифестов (scope: release manifests + packages; expected commit: `chore(release): build-all v1.1.711`).
4. [DONE] Git Commit: `chore(release): build-all v1.1.711` (hash: `d9857f83`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created`, синхронизировать release-доки (scope: `README.md`, `CHANGELOG.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync v1.1.711 notes`).
6. [DONE] Git Commit: `docs(release): sync v1.1.711 notes` (hash: `c328fe7f`)

---

## Phase 287 — Release push gate: duplication threshold (owner: Oleksandr, updated: 2026-03-05)

### Stream 0: Push unblock (check:dup < 3%)
1. [DONE] Удалить неиспользуемый дублирующий toggle-компонент в PM layout (`description-artifact-header-toggle`), чтобы снизить `jscpd` перед `git push` (scope: `src/client/project-manager/components/layout/description-artifact-header-toggle.tsx`, `doc/TODO/todo-plan.md`; expected commit: `refactor(pm): drop unused description artifact toggle`).
2. [DONE] Git Commit: `refactor(pm): drop unused description artifact toggle` (hash: `479cb298`)

---

## Phase 288 — Codebase hygiene: dead code + checks hardening (owner: Oleksandr, updated: 2026-03-05)

### Stream 0: Plan + scope (cleanup)
1. [DONE] Зафиксировать Phase 288 в `todo-plan.md`: чистка мёртвого кода (inbound=0), удаление неиспользуемых экспортов, усиление `check:links`, затем пересборка релиза (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(pm): plan phase288 codebase hygiene`).
2. [DONE] Git Commit: `docs(pm): plan phase288 codebase hygiene` (hash: `98674d1b`)

### Stream 1: Remove dead client files (PM/UI)
1. [DONE] Удалить неиспользуемые PM placeholders/state-store (inbound=0): `session-create-pending-placeholder.tsx`, `dialog-tabs-store.ts` (scope: `src/client/project-manager/components/description/session-create-pending-placeholder.tsx`, `src/client/project-manager/services/dialog-tabs-store.ts`; expected commit: `chore(pm): remove unused placeholder + dialog tabs store`).
2. [DONE] Git Commit: `chore(pm): remove unused placeholder + dialog tabs store` (hash: `48a7581a`)
3. [DONE] Удалить неиспользуемый UI компонент `AnimatedDots` (inbound=0) (scope: `src/client/ui/src/session/animated-dots.tsx`; expected commit: `chore(ui): remove unused animated dots component`).
4. [DONE] Git Commit: `chore(ui): remove unused animated dots component` (hash: `536c57cd`)

### Stream 2: Remove dead extension-module utilities
1. [DONE] Удалить неиспользуемые extension-module утилиты (inbound=0): `core-manager-lock.ts`, `install-provider-module.ts` (scope: `src/extension-module/core/core-manager-lock.ts`, `src/extension-module/provider/shared/install-provider-module.ts`; expected commit: `chore(ext): remove unused lock + provider installer helpers`).
2. [DONE] Git Commit: `chore(ext): remove unused lock + provider installer helpers` (hash: `74db955b`)

### Stream 3: Remove dead package helpers (Claude/Core)
1. [DONE] Удалить неиспользуемый Claude SDK session discovery helper (inbound=0) (scope: `packages/Claude_Module/src/messaging/session-file-discovery.ts`; expected commit: `chore(claude): remove unused sdk session discovery helper`).
2. [DONE] Git Commit: `chore(claude): remove unused sdk session discovery helper` (hash: `c12440c9`)
3. [DONE] Удалить неиспользуемые core helpers (inbound=0): `history-writer.ts`, `workflow-gates-facade.ts` (scope: `packages/core/src/unified-session/history-writer.ts`, `packages/core/src/workflow/gates/workflow-gates-facade.ts`; expected commit: `chore(core): remove unused history writer + gates facade`).
4. [DONE] Git Commit: `chore(core): remove unused history writer + gates facade` (hash: `c7d70220`)
5. [DONE] Удалить неиспользуемые core facades (inbound=0): `workflow-paths-facade.ts`, `workflow-watcher-facade.ts` (scope: `packages/core/src/workflow/paths/workflow-paths-facade.ts`, `packages/core/src/workflow/watcher/workflow-watcher-facade.ts`; expected commit: `chore(core): remove unused workflow facades`).
6. [DONE] Git Commit: `chore(core): remove unused workflow facades` (hash: `2bcc55b2`)

### Stream 4: Remove unused exports in live modules
1. [DONE] Удалить неиспользуемые экспорты: `ensureLauncherWorkspaceConfig`, `resolveProviderModulePath` (scope: `src/extension-module/cef/launcher.ts`, `src/extension-module/core/core-workspace.ts`; expected commit: `refactor(ext): drop unused launcher/workspace exports`).
2. [DONE] Git Commit: `refactor(ext): drop unused launcher/workspace exports` (hash: `a8647a23`)
3. [DONE] Удалить неиспользуемые экспорты: `resolveAppDirectory`, `getSettingsPath` (scope: `src/extension-module/core/runtime-paths.ts`, `src/extension-module/settings/settings-storage.ts`; expected commit: `refactor(ext): drop unused runtime/settings exports`).
4. [DONE] Git Commit: `refactor(ext): drop unused runtime/settings exports` (hash: `8ee87dde`)

### Stream 5: Checks hardening (links)
1. [DONE] Сделать `check:links` обязательным и автономным: добавить `scripts/check-markdown-links.js` и переключить `check:links` на него (scope: `scripts/check-markdown-links.js`, `package.json`; expected commit: `chore(checks): enforce markdown link check`).
2. [DONE] Git Commit: `chore(checks): enforce markdown link check` (hash: `a7b3a59e`)

### Stream 6: Release build (v1.1.712)
1. [DONE] Выполнить релизный цикл после cleanup: `./scripts/build-all.sh` (scope: release manifests + packages; expected commit: `chore(release): build-all v1.1.712`).
2. [IN_PROGRESS] Git Commit: `chore(release): build-all v1.1.712` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created`, синхронизировать release-доки (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync v1.1.712 notes`).
4. [TODO] Git Commit: `docs(release): sync v1.1.712 notes` (hash: TBD)

---

## Phase 289 — Baseline Codex `gpt-5.4` Release Rebuild (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Replace baseline general model without PM refactors
1. [IN_PROGRESS] На стабильной baseline-линии заменить user-facing Codex general model `gpt-5.2` на `gpt-5.4`, оставить `gpt-5.3-codex` как coding model и сузить persisted settings snapshot до двух active model ids без подтягивания более поздних PM/workflow-state рефакторингов (scope: `src/types/codex-model-registry.ts`, `src/extension-module/settings/codex-settings.ts`, `packages/core/src/config/index.ts`; expected commit: `feat(codex): switch baseline general model to gpt-5.4`).
2. [TODO] Git Commit: `feat(codex): switch baseline general model to gpt-5.4` (hash: TBD)

### Stream 2: Release docs + baseline rebuild
3. [TODO] Синхронизировать release-facing документы и SSOT модуля Codex под baseline release `v1.1.720` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; expected commit: `docs(release): sync baseline gpt-5.4 notes`).
4. [TODO] Git Commit: `docs(release): sync baseline gpt-5.4 notes` (hash: TBD)
5. [TODO] Поднять baseline version line до предрелизного состояния, затем выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` для нового локального baseline релиза с чистого дерева (scope: root release assets, `doc/tmp/releases/`, package versions/manifests; expected commit: `chore(release): build-all v1.1.720`).
6. [TODO] Git Commit: `chore(release): build-all v1.1.720` (hash: TBD)
7. [TODO] Создать новый session-report с итогами baseline smoke-prep и release build (scope: `doc/Sessions/`; expected commit: `docs(session): record baseline gpt-5.4 release build`).
8. [TODO] Git Commit: `docs(session): record baseline gpt-5.4 release build` (hash: TBD)
