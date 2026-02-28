# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/Sessions/Session050.md`
- TODO Plan состоит из Phase/Stream, каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Phase 271 — Standalone Reviewer module design kickoff (owner: Oleksandr, updated: 2026-02-28)

**Контекст:** базовый workflow стабилизирован на single-agent Description. Standalone Reviewer вынесен в отдельный модуль (`Backlog Module R1`).

### Stream 0: Design Phase gate (архитектурное согласование)
1. [TODO] Подготовить архитектурный контракт standalone reviewer: manual trigger, границы ответственности, артефакты, resume/memory policy, интеграция с PM/UI (scope: `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`; expected commit: `docs(reviewer): draft standalone reviewer module architecture`).
2. [TODO] Git Commit: `docs(reviewer): draft standalone reviewer module architecture` (hash: TBD)
3. [BLOCKED] После утверждения контракта пользователем синхронизировать SSOT workflow документы и boundary с существующими шагами (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(workflow): approve standalone reviewer module boundary`).
4. [BLOCKED] Git Commit: `docs(workflow): approve standalone reviewer module boundary` (hash: TBD)

### Stream 1: Execution planning (после утверждения архитектуры)
1. [BLOCKED] Разбить реализацию standalone reviewer на микро-задачи (runtime/core, PM/UI, templates) с лимитом ≤3 файлов на подзадачу и обязательными commit-step пунктами (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): expand standalone reviewer execution streams`).
2. [BLOCKED] Git Commit: `docs(todo): expand standalone reviewer execution streams` (hash: TBD)
