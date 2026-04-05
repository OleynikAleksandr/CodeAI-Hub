# Workflow Steps Overview — от идеи к реализации (SSOT)

**Status:** Active SSOT
**Updated:** 2026-04-05
**Owner:** Oleksandr

---

## 0) Философия Workflow

Главный принцип: **от простого к сложному**.

Пользователь не обязан «продумать всё заранее» на первом шаге. Каждый шаг добавляет только один слой ясности и формирует артефакт, который нужен следующему шагу.

### Ствол (trunk) — реализован:
- **Шаг 1 (Description):** что за продукт, для кого, и какие базовые сценарии должны работать.
- **Шаг 2 (Virtual Simulation):** как продукт должен вести себя в сценариях использования.
- **Шаг 3 (Diagram Modules):** из каких Product Part / Cluster / Module состоит система.
- **Шаг 4 (Application Foundation Envelope):** как эти части собираются в одно приложение: `Application Root`, `Shared Zones`, `Integration Seams`, intended technologies и placement/dependency rules.

### Ветки (branches) — `[DESIGNED, NOT IMPLEMENTED]`:

После утверждения `Application Foundation Envelope` ствол заканчивается и начинается дерево разработки (Development Tree). Работа ведётся по веткам, привязанным к структуре продукта:

```
Diagram Modules
 └─ Application Foundation Envelope (trunk end)
     └─ Product Part (ветка per part)
         ├─ Cluster (ветка per cluster)
         │   ├─ Cluster Specification (функции, модули, зона ответственности)
         │   ├─ Cluster Facade Contract (внешний контракт кластера)
         │   └─ Module (ветка per module)
         │       ├─ Module Specification (интерфейсы, методы, зависимости)
         │       ├─ Module Facade Contract (публичный API модуля)
         │       ├─ TODO Plan (фазы, стримы, микро-задачи ≤3 файлов)
         │       └─ Implementation (код + синхронные обновления документации)
         └─ ... (следующий Cluster)
```

Ключевое решение: **фасады не являются отдельным шагом ствола**. Спецификация фасада появляется естественно внутри каждой ветки — на уровне кластера (Cluster Facade Contract) и на уровне модуля (Module Facade Contract). Это позволяет работать с фасадами в контексте конкретного блока системы, а не как с неуправляемым плоским списком.

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

Это главный user-review step всего workflow:
- именно здесь предыдущие текстовые шаги впервые превращаются в понятную визуальную структуру;
- именно здесь ожидается максимальный объём пользовательских уточнений и архитектурных правок;
- этот шаг не обязан угадывать идею продукта "с первого раза", но обязан давать понятную форму для коррекции мысли пользователя.

### Подход

Manual start из верхнего toolbar PM:
- пользователь сам решает, когда `virtual-simulation.md` уже достаточно хороший для перехода на следующий шаг;
- запуск требует доступный canonical upstream artifact `virtual-simulation.md`;
- PM не должен дополнительно требовать точный upstream status `DONE` / `completed`, если artifact уже существует и gating не блокирует старт.

### Входы

- `Final_Description.md`
- `virtual-simulation.md`

### Артефакты

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json`

`product-parts.index.md` является первым canonical orchestration artifact этого шага:
- он фиксирует список `Product Part`, их порядок, purpose и generation status;
- по нему `React Flow` может показать skeleton общей картины ещё до materialization всех part-файлов.

`product-parts/<part-id>.md` являются canonical semantic artifacts отдельных `Product Part`.
Каждый такой файл materialize-ит один ownership subtree `Product Part -> Cluster -> Module`.

`module-map.flow.json` хранит только layout/view state визуального редактора.
Visual diagram materialize-ится runtime из index + part artifacts и не требует отдельного raw semantic map-файла в workspace.

### User-facing baseline

- `Diagram Modules` обязан быть читаемым уже при первом открытии, даже если `module-map.flow.json` ещё не существует.
- Шаг должен materialize-иться progressive:
  - сначала появляется skeleton planned `Product Part` из `product-parts.index.md`;
  - затем `React Flow` последовательно заменяет placeholders реальными ownership trees по мере появления `product-parts/<part-id>.md`;
  - пользователь не обязан подтверждать каждый `Product Part` через чат между turn-ами.
- First-open layout для ownership hierarchy должен следовать детерминированному правилу `measure -> place`:
  - сначала измеряются header/content blocks `Product Part`, `Cluster`, `Module`;
  - затем layout раскладывает их сверху вниз по реальным размерам;
  - дочерние cards не имеют права залезать в header-zone родителя;
  - standalone modules должны компактизироваться внутри `Product Part`, а не падать в пустой нижний band.
- `Product Part` и `Cluster` обязаны показывать короткий purpose/description layer, чтобы пользователь видел не только состав, но и назначение уровня иерархии.
- Relation lines и cross-part graph wiring не входят в обязательный baseline первого полезного результата `Diagram Modules`; базовый review-step должен сначала стабилизировать структуру `Product Part -> Cluster -> Module`.

---

## Шаг 4 — Application Foundation Envelope

### Цель

Зафиксировать application-level structural envelope после завершённого `Diagram Modules`, но до branch-level specifications.

Этот шаг отвечает на вопросы:
- что считается `Application Root`;
- какие есть `Shared Zones`;
- через какие `Integration Seams` взаимодействуют `Product Part`;
- какие intended technologies и dependency/placement rules принимаются как application-wide baseline.

### Подход

Manual start из PM после завершённой semantic materialization `Diagram Modules`:
- gating опирается на `diagramModulesProgress.aggregateReady === true`;
- шаг materialize-ит один canonical текстовый артефакт;
- visual projection этого шага является целевой capability, но не обязательной частью первой implementation wave.

### Входы

- `Final_Description.md`
- `virtual-simulation.md`
- `product-parts.index.md`
- `product-parts/<part-id>.md`

### Артефакт

- `.codeai-hub/<workspaceSlug>/application_foundation_envelope/application-foundation-envelope.md`

### Первая implementation wave

Текущая первая wave для этого шага ограничена `stage shell` baseline:
- новый workflow stage;
- core/client routing и gating;
- canonical markdown artifact;
- Project Manager button/tree/panel shell.

Из этой wave сознательно исключены:
- `application-envelope.flow.json`;
- visual editor / renderer / layout persistence;
- branch-level specification steps после envelope.

---

## Сквозные механизмы

### OUTDATED propagation

- Изменение `Final_Description.md` → `Virtual Simulation = OUTDATED`.
- Изменение `virtual-simulation.md` → `Diagram Modules = OUTDATED`.
- Изменение canonical artifacts `Diagram Modules` после готового envelope → `Application Foundation Envelope = OUTDATED`.

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

Шаг `Diagram Modules` работает через agent asset pack:
- prompt, field reference и merge rules живут в `packages/agents/diagram-modules-agent/assets/` (`diagram-modules-prompt.md`, `diagram-modules-field-reference.md`, `diagram-modules-merge-rules.md`);
- runtime отправляет агенту canonical `.md` артефакт и generated `Change Summary`;
- Mermaid `.mmd` больше не является workflow SSOT.

---

## Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
