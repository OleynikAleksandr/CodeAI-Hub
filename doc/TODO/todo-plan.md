# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/Sessions/Session052.md`
- TODO Plan состоит из Phase/Stream, каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Parked Phases (вынесены в отдельные файлы)
- `Phase 272 (Standalone Reviewer, DEFERRED)`: `doc/TODO/Phase272-StandaloneReviewer.md`

## Архив
- Предыдущий общий план (Phase 271–278): `doc/TODO/Archive/todo-plan-up-to-phase278-2026-02-28.md`
- Завершённый план Phase 279: `doc/TODO/Archive/todo-plan-up-to-phase279-2026-03-01.md`

---

## Phase 280 — Description Draft Templates Review & Integration Plan (owner: Oleksandr, updated: 2026-03-01)

**Scope этой фазы:** только ревью и согласование шаблонов шага `Description`.

**Цель:**
- получить утверждённые user-facing и agent-facing шаблоны;
- подготовить микро-план интеграции в runtime после пользовательского утверждения.

### Stream 0: Review Gate (with user)
1. [TODO] Провести ревью и согласовать правки для `doc/Description_Step_Help_Template.draft-v1.md` (scope: `doc/Description_Step_Help_Template.draft-v1.md`; expected commit: `docs(help): approve description step help template v1`).
2. [TODO] Git Commit: `docs(help): approve description step help template v1` (hash: TBD)
3. [TODO] Провести ревью и согласовать правки для `doc/Description_Agent_Instructions_Template.draft-v2.md` (scope: `doc/Description_Agent_Instructions_Template.draft-v2.md`; expected commit: `docs(prompt): approve description agent instructions template v2`).
4. [TODO] Git Commit: `docs(prompt): approve description agent instructions template v2` (hash: TBD)

### Stream 1: Integration planning (post-approval)
1. [BLOCKED] Зафиксировать интеграционный план: какие draft-файлы становятся runtime-asset источником истины и какие файлы/модули нужно менять (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(description): define integration plan for approved templates`).
2. [BLOCKED] Git Commit: `docs(description): define integration plan for approved templates` (hash: TBD)
