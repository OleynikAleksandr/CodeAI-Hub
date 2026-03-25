# Архитектура пользовательской поверхности Diagram Workflow

**Статус:** Черновик - scope `module-inventory.md` утверждён, inventory-only cleanup добавлен
**Дата:** 2026-03-19
**Охват:** следующий UX/runtime-контракт для `Diagram Modules` и policy-рефакторинг шаблонов для diagram steps

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/TODO/todo-plan.md`
- `doc/Sessions/Session102.md`

---

## 1. Проблема

Текущая реализация `Diagram Modules` уже умеет показывать диаграмму, ручную раскладку и сохранять `*.flow.json`, но product-contract шага всё ещё неполный.

Главный разрыв сейчас такой:
- `Final_Description.md` содержит продуктовые границы, базовые подсистемы и ключевые сущности;
- `virtual-simulation.md` содержит ключевые сценарии и точки взаимодействия;
- runtime шага `Diagram Modules` сегодня фактически опирается на `virtual-simulation.md` как на единственный прямой upstream-вход;
- агент сразу пытается построить `module-map.md`, хотя перед диаграммой пользователю нужен более простой и человекочитаемый semantic artifact.

Из-за этого возникают две проблемы:
- модульная диаграмма получается слишком сценарно-зависимой и может пропускать кластеры, standalone modules и важные зоны ответственности, которые не попали в текущий сценарный набор;
- пользователю негде быстро увидеть и поправить сам список кластеров и модулей до того, как они превратятся в visual graph.

Отдельная проблема контракта разработки:
- для `Description` и `Virtual Simulation` живые prompt/template-файлы лежат в `~/.codeai-hub/templates/...`;
- для `Diagram Modules` и `Diagram Facades` текущий runtime читает prompt/template из package assets, поэтому разработчик не видит живой template-contract рядом с остальными workflow steps.

---

## 2. Решение на уровне продукта

`Diagram Modules` должен стать двухфазным шагом внутри того же workflow stage, без вынесения в отдельный этап.

Новый контракт:
- прямые upstream-входы для `Diagram Modules`: `Final_Description.md` и `virtual-simulation.md`;
- новый человекочитаемый semantic artifact: `module-inventory.md`;
- `module-map.md` больше не является workspace artifact, visible template или user-facing contract;
- visual projection строится в runtime напрямую из согласованного inventory, без отдельного Markdown-артефакта `module-map.md` на диске;
- `module-map.flow.json` остаётся только layout/view sidecar.

Смысл ролей:
- `Final_Description.md` отвечает за продуктовые границы и крупные зоны ответственности;
- `virtual-simulation.md` отвечает за сценарии, interactions и кандидатов в связи;
- `module-inventory.md` фиксирует кластеры, состав кластеров, standalone modules и короткие ответственности;
- runtime projection нужен для visual shell и диаграммы, но не оформляется отдельным Markdown-файлом в workspace.

Дополнительное решение по developer-contract:
- prompt/template-файлы для diagram steps нужно вернуть в `~/.codeai-hub/templates/diagram_modules/` и `~/.codeai-hub/templates/diagram_facades/`;
- package assets должны оставаться bundled source для sync, но не скрытым единственным местом, где живёт runtime-contract.

---

## 3. Финальный UX-контракт

### `Diagram Modules`

- `Artifacts` показывает визуальную диаграмму, построенную напрямую из `module-inventory.md`.
- `Source` показывает `module-inventory.md` как основной человекочитаемый semantic artifact шага.
- `Help` остаётся поясняющей панелью.
- Возврат на шаг должен снова открывать `Artifacts`, а не `Source`.
- `module-map.md` не должен упоминаться пользователю как ожидаемый файл этого шага.

### `Diagram Facades`

- В этом scope шаг не получает отдельный `facade-inventory.md`.
- Текущий UI contract `Artifacts / Source / Help` остаётся.
- `Source` пока продолжает показывать `facade-map.md`.
- Но template visibility policy должна стать такой же, как у остальных шагов: живые prompt/template-файлы должны быть видны в `~/.codeai-hub/templates/diagram_facades/`.
- Upstream semantic input для `Diagram Facades` должен быть `module-inventory.md`, а не `module-map.md`.

---

## 4. Роли артефактов для `Diagram Modules`

### `Final_Description.md`

- Источник продуктовых границ.
- Источник верхнеуровневых подсистем и обязанностей.
- Не должен теряться при переходе к диаграмме.

### `virtual-simulation.md`

- Источник сценариев, interactions и candidate relations.
- Даёт динамику поведения, но не заменяет полного inventory системы.

### `module-inventory.md`

Это новый semantic SSOT для пользовательского чтения внутри шага `Diagram Modules`.

Минимальная структура:
- `## Clusters`
- для каждого кластера:
  - короткое назначение кластера;
  - входящие модули;
  - короткая ответственность каждого модуля;
- `## Standalone Modules`
- `## Simple Relations`
- `## Assumptions / Open Questions`

Этот артефакт нужен, чтобы пользователь мог быстро:
- увидеть лишние или отсутствующие кластеры;
- поправить состав кластеров;
- уточнить responsibility конкретных модулей;
- поймать неправильные границы до генерации диаграммы.

### Runtime projection

- React Flow projection строится в памяти по согласованному `module-inventory.md`.
- Workspace не должен требовать отдельный Markdown-файл `module-map.md`.
- Для downstream шага `Diagram Facades` каноническим upstream-контекстом должен стать сам `module-inventory.md`.

### `module-map.flow.json`

- Только user-owned geometry и viewport.
- Не участвует в semantic contract шага.

---

## 5. Контракт шаблонов

Новая policy для diagram steps:
- все product-visible prompt/template-файлы должны синкаться в `~/.codeai-hub/templates/...`, как это уже сделано для первых шагов workflow;
- runtime должен сначала резолвить шаблоны из `~/.codeai-hub/templates/...`;
- package assets остаются bundled source для sync и fallback, но не должны быть единственным visible source of truth.

Для `Diagram Modules` в visible template-contract должны появиться:
- `module-inventory-prompt.md`
- `module-inventory-template.md`
- `module-inventory-field-reference.md`
- `module-inventory-merge-rules.md`

Для `Diagram Facades` visible template-contract должен включать как минимум:
- `facade-map-prompt.md`
- `facade-map-template.md`
- `facade-map-field-reference.md`
- `facade-map-merge-rules.md`

Отдельное требование к root prompt, который формируется runtime:
- для `Diagram Modules` он обязан явно перечислять оба upstream-артефакта;
- он обязан указывать целевой semantic artifact `module-inventory.md`;
- он не должен описывать шаг как создание `module-map.md` или как переход к отдельному derived Markdown artifact.

---

## 6. Срезы реализации

### Срез A - контракты и документы

- Зафиксировать `module-inventory.md` как новый semantic bridge внутри `Diagram Modules`.
- Зафиксировать dual-input contract: `Final_Description.md` + `virtual-simulation.md`.
- Зафиксировать inventory-only contract: без `module-map.md` как workspace artifact, gating dependency или visible template.

### Срез B - visible templates для diagram steps

- Вернуть diagram prompts/templates в `~/.codeai-hub/templates/diagram_modules/` и `.../diagram_facades/`.
- Синкать туда и основные prompt/template-файлы, и appendix-файлы с field reference/merge rules.
- Перестроить runtime на templates-first resolution path.

### Срез C - runtime prompt contract

- Изменить start/prompt-pack contract для `Diagram Modules`, чтобы агент получал оба upstream-path.
- Изменить стартовый prompt шага так, чтобы первая цель сессии была `module-inventory.md`.
- Сохранить merge-safe поведение при повторных запусках и существующих user edits.

### Срез D - Project Manager UX

- `Source` для `Diagram Modules` должен показывать `module-inventory.md`.
- `Artifacts` должен продолжать показывать диаграмму.
- Любые help/pending/tree тексты не должны навязывать пользователю `module-map.md` как ожидаемый файл шага.

### Срез E - diagram generation path

- После согласования inventory runtime строит projection напрямую из `module-inventory.md`.
- В диаграмме должны быть явные cluster nodes, модули внутри кластеров, standalone modules и простые relations.
- `Diagram Facades` читает upstream module context из `module-inventory.md`.
- Visual shell продолжает владеть только layout/view state.

---

## 7. Что не входит в этот scope

- Новый отдельный workflow step между `Virtual Simulation` и `Diagram Modules`.
- Анализ существующей кодовой базы как обязательный источник диаграммы.
- Полный аналогичный inventory-bridge для `Diagram Facades` в этом же релизе.
- Inspector-driven diagram editor или возврат inline semantic editors.

---

## 8. Верификация

Ручная и контрактная проверка этого scope должна подтвердить следующее:

1. `Diagram Modules` стартует с prompt-pack, в котором явно присутствуют и `Final_Description.md`, и `virtual-simulation.md`.
2. Первый согласуемый semantic output шага — `module-inventory.md`.
3. Пользователь в `Source` видит именно `module-inventory.md`, а не raw `module-map.md`.
4. После согласования inventory диаграмма в `Artifacts` показывает кластеры, модули внутри кластеров, standalone modules и простые relations.
5. `module-map.md` не упоминается пользователю и не требуется как workspace artifact этого шага.
6. `module-map.flow.json` по-прежнему хранит только layout/view state.
7. Живые diagram templates доступны в `~/.codeai-hub/templates/diagram_modules/` и `.../diagram_facades/`.
8. Reopen/resume по-прежнему возвращает пользователя в `Artifacts`, а ручная раскладка сохраняется.

---

## 9. Инструкция для нового TODO

Новый execution plan должен охватывать четыре обязательных изменения:

- ввести `module-inventory.md` как semantic bridge для `Diagram Modules`;
- изменить runtime prompt contract так, чтобы шаг использовал оба upstream-артефакта;
- вернуть diagram templates в visible templates contract и убрать из него legacy `module-map-*` для `Diagram Modules`;
- перевести downstream gating и `Diagram Facades` с `module-map.md` на `module-inventory.md`;
- выпустить новый релиз, который валидирует inventory-first flow для `Diagram Modules`.
