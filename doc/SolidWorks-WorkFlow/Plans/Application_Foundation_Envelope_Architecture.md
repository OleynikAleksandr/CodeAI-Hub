# Application Foundation Envelope Architecture

**Status:** Draft for review (2026-04-05)
**Created:** 2026-04-05
**Owner:** Oleksandr + Codex
**Scope:** Define a new light workflow step immediately after `Diagram Modules`. The step must formalize the application-wide structural envelope before branch-level specifications begin: `Application Root`, `Shared Zones`, `Integration Seams`, intended technologies per `Product Part`, placement rules, dependency rules, and a user-facing visualization derived from a canonical text artifact.

---

## 1. Problem

Текущий шаг `Diagram Modules` хорошо формализует ownership structure приложения:

- `Product Part`
- `Cluster`
- `Module`
- `Standalone Module`

Для непрограммиста это уже полезная и наглядная диаграмма. Но для многосоставного приложения этого недостаточно.

Сейчас в semantic model отсутствуют важные application-level сущности:

- `Application Root`;
- `Shared Zones`;
- `Integration Seams`;
- application-wide dependency rules;
- intended technologies per `Product Part`;
- unresolved global technology decisions.

Из-за этого следующие шаги вынуждены угадывать:

- как все `Product Part` собираются в одно приложение;
- какие части являются shared, а какие part-owned;
- где позже должны лежать integration adapters и cross-part contracts;
- на какой technology basis предполагается развивать каждую ветку.

Для сложного продукта это создаёт архитектурную дыру:

- branch-level specifications начинают работать без общей application assembly картины;
- `Implementation Foundation` пытается догадаться о structure, которая должна была быть зафиксирована раньше;
- непрограммисту сложно проверить, правильно ли приложение собирается в одно целое.

Следовательно, между `Diagram Modules` и branch-level design нужен отдельный, лёгкий, но формализованный шаг.

---

## 2. Product Goal

`Application Foundation Envelope` должен переводить workflow из состояния “мы видим составные части системы” в состояние “мы понимаем, как эти части собираются в одно приложение и на какой технологической основе они в целом будут развиваться”.

Шаг считается успешным, когда materialize-ено следующее:

1. Явно определён `Application Root`.
2. Явно определены `Shared Zones`.
3. Явно определены `Integration Seams` между `Product Part`.
4. Для каждого `Product Part` зафиксирован intended technology profile или decision status.
5. Зафиксированы dependency/placement rules для будущей physical structure.
6. Создан простой canonical документ, который непрограммист может прочитать.
7. По этому документу строится понятная диаграмма для visual review.

Ключевой принцип шага:

- это **technology-aware structural step**, но ещё **не implementation materialization step**.

---

## 3. Non-Goals

Этот шаг не должен:

- ставить environments или toolchains;
- создавать runnable application scaffold;
- генерировать окончательные framework configs;
- materialize-ить `src/`, `tests/`, `package.json`, `.sln`, `pyproject.toml` и т.п.;
- писать бизнес-логику;
- подменять собой branch-level specifications и contracts;
- навсегда фиксировать все technology decisions без права пометки `Proposed` / `Needs decision`.

---

## 4. Core Decisions

### 4.1. Шаг должен стоять сразу после `Diagram Modules`

Новый целевой порядок верхней части workflow:

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`
4. `Application Foundation Envelope`
5. `Product Part / Cluster / Module Specifications`
6. Contracts
7. `Implementation Foundation`

Это делает `Application Foundation Envelope` bridge step между ownership-diagram и branch-level design.

### 4.2. Нужно формализовать application-level structural entities

Этот шаг обязан ввести в workflow дополнительные сущности, которых не хватает текущей `Diagram Modules` model:

- `Application Root`
- `Shared Zone`
- `Integration Seam`
- при необходимости `External Boundary`

Они должны рассматриваться как такие же first-class structural units, как `Product Part`, `Cluster` и `Module`, но на другом уровне.

### 4.3. Канонический артефакт шага — текстовый документ, диаграмма строится из него

Как и в `Diagram Modules`, source of truth этого шага должен быть текстовым.

Шаг должен materialize-ить:

- semantic artifact — канонический `.md` документ;
- visual projection — диаграмму, построенную из semantic artifact;
- visual sidecar для layout/view state.

Итоговое правило:

- semantics живёт только в `.md`;
- диаграмма является projection;
- visual sidecar не может становиться semantic source of truth.

### 4.4. Шаг должен быть понятен непрограммисту

Этот шаг должен давать наглядный user-facing результат.

Пользователь без опыта программирования должен быть способен быстро понять:

- что является корнем приложения;
- какие есть `Product Part`;
- что у приложения общее;
- как части между собой общаются;
- какие technologies предполагаются для каждой части;
- какие решения ещё не окончательно подтверждены.

Поэтому документ и диаграмма этого шага должны использовать простой язык, short summaries и явные decision statuses.

### 4.5. Здесь фиксируется technology allocation, но не делается реальная materialization

На этом шаге допустимо и полезно зафиксировать:

- intended languages per `Product Part`;
- intended frameworks/platforms per `Product Part`;
- shared technology assumptions;
- cross-part compatibility assumptions;
- unresolved decisions.

Но этот шаг не должен:

- устанавливать toolchains;
- генерировать framework bootstrap;
- делать вид, что все technology decisions уже окончательно materialized.

Иначе говоря:

- здесь фиксируется `technology intent`;
- поздний `Implementation Foundation` фиксирует `technology realization`.

### 4.6. Результат шага — application assembly contract

Финал этого шага должен быть не “кодовым скелетом”, а **структурным скелетом приложения**.

Он должен отвечать на вопросы:

- что является `Application Root`;
- какие `Product Part` входят в приложение;
- где находятся `Shared Zones`;
- через какие `Integration Seams` части взаимодействуют;
- какие dependency directions допустимы;
- где later physical structure должна размещать различные сущности;
- какие technology decisions уже подтверждены, а какие ещё открыты.

---

## 5. Target Architecture

### 5.1. Placement in workflow

Целевой порядок выглядит так:

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`
4. `Application Foundation Envelope`
5. `Product Part / Cluster / Module Specifications`
6. Required contracts
7. `Implementation Foundation`
8. `TODO Plan`
9. `Implementation`

`Application Foundation Envelope` — это bridge between product composition and application assembly.

### 5.2. Input contract of the step

Минимальные входы:

- `Final_Description.md`
- `virtual-simulation.md`
- `product-parts.index.md`
- `product-parts/<part-id>.md`

Дополнительные входы:

- user constraints and preferences
- platform constraints
- early technology preferences, если они уже озвучены

Шаг не должен требовать already-finalized stack choices по всем будущим веткам. Он должен уметь фиксировать как confirmed решения, так и open decisions.

### 5.3. Output artifact set

Целевой artifact set шага должен жить внутри `.codeai-hub/<workspaceSlug>/application_foundation_envelope/`:

- `application-foundation-envelope.md`
- `application-envelope.flow.json`

Где:

- `application-foundation-envelope.md` — canonical semantic artifact;
- `application-envelope.flow.json` — layout/view state visual projection.

Но по результатам аудита текущей кодовой базы нужно сразу зафиксировать реалистичный первый execution slice:

- **Wave 1 must-have**: только `application-foundation-envelope.md`;
- `application-envelope.flow.json` и реальная visual projection должны идти отдельной следующей wave;
- иначе первый implementation scope получится слишком широким и будет смешивать stage shell с отдельной задачей визуального редактора/renderer.

### 5.4. Semantic sections of `application-foundation-envelope.md`

В каноническом документе должны быть как минимум такие разделы:

1. **Application Root**
   - короткое описание root application shape
   - что считается корнем приложения
2. **Product Parts**
   - список всех `Product Part`
   - короткий purpose каждого
   - intended technology allocation и decision status
3. **Shared Zones**
   - общие для приложения слои или surfaces
4. **Integration Seams**
   - как `Product Part` взаимодействуют между собой
5. **Placement Rules**
   - как future physical structure должна раскладывать части приложения
6. **Dependency Rules**
   - какие направления зависимостей разрешены
7. **Open Decisions**
   - явно перечисленные unresolved вопросы

### 5.5. Visual projection

Диаграмма этого шага должна быть простой и человекочитаемой.

Минимальный visual language:

- один container `Application Root`;
- отдельные containers или bands для `Shared Zones`;
- карточки `Product Part`;
- линии или labeled links для `Integration Seams`;
- badges у `Product Part`:
  - language
  - framework/platform
  - decision status (`Fixed`, `Proposed`, `Open`)

Это должна быть не файловая схема и не UML, а user-friendly карта того, как приложение собирается в одно целое.

При этом в текущем implementation cycle важно не смешивать две разные задачи:

- включение самого workflow-step в продукт;
- создание user-facing визуализации этого шага.

Поэтому visual projection является **обязательной целевой capability шага**, но **не обязательной частью первого code slice**.

### 5.6. Downstream contract

После этого шага branch-level specifications больше не должны:

- заново придумывать application root;
- случайно изобретать shared layer;
- конфликтовать в dependency directions;
- выбирать technology context, не сверяясь с envelope.

Они должны:

- читать `application-foundation-envelope.md`;
- наследовать его assembly decisions;
- уточнять, а не переизобретать application-wide structure;
- передавать свои outputs дальше в `Implementation Foundation`.

---

## 6. Реальность текущей кодовой базы (audit 2026-04-05)

### 6.1. Новый шаг нельзя добавить только одной кнопкой

В текущей реализации workflow шаги жёстко зашиты как набор известных `stage id`.

Это означает, что `Application Foundation Envelope` потребует изменений одновременно в нескольких слоях:

- core workflow state;
- core HTTP contract routing;
- artifact allowlist / validation / persistence;
- Project Manager services;
- Project Manager toolbar / tree / panel routing.

Следовательно, “добавить следующую кнопку” — это не один UI-файл, а сквозной stage contract.

### 6.2. Где именно stage ids/order сейчас захардкожены

По результатам просмотра кодовой базы новый stage должен быть добавлен как минимум в следующие точки:

- `packages/core/src/workflow/watcher/watcher-types.ts`
- `packages/core/src/workflow/watcher/workflow-watcher.ts`
- `packages/core/src/workflow/state/workflow-state-store.ts`
- `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
- `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`
- `packages/core/src/workflow/paths/workflow-paths-types.ts`
- `packages/core/src/workflow/paths/workflow-artifact-paths.ts`
- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
- `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
- `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`
- `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`
- `src/client/project-manager/services/workflow-state-client.ts`
- `src/client/project-manager/services/description-submit-service.ts`
- `src/client/project-manager/services/prompt-pack-builder.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`
- `src/client/project-manager/components/layout/main-area.tsx`
- `src/client/project-manager/components/layout/use-workflow-tool-select.ts`
- `src/client/project-manager/components/layout/main-area-utils.ts`
- `src/client/project-manager/components/layout/workspace-tree-model.ts`
- `src/client/project-manager/components/layout/workspace-tree.tsx`
- `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`
- `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`
- `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`
- `src/client/project-manager/components/layout/use-stage-panel-sync.ts`
- `src/client/project-manager/components/layout/main-area-panel-content.tsx`

Это и есть реальная техническая поверхность внедрения нового workflow-step в текущую архитектуру продукта.

### 6.3. Реальная upstream gate для нового шага

Новый шаг нельзя открывать только по факту появления `product-parts.index.md`.

В текущем `Diagram Modules` runtime индекс может уже существовать, а materialization `product-parts/<part-id>.md` ещё продолжаться.

Следовательно, правильный upstream gate для `Application Foundation Envelope` в текущей реализации должен опираться на:

- `diagramModulesProgress.aggregateReady === true`

а не только на:

- наличие `product-parts.index.md`

Это важно, чтобы новый шаг стартовал после завершённой semantic materialization `Diagram Modules`, а не в середине progressive generation.

### 6.4. Реальный минимальный артефакт первого code slice

Первый реалистичный implementation slice для нового шага:

- новый `stage id` в workflow;
- gating после завершённого `Diagram Modules`;
- contract endpoint и prompt/template wiring;
- canonical `.md` artifact;
- start service;
- Project Manager button / tree / panel shell;
- чтение и отображение canonical markdown artifact.

То есть первый slice должен довести продукт до состояния:

- шаг существует как часть workflow;
- шаг можно запустить из Project Manager;
- шаг имеет свой canonical текстовый output;
- этот output виден в UI и может стать опорой для следующего design step.

### 6.5. Что сознательно откладывается из первого slice

Из первого implementation cycle разумно исключить:

- `application-envelope.flow.json`;
- visual renderer/editor для envelope;
- отдельную progressive orchestration model для визуализации;
- любые branch-level specification steps после этого шага;
- интеграцию с поздним `Implementation Foundation`.

Иначе scope станет слишком большим и перестанет быть детерминированным.

---

## 7. Рекомендуемая первая implementation wave

### 7.1. Цель wave

Первая wave должна дать **stage shell**, а не полный feature-complete step.

Формулировка результата:

`Application Foundation Envelope` появляется в workflow сразу после `Diagram Modules`, корректно блокируется до завершения upstream stage, умеет стартовать отдельную collector-session и materialize-ит canonical файл `application-foundation-envelope.md`.

### 7.2. Состав wave

Первая wave должна включать:

1. shared stage contract в core и client;
2. gating и cold-start hydration;
3. artifact allowlist / validation / persistence;
4. workflow contract endpoint и bundled prompt;
5. Project Manager service wiring;
6. toolbar/tree/panel shell;
7. базовые тесты на новые stage contracts.

### 7.3. Что будет следующей wave

После завершения первой wave отдельным следующим scope нужно будет делать:

1. визуальную projection-диаграмму;
2. `application-envelope.flow.json`;
3. visual layout persistence;
4. UX вокруг редактирования/перестройки envelope;
5. bridge к downstream шагам `Product Part / Cluster / Module Specifications`.

---

## 8. Risks And Mitigations

### 8.1. Premature technology lock-in

Риск:

- шаг слишком рано заморозит technology choices.

Смягчение:

- документ обязан поддерживать explicit decision statuses (`Fixed`, `Proposed`, `Open`);
- unresolved вопросы не прячутся, а фиксируются как open decisions.

### 8.2. Step becomes too abstract to be useful

Риск:

- получится красивый, но бесполезный high-level prose документ.

Смягчение:

- document structure должна быть формализована;
- visual projection обязана строиться из canonical artifact;
- placement/dependency rules должны быть явными.

### 8.3. Semantic duplication with `Diagram Modules`

Риск:

- новый шаг начнёт дублировать ownership hierarchy.

Смягчение:

- `Diagram Modules` отвечает за composition of parts;
- `Application Foundation Envelope` отвечает за application assembly, shared zones, seams и technology allocation.

### 8.4. Non-programmer overload

Риск:

- пользователь увидит слишком технический документ.

Смягчение:

- использовать короткие descriptions;
- technology allocation показывать badges/statuses;
- сложные implementation details оставить для позднего `Implementation Foundation`.

---

## 9. Execution Outline

Реализация этого scope должна идти в таком порядке:

1. Прочитать `Diagram Modules` artifacts.
2. Сформировать `Application Root`, `Shared Zones` и `Integration Seams`.
3. Зафиксировать intended technology allocation per `Product Part`.
4. Зафиксировать placement/dependency rules.
5. Отдельно перечислить open decisions.
6. Materialize-ить canonical `.md` document.
7. Построить visual projection для review.

---

## 10. Verification Target

Шаг считается спроектированным корректно, если его конечное состояние можно проверить следующими условиями:

1. Существует один canonical semantic artifact `application-foundation-envelope.md`.
2. По нему строится user-facing диаграмма.
3. В документе явно определены `Application Root`, `Shared Zones` и `Integration Seams`.
4. Для каждого `Product Part` есть intended technology allocation или explicit open status.
5. Есть dependency/placement rules, достаточные для старта branch-level specifications.
6. Непрограммист может прочитать документ и понять, как приложение собирается в одно целое.

---

## 11. Expected Outcome

После реализации этого planning scope CodeAI Hub должен получить новый лёгкий workflow step, который:

- расширяет текущий `Diagram Modules` до уровня application assembly;
- даёт непрограммисту понятную визуальную и текстовую картину того, как parts собираются в одно приложение;
- фиксирует technology intent без premature implementation materialization;
- готовит детерминированную основу для branch-level specifications и позднего `Implementation Foundation`.

Итоговый принцип:

- `Diagram Modules` показывает логическую композицию продукта;
- `Application Foundation Envelope` показывает композицию приложения как technical system;
- `Implementation Foundation` позже materialize-ит реальную implementation surface для выбранной ветки.
