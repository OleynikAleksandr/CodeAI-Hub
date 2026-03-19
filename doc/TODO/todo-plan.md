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
1. [DONE] Починить `Fix with agent`, чтобы кнопка открывала dialog session нужного stage и передавала в агент parse/validation ошибку как follow-up repair prompt; отдельный panel-callback refactor не потребовался, потому что shared flow сам резолвит активную continuity session через `WorkflowState` (scope: `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`, `src/client/project-manager/components/shared/stage-artifact-content-view.tsx`, `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`; expected commit: `fix(pm): forward artifact validation errors to agent`).
2. [DONE] Git Commit: `fix(pm): forward artifact validation errors to agent` (hash: `23916bed`)
3. [DONE] После сохранения `module-inventory.md` автоматически материализовать derived `module-map.md`, чтобы `Diagram Modules` не застревал без canonical downstream artifact и `Diagram Facades` мог стартовать на согласованной карте модулей (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix(diagram-modules): materialize module map from inventory upload`).
4. [DONE] Git Commit: `fix(diagram-modules): materialize module map from inventory upload` (hash: `0740fd1f`)

### Stream: Verification and release
1. [DONE] Синхронизировать release docs и session report под regression-fix scope для `Diagram Modules` (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session103.md`; expected commit: `docs(release): prep diagram modules regression fix release`).
2. [DONE] Git Commit: `docs(release): prep diagram modules regression fix release` (hash: `d68266cd`)
3. [DONE] Собрать и проверить новый релиз с inventory-first repair flow, закрыть Phase 15 в плане и зафиксировать новый VSIX (scope: `release manifests/scripts`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session103.md`; expected commit: `chore(release): build diagram modules regression fix release`).
4. [DONE] Git Commit: `chore(release): build diagram modules regression fix release` (hash: `aece7a29`)

---

## Phase 16 — Diagram Modules Inventory-Only Contract Cleanup (owner: Oleksandr, updated: 2026-03-19)

### Stream: Planning and contract reset
1. [DONE] Зафиксировать в planning doc и в execution plan новый inventory-only contract: `module-map.md` больше не является workspace artifact, visible template и gating dependency для `Diagram Modules`; `Diagram Facades` должен читать upstream module context из `module-inventory.md` (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope inventory-only diagram cleanup`).
2. [DONE] Git Commit: `docs(plan): scope inventory-only diagram cleanup` (hash: `46f436d7`)

### Stream: Visible templates and prompts
1. [DONE] Убрать legacy `module-map-*` из visible template sync для `diagram_modules`, чтобы в `~/.codeai-hub/templates/diagram_modules/` остались только inventory-first assets (scope: `packages/core/src/templates/bundled-templates.ts`, `scripts/generate-bundled-templates.js`, `packages/core/src/templates/template-sync-service.test.ts`; expected commit: `refactor(templates): drop legacy module map sync`).
2. [DONE] Git Commit: `refactor(templates): drop legacy module map sync` (hash: `a8961374`)
3. [DONE] Очистить стартовый prompt contract `Diagram Modules`: убрать из runtime prompt и agent prompt упоминания о переходе к `module-map.md`, оставить только inventory-first dialogue и `module-map.flow.json` как layout sidecar (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; expected commit: `refactor(diagram-modules): remove module map prompt tail`).
4. [DONE] Git Commit: `refactor(diagram-modules): remove module map prompt tail` (hash: `0d8e4a6d`)
5. [DONE] Убрать последние raw `module-map.md` copy-tails из inventory prompt и diagram help-copy, чтобы visible contract и agent contract не рекламировали отсутствующий workspace artifact (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `src/client/project-manager/components/diagram-facades/diagram-facades-help.tsx`; expected commit: `refactor(diagrams): remove raw module map copy tails`).
6. [DONE] Git Commit: `refactor(diagrams): remove raw module map copy tails` (hash: `801d811b`)
7. [DONE] Удалить неиспользуемые legacy `module-map` prompt/template assets из `diagram-modules-agent`, чтобы в package runtime не оставалось второго конкурирующего contract pack (scope: `packages/agents/diagram-modules-agent/assets/module-map-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-map-template.md`; expected commit: `refactor(diagram-modules): drop legacy module map prompt assets`).
8. [DONE] Git Commit: `refactor(diagram-modules): drop legacy module map prompt assets` (hash: `a6ed3919`)
9. [DONE] Удалить неиспользуемые legacy `module-map` field-reference/merge-rules assets из `diagram-modules-agent`, чтобы inventory-first asset pack остался единственным активным contract source (scope: `packages/agents/diagram-modules-agent/assets/module-map-field-reference.md`, `packages/agents/diagram-modules-agent/assets/module-map-merge-rules.md`; expected commit: `refactor(diagram-modules): drop legacy module map appendix assets`).
10. [DONE] Git Commit: `refactor(diagram-modules): drop legacy module map appendix assets` (hash: `37424b33`)

### Stream: Project Manager surface cleanup
1. [DONE] Убрать `module-map.md` из help/pending/tree contract для `Diagram Modules`, чтобы UI везде опирался на `module-inventory.md` и visual diagram, а не на отсутствующий raw map file (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `refactor(pm): remove module map references from diagram modules`).
2. [DONE] Git Commit: `refactor(pm): remove module map references from diagram modules` (hash: `49184ef3`)
3. [DONE] Перевести availability/title contract и blocked messaging на inventory-only semantics, чтобы `Diagram Modules` и `Diagram Facades` не ожидали `module-map.md` на диске; заодно синхронизировать старт `Diagram Facades` на `module-inventory.md` (scope: `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`; expected commit: `refactor(pm): align inventory-only gating messaging`).
4. [DONE] Git Commit: `refactor(pm): align inventory-only gating messaging` (hash: `4fda5662`)
5. [DONE] Убрать fallback чтение `module-map.md` из `Diagram Modules` loader/persistence path и зафиксировать `module-inventory.md` как единственный semantic source для PM surface (scope: `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`, `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`; expected commit: `refactor(pm): remove module map fallback from modules loader`).
6. [DONE] Git Commit: `refactor(pm): remove module map fallback from modules loader` (hash: `c1bbbb93`)

### Stream: Runtime and downstream contract cleanup
1. [DONE] Перевести stage start и workflow gating на `module-inventory.md`: `Diagram Facades` должен стартовать от inventory, filesystem hydration и blocked gates должны считать canonical artifact именно inventory (scope: `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `refactor(workflow): gate diagrams on module inventory`).
2. [DONE] Git Commit: `refactor(workflow): gate diagrams on module inventory` (hash: `63b0f83a`)
3. [DONE] Убрать `module-map.md` из workflow artifact path contract и artifact-upsert pipeline для `diagram_modules`, оставив только `module-inventory.md` и `module-map.flow.json` как workspace files этого шага (scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`; expected commit: `refactor(workflow): remove module map workspace artifact`).
4. [DONE] Git Commit: `refactor(workflow): remove module map workspace artifact` (hash: `25358a47`)
5. [DONE] Перевести `Diagram Facades` prompt и field reference на upstream `module-inventory.md`, чтобы runtime contract больше не ссылался на `module-map.md` как на вход шага (scope: `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`, `packages/agents/diagram-facades-agent/assets/facade-map-field-reference.md`; expected commit: `refactor(diagram-facades): point prompt to module inventory`).
6. [DONE] Git Commit: `refactor(diagram-facades): point prompt to module inventory` (hash: `e6e15451`)
7. [DONE] Перевести `Diagram Facades` merge rules и контрактный тест на upstream `module-inventory.md` и подтвердить, что stage contract tests проходят (scope: `packages/agents/diagram-facades-agent/assets/facade-map-merge-rules.md`, `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`; expected commit: `refactor(diagram-facades): align prompt merge rules with inventory`).
8. [DONE] Git Commit: `refactor(diagram-facades): align prompt merge rules with inventory` (hash: `d1cb1d8a`)

### Stream: SSOT sync and release
1. [DONE] Синхронизировать основные workflow SSOT docs под inventory-only contract для diagrams: canonical artifacts, gating, watcher hydration и Workflow Steps overview больше не должны опираться на `module-map.md` как workspace artifact (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`; expected commit: `docs(architecture): sync inventory-only workflow ssot`).
2. [DONE] Git Commit: `docs(architecture): sync inventory-only workflow ssot` (hash: `c6cb708c`)
3. [DONE] Синхронизировать downstream contracts и navigation SSOT под `module-inventory.md` как upstream для `Diagram Facades` (scope: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`, `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`, `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`; expected commit: `docs(contracts): sync downstream inventory references`).
4. [DONE] Git Commit: `docs(contracts): sync downstream inventory references` (hash: `02fe4911`)
5. [IN_PROGRESS] Синхронизировать release docs под inventory-only cleanup release и убрать из SSOT последние формулировки про обязательный raw `module-map.md` в workspace (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(release): prep inventory-only diagram cleanup release`).
6. [TODO] Git Commit: `docs(release): prep inventory-only diagram cleanup release` (hash: TBD)
7. [TODO] После ручной проверки собрать новый релиз, обновить `todo-plan.md`, создать новый session report и зафиксировать итоговый VSIX (scope: `release manifests/scripts`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session104.md`; expected commit: `chore(release): build inventory-only diagram cleanup release`).
8. [TODO] Git Commit: `chore(release): build inventory-only diagram cleanup release` (hash: TBD)
