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
1. [TODO] Зафиксировать в живых архитектурных документах новый contract для `Diagram Modules`: обязательные входы `Final_Description.md` + `virtual-simulation.md`, `module-inventory.md` как человекочитаемый semantic bridge, `module-map.md` как derived diagram artifact (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`; expected commit: `docs(architecture): add module inventory bridge contract`).
2. [TODO] Git Commit: `docs(architecture): add module inventory bridge contract` (hash: TBD)
3. [TODO] Синхронизировать живой PM UX contract под `Source = module-inventory.md` для `Diagram Modules` и новую policy видимых diagram templates (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`; expected commit: `docs(pm): sync module inventory source contract`).
4. [TODO] Git Commit: `docs(pm): sync module inventory source contract` (hash: TBD)

### Stream: Visible templates
1. [DONE] Вернуть diagram prompt/template contract в visible templates sync, чтобы `diagram_modules` и `diagram_facades` жили в `~/.codeai-hub/templates/...` через bundled manifest (scope: `packages/core/src/templates/bundled-templates.ts`; expected commit: `refactor(templates): sync diagram workflow templates`).
2. [DONE] Git Commit: `refactor(templates): sync diagram workflow templates` (hash: `7a709c16`)
3. [DONE] Довести source generator для visible templates contract до formatter-approved состояния, чтобы `scripts/generate-bundled-templates.js` продолжал собирать diagram templates в visible home templates (scope: `scripts/generate-bundled-templates.js`; expected commit: `refactor(templates): sync diagram workflow templates source`).
4. [DONE] Git Commit: `refactor(templates): sync diagram workflow templates source` (hash: `1b6dfb3a`)
5. [DONE] Перевести diagram prompt appendix resolution на templates-first path и оставить package assets только bundled-source fallback (scope: `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`, `packages/core/src/templates/template-sync-service.test.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `refactor(templates): prefer synced diagram prompt appendices`).
6. [DONE] Git Commit: `refactor(templates): prefer synced diagram prompt appendices` (hash: `4e18a234`)

### Stream: Diagram Modules inventory contract
1. [TODO] Добавить inventory-first prompt/template assets для `Diagram Modules`, чтобы первый semantic output шага был `module-inventory.md` с кластерами, составом кластеров, standalone modules и простыми relations (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`; expected commit: `feat(diagram-modules): add module inventory templates`).
2. [TODO] Git Commit: `feat(diagram-modules): add module inventory templates` (hash: TBD)
3. [TODO] Добавить merge-rules для inventory и перестроить root prompt, который runtime формирует в начале сессии, чтобы он явно перечислял `Final_Description.md` и `virtual-simulation.md` и вел сессию к `module-inventory.md` (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`, `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`; expected commit: `refactor(diagram-modules): add dual-input inventory prompt contract`).
4. [TODO] Git Commit: `refactor(diagram-modules): add dual-input inventory prompt contract` (hash: TBD)
5. [TODO] Ввести `module-inventory.md` в workflow artifact contract и watcher/runtime routing, не ломая существующие `module-map.md` и `module-map.flow.json` (scope: `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit: `feat(diagram-modules): register module inventory artifact`).
6. [TODO] Git Commit: `feat(diagram-modules): register module inventory artifact` (hash: TBD)

### Stream: Project Manager user surface
1. [TODO] Переключить `Diagram Modules` на inventory-first UX: `Artifacts` открывает диаграмму, `Source` показывает `module-inventory.md`, raw `module-map.md` уходит из primary surface (scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `refactor(pm): route diagram modules source to inventory`).
2. [TODO] Git Commit: `refactor(pm): route diagram modules source to inventory` (hash: TBD)
3. [TODO] Обновить help/empty-state под inventory-first flow и объяснить пользователю, что перечень согласуется до генерации визуальной диаграммы (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/layout/stage-artifact-mode.test.ts`; expected commit: `docs(pm): explain module inventory flow`).
4. [TODO] Git Commit: `docs(pm): explain module inventory flow` (hash: TBD)

### Stream: Diagram projection and release
1. [TODO] Перестроить diagram generation path так, чтобы `module-map.md` производился из согласованного `module-inventory.md` и сохранял cluster membership, standalone modules и простые relations для React Flow projection (scope: `packages/core/src/workflow/diagram-dsl/module-map-parser.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts`; expected commit: `refactor(diagram-modules): derive module map from inventory`).
2. [TODO] Git Commit: `refactor(diagram-modules): derive module map from inventory` (hash: TBD)
3. [TODO] Синхронизировать release docs и SSOT после реализации inventory-first `Diagram Modules` и visible diagram templates contract (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(release): prep module inventory diagram release`).
4. [TODO] Git Commit: `docs(release): prep module inventory diagram release` (hash: TBD)
5. [TODO] После ручной проверки собрать новый релиз, записать session report и закрыть хеши Phase 14 (scope: `release manifests/scripts`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session103.md`; expected commit: `chore(release): build module inventory diagram release`).
6. [TODO] Git Commit: `chore(release): build module inventory diagram release` (hash: TBD)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-up-to-phase13-diagram-workflow-2026-03-19.md`
- Active planning doc for this phase: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
- Current implemented diagram SSOT remains in `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (`6.1`-`6.5`) until Phase 14 is implemented and synced
