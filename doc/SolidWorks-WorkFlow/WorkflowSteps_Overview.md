# Workflow Steps Overview — от идеи к реализации (SSOT)

**Status:** Active SSOT
**Updated:** 2026-03-22
**Owner:** Oleksandr

---

## 0) Философия Workflow

Главный принцип: **от простого к сложному**.

Пользователь не обязан «продумать всё заранее» на первом шаге. Каждый шаг добавляет только один слой ясности и формирует артефакт, который нужен следующему шагу.

Каноническая цепочка:
- **Шаг 1 (Description):** что за продукт, для кого, и какие базовые сценарии должны работать.
- **Шаг 2 (Virtual Simulation):** как продукт должен вести себя в сценариях использования.
- **Шаг 3 (Diagram Modules):** из каких модулей/кластеров состоит система.
- **Шаг 4 (Diagram Facades):** как модули взаимодействуют через фасады.
- **Шаг 5 (Module Specifications):** детальные спецификации модулей.
- **Шаг 6 (TODO Plan + Implementation):** реализация через микро-задачи и коммиты.

Сквозной принцип: **feedback loop + OUTDATED propagation**. Любое изменение upstream-артефакта помечает downstream-шаги как требующие синхронизации.

---

## Шаг 1 — Description

### Зачем нужен этот шаг

Шаг `Description` запускает workflow: он превращает анкету в первый читаемый `Final_Description.md`, который пользователь обсуждает с агентом и который является входом для `Virtual Simulation`.

Ключевая идея шага: сначала появляется документ, потом идут уточнения.

### 1.1 Pre-submit (без runtime-сессии)

**Кто ведёт:** пользователь.

Пользователь заполняет:
- `questionnaire.md` (по шаблону `questionnaire-template.md`).

UI на этом этапе:
- левая панель (`Sessions`) показывает user-facing Help для шага Description;
- правая панель (`Artifacts`) показывает редактор `questionnaire.md`;
- runtime-сессии ещё нет.

### 1.2 Submit и запуск Description Agent

**Кто ведёт:** Description Agent (resume-сессия).

После `Submit questionnaire`:
1. Project Manager запускает runtime-сессию шага `description`.
2. Агент читает `questionnaire.md` (+ pre-read документы, если есть).
3. Агент **сразу** формирует первый черновик `Final_Description.md` (file-first).
4. Дальше агент итеративно обновляет файл и задаёт только критичные вопросы.

UI после submit:
- левая панель возвращается к обычному Session UI;
- правая панель поддерживает переключатель `Artifacts/Help`.

### 1.3 Что должно быть в `Final_Description.md`

Минимум для передачи в `Virtual Simulation`:
- проблема/ценность;
- целевые пользователи;
- ключевые сценарии в количестве, достаточном для покрытия продукта (актор/цель → действие → ожидаемый результат → критерий успеха);
- ограничения/допущения;
- `out of scope`;
- ключевые сущности/термины (чтобы следующий агент не стартовал с нуля);
- открытые вопросы.

### 1.4 Артефакты шага

- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`
- Internal compat only: `.codeai-hub/<workspaceSlug>/description/description.md` может читаться runtime/store, но не является product-visible SSOT.

### 1.5 Reviewer boundary

Встроенного reviewer-подшага в `Description` нет.
Standalone reviewer остаётся отдельным deferred-модулем и не входит в базовый chain 1→6.
Ручной `↻ Restart attempt` в шаге `Description` отсутствует.

### 1.6 Legacy naming boundary

- В живом workflow нет отдельного шага `Idea`.
- Название шага, Help, provider picker и артефакты первого шага используют только `Description`.
- Если в коде ещё встречаются `Idea` / `Idea Collector`, это internal compat/deferred legacy слой, а не поддерживаемая product-семантика текущего workflow.

---

## Шаг 2 — Virtual Simulation

### Цель

Зафиксировать ключевые сценарии поведения системы в виде `virtual-simulation.md` без искусственного числового лимита.

### Подход

Manual start из PM + resume-сессия агента:
- агент читает `Final_Description.md`;
- агент задаёт только уточнения, которые реально улучшают сценарии;
- агент обновляет `virtual-simulation.md` итеративно.

### Артефакт

- `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`

---

## Шаг 3 — Diagram Modules

### Цель

Преобразовать сценарии в карту модулей/кластеров и связей.

### Подход

Manual start из верхнего toolbar PM:
- пользователь сам решает, когда `virtual-simulation.md` уже достаточно хороший для перехода на следующий шаг;
- запуск требует доступный canonical upstream artifact `virtual-simulation.md`;
- PM не должен дополнительно требовать точный upstream status `DONE` / `completed`, если artifact уже существует и gating не блокирует старт.

### Входы

- `Final_Description.md`
- `virtual-simulation.md`

### Артефакт

- `.codeai-hub/<workspaceSlug>/diagram_modules/module-inventory.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json`

`module-inventory.md` является canonical SSOT для semantic content.
`module-map.flow.json` хранит только layout/view state визуального редактора.
Visual diagram материализуется runtime напрямую из inventory и не требует отдельного raw map-файла в workspace.

---

## Шаг 4 — Diagram Facades

### Цель

Зафиксировать фасады модулей, типы взаимодействий и зависимости.

### Подход

Manual start из верхнего toolbar PM:
- пользователь сам решает, когда `module-inventory.md` уже достаточно хороший для перехода на следующий шаг;
- запуск требует доступный canonical upstream artifact `module-inventory.md`;
- PM не должен дополнительно требовать точный upstream status `DONE` / `completed`, если artifact уже существует и gating не блокирует старт.

### Входы

- `Final_Description.md`
- `virtual-simulation.md`
- `module-inventory.md`

### Артефакты

- `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.md`
- `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.flow.json`
- `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.agent-baseline.md`

`facade-map.md` является canonical SSOT для semantic content.
`facade-map.flow.json` хранит только layout/view state визуального редактора.
`facade-map.agent-baseline.md` фиксирует baseline для change summary и безопасного merge после повторных agent runs.

---

## Шаг 5 — Module Specifications (будущий)

### Цель

Подготовить детальные спецификации модулей (классы, состояние, ошибки, ограничения).

### Артефакт

- `.codeai-hub/<workspaceSlug>/specifications/<moduleSlug>-spec.md`

---

## Шаг 6 — TODO Plan + Implementation (будущий)

### Цель

Превратить спецификации в поэтапный план и реализацию через микро-задачи.

### Артефакты

- `doc/TODO/todo-plan.md`
- изменения в коде (`packages/`, `src/`)
- синхронные обновления документации (`doc/`)

---

## Сквозные механизмы

### OUTDATED propagation

- Изменение `Final_Description.md` → `Virtual Simulation = OUTDATED`.
- Изменение `virtual-simulation.md` → `Diagram Modules = OUTDATED`.
- Изменение `module-inventory.md` → `Diagram Facades = OUTDATED`.
- Изменение `facade-map.md` или `facade-map.agent-baseline.md`/спецификаций → downstream шаги получают `OUTDATED`.

### Resume-by-default для workflow шагов

Описание шагов 1–4 предполагает «живые» сессии: пользователь может возвращаться и корректировать результат без переинициализации workflow.

### Template model (текущее состояние)

Шаблоны шага `Description` статически bundled и синхронизируются при старте Core:
- `questionnaire-template.md` (анкета),
- `description-template.md` (Help),
- `description-collector-prompt.md` (инструкции агента).

Шаг `Virtual Simulation` работает в режиме **prompt-only**:
- bundled только `virtual-simulation-prompt.md`;
- отдельный artifact template не поставляется и не отправляется агенту;
- структура `virtual-simulation.md` задаётся контрактом шага и минимальными инвариантами валидации.

Шаги `Diagram Modules` и `Diagram Facades` работают через agent asset packs:
- prompt и template живут в `packages/agents/diagram-modules-agent/assets/` и `packages/agents/diagram-facades-agent/assets/`;
- runtime отправляет агенту canonical `.md` артефакт и generated `Change Summary`;
- Mermaid `.mmd` больше не является workflow SSOT.

---

## Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
