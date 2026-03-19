# Workflow Steps & Watcher — Contract (SSOT)

**Status:** Active
**Updated:** 2026-03-19
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
3. `Diagram Modules` → first semantic output: `module-inventory.md`, then canonical output: `module-map.md` + sidecars `module-map.flow.json`, `module-map.agent-baseline.md`
4. `Diagram Facades` → canonical output: `facade-map.md` + sidecars `facade-map.flow.json`, `facade-map.agent-baseline.md`

---

## 3) Канонические артефакты (workspace-scoped, SSOT)

Все артефакты живут внутри `.codeai-hub/<workspaceSlug>/...`.

- `Description`:
  - `.codeai-hub/<workspaceSlug>/description/questionnaire.md` (input)
  - `.codeai-hub/<workspaceSlug>/description/Final_Description.md` (canonical output)
- `Virtual Simulation`:
  - `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`
- `Diagram Modules`:
  - `.codeai-hub/<workspaceSlug>/diagram_modules/module-inventory.md` (human-readable semantic bridge)
  - `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.md` (canonical semantic SSOT)
  - `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json` (layout/view sidecar)
  - `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.agent-baseline.md` (agent baseline for diff/merge)
- `Diagram Facades`:
  - `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.md` (canonical semantic SSOT)
  - `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.flow.json` (layout/view sidecar)
  - `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.agent-baseline.md` (agent baseline for diff/merge)

Legacy `description.md` допускается только для compat и не участвует в gating новых workflow.

### 3.1 Diagram runtime / user-surface contract

- `module-inventory.md` — human-readable bridge for `Diagram Modules`; it is the first agreement layer before `module-map.md`.
- `module-map.md` и `facade-map.md` — canonical semantic SSOT для diagram steps.
- `*.agent-baseline.md` используется только для agent diff/merge path и не является primary user surface.
- `*.flow.json` хранит только layout/view state и не участвует в semantic gating.
- Project Manager для `Diagram Modules` / `Diagram Facades` использует user surface `Artifacts/Source/Help`:
  - `Artifacts` по умолчанию открывает visual React Flow projection;
  - `Source` показывает read-only canonical `.md` (`module-inventory.md` для `Diagram Modules`, `facade-map.md` для `Diagram Facades`);
  - `Help` показывает guidance по шагу.
- Visible PM surface для diagram steps не должна требовать `Auto-layout`, layout profiles, inline semantic editors или bottom-right minimap.
- Semantic changes ожидаются через agent-run или прямое редактирование canonical Markdown artifact.

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
- `Diagram Modules`: требует доступные canonical artifacts `Final_Description.md` и `virtual-simulation.md`; runtime сначала формирует `module-inventory.md`, а затем `module-map.md`, и пользователь вручную запускает шаг, когда считает upstream artifacts достаточными, если gating не блокирует старт.
- `Diagram Facades`: требует доступный canonical artifact `module-map.md`; пользователь вручную запускает шаг, когда считает upstream artifact достаточным, и PM не должен требовать точный upstream status `DONE` / `completed`, если artifact уже существует и gating не блокирует старт.

---

## 6) Watcher events (FS → workflow.events)

Watcher обязан отслеживать canonical артефакты и публиковать события пересчёта.

Минимум:
- `Final_Description.md` created/changed
- `virtual-simulation.md` created/changed
- `module-inventory.md` created/changed
- `module-map.md` created/changed
- `module-map.agent-baseline.md` created/changed
- `facade-map.md` created/changed
- `facade-map.agent-baseline.md` created/changed

Требования:
- событие содержит `workspaceSlug` + canonical path;
- события debounce’ятся;
- delete/rename приводит к пересчёту статуса как «артефакт отсутствует».

---

## 7) OUTDATED propagation (upstream → downstream)

- Изменение `Final_Description.md` после `DONE` шага `Virtual Simulation` → `Virtual Simulation = OUTDATED`.
- Изменение `Final_Description.md` или `virtual-simulation.md` после `DONE` шага `Diagram Modules` → `Diagram Modules = OUTDATED` (или `BLOCKED`, если артефакта ещё нет); `module-inventory.md` и затем `module-map.md` должны быть пересобраны в этом порядке.
- Изменение `module-inventory.md` → `module-map.md = OUTDATED` (или `BLOCKED`, если артефакта ещё нет).
- Изменение `module-map.md` или `module-map.agent-baseline.md` → `Diagram Facades = OUTDATED` (или `BLOCKED`, если артефакта ещё нет).

`*.flow.json` не участвуют в semantic gating: это view-only sidecar, их изменение не должно менять `READY/DONE/OUTDATED`.

Рекомендация: propagation транзитивный.

---

## 8) Manual start в PM (не блокирует watcher)

Некоторые шаги стартуют вручную из UI (например, `Virtual Simulation`).

Manual start не отменяет watcher:
- артефакт может быть создан/изменён вне UI;
- UI всё равно обязан корректно показать `READY/DONE/ERROR/OUTDATED`.

Для `Virtual Simulation` runtime-контракт prompt-only:
- отсутствие `templatePath`/artifact template не влияет на запуск шага и пересчёт статусов;
- источником инструкций для агента является `virtual-simulation-prompt.md`.

Для `Diagram Modules` / `Diagram Facades` default PM route после открытия шага обязан возвращать пользователя в `Artifacts`, а не в raw Markdown source.

---

## 9) Связанные контракты

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` (legacy filename, compat)
