# Workflow Steps & Watcher — Contract (SSOT)

**Status:** Active
**Updated:** 2026-03-01
**Owner:** Oleksandr + Codex

---

## 1) Назначение

Документ фиксирует:
- канонический порядок workflow-шагов;
- канонические артефакты и пути;
- минимальную state machine статусов;
- watcher-события для пересчёта статусов в Core/PM.

Цель: поддержать итеративную разработку без требования «описать всё заранее».

---

## 2) Канонический порядок шагов

1. `Description` → финал: `Final_Description.md`
2. `Virtual Simulation` → артефакт: `virtual-simulation.md`
3. `Diagram Modules` → артефакт: `modules-diagram.mmd`
4. `Diagram Facades` → артефакт: `facades-graph.mmd`

---

## 3) Канонические артефакты (workspace-scoped, SSOT)

Все артефакты живут внутри `.codeai-hub/<workspaceSlug>/...`.

- `Description`:
  - `.codeai-hub/<workspaceSlug>/description/questionnaire.md` (input)
  - `.codeai-hub/<workspaceSlug>/description/Final_Description.md` (canonical output)
- `Virtual Simulation`:
  - `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`
- `Diagram Modules`:
  - `.codeai-hub/<workspaceSlug>/diagram_modules/modules-diagram.mmd`
- `Diagram Facades`:
  - `.codeai-hub/<workspaceSlug>/diagram_facades/facades-graph.mmd`

Legacy `description.md` допускается только для compat и не участвует в gating новых workflow.

---

## 4) Минимальная state machine (статусы)

- `BLOCKED` — отсутствует обязательный upstream input.
- `READY` — upstream input есть, но артефакт шага отсутствует.
- `DONE` — артефакт существует и проходит детерминированную валидацию.
- `ERROR` — артефакт существует, но валидацию не проходит.
- `OUTDATED` — upstream input изменился после `DONE`.

---

## 5) Gating (upstream requirements)

- `Description`: шаг может быть `READY` сразу (upstream не требуется).
- `Virtual Simulation`: требует `Final_Description.md`.
- `Diagram Modules`: требует `virtual-simulation.md` в статусе `DONE`.
- `Diagram Facades`: требует `modules-diagram.mmd` в статусе `DONE`.

---

## 6) Watcher events (FS → workflow.events)

Watcher обязан отслеживать canonical артефакты и публиковать события пересчёта.

Минимум:
- `Final_Description.md` created/changed
- `virtual-simulation.md` created/changed
- `modules-diagram.mmd` created/changed
- `facades-graph.mmd` created/changed

Требования:
- событие содержит `workspaceSlug` + canonical path;
- события debounce’ятся;
- delete/rename приводит к пересчёту статуса как «артефакт отсутствует».

---

## 7) OUTDATED propagation (upstream → downstream)

- Изменение `Final_Description.md` после `DONE` шага `Virtual Simulation` → `Virtual Simulation = OUTDATED`.
- Изменение `virtual-simulation.md` → `Diagram Modules = OUTDATED` (или `BLOCKED`, если артефакта ещё нет).
- Изменение `modules-diagram.mmd` → `Diagram Facades = OUTDATED` (или `BLOCKED`, если артефакта ещё нет).

Рекомендация: propagation транзитивный.

---

## 8) Manual start в PM (не блокирует watcher)

Некоторые шаги стартуют вручную из UI (например, `Virtual Simulation`).

Manual start не отменяет watcher:
- артефакт может быть создан/изменён вне UI;
- UI всё равно обязан корректно показать `READY/DONE/ERROR/OUTDATED`.

---

## 9) Связанные контракты

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` (legacy filename, compat)
