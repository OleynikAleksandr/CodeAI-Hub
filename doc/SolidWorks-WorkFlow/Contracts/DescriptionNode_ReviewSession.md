# Description Node — Contract (SSOT)

## Назначение
Канонический контракт узла Workflow Tree `description`.

**Target flow (SSOT):**
`questionnaire.md` → **Description Agent (resume)** → `Final_Description.md`.

Устаревший поток `questionnaire.md → description.md → auto-reviewer → Final_Description.md` считается legacy и поддерживается только для совместимости со старыми workspace/историей.

Детализированный SSOT по новой модели: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`.

---

## Артефакты
- Questionnaire (ввод пользователя):
  - `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- Final Description (выход шага):
  - `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

### Legacy artifacts (compat only)
- Draft `description.md` (включая варианты в `runs/`) может существовать в старых workspace.
- В новой модели он **не** является upstream-источником истины для следующих шагов.

---

## Инварианты
1) **Single-agent step:** внутри узла `description` нет обязательного второго встроенного агента (reviewer).
2) **Resume:** сессия Description должна быть `resume_in_place` (не one-shot).
3) **Stable final path:** `Final_Description.md` пишется в стабильный путь (без `runs/`).
4) **No auto-reviewer:** запись артефактов Description не должна триггерить скрытый auto-start reviewer-сессии.
5) **Gating:** шаг `virtual_simulation` должен требовать **только** `Final_Description.md` как вход (а не `description.md`).

---

## Recovery: ↻ Restart attempt (Description)

**Назначение:** аварийный перезапуск шага, если сессия не стартовала/зависла/сломалась.

**Контракт:**
- ↻ **не** рестартит Core (нельзя ломать другие активные сессии).
- ↻ запускает новую Description-сессию из `questionnaire.md`.
- Late results от старых попыток **не должны** перезаписывать `Final_Description.md` и не должны триггерить downstream.

---

## Связанные SSOT
- Новый контракт шага Description: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Virtual Simulation step: `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
