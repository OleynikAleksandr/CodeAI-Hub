# План разработки (Development TODO Plan)

## Execution Scope Status: EMPTY

Нет активного execution cycle. Последний закрытый цикл — 1.2.11 (Gemini initial-leg stalled-turn watchdog 60_000 → 240_000). Архив: `doc/TODO/Archive/todo-plan-1.2.11-gemini-initial-watchdog.md`.

## Next steps (для новой сессии)

1. Прочитать базовый SSOT `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`.
2. Обсудить с пользователем новый scope.
3. Открыть `doc/SolidWorks-WorkFlow/Docs_Index.md` и выбрать релевантные документы.
4. Создать planning-doc в `doc/SolidWorks-WorkFlow/Plans/<NewScope>.md`.
5. После утверждения — нарезать на фазы и стримы в новом `doc/TODO/todo-plan.md`.

Для периодического audit cycle — `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md`.

**Pending follow-up:** если 1.2.11 retest покажет что 240с недостаточно (или избыточно), адаптивный watchdog per thinking level — см. архивный planning-doc.
