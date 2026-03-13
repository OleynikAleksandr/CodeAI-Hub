# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/README.md`
- Дополнительно перед стартом нового scope открыть: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`, текущий `doc/Sessions/Session070.md`.
- Новый execution plan разворачивается только после отдельного planning-документа в `doc/SolidWorks-WorkFlow/Plans/` и явного утверждения пользователем.
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Phase TBD — Next approved architecture scope bootstrap (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Design intake
1. [TODO] Зафиксировать новый рабочий scope отдельным planning-документом в `doc/SolidWorks-WorkFlow/Plans/` и утвердить его перед разворачиванием execution plan (scope: `doc/SolidWorks-WorkFlow/Plans/<NextScope>_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): register <next-scope> architecture`).
2. [TODO] Git Commit: `docs(plan): register <next-scope> architecture` (hash: TBD)

### Stream 1: Execution plan bootstrap
3. [TODO] После утверждения planning-документа заменить эту болванку на реальный phase/stream plan под новый scope с микро-задачами и обязательными commit checkpoints (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(plan): bootstrap <next-scope> execution`).
4. [TODO] Git Commit: `docs(plan): bootstrap <next-scope> execution` (hash: TBD)
