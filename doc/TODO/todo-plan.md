# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение протоколов/архитектуры требует синхронного обновления документов из `doc/` **до** коммита.

## Required documents to review before work
1. `doc/Project_Docs/ProjectManager_SessionPlacement_And_RunsPath_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`

---

## Phase 53 — Workflow Tree: split шагов + новые агенты (owner: Oleksandr, updated: 2026-01-17)

Цель UX: в дереве Project Manager и верхнем сайдбаре вместо двух шагов (Описание/Диаграмма) должны быть четыре — Описание, Virtual Simulation, Диаграмма модулей, Диаграмма фасадов.

### Stream: Architecture docs
1. [IN_PROGRESS] Docs: обновить SolidWorks-Flow архитектуру (4 шага, новые пути/шаблоны) — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`, `doc/SolidWorks-Flow/README.md`; expected commit message: `docs: solidworks workflow step split`
2. [TODO] Git Commit: `docs: solidworks workflow step split` (hash: TBD)
3. [TODO] Docs: добавить указатель в Project_Docs — scope: `doc/Project_Docs/WorkflowTree_StepSplit_Architecture.md`; expected commit message: `docs: link step split architecture`
4. [TODO] Git Commit: `docs: link step split architecture` (hash: TBD)

### Stream: Core template namespace
1. [DONE] Refactor(core): обновить реестр шаблонов и sync под новые namespaces — scope: `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/templates/template-sync-service.ts`; expected commit message: `refactor(core): split template namespaces`
2. [DONE] Git Commit: `refactor(core): split template namespaces` (hash: b2c6597b)
3. [DONE] Refactor(core): добавить legacy-move для старых шаблонов idea — scope: `packages/core/src/templates/template-sync-service.ts`; expected commit message: `refactor(core): archive legacy idea templates`
4. [DONE] Git Commit: `refactor(core): archive legacy idea templates` (hash: e5f3f46b)

### Stream: Description agent
1. [DONE] Feat(agents): каркас description-agent — scope: `packages/agents/description-agent/package.json`, `packages/agents/description-agent/src/index.ts`, `packages/agents/description-agent/src/facade.ts`; expected commit message: `feat(agents): add description agent skeleton`
2. [DONE] Git Commit: `feat(agents): add description agent skeleton` (hash: 82a5198f)
3. [DONE] Feat(agents): шаблоны описания — scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/agents/description-agent/assets/description-collector-schema.json`, `packages/agents/description-agent/assets/description-template.md`; expected commit message: `feat(agents): add description templates`
4. [DONE] Git Commit: `feat(agents): add description templates` (hash: eb75d920)
5. [DONE] Feat(agents): анкета описания — scope: `packages/agents/description-agent/assets/questionnaire-template.md`; expected commit message: `feat(agents): add description questionnaire template`
6. [DONE] Git Commit: `feat(agents): add description questionnaire template` (hash: a56c5f51)

### Stream: Virtual Simulation agent
1. [DONE] Feat(agents): каркас virtual-simulation-agent — scope: `packages/agents/virtual-simulation-agent/package.json`, `packages/agents/virtual-simulation-agent/src/index.ts`, `packages/agents/virtual-simulation-agent/src/facade.ts`; expected commit message: `feat(agents): add virtual simulation agent skeleton`
2. [DONE] Git Commit: `feat(agents): add virtual simulation agent skeleton` (hash: 61b59722)
3. [DONE] Feat(agents): шаблоны virtual simulation — scope: `packages/agents/virtual-simulation-agent/assets/virtual-simulation-prompt.md`, `packages/agents/virtual-simulation-agent/assets/virtual-simulation-schema.json`, `packages/agents/virtual-simulation-agent/assets/virtual-simulation-template.md`; expected commit message: `feat(agents): add virtual simulation templates`
4. [DONE] Git Commit: `feat(agents): add virtual simulation templates` (hash: 5b982032)

### Stream: Diagram Modules agent
1. [DONE] Feat(agents): каркас diagram-modules-agent — scope: `packages/agents/diagram-modules-agent/package.json`, `packages/agents/diagram-modules-agent/src/index.ts`, `packages/agents/diagram-modules-agent/src/facade.ts`; expected commit message: `feat(agents): add diagram modules agent skeleton`
2. [DONE] Git Commit: `feat(agents): add diagram modules agent skeleton` (hash: 98fd9960)
3. [DONE] Feat(agents): шаблоны modules diagram — scope: `packages/agents/diagram-modules-agent/assets/modules-diagram-prompt.md`, `packages/agents/diagram-modules-agent/assets/modules-diagram-schema.json`, `packages/agents/diagram-modules-agent/assets/modules-diagram-template.mmd`; expected commit message: `feat(agents): add modules diagram templates`
4. [DONE] Git Commit: `feat(agents): add modules diagram templates` (hash: 39536b9a)

### Stream: Diagram Facades agent
1. [DONE] Feat(agents): каркас diagram-facades-agent — scope: `packages/agents/diagram-facades-agent/package.json`, `packages/agents/diagram-facades-agent/src/index.ts`, `packages/agents/diagram-facades-agent/src/facade.ts`; expected commit message: `feat(agents): add diagram facades agent skeleton`
2. [DONE] Git Commit: `feat(agents): add diagram facades agent skeleton` (hash: 3839cef3)
3. [DONE] Feat(agents): шаблоны facades graph — scope: `packages/agents/diagram-facades-agent/assets/facades-graph-prompt.md`, `packages/agents/diagram-facades-agent/assets/facades-graph-schema.json`, `packages/agents/diagram-facades-agent/assets/facades-graph-template.mmd`; expected commit message: `feat(agents): add facades graph templates`
4. [DONE] Git Commit: `feat(agents): add facades graph templates` (hash: 74caf112)

### Stream: Core contracts + paths
1. [TODO] Refactor(core): разнести contract endpoints по шагам — scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/idea-questionnaire-path-detector.ts`; expected commit message: `refactor(core): split workflow contracts`
2. [TODO] Git Commit: `refactor(core): split workflow contracts` (hash: TBD)
3. [TODO] Refactor(core): обновить allowlist slots → paths для 4 шагов — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit message: `refactor(core): update artifact slots allowlist`
4. [TODO] Git Commit: `refactor(core): update artifact slots allowlist` (hash: TBD)

### Stream: UI wiring (vscode-webview)
1. [TODO] Refactor(ui): заменить Idea Collector сервисы на Description + Virtual Simulation — scope: `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-collector-contract.ts`, `src/client/ui/src/services/idea-collector-schema-cache.ts`; expected commit message: `refactor(ui): split description and virtual simulation`
2. [TODO] Git Commit: `refactor(ui): split description and virtual simulation` (hash: TBD)
3. [TODO] Refactor(ui): обновить пути и логику runs для diagram steps — scope: `src/client/ui/src/app-host/session-region-idea-paths.ts`, `src/client/ui/src/services/idea-questionnaire-service.ts`; expected commit message: `refactor(ui): split diagram steps paths`
4. [TODO] Git Commit: `refactor(ui): split diagram steps paths` (hash: TBD)

### Stream: Project Manager wiring
1. [TODO] Refactor(project-manager): split description submit + new steps — scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `refactor(project-manager): split description workflow steps`
2. [TODO] Git Commit: `refactor(project-manager): split description workflow steps` (hash: TBD)

### Stream: Cleanup idea naming
1. [TODO] Refactor: удалить упоминания idea/full-development-flow из docs и типов — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/AgentPackages_Architecture.md`; expected commit message: `docs: remove idea naming from architecture`
2. [TODO] Git Commit: `docs: remove idea naming from architecture` (hash: TBD)
