# Development Tree Branch Workflow Architecture

**Status:** Draft for review (2026-04-07)
**Created:** 2026-04-07
**Updated:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Formalize the branch-level workflow that starts after `Foundation Envelope`: `Product Part Specification`, `Cluster Design`, `Module Design`, standalone-module path, required contracts for the selected implementation wave, and the readiness gate into `Implementation Foundation`.

---

## 1. Problem

После `Foundation Envelope` текущий trunk формально заканчивается, но дальше branch-level workflow пока зафиксирован только на очень общем уровне:

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
- какой именно artifact set считается достаточным для старта `Implementation Foundation`;
- как должны выглядеть canonical filenames и workspace paths для branch artifacts;
- как работает `OUTDATED propagation` между envelope, part, cluster, module и implementation wave.

Без этого возникают практические проблемы:

- агенту приходится импровизировать branch sequence заново;
- фасад-контракты могут появляться слишком поздно или отдельно от спецификаций, из-за чего теряется единая точка входа;
- `Implementation Foundation` рискует стартовать по “хорошему чату”, а не по утверждённым traceable artifacts;
- разные `Product Part` и волны реализации могут оформляться по разным схемам.

Следовательно, нужен отдельный planning-док, который формализует branch-level development tree между `Foundation Envelope` и `Implementation Foundation`.

---

## 2. Product Goal

После утверждения `Foundation Envelope` система должна переходить не в абстрактное “теперь делаем спецификации”, а в жёстко определённый branch-level workflow.

Шаг считается корректно спроектированным, когда одновременно выполняются следующие условия:

1. Для каждого выбранного `Product Part` существует явный `Product Part Specification`.
2. Для каждого `Cluster` используется один design-step, который materialize-ит два артефакта:
   - `Cluster Specification`;
   - `Cluster Facade Contract`.
3. Для каждого `Module` используется один design-step, который materialize-ит два артефакта:
   - `Module Specification`;
   - `Module Facade Contract`.
4. Для standalone modules существует такой же `Module Design` path без искусственного обязательного cluster layer.
5. `Implementation Foundation` стартует только после того, как выбранная implementation wave имеет полный и утверждённый набор branch artifacts.
6. Все branch artifacts имеют предсказуемые canonical paths.
7. `OUTDATED propagation` между upstream и downstream artifacts формализована заранее.

Ключевой принцип:

- один design-step может и должен создавать сразу и спецификацию, и facade contract;
- но сами артефакты при этом остаются раздельными, потому что они отвечают на разные вопросы.

---

## 3. Non-Goals

Этот planning scope не должен:

- реализовывать branch workflow в продукте прямо сейчас;
- заменять собой `Foundation Envelope`;
- заменять собой `Implementation Foundation`;
- создавать файловый scaffold, environments или toolchains;
- писать бизнес-логику модулей;
- навязывать один giant-bang sequence, в котором весь продукт обязан быть полностью расписан до старта первой implementation wave;
- сливать specification и facade contract в один markdown-файл.

---

## 4. Core Decisions

### 4.1. `Foundation Envelope` остаётся концом trunk

`Foundation Envelope` остаётся последним trunk-step.

После него начинается Development Tree.

Он не materialize-ит branch specs и не заменяет их.

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
- это уменьшает архитектурный drift между “что cluster делает” и “как с ним взаимодействуют извне”.

### 4.4. `Module Specification` и `Module Facade Contract` объединяются в один design-step

На уровне модуля действует та же логика:

- один `Module Design` step;
- одна agent session;
- два артефакта:
  - `Module Specification`;
  - `Module Facade Contract`.

Причина та же:

- спецификация модуля без сразу зафиксированной facade boundary слишком легко расползается;
- facade contract без module specification слишком легко превращается в декларацию без внутренней опоры.

### 4.5. Standalone modules проходят тот же `Module Design` path

Если модуль принадлежит `Product Part`, но не входит ни в один cluster, он не должен считаться “вне branch workflow”.

Для него используется тот же `Module Design` step:

- `Module Specification`;
- `Module Facade Contract`.

Единственная разница:

- его artifact path живёт под `standalone-modules/`, а не под `clusters/<cluster-id>/modules/`.

### 4.6. `Implementation Foundation` идёт только после approved branch artifacts выбранной wave

`Implementation Foundation` не должен получать абстрактный вход вида “мы в целом всё обсудили”.

Он должен опираться на materialized artifacts выбранной wave:

- `foundation-envelope.md`;
- `Product Part Specification`;
- все релевантные `Cluster Specification`;
- все релевантные `Cluster Facade Contract`;
- все релевантные `Module Specification`;
- все релевантные `Module Facade Contract`;
- дополнительные seam/shared contracts, если данная wave выходит за границы одной локальной ветки.

### 4.7. `Implementation Foundation` остаётся wave-based, а не product-wide by default

Не требуется полностью расписать все `Product Part` всего продукта перед началом первой materialization wave.

Допустимый порядок:

- выбрать один `Product Part`;
- довести его branch artifacts;
- при необходимости добавить релевантные shared/seam contracts;
- запустить `Implementation Foundation` только для этой wave.

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

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`
4. `Foundation Envelope`
5. `Product Part Specification`
6. `Cluster Design`
7. `Module Design`
8. `Required contracts for the selected implementation wave`
9. `Implementation Foundation`
10. `TODO Plan`
11. `Implementation`

При этом пункты 5–8 живут уже не как новый trunk, а как дерево веток.

### 5.2. Development Tree shape

```text
Foundation Envelope
 └─ Product Part Specification
     ├─ Cluster Design
     │   ├─ Cluster Specification
     │   ├─ Cluster Facade Contract
     │   └─ Module Design
     │       ├─ Module Specification
     │       └─ Module Facade Contract
     └─ Standalone Module Design
         ├─ Module Specification
         └─ Module Facade Contract
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

`Module Design`:

- фиксирует ответственность конкретного модуля;
- фиксирует collaborators, dependencies и ограничения;
- фиксирует внешний facade contract этого модуля.

`Required contracts for the selected implementation wave`:

- включает только те дополнительные контракты, которые реально нужны выбранной wave;
- обычно это cross-cluster, cross-part или shared-seam contracts;
- не должен раздуваться в “сначала опишем вообще все возможные контракты системы”.

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

### 6.5. Standalone module artifacts

Для standalone modules внутри `Product Part`:

- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/standalone-modules/<module-id>/module-specification.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/standalone-modules/<module-id>/module-facade-contract.md`

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
2. `Role in Foundation Envelope`
   - место части внутри `Application Root`
   - relation to shared zones and integration seams
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

### 7.6. Relation to facade process docs

Cluster/module facade contracts должны быть согласованы с process-правилами из:

- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

То есть:

- фасад остаётся единственной публичной точкой входа;
- скрытые входы в модуль не допускаются;
- внешние зависимости и взаимодействия должны быть наблюдаемыми и типизированными.

---

## 8. Gate Into `Implementation Foundation`

### 8.1. Minimal gate for one selected wave

`Implementation Foundation` можно запускать только если для выбранной wave готовы:

1. `foundation-envelope.md`
2. `product-part-specification.md` выбранного `Product Part`
3. Для каждого затронутого `Cluster`:
   - `cluster-specification.md`
   - `cluster-facade-contract.md`
4. Для каждого затронутого `Module`:
   - `module-specification.md`
   - `module-facade-contract.md`
5. Для каждого standalone module в scope wave:
   - `module-specification.md`
   - `module-facade-contract.md`
6. Все дополнительные seam/shared contracts, без которых subtree materialization пришлось бы угадывать
7. Достаточно уточнённый technology profile для этой wave

### 8.2. What is not required

Для старта одной implementation wave не требуется:

- чтобы были полностью описаны все `Product Part` продукта;
- чтобы были описаны все будущие contracts всей системы;
- чтобы были финализированы все будущие implementation waves.

### 8.3. Why this gate exists

Этот gate нужен, чтобы `Implementation Foundation`:

- materialize-ил реальную technical surface, а не догадки;
- не подменял собой branch design;
- не проектировал фасады задним числом после появления scaffold.

---

## 9. OUTDATED Propagation

Нужно заранее зафиксировать downstream invalidation rules.

### 9.1. Upstream to branch roots

Изменение `Foundation Envelope` для конкретного `Product Part`:

- делает `Product Part Specification` этого part `OUTDATED`;
- делает `Cluster Design` и `Module Design`, опирающиеся на этот part, `OUTDATED`;
- делает `Implementation Foundation` waves, покрывающие этот part, `OUTDATED`.

### 9.2. Product Part to cluster/module

Изменение `Product Part Specification`:

- делает `Cluster Design` этого `Product Part` `OUTDATED`;
- делает standalone `Module Design` этого `Product Part` `OUTDATED`;
- делает implementation waves, использующие этот part, `OUTDATED`.

### 9.3. Cluster to module

Изменение `Cluster Specification` или `Cluster Facade Contract`:

- делает `Module Design` внутри этого cluster `OUTDATED`;
- делает implementation waves, использующие этот cluster, `OUTDATED`.

### 9.4. Module to implementation

Изменение `Module Specification` или `Module Facade Contract`:

- делает implementation waves, использующие этот module, `OUTDATED`.

---

## 10. Recommended Execution Order

Для одной выбранной ветки рекомендуется такой порядок:

1. Прочитать `foundation-envelope.md`.
2. Выбрать один `Product Part` для следующей wave.
3. Создать `Product Part Specification`.
4. Для каждого cluster в этой wave выполнить `Cluster Design`.
5. Для каждого module в cluster выполнить `Module Design`.
6. Для standalone modules выполнить `Module Design`.
7. Зафиксировать дополнительные wave-level contracts только там, где они реально нужны.
8. Запустить `Implementation Foundation` для этой wave.

Важно:

- сначала проектируется branch structure и facade boundaries;
- только потом materialize-ится filesystem/env surface.

---

## 11. Verification Target

Этот planning scope считается достаточно подготовленным, если после review можно однозначно ответить на вопросы:

1. Какой первый branch artifact появляется после `Foundation Envelope`?
2. Являются ли specification и facade contract разными шагами или одной design-сессией?
3. Где живут standalone modules?
4. Какой exact artifact set нужен для старта `Implementation Foundation`?
5. Можно ли стартовать implementation wave без полного freeze всех остальных частей продукта?
6. По каким путям и именам должны жить branch artifacts?
7. Как branch-level changes помечают downstream wave как `OUTDATED`?

---

## 12. Expected Outcome

После реализации этого planning scope CodeAI Hub должен получить не абстрактную “веточную фазу после envelope”, а детерминированный branch-level workflow:

- `Foundation Envelope` завершает trunk и даёт application assembly baseline;
- `Product Part Specification` открывает конкретную ветку части продукта;
- `Cluster Design` создаёт пару `specification + facade contract`;
- `Module Design` создаёт пару `specification + facade contract`;
- standalone modules проходят тот же путь без искусственного cluster layer;
- `Implementation Foundation` получает точный и проверяемый набор входных branch artifacts;
- filesystem scaffold, environments и toolchains materialize-ятся только после завершения design-слоя, а не раньше.

Итоговый принцип:

- trunk отвечает за понимание продукта и application assembly;
- branch workflow отвечает за проектирование конкретных частей и их публичных границ;
- `Implementation Foundation` отвечает за materialization implementation surface только после того, как branch design уже утверждён.
