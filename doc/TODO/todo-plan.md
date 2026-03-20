# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`, `doc/Sessions/Session106.md`, `doc/Sessions/Session107.md`
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
2. [TODO] Git Commit: `docs(plan): start diagram layout and format scope` (hash: TBD)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-phase17-codex-resume-recovery-2026-03-20.md`
- Active planning docs for this phase:
  - `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
- Active mirrored workspace artifact:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/diagram_modules/module-inventory.md`
- Confirmed current defect baseline:
  - first-open diagram remains visible without `module-map.flow.json`, but fallback positions can overlap cards and reduce readability
  - current `cluster` / `module` semantics are not yet strict enough to produce a diagram that is self-explanatory for a non-programmer user
- Implementation streams will be added after planning decisions on lane model, card format, and fallback-layout rules are approved.
