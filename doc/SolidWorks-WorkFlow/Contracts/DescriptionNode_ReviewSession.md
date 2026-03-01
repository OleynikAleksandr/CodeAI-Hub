# Description Node — Runtime Contract (legacy filename)

## Назначение

Этот файл сохранён по legacy-имени для обратной совместимости ссылок.
Канонический контракт шага `description` находится в:
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`

**Target flow (SSOT):**
`questionnaire.md` → Description Agent (resume) → `Final_Description.md`.

---

## Артефакты

- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

### Legacy artifacts (compat only)

- `.codeai-hub/<workspaceSlug>/description/description.md` и `runs/*` могут встречаться в старых workspace.
- Legacy draft не является upstream-источником истины.

---

## Инварианты

1. В узле `description` нет обязательного встроенного reviewer-агента.
2. Description-сессия после submit работает как `resume_in_place`.
3. `Final_Description.md` пишется в стабильный путь (без `runs/`).
4. Запись description-артефактов не должна триггерить auto-reviewer.
5. Шаг `virtual_simulation` требует только `Final_Description.md` как вход.

---

## Recovery: ↻ Restart attempt (Description)

Назначение: аварийный перезапуск попытки шага, если сессия не стартовала/зависла.

Контракт:
- ↻ не рестартит Core глобально;
- ↻ запускает новую попытку Description на базе `questionnaire.md`;
- late results от старых попыток не должны перезаписывать актуальный `Final_Description.md`.

---

## Связанные SSOT

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
