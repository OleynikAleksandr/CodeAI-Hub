# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`, `doc/Sessions/Session106.md`, `doc/Sessions/Session107.md`, `doc/Sessions/Session108.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 18 — Diagram User-Facing Layout And Format (owner: Oleksandr, updated: 2026-03-20)

### Stream: Planning baseline
1. [DONE] Заархивировать завершенный `Phase 17` execution plan, создать planning docs для user-facing layout/format diagram stages и для формальной module/cluster-facade grammar платформы, затем зафиксировать confirmed baseline: текущая диаграмма слабо полезна пользователю не только из-за layout overlap, но и из-за отсутствия внятно materialized formal entities в кодовой базе (scope: `doc/TODO/Archive/todo-plan-phase17-codex-resume-recovery-2026-03-20.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start diagram layout and format scope`).
2. [DONE] Git Commit: `docs(plan): start diagram layout and format scope` (hash: `b0eb2f09`)

## Phase 19 — Greenfield Polygon Prompt Grammar (owner: Oleksandr, updated: 2026-03-20)

### Stream: Polygon baseline
1. [DONE] Зафиксировать greenfield-полигон как активный execution scope: привязать новый planning-doc к active TODO и подтвердить, что ближайшая practical цель — не рефакторинг основного repo, а переписывание prompt/template grammar для `Description`, `Virtual Simulation` и `Diagram Modules` на пустых репозиториях (scope: `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start greenfield architecture polygon`).
2. [TODO] Git Commit: `docs(plan): start greenfield architecture polygon` (hash: TBD)

### Stream: Description grammar
1. [DONE] Переписать user-facing `Description` templates так, чтобы шаг начал собирать archetype приложения, deployable/runtime contours и язык formal boundaries, не превращаясь в низкоуровневую спецификацию; затем регенерировать bundled templates (scope: `packages/agents/description-agent/assets/questionnaire-template.md`, `packages/agents/description-agent/assets/description-template.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): align description user templates with polygon grammar`).
2. [TODO] Git Commit: `docs(prompt): align description user templates with polygon grammar` (hash: TBD)
3. [DONE] Переписать `description-collector-prompt.md`, чтобы агент `Final_Description.md` уже оперировал `Archetype Shell`, `Archetype Profile`, `Package / Deployable Unit`, `Cluster`, `Module`, `Module Facade`, `Cluster Facade`; затем регенерировать bundled templates (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): teach description agent formal architecture grammar`).
4. [TODO] Git Commit: `docs(prompt): teach description agent formal architecture grammar` (hash: TBD)

### Stream: Virtual Simulation grammar
1. [DONE] Переписать `virtual-simulation-prompt.md`, чтобы сценарии порождали formal boundaries, archetype-aware shell constraints и простые user-readable interactions между будущими clusters/modules; затем регенерировать bundled templates и обновить prompt-only contract test (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`; expected commit: `docs(prompt): align virtual simulation with formal boundaries`).
2. [TODO] Git Commit: `docs(prompt): align virtual simulation with formal boundaries` (hash: TBD)

### Stream: Diagram Modules grammar
1. [DONE] Переписать `module-inventory` prompt/template так, чтобы `Diagram Modules` строилась из formal clusters и formal modules: cluster отображается как container с вложенными module-nodes, standalone modules остаются отдельными node-ами, а связи остаются простыми и user-readable; затем регенерировать bundled templates (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): align diagram modules inventory grammar`).
2. [TODO] Git Commit: `docs(prompt): align diagram modules inventory grammar` (hash: TBD)
3. [DONE] Переписать field-reference и merge-rules для `module-inventory`, чтобы grammar требовала formal clusters/modules, запрещала loose analytical labels и сохраняла user-approved boundaries; затем регенерировать bundled templates (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): lock diagram modules formal grammar`).
4. [TODO] Git Commit: `docs(prompt): lock diagram modules formal grammar` (hash: TBD)
5. [DONE] Обновить diagram-stage contract test, чтобы prompt-pack для `Diagram Modules` проверял новую polygon grammar и appendix invariants для formal clusters/modules (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`; expected commit: `test(prompt): cover diagram modules polygon grammar`).
6. [TODO] Git Commit: `test(prompt): cover diagram modules polygon grammar` (hash: TBD)

### Stream: Prompt-pack verification
1. [DONE] Расширить template-sync / visible-template checks так, чтобы `Description`, `Virtual Simulation` и `Diagram Modules` гарантированно поставляли пользователю актуальный polygon prompt surface через existing template-sync path (scope: `packages/core/src/templates/template-sync-service.test.ts`; expected commit: `test(prompt): verify polygon template sync surface`).
2. [TODO] Git Commit: `test(prompt): verify polygon template sync surface` (hash: TBD)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-phase17-codex-resume-recovery-2026-03-20.md`
- Active planning docs for this phase:
  - `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`
- Session handoff report:
  - `doc/Sessions/Session108.md`
- Active mirrored workspace artifact:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/diagram_modules/module-inventory.md`
- Confirmed current defect baseline:
  - first-open diagram remains visible without `module-map.flow.json`, but fallback positions can overlap cards and reduce readability
  - current `cluster` / `module` semantics are not yet strict enough to produce a diagram that is self-explanatory for a non-programmer user
- Current active execution focus:
  - не рефакторинг основного repo, а greenfield-полигон на пустых репозиториях
  - первый practical target — prompt/template grammar для `Description`, `Virtual Simulation`, `Diagram Modules`
  - success criterion — `Diagram Modules` должна стать понятной пользователю диаграммой состава системы, а не повторением folder chaos
