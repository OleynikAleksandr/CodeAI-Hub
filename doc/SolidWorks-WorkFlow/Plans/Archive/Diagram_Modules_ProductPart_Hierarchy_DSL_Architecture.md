# Архитектура DSL для иерархии Product Part -> Cluster -> Module

**Статус:** Implemented baseline
**Дата:** 2026-03-21
**Охват:** изменение структуры `module-inventory.md`, parser/runtime contract и React Flow projection для `Diagram Modules`, чтобы диаграмма materialize-ила верхний ownership layer, а не только плоские `cluster + module`

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`
- `doc/Sessions/Archive/Session110.md`
- `doc/TODO/todo-plan.md`

---

## 1. Проблема

После greenfield runtime-прогона подтвердилось, что проблема `Diagram Modules` уже не сводится к layout.

Текущий semantic/runtime baseline умеет выражать только:
- `cluster`;
- `standalone module`;
- простые relation между модулями.

Этого недостаточно, чтобы показать пользователю реальную архитектурную картину продукта, если система состоит из нескольких самостоятельных частей:
- `shell`;
- отдельного `runtime`;
- отдельного desktop/web application;
- service/process;
- family of providers;
- других independently-living частей продукта.

Сейчас такие части либо:
- схлопываются в один плоский graph;
- либо маскируются под `cluster`;
- либо остаются только в prose, но не materialize-ятся в диаграмме как formal visual entities.

Следствие:
- пользователь не видит, где именно "живёт" модуль;
- ownership и host/runtime placement теряются;
- `cluster` вынужденно начинает играть роль не своей сущности;
- diagram interpreter flatten-ит систему сильнее, чем это допускает уже согласованная архитектурная логика.

---

## 2. Подтвержденный текущий baseline

На текущем этапе `module-inventory.md` поддерживает:
- секции `Metadata`, `Clusters`, `Standalone Modules`, `Simple Relations`, `Assumptions / Open Questions`;
- nested modules внутри `Cluster`;
- standalone modules вне cluster;
- relation только на уровне `module -> module`.

Текущая domain model знает только:
- `ModuleEntity` с optional `cluster`;
- `ModuleRelation`;
- flat `ModuleMapModel`.

Текущий React Flow projection:
- создаёт top-level node для `cluster`;
- создаёт top-level node для каждого `module`;
- не использует `parentId` / `extent` для вложения module nodes в cluster container;
- не имеет formal top-level node для самостоятельной части продукта.

То есть текущая цепочка:
`DSL -> parser -> model -> projection -> React Flow`
формально не умеет показать иерархию:
`product part -> cluster -> module`.

---

## 3. Целевой архитектурный baseline

Для `Diagram Modules` нужен новый semantic baseline:

- верхний уровень: `Product Part`
- средний уровень: `Cluster`
- нижний уровень: `Module`

Где:
- `Product Part` — самостоятельная часть продукта, которая может жить, запускаться, обновляться или поставляться отдельно;
- `Cluster` — формальная подсистема внутри конкретной `Product Part`;
- `Module` — минимальный рабочий блок внутри `Cluster` или standalone внутри конкретной `Product Part`.

Ключевой принцип:

**`Shell` — это не отдельный параллельный тип верхнего уровня, а одна из ролей `Product Part`.**

То есть верхний уровень должен отвечать не на вопрос:
- `shell или не shell`,

а на вопрос:
- `какая это самостоятельная часть продукта и какая у неё роль`.

Candidate roles для `Product Part`:
- `shell`
- `application`
- `runtime`
- `service`
- `provider`
- `external`

Список ролей можно уточнить позже, но ownership layer нужен уже сейчас.

---

## 4. Proposed DSL v2

### 4.1. Главная structural change

В `module-inventory.md` нужно отказаться от раздельной плоской модели:
- `Clusters`
- `Standalone Modules`

и перейти к иерархической секции:
- `Product Parts`

Новая high-level структура документа:

```md
# Module Inventory

## Metadata
...

## Product Parts
...

## Simple Relations
...

## Assumptions / Open Questions
...
```

### 4.2. Product Part block

Каждая `Product Part` должна быть formal entity со своими полями:
- `Id`
- `Role`
- `Title`
- `Purpose`
- `Clusters`
- `Standalone Modules`
- `Notes`

Смысл:
- `Clusters` перечисляет cluster IDs, живущие внутри этой части продукта;
- `Standalone Modules` перечисляет module IDs, которые принадлежат этой части продукта, но не входят ни в один cluster.

### 4.3. Cluster block

`Cluster` должен находиться внутри конкретной `Product Part`.

Поля `Cluster`:
- `Id`
- `Title`
- `Purpose`
- `Product Part`
- `Modules`
- `Notes`

Важно:
- cluster не существует "в вакууме";
- cluster всегда принадлежит одной `Product Part`;
- cluster должен быть container для нескольких modules, а не loose label.

### 4.4. Module block

`Module` должен всегда принадлежать одной `Product Part`.

У модуля есть два допустимых состояния:
- `Cluster member`
- `Standalone inside Product Part`

Поля `Module`:
- `Id`
- `Kind`
- `Title`
- `Responsibility`
- `Product Part`
- `Cluster` (optional)
- `Inputs`
- `Outputs`
- `Spec Target`
- `Contract Targets`
- `Code Targets`
- `Origin`
- `Status`
- `Notes`
- `Rationale`

Семантика:
- если `Cluster` задан, модуль принадлежит указанному cluster;
- если `Cluster` не задан, модуль считается standalone, но всё равно обязан иметь `Product Part`.

### 4.5. Relations не меняют уровень

`Simple Relations` пока должны оставаться на уровне:
- `module -> module`

Мы не вводим отдельные relation types:
- `product-part -> product-part`
- `cluster -> cluster`

Потому что для пользовательской ясности и для будущих facade contracts важнее сохранить concrete interactions между модулями.

Если пользователь видит связь двух top-level частей продукта, interpreter должен выражать её через ту пару модулей, которая лучше всего объясняет эту связь.

---

## 5. Candidate DSL example

```md
# Module Inventory

## Metadata
- Version: 2
- Stage: diagram_modules
- Revision: 00000000
- Updated: 2026-03-21T00:00:00Z

## Product Parts

### Product Part: vscode-extension-shell
- Id: vscode-extension-shell
- Role: shell
- Title: VS Code Extension Shell
- Purpose: Gives the user entry into the product from inside VS Code
- Clusters:
  - ide-workspace
- Standalone Modules:
  - prompt-entry

#### Cluster: ide-workspace
- Id: ide-workspace
- Title: IDE Workspace
- Purpose: Coordinates extension-side workspace behavior
- Product Part: vscode-extension-shell
- Modules:
  - workspace-intake
  - workspace-panel

##### Module: workspace-intake
- Id: workspace-intake
- Kind: service
- Title: Workspace Intake
- Responsibility: Starts and validates workspace entry into the extension flow
- Product Part: vscode-extension-shell
- Cluster: ide-workspace
- Origin: agent
- Status: proposed

##### Module: workspace-panel
- Id: workspace-panel
- Kind: adapter
- Title: Workspace Panel
- Responsibility: Shows the user the active project workspace inside the IDE
- Product Part: vscode-extension-shell
- Cluster: ide-workspace
- Origin: agent
- Status: proposed

#### Module: prompt-entry
- Id: prompt-entry
- Kind: adapter
- Title: Prompt Entry
- Responsibility: Accepts the user prompt from the IDE shell and forwards it into the runtime flow
- Product Part: vscode-extension-shell
- Origin: agent
- Status: proposed

### Product Part: core-runtime
- Id: core-runtime
- Role: runtime
- Title: Core Runtime
- Purpose: Owns orchestration, long-running state, and provider coordination
- Clusters:
  - provider-orchestration
- Standalone Modules:
  - session-store

#### Cluster: provider-orchestration
- Id: provider-orchestration
- Title: Provider Orchestration
- Purpose: Coordinates concrete AI providers under one runtime policy
- Product Part: core-runtime
- Modules:
  - claude-provider
  - codex-provider
  - gemini-provider

##### Module: claude-provider
- Id: claude-provider
- Kind: adapter
- Title: Claude Provider
- Responsibility: Connects the runtime to Claude under the shared provider contract
- Product Part: core-runtime
- Cluster: provider-orchestration
- Origin: agent
- Status: proposed

##### Module: codex-provider
- Id: codex-provider
- Kind: adapter
- Title: Codex Provider
- Responsibility: Connects the runtime to Codex under the shared provider contract
- Product Part: core-runtime
- Cluster: provider-orchestration
- Origin: agent
- Status: proposed

##### Module: gemini-provider
- Id: gemini-provider
- Kind: adapter
- Title: Gemini Provider
- Responsibility: Connects the runtime to Gemini under the shared provider contract
- Product Part: core-runtime
- Cluster: provider-orchestration
- Origin: agent
- Status: proposed

#### Module: session-store
- Id: session-store
- Kind: store
- Title: Session Store
- Responsibility: Keeps runtime session state readable and stable across provider interactions
- Product Part: core-runtime
- Origin: agent
- Status: proposed

## Simple Relations
...

## Assumptions / Open Questions
...
```

---

## 6. Инварианты новой модели

1. У каждого `Module` должен быть ровно один `Product Part`.
2. У каждого `Cluster` должен быть ровно один `Product Part`.
3. `Module` может принадлежать максимум одному `Cluster`.
4. Standalone module — это не модуль "вне системы", а модуль внутри `Product Part` без cluster membership.
5. `Cluster` не может пересекать границы `Product Part`.
6. `Cluster` не должен существовать без nested modules.
7. `Product Part` не должен быть пустым:
   - внутри него должен быть хотя бы один `Cluster` или хотя бы один standalone `Module`.
8. `Simple Relations` не должны ссылаться на `Product Part` или `Cluster` как endpoints.
9. `Kind` остаётся вторичным tooling field, а не главным архитектурным смыслом сущности.

---

## 7. Что это меняет в runtime и кодовой базе

### 7.1. Parser / serializer / domain model

Понадобится новый слой модели:
- `ProductPartEntity`

`ModuleMapModel` больше не должен быть просто:
- `modules[]`
- `relations[]`

Минимально он должен уметь выражать:
- `productParts[]`
- `clusters[]`
- `modules[]`
- `relations[]`

Либо:
- хранить иерархию в nested form,
- либо хранить flat records, но с explicit `productPart` ownership field.

Для parser/runtime проще и безопаснее:
- хранить explicit ownership fields на `Cluster` и `Module`;
- а nested Markdown structure использовать как user-facing DSL surface и как validation input.

### 7.2. React Flow projection

Projection должен перейти к nested container model:

- `Product Part` node:
  - top-level container
- `Cluster` node:
  - child container внутри `Product Part`
- `Module` node:
  - child node внутри `Cluster`
  - или child node напрямую внутри `Product Part`, если module standalone

То есть `parentId` / `extent: "parent"` должны наконец стать реальным runtime-контрактом, а не неиспользуемой возможностью types.

### 7.3. Visual semantics

Пользователь должен сразу видеть:
- где оболочка продукта;
- где отдельный runtime/app/service;
- какие clusters живут внутри каждой части продукта;
- какие modules входят в cluster;
- какие modules standalone, но принадлежат конкретной верхнеуровневой части.

### 7.4. Layout sidecar

`module-map.flow.json` не становится semantic artifact.

Но после введения container hierarchy sidecar должен уметь стабильно хранить geometry для:
- `product-part` containers;
- `cluster` containers;
- `module` nodes.

Сам принцип sidecar не меняется:
- только layout;
- никакой семантики ownership туда не переносится.

---

## 8. Предлагаемая стратегия миграции

### Вариант A — жёсткий switch

- prompt/template сразу начинают писать только DSL v2;
- parser принимает только новую структуру;
- старые `module-inventory.md` считаются legacy.

Плюс:
- проще код.

Минус:
- ломает обратную совместимость.

### Вариант B — dual-read, single-write

- parser временно умеет читать и старый flat DSL, и новый hierarchical DSL;
- serializer и prompt-pack уже пишут только новый DSL;
- для legacy inventory runtime materialize-ит synthetic default `Product Part`.

Плюс:
- мягкая миграция;
- безопаснее для уже существующих workspace artifacts.

Минус:
- временно усложняет parser/runtime.

Для этого scope предпочтительнее `Вариант B`.

---

## 9. Что нужно утвердить до начала реализации

1. User-facing label верхнего уровня:
   - `Product Part`
   - или другой термин, но с тем же смыслом `самостоятельной части продукта`.
2. Набор допустимых `Role` для `Product Part`:
   - фиксированный enum
   - или controlled string set с мягкой валидацией.
3. Нужен ли `Title` у `Cluster`, или достаточно `Id + Purpose`.
4. Должен ли parser на этапе миграции materialize-ить synthetic default `Product Part`, и как именно его называть.
5. Нужно ли уже в `Diagram Modules` фиксировать будущий `cluster facade` / `module facade` ownership текстом, или это останется задачей следующего шага.

---

## 10. Proposed execution slices

### Slice A — DSL contract
- Обновить prompt/template/help для `Diagram Modules`.
- Зафиксировать `Product Part` grammar и field reference.
- Обновить merge-rules под ownership-preserving behavior.

### Slice B — Parser/model
- Добавить `ProductPartEntity` и ownership fields.
- Обновить parser / serializer / tests.
- Ввести dual-read migration path.

### Slice C — React Flow interpreter
- Добавить `product-part` node type.
- Перевести projection на nested containers.
- Разделить standalone modules внутри `Product Part` и cluster members внутри `Cluster`.

### Slice D — User-facing verification
- Проверить first-open diagram на greenfield runtime.
- Проверить, что ownership hierarchy читается без sidecar.
- Проверить, что пользовательские drag-правки по-прежнему сохраняются корректно.

---

## 11. Итоговый baseline этого документа

Для `Diagram Modules` больше недостаточно grammar вида:
- `cluster + standalone module + simple relation`.

Новый baseline должен быть таким:

**`Product Part -> Cluster -> Module`**

где:
- `Product Part` materialize-ит самостоятельную часть продукта;
- `Cluster` materialize-ит подсистему внутри этой части;
- `Module` materialize-ит рабочий блок внутри cluster или напрямую внутри product part;
- diagram interpreter обязан показывать эту иерархию как вложенные visual containers, а не как плоский набор карточек.
