# План разработки (Development TODO Plan)

## Execution Scope Status: EMPTY

Нет активного execution cycle. Последний закрытый цикл — 1.2.12 (Gemini abort-crash suppression + misrouted-thinking reroute). Архив: `doc/TODO/Archive/todo-plan-1.2.12-gemini-abortcrash-and-misrouted-thinking.md`.

## Next steps (для новой сессии)

1. Прочитать базовый SSOT `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`.
2. Обсудить с пользователем новый scope.
3. Открыть `doc/SolidWorks-WorkFlow/Docs_Index.md` и выбрать релевантные документы.
4. Создать planning-doc в `doc/SolidWorks-WorkFlow/Plans/<NewScope>.md`.
5. После утверждения — нарезать на фазы и стримы в новом `doc/TODO/todo-plan.md`.

Для периодического audit cycle — `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md`.

**Pending follow-ups:**
- Adaptive watchdog per thinking level (если 240с initial-leg watchdog окажется неподходящим — см. archived 1.2.11 planning-doc).
- Расширение `MISROUTED_THINKING_PREFIXES` если всплывут новые варианты mis-routed thinking markers в retest'ах (`packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`).
