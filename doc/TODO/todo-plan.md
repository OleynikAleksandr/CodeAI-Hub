# План разработки (Development TODO Plan)

## Execution Scope Status: EMPTY

Нет активного execution cycle. Последний закрытый цикл — 1.2.10 (Audit Cleanup: docs/config verification + 7 dead loc keys + 3 duplication extracts + PeriodicAudit checklist + SSOT invariant 29). Архив: `doc/TODO/Archive/todo-plan-1.2.10-audit-cleanup.md`.

## Next steps (для новой сессии)

1. Прочитать базовый SSOT `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`.
2. Обсудить с пользователем новый scope (bug / feature / refactor / аудит).
3. Открыть `doc/SolidWorks-WorkFlow/Docs_Index.md` и выбрать релевантные документы для нового planning scope.
4. Создать planning-doc в `doc/SolidWorks-WorkFlow/Plans/<NewScope>.md`, утвердить его с пользователем.
5. После утверждения — нарезать planning-doc на фазы и стримы в новом `doc/TODO/todo-plan.md` (пересоздать этот файл из шаблона в `.claude/CLAUDE.md`).

Для периодического audit cycle смотри `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md`.
