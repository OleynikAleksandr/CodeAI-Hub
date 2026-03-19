# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед каждым фиксом для этого scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/Sessions/Session102.md`
- Активный scope этой фазы: `Diagram Modules` должен получить dual-input contract (`Final_Description.md` + `virtual-simulation.md`), новый semantic bridge `module-inventory.md`, inventory-first `Source`, и visible templates contract для diagram steps
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом стриме - микро-задачи
- Каждая микро-задача затрагивает не более 3 файлов или пакетов
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Таргетные сборки выполнять перед закрытием затронутого Stream/Phase
- После завершения фазы: обновить release docs, выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 14 — Module Inventory Bridge And Visible Diagram Templates (owner: Oleksandr, updated: 2026-03-19)

### Stream: Live contracts
1. [DONE] Зафиксировать в живых архитектурных документах новый contract для `Diagram Modules`: обязательные входы `Final_Description.md` + `virtual-simulation.md`, `module-inventory.md` как человекочитаемый semantic bridge, `module-map.md` как derived diagram artifact (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`; expected commit: `docs(architecture): add module inventory bridge contract`).
2. [DONE] Git Commit: `docs(architecture): add module inventory bridge contract` (hash: `d4d5486a`)
3. [DONE] Синхронизировать живой PM UX contract под `Source = module-inventory.md` для `Diagram Modules` и новую policy видимых diagram templates (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`; expected commit: `docs(pm): sync module inventory source contract`).
4. [DONE] Git Commit: `docs(pm): sync module inventory source contract` (hash: `7d7203f1`)

### Stream: Visible templates
1. [DONE] Вернуть diagram prompt/template contract в visible templates sync, чтобы `diagram_modules` и `diagram_facades` жили в `~/.codeai-hub/templates/...` через bundled manifest (scope: `packages/core/src/templates/bundled-templates.ts`; expected commit: `refactor(templates): sync diagram workflow templates`).
2. [DONE] Git Commit: `refactor(templates): sync diagram workflow templates` (hash: `7a709c16`)
3. [DONE] Довести source generator для visible templates contract до formatter-approved состояния, чтобы `scripts/generate-bundled-templates.js` продолжал собирать diagram templates в visible home templates (scope: `scripts/generate-bundled-templates.js`; expected commit: `refactor(templates): sync diagram workflow templates source`).
4. [DONE] Git Commit: `refactor(templates): sync diagram workflow templates source` (hash: `1b6dfb3a`)
5. [DONE] Перевести diagram prompt appendix resolution на templates-first path и оставить package assets только bundled-source fallback (scope: `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`, `packages/core/src/templates/template-sync-service.test.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `refactor(templates): prefer synced diagram prompt appendices`).
6. [DONE] Git Commit: `refactor(templates): prefer synced diagram prompt appendices` (hash: `4e18a234`)

### Stream: Diagram Modules inventory contract
1. [DONE] Добавить inventory-first prompt/template assets для `Diagram Modules`, чтобы первый semantic output шага был `module-inventory.md` с кластерами, составом кластеров, standalone modules и простыми relations (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`; expected commit: `feat(diagram-modules): add module inventory templates`).
2. [DONE] Git Commit: `feat(diagram-modules): add module inventory templates` (hash: `6b8a3281`)
3. [DONE] Добавить merge-rules для inventory и перестроить root prompt, который runtime формирует в начале сессии, чтобы он явно перечислял `Final_Description.md` и `virtual-simulation.md` и вел сессию к `module-inventory.md` (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`, `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected commit: `refactor(diagram-modules): add dual-input inventory prompt contract`).
4. [DONE] Git Commit: `refactor(diagram-modules): add dual-input inventory prompt contract` (hash: `36cef261`)
5. [DONE] Ввести `module-inventory.md` в workflow artifact contract и runtime routing, не ломая существующие `module-map.md` и `module-map.flow.json` (scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit: `feat(diagram-modules): register module inventory artifact`).
6. [DONE] Git Commit: `feat(diagram-modules): register module inventory artifact` (hash: `c1b0fb5d`)

### Stream: Project Manager user surface
1. [DONE] Переключить `Diagram Modules` на inventory-first UX: `Artifacts` открывает диаграмму, `Source` показывает `module-inventory.md`, raw `module-map.md` уходит из primary surface (scope: `src/client/project-manager/components/layout/stage-artifact-mode.ts`, `src/client/project-manager/components/layout/stage-artifact-mode.test.ts`; expected commit: `refactor(pm): route diagram modules source to inventory`).
2. [DONE] Git Commit: `refactor(pm): route diagram modules source to inventory` (hash: `18d9a9ee`)
3. [DONE] Обновить help/empty-state под inventory-first flow и объяснить пользователю, что перечень согласуется до генерации визуальной диаграммы (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/layout/stage-artifact-mode.test.ts`; expected commit: `docs(pm): explain module inventory flow`).
4. [DONE] Git Commit: `docs(pm): explain module inventory flow` (hash: `28f131c5`)

### Stream: Diagram projection and release
1. [DONE] Перестроить diagram generation path так, чтобы `module-map.md` производился из согласованного `module-inventory.md` и сохранял cluster membership, standalone modules и простые relations для React Flow projection (scope: `packages/core/src/workflow/diagram-dsl/module-inventory-parser.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; expected commit: `refactor(diagram-modules): derive module map from inventory`).
2. [DONE] Git Commit: `refactor(diagram-modules): derive module map from inventory` (hash: `628d69e2`)
3. [DONE] Синхронизировать release docs и SSOT после реализации inventory-first `Diagram Modules` и visible diagram templates contract (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(release): prep module inventory diagram release`).
4. [DONE] Git Commit: `docs(release): prep module inventory diagram release` (hash: `43132504`)
5. [DONE] После ручной проверки собрать новый релиз, записать session report и закрыть хеши Phase 14 (scope: `release manifests/scripts`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session103.md`; expected commit: `chore(release): build module inventory diagram release`).
6. [DONE] Git Commit: `chore(release): build module inventory diagram release` (hash: `7c346ad0`)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-up-to-phase13-diagram-workflow-2026-03-19.md`
- Active planning doc for this phase: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
- Current implemented diagram SSOT remains in `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (`6.1`-`6.5`) until Phase 14 is implemented and synced

---

## Phase 15 — Diagram Modules Inventory-First Regression Repair (owner: Oleksandr, updated: 2026-03-19)

### Stream: Prompt and visible templates
1. [DONE] Исправить visible templates contract для `diagram_modules`, чтобы synced templates включали `module-inventory-*` assets (scope: `scripts/generate-bundled-templates.js`, `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/templates/template-sync-service.test.ts`; expected commit: `fix(templates): sync diagram modules inventory templates`).
2. [DONE] Git Commit: `fix(templates): sync diagram modules inventory templates` (hash: `6973c732`)
3. [DONE] Перевести root diagram contract на templates-first resolution, чтобы prompt/template для diagram stages резолвились из `~/.codeai-hub/templates/...`, а package assets оставались только fallback (scope: `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`; expected commit: `fix(templates): prefer synced root diagram contracts`).
4. [DONE] Git Commit: `fix(templates): prefer synced root diagram contracts` (hash: `8d412a62`)
5. [DONE] Починить PM prompt-pack для `Diagram Modules`: целевой файл должен быть `module-inventory.md`, prompt обязан явно перечислять `Final_Description.md` + `virtual-simulation.md` и проговаривать фазы `read -> discuss inventory -> derive module map` (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`; expected commit: `fix(diagram-modules): repair inventory-first prompt pack`).
6. [DONE] Git Commit: `fix(diagram-modules): repair inventory-first prompt pack` (hash: `f6248cd7`)

### Stream: Repair flow and derived artifacts
1. [TODO] Починить `Fix with agent`, чтобы кнопка открывала dialog session нужного stage и передавала в агент parse/validation ошибку как follow-up repair prompt (scope: `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`, `src/client/project-manager/components/shared/stage-artifact-content-view.tsx`, `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`; expected commit: `fix(pm): forward artifact validation errors to agent`).
2. [TODO] Git Commit: `fix(pm): forward artifact validation errors to agent` (hash: TBD)
3. [TODO] Довести panel callbacks до repair-flow: `Fix with agent` должен возвращать `sessionId` для follow-up prompt и работать для `Virtual Simulation`, `Diagram Modules`, `Diagram Facades` (scope: `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`; expected commit: `fix(pm): reuse workflow sessions for artifact repair`).
4. [TODO] Git Commit: `fix(pm): reuse workflow sessions for artifact repair` (hash: TBD)
5. [TODO] После сохранения `module-inventory.md` автоматически материализовать derived `module-map.md`, чтобы `Diagram Modules` не застревал без canonical downstream artifact и `Diagram Facades` мог стартовать на согласованной карте модулей (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `fix(diagram-modules): materialize module map from inventory upload`).
6. [TODO] Git Commit: `fix(diagram-modules): materialize module map from inventory upload` (hash: TBD)

### Stream: Verification and release
1. [TODO] Синхронизировать release docs и session report под regression-fix scope для `Diagram Modules` (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session103.md`; expected commit: `docs(release): prep diagram modules regression fix release`).
2. [TODO] Git Commit: `docs(release): prep diagram modules regression fix release` (hash: TBD)
3. [TODO] Собрать и проверить новый релиз с inventory-first repair flow, закрыть Phase 15 в плане и зафиксировать новый VSIX (scope: `release manifests/scripts`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session103.md`; expected commit: `chore(release): build diagram modules regression fix release`).
4. [TODO] Git Commit: `chore(release): build diagram modules regression fix release` (hash: TBD)
