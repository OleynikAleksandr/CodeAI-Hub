# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом нового scope сначала создать или обновить planning-док в `doc/SolidWorks-WorkFlow/Plans/`, затем нарезать его на Phase/Stream здесь.
- Текущий baseline релиз: `1.1.835`.
- Каждый новый stream должен соблюдать лимит микро-задачи `<= 3` рабочих файлов (не считая обязательного апдейта `doc/TODO/todo-plan.md`).
- После каждой микро-задачи обязателен отдельный `Git Commit:` пункт с фактическим hash после коммита.
- Husky hooks, `check-architecture.sh` и release checklist не обходить.

---

## Intake

### Stream: Await next approved planning scope
1. [TODO] Подготовить новый planning scope после baseline `1.1.835`: сначала обновить/создать planning-док в `doc/SolidWorks-WorkFlow/Plans/`, затем сформировать новый phase backlog в этом файле. Scope: planning docs only. Expected commit: `docs(plan): define next scope`
2. [TODO] Git Commit: `docs(plan): define next scope` (hash: `TBD`)
