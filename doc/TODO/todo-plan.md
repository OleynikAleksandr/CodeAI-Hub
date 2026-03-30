# План разработки (Development TODO Plan)

## Status
- Активный execution scope сейчас отсутствует.
- Последний завершённый Gemini-focused plan архивирован в `doc/TODO/Archive/todo-plan-up-to-phase3-gemini-upstream-pause-2026-03-30.md`.
- Следующий рабочий scope открывается только после нового approved planning-дока в `doc/SolidWorks-WorkFlow/Plans/`.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед новым `todo-plan` сначала создать или обновить planning-док в `doc/SolidWorks-WorkFlow/Plans/` и согласовать его как source of truth.
- Каждая новая микро-задача должна затрагивать не более 3 файлов и сопровождаться отдельным `Git Commit:` пунктом.
- Изменения логики и архитектуры должны синхронно попадать в `doc/` в том же коммите.

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/Sessions/Session202.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

## Next step before implementation
- Выбрать следующий scope вне Gemini remediation trail.
- Создать под него новый planning-док.
- Только после этого нарезать новый execution `todo-plan`.
