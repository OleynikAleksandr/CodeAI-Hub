# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/Sessions/Session127.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 29 — Diagram Prompt Consistency And Autolayout Follow-Up (owner: Oleksandr, updated: 2026-03-22)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый `Phase 28` plan и открыть новый scope, в котором accepted findings приходят от фактических runtime prompt payloads diagram stages и live regression по visual readability, а длина prompt сама по себе defect-ом не считается (scope: `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start diagram prompt consistency and autolayout scope`).
2. [TODO] Git Commit: `docs(plan): start diagram prompt consistency and autolayout scope` (hash: TBD)

### Stream: Diagram prompt payload contradiction audit
1. [TODO] Сверить фактический runtime payload `Diagram Modules` с source assets и зафиксировать только реальные contradictions, unsafe duplicates и wording drift, не сокращая prompt ради краткости (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`; expected commit: `docs(diagram-prompts): capture modules prompt contradictions`).
2. [TODO] Git Commit: `docs(diagram-prompts): capture modules prompt contradictions` (hash: TBD)
3. [TODO] Сверить фактический runtime payload `Diagram Facades` с source assets по тем же правилам и отделить реальные contradictions от безопасных повторов (scope: `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`, `packages/agents/diagram-facades-agent/assets/facade-map-field-reference.md`, `packages/agents/diagram-facades-agent/assets/facade-map-merge-rules.md`; expected commit: `docs(diagram-prompts): capture facades prompt contradictions`).
4. [TODO] Git Commit: `docs(diagram-prompts): capture facades prompt contradictions` (hash: TBD)

### Stream: Diagram DSL follow-up
1. [TODO] На основе принятых prompt findings упростить или прояснить только те user-facing DSL surface-элементы, которые реально улучшают понимание диаграммы, не возвращая removed `Role` и не теряя явную сущность `Module` (scope: files to be narrowed after audit; expected commit: `fix(diagram-dsl): refine user-facing diagram contract`).
2. [TODO] Git Commit: `fix(diagram-dsl): refine user-facing diagram contract` (hash: TBD)

### Stream: Autolayout readability follow-up
1. [TODO] Зафиксировать принятые defects first-open layout для `Diagram Modules` / `Diagram Facades` на live regression `1.1.764` и отделить проблемы runtime layout от проблем semantic artifact (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(layout): capture diagram autolayout defects`).
2. [TODO] Git Commit: `docs(layout): capture diagram autolayout defects` (hash: TBD)
3. [TODO] После подтверждения defects определить минимальный кодовый slice для улучшения first-open readability без расширения scope до полного redesign graph runtime (scope: files to be narrowed after evidence capture; expected commit: `fix(diagram-layout): improve first-open readability`).
4. [TODO] Git Commit: `fix(diagram-layout): improve first-open readability` (hash: TBD)

### Stream: Release build after accepted fixes
1. [BLOCKED] После принятия конкретных prompt / DSL / layout fixes выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать новый baseline и оформить session report (scope: release/version docs and files to be determined by accepted fixes; expected commit: `chore(release): prepare diagram prompt consistency release`).
2. [BLOCKED] Git Commit: `chore(release): prepare diagram prompt consistency release` (hash: TBD)

## Notes
- Archived completed rollout plans:
  - `doc/TODO/Archive/todo-plan-up-to-phase26-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase27-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`
- Active planning doc for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`
- Current validated release baseline:
  - `codeai-hub-1.1.764.vsix`
- User constraints for this scope:
  - always-full prompt pack acceptable;
  - prompt length itself is not a defect;
  - defects matter only when the pack contains contradictions, unsafe duplicates or wording drift;
  - autolayout and DSL should be improved only where they clearly improve the product.
