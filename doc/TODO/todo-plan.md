# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед разворачиванием нового diagram scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/Sessions/Session102.md`
- Реализованная diagram-архитектура уже консолидирована в `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (разделы `6.1`-`6.5`); этот файл пока является только execution-plan stub для следующего follow-up scope
- Новый execution-plan разворачивается только после утверждения следующего delta-scope
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом стриме - микро-задачи
- Каждая микро-задача затрагивает не более 3 файлов или пакетов
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Таргетные сборки выполнять перед закрытием затронутого Stream/Phase
- После полной реализации этого stub-плана перенести его в `doc/TODO/Archive/` и создать новый `todo-plan.md` под следующий scope

---

## Phase 14 — next diagram steps follow-up (owner: Oleksandr, updated: 2026-03-19)

### Stream: Scope intake stub
1. [TODO] Утвердить следующий follow-up scope для `Diagram Modules` / `Diagram Facades` поверх уже реализованного контракта из `SystemArchitecture.md`; первыми кандидатами считать `module-map.md` golden reference и manual alignment tools (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope next diagram follow-up`).
2. [TODO] Git Commit: `docs(plan): scope next diagram follow-up` (hash: TBD)
3. [TODO] После user approval развернуть эту болванку в micro-task execution plan с ограничением `<= 3 files` на задачу и обязательными commit-строками после каждой микро-задачи (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(plan): expand next diagram follow-up execution plan`).
4. [TODO] Git Commit: `docs(plan): expand next diagram follow-up execution plan` (hash: TBD)

## Notes
- Archived completed diagram rollout plan: `doc/TODO/Archive/todo-plan-up-to-phase13-diagram-workflow-2026-03-19.md`
- Consolidated implemented diagram architecture: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (`6.1`-`6.5`)
- Active follow-up planning doc: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
