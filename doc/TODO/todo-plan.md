# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым новым фиксом):** `AGENTS.md`, `doc/Sessions/Session171.md`, `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Новый implementation scope стартует только после утверждённого planning-дока в `doc/SolidWorks-WorkFlow/Plans/`
- Завершённый план архивируется сразу после закрытия всех phase/stream и перед стартом нового scope
- Любые будущие изменения архитектуры/логики должны синхронно обновлять `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и профильные документы модулей

---

## Текущий статус

- Активных implementation phase сейчас нет.
- Последний полностью закрытый план архивирован в `doc/TODO/Archive/todo-plan-up-to-phase78-2026-03-28.md`.
- Следующая сессия должна начать с нового planning-дока и только после этого сформировать новый `doc/TODO/todo-plan.md`.

## Next Activation Checklist

1. Создать или обновить planning-док в `doc/SolidWorks-WorkFlow/Plans/`.
2. Зафиксировать scope, class boundaries и контракты.
3. После утверждения нарезать новый `todo-plan.md` на phase/stream/микро-задачи с обязательными `Git Commit:` пунктами.
