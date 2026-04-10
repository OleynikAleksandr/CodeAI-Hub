# Development Tree Branch Workflow Architecture

**Status:** Draft for review (2026-04-07, updated 2026-04-10)
**Created:** 2026-04-07
**Updated:** 2026-04-10
**Owner:** Oleksandr + Codex
**Scope:** Формализовать branch-level workflow, который начинается после `Diagram Modules`: `Product Part Specification`, `Cluster Design`, `Module Design` / `Module Planning` / `Module Execution`, standalone-module path, required contracts для выбранной implementation wave и readiness gates между сессиями.

**Синхронизирован с:** `Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` (rev 3, Accepted) — единый sidebar/session model.

---

## 1. Problem

После `Diagram Modules` текущий trunk формально заканчивается, но дальше branch-level workflow пока зафиксирован только на очень общем уровне:

- `Product Part branch`;
- `Cluster branch`;
- `Module branch`;
- `Cluster Facade Contract`;
- `Module Facade Contract`;
- поздний `Implementation Foundation`.

Этого недостаточно для детерминированной работы, потому что сейчас не определено:

- нужен ли отдельный `Product Part Specification` как первый branch artifact;
- являются ли `Cluster Specification` и `Cluster Facade Contract` разными шагами или одной design-сессией с двумя outputs;
- являются ли `Module Specification` и `Module Facade Contract` разными шагами или одной design-сессией с двумя outputs;
- как проходит ветка для standalone modules, которые живут внутри `Product Part`, но вне любого cluster;
- как module-level workflow переходит от design через planning к execution;
- какой именно artifact set считается достаточным для старта каждой следующей сессии;
- как должны выглядеть canonical filenames и workspace paths для branch artifacts;
- как работает `OUTDATED propagation` между `Diagram Modules`, part, cluster, module и implementation wave.

Без этого возникают практические проблемы:

- агенту приходится импровизировать branch sequence заново;
- фасад-контракты могут появляться слишком поздно или отдельно от спецификаций, из-за чего теряется единая точка входа;
- `Implementation Foundation` рискует стартовать по "хорошему чату", а не по утверждённым traceable artifacts;
- разные `Product Part` и волны реализации могут оформляться по разным схемам.

Следовательно, нужен отдельный planning-док, который формализует branch-level development tree между `Diagram Modules` и `Implementation`.

---

## 2. Product Goal

После утверждения `Diagram Modules` система должна переходить не в абстрактное "теперь делаем спецификации", а в жёстко определённый branch-level workflow.

Шаг считается корректно спроектированным, когда одновременно выполняются следующие условия:

1. Для каждого выбранного `Product Part` существует явный `Product Part Specification`.
2. Для каждого `Cluster` используется один design-step, который materialize-ит два артефакта:
   - `Cluster Specification`;
   - `Cluster Facade Contract`.
3. Для каждого `Module` используются три сессии:
   - **Design session** — materialize-ит `Module Specification` + `Module Facade Contract`.
   - **Planning session** — materialize-ит `Implementation Foundation` + `TODO Plan`.
   - **Execution session** — materialize-ит `Implementation` (реальный код).
4. Для standalone modules действует тот же три-сессионный `Module` path без искусственного обязательного cluster layer.
5. Каждая следующая module session gated на завершение артефактов предыдущей (Design → Planning → Execution).
6. `Implementation Foundation` создаётся Planning session только после того, как Design session завершила `Module Specification` + `Module Facade Contract`.
7. Все branch artifacts имеют предсказуемые canonical paths.
8. `OUTDATED propagation` между upstream и downstream artifacts формализована заранее.

Ключевые принципы:

- один design-step может и должен создавать сразу и спецификацию, и facade contract;
- но сами артефакты при этом остаются раздельными, потому что они отвечают на разные вопросы;
- три module sessions отражают три когнитивных режима: design («что это и как выглядит снаружи»), planning («как строить шаг за шагом»), execution («делай по плану»).

---

## 3. Non-Goals

Этот planning scope не должен:

- реализовывать branch workflow в продукте прямо сейчас;
- заменять собой `Diagram Modules`;
- создавать файловый scaffold, environments или toolchains;
- писать бизнес-логику модулей;
- навязывать один giant-bang sequence, в котором весь продукт обязан быть полностью расписан до старта первой implementation wave;
- сливать specification и facade contract в один markdown-файл;
- определять визуализацию sidebar (ownership: `DevelopmentTree_Sidebar_Visualization_Architecture.md`).

---

## 4. Core Decisions

### 4.1. `Diagram Modules` остаётся концом trunk

`Diagram Modules` остаётся последним trunk-step.

После него начинается Development Tree.

Он уже materialize-ит достаточную ownership structure для branch entry и не требует дополнительного bridge-step.

### 4.2. `Product Part Specification` нужен как первый branch artifact

`Product Part` не должен перескакивать сразу к cluster-level документам.

Для каждой части продукта нужен отдельный branch-root artifact, который фиксирует:

- роль `Product Part` внутри общего application envelope;
- его границы;
- список `Cluster`;
- список standalone modules;
- использование shared zones и integration seams;
- scope и приоритет первых implementation waves;
- branch-level open decisions.

Это не facade contract.
Это branch passport для конкретной части продукта.

**Сессия:** одна Design session, один артефакт (Part Specification). Соответствует §9.4 sidebar-документа.

### 4.3. `Cluster Specification` и `Cluster Facade Contract` объединяются в один design-step

Не нужно делать их двумя разными workflow-step.

Правильная единица работы:

- один `Cluster Design` step;
- одна agent session;
- два артефакта:
  - `Cluster Specification`;
  - `Cluster Facade Contract`.

Причина:

- внутреннюю структуру cluster и его публичную boundary лучше проектировать одновременно;
- это уменьшает архитектурный drift между "что cluster делает" и "как с ним взаимодействуют извне".

**Соответствует §9.5 sidebar-документа:** 1 session, 2 artifact tabs.

### 4.4. Module lifecycle: три сессии, пять артефактов

Module проектируется и реализуется через три отдельных agent sessions:

**Design session** (один агент) — два артефакта:
- `Module Specification` — что модуль собой представляет, обязанности, зависимости, ограничения.
- `Module Facade Contract` — публичная boundary, API surface, invariants.

Логика та же, что для cluster: specification и facade contract создаются одновременно одним агентом, но остаются раздельными артефактами.

**Planning session** (один агент) — два артефакта:
- `Implementation Foundation` — technical scaffold: file structure, dependencies, configs, environment setup.
- `TODO Plan` — фазы, стримы, микро-задачи ≤3 файлов, ожидаемые commit messages.

Planning session gated на завершение обоих Design artifacts. Foundation и TODO Plan создаются одним агентом, потому что Foundation определяет scaffold, а TODO разбивает его на micro-tasks, которые ссылаются на этот scaffold.

**Execution session** (один агент) — один «артефакт»:
- `Implementation` — реальный код в репозитории.

Execution session gated на завершение обоих Planning artifacts. Execution agent обязан обновлять TODO Plan в ходе реализации (статусы, commit hashes, реструктуризация streams).

Три сессии отражают три когнитивных режима: design (архитектурное мышление), planning (декомпозиция на шаги), execution (код + коммиты). У каждой фазы свой context window profile. Объединение планирования и исполнения в одного агента расточительно — контекст на planning-thinking мешает execution-thinking.

**Соответствует §6.12, §6.13 sidebar-документа:** 3 session tabs, 5 artifact tabs с phase separators.

### 4.5. Standalone modules проходят тот же три-сессионный path

Если модуль принадлежит `Product Part`, но не входит ни в один cluster, он не должен считаться "вне branch workflow".

Для него используется тот же три-сессионный `Module` lifecycle:

- Design: `Module Specification` + `Module Facade Contract`.
- Planning: `Implementation Foundation` + `TODO Plan`.
- Execution: `Implementation`.

Единственная разница:

- его artifact path живёт под `standalone-modules/`, а не под `clusters/<cluster-id>/modules/`.

### 4.6. TODO Plan — living artifact

TODO Plan co-owned двумя сессиями внутри одного module:

- **Planning session** создаёт начальную структуру (фазы, стримы, подзадачи, ожидаемые commit messages).
- **Execution session** **обязана** обновлять тот же файл в ходе реализации: менять статусы (`TODO` → `IN_PROGRESS` → `DONE` / `BLOCKED`), заполнять git commit hashes, реструктурировать streams, когда подзадача вырастает за 3 файла.

Это формализует convention, уже работающую для `doc/TODO/todo-plan.md` внутри CodeAI Hub. TODO Plan — это и план, и dashboard исполнения одновременно.

### 4.7. Implementation Foundation wave-based, не product-wide

Не требуется полностью расписать все `Product Part` всего продукта перед началом первой materialization wave.

Допустимый порядок:

- выбрать один `Product Part`;
- довести его branch artifacts (PP Spec, cluster designs, module designs);
- при необходимости добавить релевантные shared/seam contracts;
- запустить Planning sessions для модулей этой wave.

Это сохраняет детерминированность без большого upfront freeze для всего продукта.

### 4.8. Facade contracts остаются отдельными артефактами

Несмотря на то, что design-step общий, артефактов должно быть два.

Это обязательное правило.

Спецификация отвечает на вопрос:

- что этот cluster/module собой представляет;
- какие у него обязанности;
- какая у него внутренняя структура и зависимости.

Facade contract отвечает на вопрос:

- какая у него публичная boundary;
- через какие методы, команды, события, файлы или transport seams с ним можно взаимодействовать;
- какие invariants, status/failure semantics и ограничения обязан видеть внешний мир.

---

## 5. Target Workflow

### 5.1. Placement in workflow

Целевой порядок верхнего pipeline выглядит так:

1. `Description` (trunk)
2. `Virtual Simulation` (trunk)
3. `Diagram Modules` (trunk)
4. `Product Part Specification` (branch, per part)
5. `Cluster Design` (branch, per cluster)
6. `Module Design` (branch, per module — Design session)
7. `Module Planning` (branch, per module — Planning session)
8. `Module Execution` (branch, per module — Execution session)

При этом пункты 4–8 живут уже не как новый trunk, а как дерево веток. Пункты 6–8 — три последовательных сессии одного module node, gated друг на друга.

Дополнительные wave-level contracts (seam, shared-zone, adapter) создаются по мере необходимости между пунктами 5 и 6, если wave пересекает несколько boundary.

### 5.2. Development Tree shape

```text
Diagram Modules
 └─ Product Part Specification (1 session: Design)
     ├─ Cluster Design (1 session: Design)
     │   ├─ Cluster Specification
     │   ├─ Cluster Facade Contract
     │   └─ Module (3 sessions: Design / Planning / Execution)
     │       ├─ Module Specification        ─┐
     │       ├─ Module Facade Contract      ─┘ Design session
     │       ├─ Implementation Foundation   ─┐
     │       ├─ TODO Plan                   ─┘ Planning session
     │       └─ Implementation               ─ Execution session
     └─ Standalone Module (3 sessions: Design / Planning / Execution)
         ├─ Module Specification
         ├─ Module Facade Contract
         ├─ Implementation Foundation
         ├─ TODO Plan
         └─ Implementation
```

### 5.3. Meaning of each branch layer

`Product Part Specification`:

- фиксирует branch root для конкретной части продукта;
- не спускается сразу в низкоуровневые методы и файлы;
- определяет, какие clusters и standalone modules вообще существуют внутри этой части;
- определяет, какая implementation wave будет первой.

`Cluster Design`:

- фиксирует ответственность cluster;
- фиксирует состав его модулей;
- фиксирует внешний facade contract этого cluster.

`Module Design` (Design session):

- фиксирует ответственность конкретного модуля;
- фиксирует collaborators, dependencies и ограничения;
- фиксирует внешний facade contract этого модуля.

`Module Planning` (Planning session):

- создаёт technical scaffold (Implementation Foundation): file structure, dependencies, configs;
- создаёт TODO Plan: фазы, стримы, микро-задачи ≤3 файлов.

`Module Execution` (Execution session):

- реализует код по TODO Plan;
- обновляет TODO Plan (статусы, commit hashes);
- производит единственный «артефакт» — рабочий код в репозитории.

---

## 6. Canonical Artifact Surface

### 6.1. Root path

Branch-level artifacts должны жить под:

`.codeai-hub/<workspaceSlug>/development_tree/`

Это отделяет их:

- от trunk artifacts;
- от implementation materialization;
- от runtime continuity artifacts.

### 6.2. Product Part artifacts

Для каждого `Product Part`:

`.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/product-part-specification.md`

### 6.3. Cluster artifacts

Для каждого `Cluster` внутри `Product Part`:

- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/cluster-specification.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/cluster-facade-contract.md`

### 6.4. Module artifacts inside a cluster

Для каждого `Module` внутри `Cluster`:

- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-specification.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-facade-contract.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/implementation-foundation.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/todo-plan.md`

Implementation (код) живёт в основном source tree проекта, не под `.codeai-hub/`. Его scope определяется Implementation Foundation.

### 6.5. Standalone module artifacts

Для standalone modules внутри `Product Part`:

- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/standalone-modules/<module-id>/module-specification.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/standalone-modules/<module-id>/module-facade-contract.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/standalone-modules/<module-id>/implementation-foundation.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/standalone-modules/<module-id>/todo-plan.md`

### 6.6. Wave contract artifacts

Дополнительные контракты выбранной wave должны жить под:

`.codeai-hub/<workspaceSlug>/development_tree/contracts/<wave-id>/`

Это могут быть:

- seam contracts;
- shared-zone contracts;
- adapter contracts;
- transport/file contracts для конкретной wave.

Важно:

- эти контракты не заменяют branch specs;
- они дополняют их там, где wave реально пересекает несколько boundary.

---

## 7. Required Document Shape

### 7.1. `Product Part Specification`

Документ должен содержать как минимум:

1. `Identity`
   - `part-id`
   - title
   - short purpose
2. `Role in Diagram Modules Structure`
   - место части внутри принятой ownership diagram
   - relation to upstream `product-parts.index.md` and selected part artifact
3. `Owned Branch Structure`
   - список cluster-ов
   - список standalone modules
4. `Responsibilities`
   - что эта часть продукта обязана делать
   - что остаётся вне её scope
5. `Dependency Boundaries`
   - allowed upstream/downstream dependencies
6. `Implementation Waves`
   - recommended wave ordering
   - first wave candidate
7. `Open Decisions`

### 7.2. `Cluster Specification`

Документ должен содержать как минимум:

1. `Identity`
2. `Purpose`
3. `Role inside Product Part`
4. `Constituent Modules`
5. `Responsibilities`
6. `Internal Coordination`
7. `Dependencies and Seams`
8. `Non-Goals`
9. `Open Decisions`

### 7.3. `Cluster Facade Contract`

Документ должен содержать как минимум:

1. `Facade Identity`
2. `Public Entry Points`
3. `Commands / Queries / Events / File Contracts`
4. `Visible Inputs`
5. `Visible Outputs`
6. `Allowed Consumers`
7. `Hidden Internal Structure`
8. `Failure / Status Semantics`
9. `Observability Requirements`

### 7.4. `Module Specification`

Документ должен содержать как минимум:

1. `Identity`
2. `Purpose`
3. `Responsibilities`
4. `Collaborators`
5. `Dependencies`
6. `State / Data Ownership`
7. `Constraints`
8. `Non-Goals`
9. `Open Decisions`

### 7.5. `Module Facade Contract`

Документ должен содержать как минимум:

1. `Facade Identity`
2. `Public API Surface`
3. `Inputs`
4. `Outputs`
5. `Error / Status Semantics`
6. `Allowed Consumers`
7. `Forbidden Direct Access`
8. `Invariants`
9. `Traceability / Logging Expectations`

### 7.6. `Implementation Foundation`

Документ должен содержать как минимум:

1. `Module Identity` — ссылка на Module Specification
2. `File Structure` — target directories, filenames, exports
3. `Dependencies` — external packages, internal imports
4. `Configuration` — environment, feature flags, configs
5. `Technology Profile` — language, framework, build tooling
6. `Scaffold Boundary` — что Foundation создаёт (structure) и что оставляет для Execution (logic)

### 7.7. `TODO Plan`

Должен следовать шаблону из `CLAUDE.md`:

1. `Context Pack` — ссылки на upstream artifacts
2. `Execution Rules` — gates, commit rules, build validation
3. `Phases / Streams / Subtasks` — каждая подзадача ≤3 файлов, каждая с отдельным Git Commit пунктом

### 7.8. Relation to facade process docs

Cluster/module facade contracts должны быть согласованы с process-правилами из:

- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

То есть:

- фасад остаётся единственной публичной точкой входа;
- скрытые входы в модуль не допускаются;
- внешние зависимости и взаимодействия должны быть наблюдаемыми и типизированными.

---

## 8. Gates Between Sessions

### 8.1. Design → Planning gate (per module)

Planning session можно запускать только если для данного module готовы:

1. `module-specification.md`
2. `module-facade-contract.md`

А также upstream artifacts:

3. `product-part-specification.md` для parent Product Part
4. `cluster-specification.md` + `cluster-facade-contract.md` для parent Cluster (если module не standalone)

### 8.2. Planning → Execution gate (per module)

Execution session можно запускать только если для данного module готовы:

1. `implementation-foundation.md`
2. `todo-plan.md`

### 8.3. Wave-level gate (cross-module)

Для запуска Planning sessions целой wave готовы:

1. `product-parts.index.md`
2. `product-parts/<part-id>.md` выбранного `Product Part`
3. `product-part-specification.md` выбранного `Product Part`
4. Для каждого затронутого `Cluster`:
   - `cluster-specification.md`
   - `cluster-facade-contract.md`
5. Для каждого затронутого `Module` (clustered и standalone):
   - `module-specification.md`
   - `module-facade-contract.md`
6. Все дополнительные seam/shared contracts, без которых subtree materialization пришлось бы угадывать
7. Достаточно уточнённый technology profile для этой wave

### 8.4. What is not required

Для старта одной implementation wave не требуется:

- чтобы были полностью описаны все `Product Part` продукта;
- чтобы были описаны все будущие contracts всей системы;
- чтобы были финализированы все будущие implementation waves.

### 8.5. Why these gates exist

Gates нужны, чтобы каждая следующая сессия:

- materialize-ила реальную surface, а не догадки;
- не подменяла собой предыдущую фазу;
- не проектировала фасады задним числом после появления scaffold.

---

## 9. OUTDATED Propagation

Нужно заранее зафиксировать downstream invalidation rules.

### 9.1. Upstream to branch roots

Изменение `product-parts.index.md` или `product-parts/<part-id>.md` для конкретного `Product Part`:

- делает `Product Part Specification` этого part `OUTDATED`;
- делает `Cluster Design` и `Module Design`, опирающиеся на этот part, `OUTDATED`;
- делает Planning и Execution sessions, покрывающие этот part, `OUTDATED`.

### 9.2. Product Part to cluster/module

Изменение `Product Part Specification`:

- делает `Cluster Design` этого `Product Part` `OUTDATED`;
- делает standalone `Module Design` этого `Product Part` `OUTDATED`;
- делает Planning/Execution sessions, использующие этот part, `OUTDATED`.

### 9.3. Cluster to module

Изменение `Cluster Specification` или `Cluster Facade Contract`:

- делает `Module Design` внутри этого cluster `OUTDATED`;
- делает Planning/Execution sessions, использующие этот cluster, `OUTDATED`.

### 9.4. Module Design to Planning/Execution

Изменение `Module Specification` или `Module Facade Contract`:

- делает `Planning session` (Foundation + TODO) этого module `OUTDATED`;
- делает `Execution session` этого module `OUTDATED`.

### 9.5. Module Planning to Execution

Изменение `Implementation Foundation` или `TODO Plan`:

- делает `Execution session` этого module `OUTDATED`.

---

## 10. Recommended Execution Order

Для одной выбранной ветки рекомендуется такой порядок:

1. Прочитать `product-parts.index.md`.
2. Прочитать `product-parts/<part-id>.md` выбранного `Product Part`.
3. Выбрать один `Product Part` для следующей wave.
4. Создать `Product Part Specification` (Design session).
5. Для каждого cluster в этой wave выполнить `Cluster Design` (Design session).
6. Для каждого module в cluster выполнить `Module Design` (Design session).
7. Для standalone modules выполнить `Module Design` (Design session).
8. Зафиксировать дополнительные wave-level contracts только там, где они реально нужны.
9. Для каждого module выполнить `Module Planning` (Planning session → Foundation + TODO).
10. Для каждого module выполнить `Module Execution` (Execution session → код).

Важно:

- сначала проектируется branch structure и facade boundaries (шаги 4–8);
- потом materialize-ится technical scaffold (шаг 9);
- только потом пишется код (шаг 10).

---

## 11. Verification Target

Этот planning scope считается достаточно подготовленным, если после review можно однозначно ответить на вопросы:

1. Какой первый branch artifact появляется после `Diagram Modules`?
2. Являются ли specification и facade contract разными шагами или одной design-сессией?
3. Сколько сессий и артефактов у module и каковы gates между ними?
4. Где живут standalone modules?
5. Какой exact artifact set нужен для старта Planning session? Execution session?
6. Можно ли стартовать implementation wave без полного freeze всех остальных частей продукта?
7. По каким путям и именам должны жить branch artifacts?
8. Как branch-level changes помечают downstream sessions как `OUTDATED`?
9. Является ли TODO Plan живым артефактом и кто его обновляет?

---

## 12. Expected Outcome

После реализации этого planning scope CodeAI Hub должен получить не абстрактную "веточную фазу после envelope", а детерминированный branch-level workflow:

- `Diagram Modules` завершает trunk и даёт approved ownership baseline для branch entry;
- `Product Part Specification` открывает конкретную ветку части продукта (1 Design session, 1 artifact);
- `Cluster Design` создаёт пару `specification + facade contract` (1 Design session, 2 artifacts);
- `Module Design` создаёт пару `specification + facade contract` (1 Design session, 2 artifacts);
- `Module Planning` создаёт `Implementation Foundation` + `TODO Plan` (1 Planning session, 2 artifacts);
- `Module Execution` реализует код по плану, обновляя TODO Plan (1 Execution session, 1 artifact);
- standalone modules проходят тот же три-сессионный путь без искусственного cluster layer;
- каждая следующая module session gated на завершение артефактов предыдущей;
- filesystem scaffold, environments и toolchains materialize-ятся только после завершения design-слоя, а не раньше.

Итоговый принцип:

- trunk отвечает за понимание продукта и ownership structure;
- branch Design sessions отвечают за проектирование конкретных частей и их публичных границ;
- branch Planning sessions отвечают за technical scaffold и декомпозицию на micro-tasks;
- branch Execution sessions отвечают за materialization кода строго по утверждённому плану.
