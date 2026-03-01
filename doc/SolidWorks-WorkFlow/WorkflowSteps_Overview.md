# Workflow Steps Overview — от идеи к реализации (SSOT)

**Status:** Active SSOT
**Updated:** 2026-03-01
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
- 2–4 сценария (актор/цель → действие → ожидаемый результат → критерий успеха);
- ограничения/допущения;
- `out of scope`;
- ключевые сущности/термины (чтобы следующий агент не стартовал с нуля);
- открытые вопросы.

### 1.4 Артефакты шага

- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`
- Legacy (compat only): `.codeai-hub/<workspaceSlug>/description/description.md`

### 1.5 Reviewer boundary

Встроенного reviewer-подшага в `Description` нет.
Standalone reviewer остаётся отдельным deferred-модулем и не входит в базовый chain 1→6.

---

## Шаг 2 — Virtual Simulation

### Цель

Зафиксировать 2–4 сценария поведения системы в виде `virtual-simulation.md`.

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

### Входы

- `Final_Description.md`
- `virtual-simulation.md`

### Артефакт

- `.codeai-hub/<workspaceSlug>/diagram_modules/modules-diagram.mmd`

---

## Шаг 4 — Diagram Facades

### Цель

Зафиксировать фасады модулей, типы взаимодействий и зависимости.

### Входы

- `Final_Description.md`
- `virtual-simulation.md`
- `modules-diagram.mmd`

### Артефакты

- `.codeai-hub/<workspaceSlug>/diagram_facades/facades-graph.mmd`
- `.codeai-hub/<workspaceSlug>/diagram_facades/facades-description.md`

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
- Изменение `modules-diagram.mmd` → `Diagram Facades = OUTDATED`.
- Изменение `facades-graph.mmd`/спецификаций → downstream шаги получают `OUTDATED`.

### Resume-by-default для workflow шагов

Описание шагов 1–4 предполагает «живые» сессии: пользователь может возвращаться и корректировать результат без переинициализации workflow.

### Template model (текущее состояние)

Шаблоны шага `Description` статически bundled и синхронизируются при старте Core:
- `questionnaire-template.md` (анкета),
- `description-template.md` (Help),
- `description-collector-prompt.md` (инструкции агента).

---

## Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
