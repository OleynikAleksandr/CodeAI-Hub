# Development Tree — Project/Application Contract Orchestrator Planning

**Status:** Planning / design intake, not implemented SSOT  
**Owner:** Oleksandr + Codex  
**Created:** 2026-05-21  
**Scope:** добавить верхний контрактный слой Development Tree после `Diagram Modules` и до Product Part / Cluster / Module specification work.

## 1. Проблема

Текущий Development Tree уже имеет понятную иерархию:

```text
Product Part
  Cluster
    Module
```

Но этой структуры недостаточно для управляемой разработки. Она отвечает на вопрос "из каких частей состоит приложение", но еще не отвечает на вопрос "как части взаимодействуют друг с другом".

После `Diagram Modules` Core уже знает состав Product Parts, Clusters, Modules и standalone Modules. Но между этим structural artifact и нижними шагами `Product Part / Cluster / Module` не хватает самого ответственного слоя:

```text
Project / Application Orchestrator
```

Этот слой должен видеть всю структуру приложения и сформировать contract graph: входы, выходы, связи, payload names, ownership и зависимости между Product Parts, Clusters, Modules и standalone Modules.

Без такого слоя нижние агенты будут проектировать контракты локально:
- Product Part agent не увидит всю application-level картину;
- Cluster agent не сможет корректно построить внешний контракт кластера без upstream contract map;
- Module agent будет вынужден изобретать внешний API самостоятельно;
- параллельное выполнение станет рискованным из-за конфликтов ownership, hidden dependencies и поздних merge-проблем.

## 2. Принятое направление

Нужен новый root-level шаг Development Tree:

```text
Project / Application Orchestration
```

Он запускается после принятого `Diagram Modules` и до детальных Product Part / Cluster / Module specifications.

Этот шаг выполняет AI agent, а не обычный скрипт. Скрипты могут валидировать результат, но не могут спроектировать смысловую контрактную карту приложения.

### Почему это должен быть AI agent

Project/Application Orchestrator должен:
- интерпретировать назначение Product Parts и Clusters;
- выявлять межчастевые зависимости;
- формулировать входы/выходы и payload names;
- находить неочевидные shared services, state, commands, events, artifacts;
- задавать пользователю уточняющие вопросы;
- предлагать trade-offs для границ и facade contracts.

Это архитектурная reasoning-задача. Скрипт может только проверить, что:
- graph schema валидна;
- node ids существуют;
- у input есть source или явно указан external source;
- нет запрещенных boundary crossings;
- нет циклов там, где они запрещены;
- downstream artifacts имеют revision links;
- orphaned / outdated nodes подсвечены.

## 3. Роли оркестраторов

### Project / Application Orchestrator

Владеет application-level contract map.

Он видит:
- все Product Parts;
- все Clusters внутри них;
- standalone Modules;
- cross-product-part dependencies;
- application-level inputs/outputs;
- shared services/state/events/artifacts;
- предварительные execution waves.

Он не должен писать module micro-tasks и не должен полностью проектировать internals каждого модуля. Его результат — верхняя контрактная карта и preliminary contracts для Product Parts / Clusters.

### Product Part Orchestrator

Владеет контрактной картой одного Product Part.

Он получает сверху application-level constraints и уточняет:
- какие Clusters входят в Product Part;
- какие external inputs Product Part принимает;
- какие outputs Product Part обязан предоставить;
- какие Cluster boundaries нужны внутри Product Part;
- какие cluster-level dependencies могут идти параллельно или только последовательно.

Product Part agents не должны "договариваться" между собой напрямую. Если возникает cross-product-part dependency, он поднимается в Project/Application Orchestrator и фиксируется в Core-owned graph.

### Cluster Orchestrator

Владеет Cluster facade contract и module facade contracts внутри кластера.

Он получает сверху внешний контракт кластера и раскладывает его на:
- module boundaries;
- module facade inputs/outputs;
- допустимые internal dependencies;
- forbidden direct coupling;
- integration contract внутри кластера.

Cluster level является главным местом, где contracts превращаются в реалистичные module API.

### Module Agent

Владеет module internal specification и implementation plan.

Он получает внешний module facade contract сверху. Он может:
- проверить реализуемость;
- задать вопросы пользователю по внутренней логике;
- предложить contract change request наверх;
- спроектировать internal classes, data models, edge cases;
- создать module todo-plan с micro-tasks.

Module Agent не должен сам изобретать свой внешний контракт.

## 4. Contract Cascade

Порядок работы должен быть гибридным:

```text
1. Top-down contract framing
2. Local refinement
3. Bottom-up feasibility review
4. Bubble-up conflict resolution
5. Contract graph freeze
6. Module specifications
7. Module todo-plans
8. Execution / implementation
9. Cluster integration
10. Product Part integration
11. Application integration
```

### Top-down отвечает за контракты

Top-down движение касается не реализации, а contract boundaries:
- facade classes;
- inputs;
- outputs;
- payload names;
- events;
- commands;
- state/artifact ownership;
- allowed dependencies;
- forbidden dependencies.

### Bottom-up отвечает за реализуемость

Нижние агенты не владеют внешней truth, но могут возвращать наверх:
- missing input;
- impossible dependency;
- unclear payload;
- wrong ownership;
- required state/event;
- performance/security risk;
- suggested contract correction.

## 5. Новый upstream artifact: Contract Graph

Contract Graph должен быть структурированным Core-owned artifact, а не только картинкой.

Минимальный storage proposal:

```text
.codeai-hub/<workspace>/development_tree/project-orchestration/contract-graph.json
.codeai-hub/<workspace>/development_tree/project-orchestration/contract-graph.md
doc/TODO/stages/development-tree/project-orchestration/contract-graph.md
doc/TODO/stages/development-tree/product-parts/<part>/product-part-contract-map.md
doc/TODO/stages/development-tree/product-parts/<part>/clusters/<cluster>/cluster-contract.md
doc/TODO/stages/development-tree/product-parts/<part>/clusters/<cluster>/modules/<module>/module-contract.md
```

`contract-graph.json` является machine-readable truth. Markdown artifacts являются reviewable user-facing projections.

### Graph node types

```text
application
product_part
cluster
module
standalone_module
external_system
shared_service
artifact_store
```

### Contract edge types

```text
command
event
query
state
artifact
configuration
runtime_signal
```

### Минимальная contract edge schema

```json
{
  "id": "contract.session.open-requested",
  "sourceNodeId": "cluster.session-workspace-ui",
  "sourcePort": "session.openRequested",
  "targetNodeId": "module.dialog-runtime",
  "targetPort": "dialog.openSession",
  "kind": "command",
  "payloadName": "OpenSessionRequest",
  "ownerNodeId": "cluster.session-workspace-ui",
  "status": "draft",
  "revision": "r1",
  "dependsOn": [],
  "questions": []
}
```

### Port naming

Порты должны иметь user-readable и code-oriented names:

```text
session.openRequested
workspace.selected
dialog.openSession
artifact.contractGraphUpdated
workflow.nodeOutdated
```

Имена портов не должны быть случайными фразами. Они должны стать будущей основой для facade method/event naming.

## 6. UX: Contract Graph View

Project Manager должен показывать Contract Graph как отдельную projection surface:

```text
Project/Application Orchestration
  Contract Graph
```

Это не тот же экран, что `Diagram Modules`, но UX должен быть похож:
- пользователь видит граф вместо стены текста;
- узлы можно раскрывать по уровням;
- связи подписаны именами ports/payloads;
- клик по связи открывает inspector;
- клик по узлу показывает его inputs/outputs/contracts/questions.

### Visual model

```text
[Project Manager]
  output: workspace.selected
        ───────────────▶ input: session.workspaceContext [Session Workspace UI]

[Session Workspace UI]
  output: session.openRequested
        ───────────────▶ input: dialog.openSession [Dialog Runtime]
```

### Required UI layers

1. **Application overview graph**
   Показывает Product Parts, standalone Modules, shared services и cross-part contracts.

2. **Product Part drill-down**
   Показывает Clusters внутри Product Part и связи между ними.

3. **Cluster drill-down**
   Показывает Modules внутри Cluster и module facade contracts.

4. **Contract inspector**
   Показывает source, target, ports, payload name, kind, owner, status, questions, impacted downstream artifacts.

5. **Validation overlay**
   Подсвечивает missing inputs, orphan outputs, cycles, forbidden boundary crossings, duplicate payload names и contracts that bypass facade boundaries.

Project Manager остается projection-only. Он не должен владеть parser/validator truth. Он получает Core-owned graph snapshot и отправляет raw user intents: accept, edit request, ask agent, approve conflict resolution, rerun impact analysis.

## 7. Core-owned lifecycle

Contract Graph должен стать вторым upstream artifact после `Diagram Modules`.

```text
Diagram Modules controls structure.
Contract Graph controls interfaces.
Module Specifications control internals.
Todo Plans control execution.
```

### Acceptance flow

```text
Diagram Modules accepted
  -> Core materializes Development Tree folders
  -> Project/Application Orchestrator starts
  -> Agent produces Contract Graph draft
  -> Core validates graph
  -> PM renders graph and review surface
  -> User accepts or requests revisions
  -> Core freezes accepted graph revision
  -> Core materializes downstream contract artifacts
  -> Product Part / Cluster / Module specification steps unlock
```

### Edit / revision flow

Если пользователь меняет Contract Graph:

```text
Contract Graph edited
  -> Core validates changed graph
  -> Core computes impacted nodes
  -> affected Product Part contracts become OUTDATED
  -> affected Cluster contracts become OUTDATED
  -> affected Module facade contracts become OUTDATED
  -> affected Module specifications and todo-plans become OUTDATED or require review
  -> PM graph and sidebar update from Core snapshot
```

Core должен уметь спросить пользователя, что делать с уже наполненными downstream artifacts:
- archive;
- keep detached;
- regenerate;
- mark outdated only;
- delete only if empty/safe.

Это аналогично текущему behavior вокруг Development Tree materialization/orphans after Diagram Modules structure changes.

## 8. Что меняется в Development Tree

Текущая структура:

```text
Development Tree
  Product Parts
    Product Part
      Clusters
        Cluster
          Modules
            Module
              Module / Facade Specification
              Implementation
              Workers
              Integration
```

Предлагаемая структура:

```text
Development Tree
  Project / Application Orchestration
    Contract Graph
    Cross-Part Dependencies
    Shared Interfaces
    Execution Waves
  Product Parts
    <product-part>
      Product Part Orchestration
      Product Part Contract Map
      Clusters
        <cluster>
          Cluster Orchestration
          Cluster Facade Contract
          Module Contract Map
          Modules
            <module>
              Module / Facade Specification
              Implementation
              Workers
              Integration
```

Важный нюанс: `Module / Facade Specification` остается ниже, но стартует только после verified/frozen upstream contract graph.

## 9. Зачем нужны нижние контракты, если есть Project Orchestrator

Project/Application Orchestrator не должен проектировать все module contracts до конца. Он владеет application-level contract map и preliminary boundaries.

Нижние уровни нужны потому что:
- Product Part знает локальную область глубже;
- Cluster лучше понимает свои module boundaries;
- Module лучше проверяет реализуемость;
- полный module contract без Cluster refinement будет слишком coarse или ошибочным;
- один root-agent, который полностью расписывает все module APIs, станет слишком большим и начнет ошибаться.

Правильная модель:

```text
Project Orchestrator owns application contract map.
Product Part Orchestrator owns product-part internal contract map.
Cluster Orchestrator owns cluster facade contract and module facade contracts.
Module Agent owns module internal specification and implementation plan.
```

## 10. Validation rules

Core/shared contract validator должен проверять:

- every graph node references a known Development Tree node or explicit external node;
- every required input has source or explicit unresolved question;
- every output has consumer or explicit exported/public status;
- cross-product-part edge is owned at Project/Application level;
- cross-cluster edge is visible at Product Part or Project/Application level;
- module-to-module dependency across clusters is forbidden unless routed through cluster facade;
- duplicate payload names are either shared intentionally or rejected;
- cycles are classified as allowed runtime feedback loop or blocking architecture cycle;
- accepted graph revision is immutable;
- downstream artifacts record source graph revision;
- edits compute impacted downstream nodes deterministically.

## 11. Execution planning impact

После Contract Graph freeze можно строить execution waves:

```text
wave 1: contracts/specs with no upstream dependencies
wave 2: dependent specs after wave 1 verification
wave 3: implementation foundations
wave 4: module todo-plans
wave 5: module implementation
wave 6: cluster integration
wave 7: product part integration
wave 8: application integration
```

Параллельность допускается только там, где graph показывает:
- disjoint owned paths;
- no unresolved contract dependency;
- no shared facade mutation;
- no shared artifact writer;
- compatible integration wave.

## 12. Open questions

1. Должен ли Project/Application Orchestrator запускаться сразу после `Diagram Modules`, или после `Application Skeleton`, когда известны production code paths?
   - Предварительное решение: сразу после `Diagram Modules` для logical contract graph, затем Application Skeleton добавляет code path mapping.

2. Должен ли Contract Graph иметь отдельный acceptance gate до Application Skeleton?
   - Предварительное решение: да, иначе skeleton может быть построен под непроверенные boundaries.

3. Нужно ли показывать Contract Graph в sidebar как root node рядом с Product Parts?
   - Предварительное решение: да, как первый Development Tree root operation.

4. Должен ли пользователь редактировать graph вручную, или только через agent revisions?
   - Предварительное решение: сначала review/revision через agent; прямое graph editing можно отложить до второго scope.

5. Где хранить structured graph: только `.codeai-hub/...`, или зеркалить в `doc/TODO/stages/development-tree/...`?
   - Предварительное решение: оба места, как для текущего Development Tree artifact workspace.

## 13. Recommended implementation phases

### Phase A — Planning and contracts

- Утвердить этот planning document.
- Создать canonical artifact contract для Contract Graph JSON/Markdown.
- Обновить WorkflowSteps/System/Project Manager/Core Orchestrator SSOT.

### Phase B — Core graph model

- Добавить Core-owned contract graph types/parser/validator.
- Связать graph nodes с Development Tree snapshot node ids.
- Добавить revision/hash и impacted-node model.

### Phase C — Project/Application Orchestrator managed step

- Добавить root Development Tree operation `Project / Application Orchestration`.
- Создать first prompt для Project/Application Orchestrator.
- Встроить acceptance/revision lifecycle через Managed Workflow Orchestration.

### Phase D — Materialization and OUTDATED propagation

- Materialize graph artifacts into `.codeai-hub/...` and `doc/TODO/stages/...`.
- Создавать product-part/cluster/module contract artifact placeholders.
- При graph edits помечать downstream contracts/specs/todo-plans как `OUTDATED`.

### Phase E — PM graph projection

- Добавить Contract Graph view.
- Добавить graph inspector.
- Добавить validation overlay.
- Sidebar должен показывать Project/Application Orchestration как первый Development Tree node.

### Phase F — Execution graph integration

- Использовать accepted Contract Graph для parallel/serial execution waves.
- Запретить module todo-plan generation до verified upstream contract graph.
- Добавить conflict/ownership checks before parallel agent launch.

## 14. Acceptance criteria for this planning scope

Planning document считается принятым, если пользователь согласовал:
- нужен ли root Project/Application Orchestrator;
- является ли Contract Graph отдельным accepted upstream artifact;
- верна ли роль Product Part / Cluster / Module agents;
- верен ли top-down contracts + bottom-up feasibility порядок;
- нужно ли показывать Contract Graph как graph view в Project Manager;
- нужно ли Core-owned impact propagation после edits.
