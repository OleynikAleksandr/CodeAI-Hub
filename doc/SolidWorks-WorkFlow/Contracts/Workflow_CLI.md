# Workflow Steps & Watcher — Contract (SSOT)

**Status:** Active
**Updated:** 2026-04-07
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
3. `Diagram Modules` → canonical output: `product-parts.index.md` + `product-parts/<part-id>.md` + sidecar `module-map.flow.json`

---

## 3) Канонические артефакты (workspace-scoped, SSOT)

Все артефакты живут внутри `.codeai-hub/<workspaceSlug>/...`.

- `Description`:
  - `.codeai-hub/<workspaceSlug>/description/questionnaire.md` (input)
  - `.codeai-hub/<workspaceSlug>/description/Final_Description.md` (canonical output)
- `Virtual Simulation`:
  - `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`
- `Diagram Modules`:
  - `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md` (canonical orchestration SSOT)
  - `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md` (canonical semantic artifacts per Product Part)
  - `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json` (layout/view sidecar)

Legacy `description.md` допускается только для compat и не участвует в gating новых workflow.

### 3.1 Diagram runtime / user-surface contract

- `product-parts.index.md` + `product-parts/<part-id>.md` — canonical staged semantic SSOT для `Diagram Modules`.
- `*.flow.json` хранит только layout/view state и не участвует в semantic gating.
- Project Manager для `Diagram Modules` использует user surface `Artifacts/Help` (Source mode был удалён):
  - `Artifacts` по умолчанию открывает визуальный Module Graph, построенный из staged product-part файлов;
  - `Help` показывает guidance по шагу.
- Visible PM surface для diagram step рендерится через nested CSS Grid (React Flow удалён в релизе `1.1.921`) и управляется через right-click context menu (layout params `columns`, `targetAspectRatio`, `moduleColumns`, сохраняемые в `module-map.flow.json` v2 `layoutParams`); inline semantic editors не допускаются.
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
- `Diagram Modules`: требует доступные canonical artifacts `Final_Description.md` и `virtual-simulation.md`; пользователь вручную запускает шаг, когда считает upstream artifacts достаточными, если gating не блокирует старт.

---

## 6) Watcher events (FS → workflow.events)

Watcher обязан отслеживать canonical артефакты и публиковать события пересчёта.

Минимум:
- `Final_Description.md` created/changed
- `virtual-simulation.md` created/changed
- `product-parts.index.md` created/changed

Требования:
- событие содержит `workspaceSlug` + canonical path;
- события debounce’ятся;
- delete/rename приводит к пересчёту статуса как «артефакт отсутствует».

---

## 7) OUTDATED propagation (upstream → downstream)

- Изменение `Final_Description.md` после `DONE` шага `Virtual Simulation` → `Virtual Simulation = OUTDATED`.
- Изменение `Final_Description.md` или `virtual-simulation.md` после `DONE` шага `Diagram Modules` → `Diagram Modules = OUTDATED` (или `BLOCKED`, если артефакта ещё нет).

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

Для `Diagram Modules` default PM route после открытия шага обязан возвращать пользователя в `Artifacts`, а не в raw Markdown source.

---

## 9) Связанные контракты

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` (legacy filename, compat)
