# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Regression_Prompt_Surface_Refinements_Architecture.md`, `doc/Sessions/Session117.md`, `doc/Sessions/Session118.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 25 — Regression Prompt Surface Refinements (owner: Oleksandr, updated: 2026-03-22)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый `todo-plan` после релиза `1.1.757`, создать planning-doc для prompt/help refinement scope и открыть новый execution plan под regression-driven улучшения `Description` и downstream prompt surface (scope: `doc/TODO/Archive/todo-plan-up-to-phase24-2026-03-22.md`, `doc/SolidWorks-WorkFlow/Plans/Regression_Prompt_Surface_Refinements_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start regression prompt refinement scope`).
2. [DONE] Git Commit: `docs(plan): start regression prompt refinement scope` (hash: `de84b204`)

### Stream: Description artifact semantics
1. [TODO] Переформулировать контракт `Description`, чтобы агент обязан был пересобирать артефакт как цельный согласованный документ, но не обязан физически делать полную замену файла, если можно сохранить валидные пользовательские правки patch-based; одновременно добавить явную поддержку composite / multi-surface archetype для гибридных продуктов (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `src/client/project-manager/components/description/description-step-help.tsx`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): refine description artifact semantics`).
2. [TODO] Git Commit: `docs(prompt): refine description artifact semantics` (hash: TBD)
3. [IN_PROGRESS] Усилить DoD `Description`, чтобы `Final_Description.md` явно требовал отдельный блок пользовательски понятных сценариев, но без жёсткого верхнего лимита; формула должна быть "столько сценариев, сколько нужно для покрытия продукта", а не `2–4` (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/core/src/templates/template-sync-service.test.ts`, `src/client/project-manager/components/description/description-step-help.test.ts`; expected commit: `docs(prompt): require explicit description scenarios`).
4. [TODO] Git Commit: `docs(prompt): require explicit description scenarios` (hash: TBD)

### Stream: Stage context scoping
1. [TODO] Уточнить stage prompts так, чтобы semantic source of truth всегда был ограничен канонической цепочкой артефактов текущего запроса, а continuity/runtime metadata использовались только для сохранения подтверждённого пользователем контекста, но не как источник архитектурной интерпретации (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`; expected commit: `docs(prompt): tighten stage context scoping`).
2. [TODO] Git Commit: `docs(prompt): tighten stage context scoping` (hash: TBD)

### Stream: Remove hard scenario cap across all surfaces
1. [DONE] Убрать жёсткий лимит `2–4` из description-facing surfaces и kickoff templates, чтобы сценарный блок оставался обязательным, но его размер определялся сложностью продукта, а не старым фиксированным числом (scope: `packages/agents/description-agent/assets/questionnaire-template.md`, `packages/agents/idea-collector/assets/questionnaire-template.md`, `src/client/project-manager/components/description/description-step-help.tsx`; expected commit: `docs(prompt): remove hard scenario cap from description surfaces`).
2. [DONE] Git Commit: `docs(prompt): remove hard scenario cap from description surfaces` (hash: `713152ff`)
3. [DONE] Убрать жёсткий лимит `2–4` из `Virtual Simulation` user-facing prompt/help и bundle sync, сохранив требование достаточного сценарного покрытия без белых пятен (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): remove hard scenario cap from virtual simulation surfaces`).
4. [DONE] Git Commit: `docs(prompt): remove hard scenario cap from virtual simulation surfaces` (hash: `6632ec6b`)
5. [DONE] Снять технический лимит `2–4` из runtime validation, Project Manager validation copy и связанных entry surfaces, чтобы `virtual-simulation.md` больше не падал в `ERROR` только из-за количества сценариев (scope: `packages/core/src/workflow/validation/virtual-simulation-validator.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`; expected commit: `fix(workflow): remove hard virtual simulation scenario cap`).
6. [DONE] Git Commit: `fix(workflow): remove hard virtual simulation scenario cap` (hash: `8a81a2e5`)
7. [DONE] Удалить старый лимит `2–4` из core SSOT и step contracts, чтобы help, prompt, validator и документация больше не противоречили друг другу (scope: `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(contract): drop hard scenario cap from virtual simulation`).
8. [DONE] Git Commit: `docs(contract): drop hard scenario cap from virtual simulation` (hash: `a88dd6f6`)
9. [DONE] Удалить старый лимит `2–4` из оставшихся активных entry/design surfaces, чтобы description-entry и старые design-доки тоже не подсказывали агенту неверный контракт (scope: `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`; expected commit: `docs(prompt): remove hard scenario cap from remaining entry docs`).
10. [DONE] Git Commit: `docs(prompt): remove hard scenario cap from remaining entry docs` (hash: `d6519aec`)

### Stream: Release build after scenario-cap checkpoint
1. [DONE] На чистом дереве прогнать таргетные prompt/help/template проверки, затем выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; после успеха обновить `doc/Sessions/`, `todo-plan.md` и зафиксировать новый локальный релиз для повторного regression pass (scope: `packages/core/src/templates/template-sync-service.test.ts`, `doc/Sessions/Session118.md`, `doc/Sessions/Session119.md`; expected commit: `chore(release): build prompt refinement package`).
2. [DONE] Git Commit: `chore(release): build prompt refinement package` (hash: `e620f207`)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-up-to-phase24-2026-03-22.md`
- Active planning doc for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/Regression_Prompt_Surface_Refinements_Architecture.md`
- Current regression log:
  - `doc/Sessions/Session118.md`
- Current validated release baseline before this scope:
  - `codeai-hub-1.1.758.vsix`
  - hard scenario cap removed from `Description` / `Virtual Simulation` / runtime / SSOT surfaces in `1.1.758`
