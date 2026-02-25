# Workflow Steps & Watcher — Contract (SSOT)

**Status:** Draft (awaiting approval)
**Updated:** 2026-02-25
**Owner:** Oleksandr + Codex

---

## 1) Назначение

Этот документ фиксирует:
- **канонический порядок** workflow‑шагов;
- **канонические артефакты** (пути файлов);
- **gating/статусы** на уровне минимальной state machine;
- **watcher‑события**, которые связывают изменения файлов артефактов и пересчёт статусов в Core/PM.

Цель: поддержать итеративную разработку («2 шага вперёд, 1 назад») без требования «описать всё заранее».

---

## 2) Канонический порядок шагов

1) `Description` → финал: `Final_Description.md`
2) `Virtual Simulation` → артефакт: `virtual-simulation.md`
3) `Diagram Modules` → артефакт: `modules-diagram.mmd`
4) `Diagram Facades` → артефакт: `facades-graph.mmd`

---

## 3) Канонические артефакты (workspace-scoped, SSOT)

Все артефакты живут **внутри `.codeai-hub/<workspaceSlug>/...`** и не используют “runs/итерации” в путях.

- `Description`:
  - `.codeai-hub/<workspaceSlug>/description/Final_Description.md`
- `Virtual Simulation`:
  - `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`
- `Diagram Modules`:
  - `.codeai-hub/<workspaceSlug>/diagram_modules/modules-diagram.mmd`
- `Diagram Facades`:
  - `.codeai-hub/<workspaceSlug>/diagram_facades/facades-graph.mmd`

---

## 4) Минимальная state machine (статусы)

Статусы должны быть понятны пользователю в PM и детерминированно вычисляться из артефактов/inputs.

- `BLOCKED` — отсутствует обязательный upstream input.
- `READY` — upstream input есть, но артефакт шага отсутствует (или ещё не произведён).
- `DONE` — артефакт существует и проходит минимальную детерминированную валидацию (по контракту шага).
- `ERROR` — артефакт существует, но **не проходит** минимальную детерминированную валидацию.
- `OUTDATED` — upstream input изменился **после** того как шаг был `DONE`; требуется синхронизация.

Примечание: runtime может иметь дополнительные статусы, но отображаемая пользователю логика должна сводиться к этому набору.

---

## 5) Gating (upstream requirements)

Gating определяет, можно ли считать шаг `READY` или он `BLOCKED`.

- `Description`: upstream нет → шаг может быть `READY` сразу (по правилам Description‑контракта).
- `Virtual Simulation`: требует существования `Final_Description.md`.
- `Diagram Modules`: требует `virtual-simulation.md` в статусе `DONE`.
- `Diagram Facades`: требует `modules-diagram.mmd` в статусе `DONE`.

---

## 6) Watcher events (FS → workflow.events)

Watcher обязан отслеживать появление/изменение **канонических артефактов** и публиковать события для пересчёта статусов.

Минимальный набор:
- `Final_Description.md` created/changed
- `virtual-simulation.md` created/changed
- `modules-diagram.mmd` created/changed
- `facades-graph.mmd` created/changed

Требования:
- событие содержит `workspaceSlug` + canonical path;
- события debounce’ятся (чтобы «сохранение файла» не давало каскад);
- при delete/rename watcher должен приводить к пересчёту статуса как «артефакт отсутствует».

---

## 7) OUTDATED propagation (upstream → downstream)

Цель: легализовать возврат на предыдущие этапы и синхронизировать дерево шагов.

Правила:
- Изменение `Final_Description.md` после `DONE` шага `Virtual Simulation` → `Virtual Simulation = OUTDATED`.
- Изменение `virtual-simulation.md` → `Diagram Modules = OUTDATED` (или `BLOCKED`, если шаг ещё не начинался/артефакт отсутствует).
- Изменение `modules-diagram.mmd` → `Diagram Facades = OUTDATED` (или `BLOCKED`, если шаг ещё не начинался/артефакт отсутствует).

Рекомендация: OUTDATED downstream должен быть транзитивным (если `Virtual Simulation` OUTDATED, то `Diagram Modules/Facades` не должны оставаться `DONE` без явного подтверждения пользователя).

---

## 8) Manual start в PM (не блокирует watcher)

Некоторые шаги стартуют вручную из UI (например, `Virtual Simulation` — кнопка **VIRTUAL SIMULATION** в тулбаре PM).

Важно:
- manual start не отменяет watcher: артефакт может появиться и без UI (внешний edit);
- UI обязан уметь показать `READY/DONE/ERROR/OUTDATED` независимо от того, как артефакт был создан.

---

## 9) Связанные контракты

- Workspace runtime: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Session UI laws: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Description/Reviewer: `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
- Virtual Simulation step: `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
