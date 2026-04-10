# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- **Supporting planning doc:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`
- **Read this context before implementation:**
  - `doc/Sessions/Session029.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/tmp/prototypes/development-tree-sidebar.html`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Этот execution cycle ведётся через **один unified** `doc/TODO/todo-plan.md` и покрывает полный rollout Development Tree baseline через фазы 1–6.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки подзадача вырастает больше 3 файлов, stream нужно немедленно переписать на более мелкие шаги до продолжения реализации.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки по checkpoint-ам:**
  - Phase 1 → `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`
  - Phase 2 → `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`
  - Phase 3 → `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`
  - Phase 4 → `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`
  - Phase 5 → `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`
  - Phase 6 → `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`
- **Visual checkpoints обязательны:**
  - Phase 1 → trunk stages работают только через sidebar
  - Phase 2 → branch tree progressive-populate-ится и визуально соответствует принятому prototype baseline
  - Phase 3 → Product Part / Cluster / Module selection заполняет обе панели, tab groups независимы
  - Phase 4 → shell sessions, first-message bootstrap, provider inheritance и restore path работают end-to-end
  - Phase 5 → Planning/Execution unlock-ятся только по required draft artifacts, а `done/total` не влияет на gating
- **Internal release checkpoints допускаются** после Phase 1, Phase 3 и Phase 5 только при чистом дереве и зелёных таргетных сборках. Полный release baseline формируется только после Phase 6.
- **Commit**: после зелёных гейтов — максимально релевантный commit message формата `feat: ...`, `fix: ...`, `refactor: ...`, `test: ...`, `docs: ...`, `chore: ...`.
- **Real-time Документация:** любое изменение архитектуры/логики требует синхронного обновления `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и связанных документов **до** коммита.
- **Phase closeout:** закрывать фазу только после зелёных таргетных сборок, визуального walkthrough и актуализации статусов/хешей в этом `todo-plan.md`.
- **Explicit out of scope для этого цикла:**
  - detailed `Implementation` tab view
  - custom tooltip component
  - mutation/delete flow для уже materialized Diagram Modules branch structure

## Phase 1 — Trunk Shell Convergence (owner: Codex, updated: 2026-04-10)
**Checkpoint before closing the phase:**
- `npm run build:project-manager`
- `npm run build:webview`
- `npm run typecheck:webview`
- Manual visual walkthrough: `Description`, `Virtual Simulation`, `Diagram Modules` открываются и синхронизируются только через sidebar; верхний toolbar больше не является навигационной поверхностью.
- Release checkpoint: optional internal preview build разрешён только после clean tree.

### Stream: Sidebar-only trunk navigation
1. [TODO] Убрать зависимость `MainArea` от верхнего stage toolbar и перевести trunk route selection на sidebar/event model — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/toolbar.tsx`, `src/client/project-manager/components/layout/main-area-utils.ts`; ожидаемый commit message: `feat: remove project manager top stage toolbar`
2. [TODO] Git Commit: `feat: remove project manager top stage toolbar` (hash: TBD)
3. [TODO] Перестроить stage-node expansion/selection так, чтобы `WorkspaceTree` стал единственным владельцем trunk navigation state — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; ожидаемый commit message: `feat: make workspace tree the only trunk navigation surface`
4. [TODO] Git Commit: `feat: make workspace tree the only trunk navigation surface` (hash: TBD)

### Stream: Main area sync and regression safety
5. [TODO] Синхронизировать main-area artifact/session routing с sidebar-only flow и убрать toolbar assumptions из startup resolution — scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/stage-artifact-mode.ts`; ожидаемый commit message: `refactor: align main area with sidebar-only workflow routing`
6. [TODO] Git Commit: `refactor: align main area with sidebar-only workflow routing` (hash: TBD)
7. [TODO] Добавить/обновить регрессии для trunk navigation sync после удаления toolbar — scope: `src/client/project-manager/components/layout/workflow-navigation.test.ts`, `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`, `src/client/project-manager/components/layout/workspace-scope-sync.test.ts`; ожидаемый commit message: `test: cover sidebar-only trunk navigation`
8. [TODO] Git Commit: `test: cover sidebar-only trunk navigation` (hash: TBD)

## Phase 2 — Development Tree Read Model (owner: Codex, updated: 2026-04-10)
**Checkpoint before closing the phase:**
- `npm run build:core`
- `npm run build:project-manager`
- `npm run build:webview`
- `npm run typecheck:webview`
- Manual visual walkthrough: Product Part / Cluster / Module projection появляется progressive-но, strict accordion работает, skeleton rows и counters следуют prototype baseline.
- Release checkpoint: preview build допускается, если sidebar уже стабильно рендерит read-only Development Tree.

### Stream: Snapshot contract for branch projection
1. [TODO] Расширить workflow-state contract development-tree snapshot payload-ом вместо trunk-only модели — scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`, `src/client/project-manager/services/workflow-state-client.ts`; ожидаемый commit message: `feat: expose development tree snapshot in workflow state`
2. [TODO] Git Commit: `feat: expose development tree snapshot in workflow state` (hash: TBD)

### Stream: Branch node projection from Diagram Modules
3. [TODO] Построить canonical Product Part / Cluster / Module projection из Diagram Modules artifacts с `skeleton`/`materialized` semantics — scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; ожидаемый commit message: `feat: build development tree nodes from diagram modules artifacts`
4. [TODO] Git Commit: `feat: build development tree nodes from diagram modules artifacts` (hash: TBD)
5. [TODO] Реализовать strict accordion, active-path highlight, type badges и правила показа counters в sidebar — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; ожидаемый commit message: `feat: render development tree sidebar states`
6. [TODO] Git Commit: `feat: render development tree sidebar states` (hash: TBD)

### Stream: Projection test coverage
7. [TODO] Добавить/обновить тесты на progressive population и branch-node projection — scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; ожидаемый commit message: `test: cover development tree projection and progressive population`
8. [TODO] Git Commit: `test: cover development tree projection and progressive population` (hash: TBD)

## Phase 3 — Branch Panel Surfaces (owner: Codex, updated: 2026-04-10)
**Checkpoint before closing the phase:**
- `npm run build:project-manager`
- `npm run build:webview`
- `npm run typecheck:webview`
- Manual visual walkthrough: выбор Product Part / Cluster / Module заполняет обе панели; tab bars и phase separators выглядят консистентно; disabled tabs не ломают navigation flow.
- Release checkpoint: internal UI preview build разрешён после clean tree.

### Stream: Canonical branch-node selection routing
1. [TODO] Добавить canonical branch-node selection state, panel title resolution и routing между sidebar и main area — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-utils.ts`, `src/client/project-manager/components/layout/use-stage-panel-sync.ts`; ожидаемый commit message: `feat: add canonical branch node routing`
2. [TODO] Git Commit: `feat: add canonical branch node routing` (hash: TBD)

### Stream: Artifact surfaces for Product Part / Cluster / Module
3. [TODO] Реализовать branch artifact surfaces для Product Part, Cluster и Module с phase separators и blocked tabs — scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`, `src/client/project-manager/components/layout/stage-artifact-mode.ts`; ожидаемый commit message: `feat: add branch artifact surfaces to project manager`
4. [TODO] Git Commit: `feat: add branch artifact surfaces to project manager` (hash: TBD)

### Stream: Session surfaces and panel independence
5. [TODO] Реализовать branch session surfaces для single-session Part/Cluster и three-session Module path — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`; ожидаемый commit message: `feat: add branch session surfaces to project manager`
6. [TODO] Git Commit: `feat: add branch session surfaces to project manager` (hash: TBD)
7. [TODO] Добавить/обновить тесты на panel independence, phase separators и blocked tabs — scope: `src/client/project-manager/components/layout/workflow-navigation.test.ts`, `src/client/project-manager/components/layout/stage-artifact-mode.test.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; ожидаемый commit message: `test: cover branch panel routing and tab independence`
8. [TODO] Git Commit: `test: cover branch panel routing and tab independence` (hash: TBD)

## Phase 4 — Lazy Session Lifecycle And Provider Semantics (owner: Codex, updated: 2026-04-10)
**Checkpoint before closing the phase:**
- `npm run build:core`
- `npm run build:project-manager`
- `npm run build:webview`
- `npm run typecheck:webview`
- Manual visual walkthrough: branch sessions materialize-ятся как shell, provider session стартует только на первом сообщении, workspace default provider наследуется, reload корректно восстанавливает active node/session.
- Release checkpoint: preview build допускается, если branch sessions работают end-to-end.

### Stream: Session shell contract
1. [TODO] Добавить shell-session metadata и create path для Product Part / Cluster / Module nodes — scope: `packages/core/src/remote-bridge/handlers/session-shell-factory.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts`, `src/client/project-manager/services/workflow-state-client.ts`; ожидаемый commit message: `feat: add development tree session shells`
2. [TODO] Git Commit: `feat: add development tree session shells` (hash: TBD)

### Stream: First-message bootstrap
3. [TODO] Реализовать lazy first-message bootstrap и prompt-pack prepend для branch sessions вместо eager provider create — scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/components/sessions/session-message-sender.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`; ожидаемый commit message: `feat: lazy-start development tree sessions on first message`
4. [TODO] Git Commit: `feat: lazy-start development tree sessions on first message` (hash: TBD)

### Stream: Provider inheritance and restore
5. [TODO] Зафиксировать workspace default provider после Description и добавить per-session override metadata для branch sessions — scope: `src/client/project-manager/services/workflow-provider-resolver.ts`, `src/client/project-manager/services/provider-snapshot.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; ожидаемый commit message: `feat: persist provider defaults for branch sessions`
6. [TODO] Git Commit: `feat: persist provider defaults for branch sessions` (hash: TBD)
7. [TODO] Синхронизировать auto-select / restore / runtime-model sync с branch shell sessions и last-active node routing — scope: `src/client/project-manager/components/sessions/runtime-session-auto-select.ts`, `src/client/project-manager/components/sessions/dialog-runtime-session-resolver.ts`, `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`; ожидаемый commit message: `fix: restore branch session routing after reload`
8. [TODO] Git Commit: `fix: restore branch session routing after reload` (hash: TBD)

### Stream: Lifecycle regression coverage
9. [TODO] Добавить/обновить тесты на lazy bootstrap, provider inheritance и restore path — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`; ожидаемый commit message: `test: cover branch session lazy bootstrap and restore`
10. [TODO] Git Commit: `test: cover branch session lazy bootstrap and restore` (hash: TBD)

## Phase 5 — Gating, Outdated Propagation, Counters (owner: Codex, updated: 2026-04-10)
**Checkpoint before closing the phase:**
- `npm run build:core`
- `npm run build:project-manager`
- `npm run build:webview`
- `npm run typecheck:webview`
- Manual visual walkthrough: Planning/Execution tabs unlock-ятся только по required draft artifacts; `done/total` остаётся progress-indicator; outdated propagation доходит до downstream nodes и surfaces.
- Release checkpoint: release-candidate checkpoint допустим только после clean tree и зелёных таргетных сборок.

### Stream: Draft-artifact gating contract
1. [TODO] Реализовать gating Planning/Execution по required draft artifacts и отдать blocked reasons в PM без использования counters — scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `src/client/project-manager/services/workflow-gating-client.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; ожидаемый commit message: `feat: gate branch sessions by required draft artifacts`
2. [TODO] Git Commit: `feat: gate branch sessions by required draft artifacts` (hash: TBD)

### Stream: Outdated propagation and last-active semantics
3. [TODO] Добавить branch-level `OUTDATED` propagation и last-active resolution для upstream invalidation — scope: `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-last-active-resolver.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; ожидаемый commit message: `feat: add development tree outdated propagation`
4. [TODO] Git Commit: `feat: add development tree outdated propagation` (hash: TBD)

### Stream: Progress indicators are not gates
5. [TODO] Отделить `done/total` counters и blocked input copy от gating logic в sidebar/panel surfaces — scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/sessions/session-lock-guards.ts`; ожидаемый commit message: `feat: separate branch progress counters from gating`
6. [TODO] Git Commit: `feat: separate branch progress counters from gating` (hash: TBD)
7. [TODO] Добавить регрессии и обновить системную документацию по discovered branch-state invariants — scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `test: cover branch gating and outdated propagation`
8. [TODO] Git Commit: `test: cover branch gating and outdated propagation` (hash: TBD)

## Phase 6 — Release Hardening And Closeout (owner: Codex, updated: 2026-04-10)
**Checkpoint before closing the phase:**
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- Manual visual walkthrough: сравнить shipped PM baseline с `doc/tmp/prototypes/development-tree-sidebar.html` и убедиться, что deferred items не masquerade-ятся как regression.
- Release baseline: только после чистого дерева, актуального `README.md`, `CHANGELOG.md`, `doc/` и зафиксированных путей к tarball/VSIX.

### Stream: Release surface documentation
1. [TODO] Актуализировать release-facing docs для shipped Development Tree baseline — scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: document development tree execution baseline`
2. [TODO] Git Commit: `docs: document development tree execution baseline` (hash: TBD)

### Stream: Final release candidate closeout
3. [TODO] Зафиксировать результаты финальной сборки, обновить `doc/TODO/todo-plan.md`, создать session closeout report и указать расположение release artifacts — scope: `doc/TODO/todo-plan.md`, `doc/Sessions/`, `doc/tmp/releases/`; ожидаемый commit message: `chore: finalize development tree release candidate`
4. [TODO] Git Commit: `chore: finalize development tree release candidate` (hash: TBD)

### Stream: User feedback and SSOT sync
5. [TODO] Получить фидбэк от пользователя по новому релизу, зафиксировать все замечания и правки — scope: `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/`; ожидаемый commit message: `docs: capture user feedback on development tree release`
6. [TODO] Git Commit: `docs: capture user feedback on development tree release` (hash: TBD)
7. [TODO] Актуализировать SSOT-документы под проверенную новую архитектуру — scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: sync SSOT documents with verified development tree architecture`
8. [TODO] Git Commit: `docs: sync SSOT documents with verified development tree architecture` (hash: TBD)
