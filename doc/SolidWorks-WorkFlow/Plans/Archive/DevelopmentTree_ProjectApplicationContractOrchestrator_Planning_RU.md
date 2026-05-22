# Development Tree — Lead Product Part Contract Orchestrator Planning

**Status:** Planning / design intake, not implemented SSOT  
**Owner:** Oleksandr + Codex  
**Created:** 2026-05-21  
**Revised:** 2026-05-21  
**Scope:** добавить контрактный слой Development Tree после `Diagram Modules`, где `Diagram Modules` определяет lead Product Part, задает порядок Product Parts по лидерству, а lead Product Part agent строит application-wide Contract Graph.

## 1. Проблема

Текущий Development Tree уже имеет понятную иерархию:

```text
Product Part
  Cluster
    Module
```

Эта структура отвечает на вопрос "из каких частей состоит приложение", но еще не отвечает на вопрос "как части взаимодействуют друг с другом".

Нужно добавить слой контрактов:
- входы;
- выходы;
- payload names;
- facade boundaries;
- dependencies;
- allowed / forbidden coupling;
- execution waves;
- downstream OUTDATED propagation.

Первоначальная идея отдельного `Project / Application Orchestrator` была пересмотрена. В системе, где уже есть естественный главный Product Part, отдельный верхний agent становится лишним звеном.

## 2. Новое принятое направление

`Diagram Modules` уже строит всю topological structure приложения. Поэтому именно `Diagram Modules` должен дополнительно определить:

```text
leadProductPartId
productPartLeadershipOrder
```

`productPartLeadershipOrder` не является декоративным порядком отображения. Это порядок лидерства и contract orchestration priority: lead Product Part стоит первым, затем идут participant Product Parts в порядке зависимости от lead boundary, ответственности за внешние входы/выходы и влияния на downstream contracts.

После принятия `Diagram Modules` Core материализует Development Tree так, чтобы Product Parts были расположены в этом порядке, а lead Product Part был первым root-node для контрактной работы.

Дальше application-wide Contract Graph строит не отдельный Project/Application agent, а:

```text
Lead Product Part Orchestrator
```

Для CodeAI Hub lead Product Part, как правило, `Core`, потому что Core:
- владеет workflow truth;
- владеет managed lifecycle;
- принимает команды от Project Manager;
- вызывает provider modules;
- материализует artifacts;
- управляет Git/Plan Orchestrator boundaries;
- решает OUTDATED propagation;
- является центром contracts для UI, providers, workspace, sessions, artifacts и runtime state.

В другом приложении lead Product Part может быть другим: `Domain Engine`, `Simulation Kernel`, `Backend API`, `Game Runtime`, `CRM Core` и т.п.

## 3. Почему отдельный Project/Application Orchestrator не нужен

Отдельный Project/Application agent дублировал бы работу, которую можно выполнить естественнее:

```text
Diagram Modules
  -> знает всю структуру
  -> определяет lead Product Part

Lead Product Part Orchestrator
  -> знает свой central responsibility
  -> строит application-wide contract graph вокруг lead boundary
```

Это уменьшает количество абстрактных шагов и делает контрактную работу конкретной сразу.

Если в приложении один Product Part:

```text
Diagram Modules -> marks single Product Part as lead
Lead Product Part -> owns full Contract Graph
```

Если Product Parts несколько:

```text
Diagram Modules -> selects lead Product Part
Lead Product Part -> drafts contracts for participants
Participant Product Parts / Clusters -> review assigned contracts
Lead Product Part -> reconciles and freezes graph after user acceptance
```

## 4. Role model

### Diagram Modules

`Diagram Modules` остается structural authority.

Дополнительные обязанности:
- определить `leadProductPartId`;
- сформировать `productPartLeadershipOrder`, где первый элемент обязан совпадать с `leadProductPartId`;
- расположить Product Parts в accepted Diagram Modules artifact именно в порядке лидерства;
- явно пометить participant Product Parts;
- явно пометить standalone Modules;
- materialize Development Tree с Product Parts в порядке `productPartLeadershipOrder`;
- передать lead selection и leadership order в Core-owned Development Tree snapshot;
- при изменении структуры или порядка пересчитать lead/participants и downstream impact.

`Diagram Modules` не проектирует все contracts. Он только выбирает, кто должен владеть contract orchestration.

### Lead Product Part Orchestrator

Владеет application-wide Contract Graph.

Он получает:
- accepted Diagram Modules structure;
- lead Product Part artifact;
- participant Product Part artifacts;
- Cluster/Module topology;
- user context from upstream workflow artifacts.

Он создает:
- application-level Contract Graph;
- lead Product Part contract map;
- requested contracts for participant Product Parts;
- cross-part dependencies;
- shared interfaces;
- preliminary execution waves.

Lead Product Part Orchestrator не должен писать module micro-tasks. Его работа заканчивается на verified/frozen contract graph and downstream contract artifact materialization.

### Participant Product Part Orchestrator

Не "договаривается" с другими Product Parts напрямую.

Он получает assigned contracts от lead graph:
- expected inputs;
- expected outputs;
- payload names;
- external responsibilities;
- constraints;
- questions.

Он может:
- подтвердить contract;
- указать missing input/output;
- предложить correction;
- поднять conflict обратно к Lead Product Part Orchestrator.

### Cluster Orchestrator

Получает внешний contract своего Cluster сверху и уточняет:
- Cluster facade contract;
- module boundaries;
- module facade inputs/outputs;
- allowed internal dependencies;
- forbidden bypasses around facade;
- integration responsibilities.

Cluster level остается главным местом, где high-level contracts превращаются в реалистичные module facade contracts.

### Module Agent

Получает module facade contract сверху.

Он владеет:
- internal module specification;
- classes/data models;
- edge cases;
- implementation todo-plan;
- micro-tasks.

Он не владеет внешним module contract. Он может только вернуть feasibility issue или change request наверх.

## 5. Contract cascade

Новый порядок:

```text
1. Diagram Modules accepts topology, leadProductPartId and productPartLeadershipOrder
2. Lead Product Part Orchestrator drafts application-wide Contract Graph
3. Participant Product Parts review assigned contracts
4. Cluster Orchestrators refine Cluster and Module contracts
5. Module Agents perform feasibility review
6. Lead Product Part Orchestrator reconciles conflicts
7. Core validates graph
8. User reviews graph visually and accepts/revises
9. Core freezes accepted graph revision
10. Core materializes downstream contract artifacts
11. Module specifications unlock
12. Module todo-plans unlock
13. Execution waves start
```

### Top-down отвечает за contracts

Top-down движение касается:
- facade classes;
- inputs;
- outputs;
- payload names;
- events;
- commands;
- state/artifact ownership;
- allowed dependencies;
- forbidden dependencies.

### Bottom-up отвечает за feasibility

Нижние agents возвращают:
- missing input;
- impossible dependency;
- unclear payload;
- wrong ownership;
- required state/event;
- performance/security risk;
- suggested contract correction.

## 6. New upstream artifact: Contract Graph

Contract Graph остается Core-owned structured artifact, но его logical owner — lead Product Part.

Минимальный storage proposal:

```text
.codeai-hub/<workspace>/development_tree/lead-product-part/<lead-part-id>/contract-graph.json
.codeai-hub/<workspace>/development_tree/lead-product-part/<lead-part-id>/contract-graph.md
doc/TODO/stages/development-tree/lead-product-part/<lead-part-id>/contract-graph.md
doc/TODO/stages/development-tree/product-parts/<part>/product-part-contract-map.md
doc/TODO/stages/development-tree/product-parts/<part>/clusters/<cluster>/cluster-contract.md
doc/TODO/stages/development-tree/product-parts/<part>/clusters/<cluster>/modules/<module>/module-contract.md
```

`contract-graph.json` является machine-readable truth. Markdown artifacts являются reviewable projections.

### Graph node types

```text
application
lead_product_part
participant_product_part
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

### Minimal contract edge schema

```json
{
  "id": "contract.session.open-requested",
  "sourceNodeId": "cluster.session-workspace-ui",
  "sourcePort": "session.openRequested",
  "targetNodeId": "module.dialog-runtime",
  "targetPort": "dialog.openSession",
  "kind": "command",
  "payloadName": "OpenSessionRequest",
  "ownerNodeId": "product-part.core",
  "leadProductPartId": "product-part.core",
  "status": "draft",
  "revision": "r1",
  "dependsOn": [],
  "questions": []
}
```

### Port naming

Порты должны стать будущей основой для facade method/event naming:

```text
session.openRequested
workspace.selected
dialog.openSession
artifact.contractGraphUpdated
workflow.nodeOutdated
```

## 7. UX: Contract Graph View

Project Manager должен показывать Contract Graph как отдельную projection surface внутри lead Product Part:

```text
Development Tree
  <Lead Product Part>
    Lead Product Part Orchestration
      Contract Graph
      Cross-Part Contracts
      Shared Interfaces
      Execution Waves
```

Это не тот же экран, что `Diagram Modules`, но UX должен быть похож:
- пользователь видит graph вместо стены текста;
- узлы раскрываются по уровням;
- связи подписаны ports/payloads;
- клик по связи открывает inspector;
- клик по узлу показывает inputs/outputs/contracts/questions;
- validation overlay подсвечивает проблемы.

### Visual model

```text
[Core Runtime]
  output: workflow.stageAccepted
        ───────────────▶ input: sidebar.updateWorkflowState [Project Manager]

[Core Runtime]
  output: provider.turnRequested
        ───────────────▶ input: runTurn [Provider Module]
```

### Contract inspector

Inspector показывает:
- source node;
- source port;
- target node;
- target port;
- payload name;
- kind;
- owner;
- lead Product Part;
- validation status;
- questions;
- impacted downstream artifacts.

Project Manager остается projection-only. Он получает Core-owned graph snapshot и отправляет raw user intents: accept, request revision, ask agent, approve conflict resolution, rerun impact analysis.

## 8. Core-owned lifecycle

Contract Graph становится вторым upstream artifact после `Diagram Modules`.

```text
Diagram Modules controls structure, lead owner and Product Part leadership order.
Contract Graph controls interfaces.
Module Specifications control internals.
Todo Plans control execution.
```

### Acceptance flow

```text
Diagram Modules accepted
  -> Core validates topology
  -> Core records leadProductPartId
  -> Core records productPartLeadershipOrder
  -> Core materializes Development Tree folders using Product Part leadership order
  -> Core locks all non-lead Development Tree agent start actions
  -> Lead Product Part Orchestrator starts
  -> Core builds provider prompt pack from accepted structured artifacts
  -> Agent produces structured Contract Graph draft
  -> Core parses and validates graph
  -> PM renders graph and review surface
  -> User accepts or requests revisions
  -> Core freezes accepted graph revision
  -> Core materializes downstream contract artifacts
  -> Core unlocks only first allowed execution wave
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

До freeze accepted Contract Graph пользователь должен видеть остальные Product Parts, Clusters и standalone Modules в дереве, но не иметь возможности стартовать их agents. Их состояние: `Waiting for Lead Product Part Contract Graph`. После acceptance Core отправляет initial prompt packs только agents первой разрешенной wave, а не всем downstream agents сразу.

## 9. Agent instruction and output enforcement model

Development Tree требует строгих рамок, потому что каждый следующий agent должен дополнять Core-owned structured state, а не оставлять следующему agent набор текстовых догадок.

Принцип:

```text
Structured Outputs are input shaping, not validation authority.
Core validators and hooks are validation authority.
```

### Enforcement layers

Каждый managed Development Tree agent должен запускаться через несколько слоев контроля:

```text
Provider system instructions
  -> Core-generated task prompt pack
  -> provider structured output / tool schema when supported
  -> Core parser
  -> Core schema validator
  -> Core semantic validator
  -> managed repair lifecycle if invalid
  -> user acceptance
  -> frozen Core-owned artifact revision
```

`System instructions` сильнее обычного task prompt и должны задавать постоянные invariant rules конкретного agent type:
- роль agent;
- границы ответственности;
- запрет менять чужие contracts;
- запрет bypass around facade;
- запрет начинать implementation до frozen upstream contract graph;
- правило: Project Manager не source of truth;
- правило: structured artifact is primary output, markdown is projection.

`Task prompt pack` должен генерироваться Core автоматически из accepted artifacts:
- Diagram Modules topology;
- `leadProductPartId`;
- `productPartLeadershipOrder`;
- accepted Contract Graph revision;
- assigned Product Part / Cluster / Module node;
- assigned contract slice;
- upstream/downstream dependencies;
- wave id and parallel group;
- artifact output targets;
- current validation diagnostics and unresolved questions.

Если конкретному workflow agent нужны актуальные внешние знания, Core не должен запускать отдельный универсальный research layer "для всех технологий". Research должен быть обязанностью того agent step, который будет принимать решение.

Пример:
- Quality Gates agent ищет современные quality tools именно для текущего приложения, языка, package manager, repo layout и release process;
- Application Skeleton agent ищет framework/runtime constraints только для выбранного skeleton;
- Module Specification agent ищет framework/library practices только для assigned module и его contract slice;
- Integration agent ищет integration/testing practices только для своей wave.

Такой поиск точнее, потому что agent уже знает:
- что именно он должен сделать;
- какой artifact он должен создать;
- какие constraints пришли сверху;
- какие validation gates должен предложить или пройти;
- какие решения пользователь должен принять.

Provider-native structured output / tool schema нужно использовать там, где provider adapter это поддерживает:
- OpenAI/Codex: structured output / JSON schema mode when available;
- Claude: tool use with input schema / forced tool use when available;
- fallback для любого provider: prompt + schema instructions + Core parser + validator + repair loop.

Structured output снижает вероятность мусорной формы ответа, но не заменяет Core. Даже schema-compatible ответ считается untrusted input, пока Core не проверит:
- ссылочную целостность node ids;
- соответствие topology;
- ownership boundaries;
- facade boundaries;
- wave dependencies;
- downstream impact;
- отсутствие forbidden dependencies;
- полноту required artifacts.

### Prompt pack generation principle

Core Orchestrator должен стремиться не писать уникальные prompt вручную для каждого приложения, а собирать prompt packs из structured accepted state.

AI нужен там, где есть semantic design:
- выбрать meaningful contracts;
- предложить payload names;
- определить feasibility concerns;
- согласовать conflicts;
- объяснить user tradeoffs.

Core должен оставаться deterministic:
- блокировать недоступные nodes;
- создавать prompt packs;
- выбирать first allowed wave;
- dispatch agents;
- парсить structured output;
- запускать validators/hooks;
- materialize artifacts;
- считать OUTDATED propagation;
- открывать следующую wave.

Core не должен разблокировать Product Part / Cluster / Module session start, если отсутствует frozen upstream graph revision, assigned contract slice или валидный wave assignment.

Если structured output недостаточен для автоматизации следующего шага, правильная реакция — усилить предыдущий step schema/validator/repair prompt/acceptance gate, а не добавлять ручную логику в Project Manager.

### Per-agent research artifact requirement

Любой workflow agent, который использует внешний поиск или provider knowledge для выбора tools, frameworks, quality gates, runtime practices или implementation rules, обязан создать отдельный Core-owned structured research artifact before recommendations are accepted.

Минимальный artifact contract:

```text
researchArtifactId
agentStepId
targetNodeId
decisionArea
technologyContext
sources[]
recommendations[]
rejectedOptions[]
userQuestions[]
freshnessDate
validationNotes
```

Каждый source должен содержать:
- title;
- url;
- source type: official docs, official repo, package registry, release notes, security advisory, standards/spec;
- retrieved date;
- reason why relevant;
- warning if not official / not primary.

Каждая recommendation должна содержать:
- what to use;
- why it fits this project/step;
- required commands or checks;
- expected artifact changes;
- risk/tradeoff;
- whether user approval is required.

Project Manager показывает этот research artifact как review surface. Пользователь может принять, отклонить, попросить альтернативы или отправить agent на уточняющий поиск. Core принимает downstream prompt/rule changes только после accepted/reviewed research artifact.

## 10. Development Tree shape

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
  <Lead Product Part> [lead]
    Lead Product Part Orchestration
      Contract Graph
      Cross-Part Contracts
      Shared Interfaces
      Execution Waves
    Clusters
      <lead cluster>
        Cluster Orchestration
        Cluster Facade Contract
        Module Contract Map
        Modules
          <module>
            Module / Facade Specification
            Implementation
            Workers
            Integration
  <Participant Product Part>
    Participant Contract Review
    Product Part Contract Map
    Clusters
      <cluster>
        Cluster Orchestration
        Cluster Facade Contract
        Module Contract Map
```

Важно: `Module / Facade Specification` остается ниже, но стартует только после verified/frozen Contract Graph.

## 11. Why lower contracts still exist

Lead Product Part Orchestrator не должен полностью проектировать все module APIs.

Нижние уровни нужны потому что:
- Product Part лучше понимает локальную responsibility;
- Cluster лучше понимает module boundaries;
- Module лучше проверяет реализуемость;
- один lead agent, который полностью расписывает все module internals, станет слишком большим и начнет ошибаться.

Правильная ownership model:

```text
Diagram Modules owns topology, leadProductPartId and productPartLeadershipOrder.
Lead Product Part Orchestrator owns application-wide Contract Graph.
Participant Product Part Orchestrators own feasibility review of assigned contracts.
Cluster Orchestrators own Cluster facade and module facade contracts.
Module Agents own internal specifications and implementation plans.
```

## 12. Validation rules

Core/shared contract validator должен проверять:

- `leadProductPartId` exists in accepted Diagram Modules topology;
- `productPartLeadershipOrder` exists in accepted Diagram Modules topology;
- `productPartLeadershipOrder` contains every Product Part exactly once;
- first item in `productPartLeadershipOrder` equals `leadProductPartId`;
- Development Tree projection/materialization preserves `productPartLeadershipOrder`;
- after Diagram Modules acceptance only the lead Product Part agent start action is unlocked;
- every participant Product Part references a known node;
- every graph node references a known Development Tree node or explicit external node;
- every required input has source or explicit unresolved question;
- every output has consumer or explicit exported/public status;
- cross-product-part edge is owned by lead Product Part graph;
- participant-owned edge has participant review status;
- cross-cluster edge is visible at Product Part or lead graph level;
- module-to-module dependency across clusters is forbidden unless routed through cluster facade;
- duplicate payload names are either shared intentionally or rejected;
- cycles are classified as allowed runtime feedback loop or blocking architecture cycle;
- accepted graph revision is immutable;
- downstream artifacts record source graph revision;
- edits compute impacted downstream nodes deterministically.
- each agent output references the expected schema version;
- structured output contains the assigned node id, source artifact revision and output targets;
- markdown projection, if present, matches the structured artifact hash/revision;
- provider output cannot unlock downstream nodes without Core parser and semantic validator success;
- failed schema/semantic validation enters managed repair lifecycle instead of being accepted by Project Manager.
- downstream agent prompt dispatch is limited to currently unlocked wave nodes.
- any agent recommendation based on external research references an accepted/reviewed research artifact;
- research artifacts contain source URLs, source type, retrieved date, relevance reason and primary/non-primary warning;
- recommendations derived from research artifacts record tradeoff, required checks and whether user approval is required.

## 13. Execution planning impact

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

## 14. Open questions

1. Как `Diagram Modules` выбирает lead Product Part и порядок Product Parts?
   - Предварительное решение: через явные поля/sections `leadProductPartId` и `productPartLeadershipOrder`, предложенные агентом и подтвержденные пользователем. Порядок: lead первым, затем participant Product Parts по contract dependency / orchestration priority.

2. Может ли пользователь поменять lead Product Part после acceptance?
   - Предварительное решение: да, но Core должен пересчитать graph ownership и пометить downstream artifacts OUTDATED.

3. Должен ли Contract Graph запускаться сразу после `Diagram Modules`, или после `Application Skeleton`?
   - Предварительное решение: сразу после `Diagram Modules` для logical contracts; Application Skeleton позже добавляет code path mapping.

4. Должен ли пользователь редактировать graph вручную?
   - Предварительное решение: сначала review/revision через agent; direct graph editing можно отложить.

5. Где хранить structured graph?
   - Предварительное решение: `.codeai-hub/...` плюс mirror under `doc/TODO/stages/development-tree/...`, как в текущей Development Tree artifact workspace модели.

6. Нужен ли отдельный глобальный Technology Research Pack step?
   - Предварительное решение: нет. Research запускается внутри конкретного workflow step, которому нужны актуальные внешние знания, и результат сохраняется как Core-owned reviewable research artifact.

## 15. Recommended implementation phases

### Phase A — Diagram Modules lead owner and leadership order contract

- Расширить Diagram Modules artifact contract: `leadProductPartId` и `productPartLeadershipOrder`.
- Обновить parser/validator/read-model.
- Materializer должен сохранять Product Part leadership order в Development Tree projection.

### Phase B — Contract Graph artifact contract

- Создать Core-owned JSON schema/types/parser/validator.
- Связать graph node ids с Development Tree snapshot node ids.
- Добавить revision/hash и impacted-node model.
- Добавить schema versioning and provider structured output/tool schema contracts.

### Phase C — Lead Product Part Orchestrator managed step

- Добавить first Development Tree operation under lead Product Part: `Lead Product Part Orchestration`.
- Создать system instructions и Core-generated first prompt pack для lead Product Part agent.
- Встроить acceptance/revision lifecycle через Managed Workflow Orchestration.

### Phase D — Participant review and reconciliation

- Participant Product Parts / Clusters получают assigned contract review tasks.
- Lead Product Part Orchestrator reconciles accepted/rejected/corrected contracts.
- Core валидирует graph перед user acceptance.

### Phase E — Materialization and OUTDATED propagation

- Materialize graph artifacts into `.codeai-hub/...` and `doc/TODO/stages/...`.
- Создавать product-part/cluster/module contract artifact placeholders.
- При graph edits помечать downstream contracts/specs/todo-plans as `OUTDATED`.

### Phase F — PM graph projection

- Добавить Contract Graph view under lead Product Part.
- Добавить graph inspector.
- Добавить validation overlay.
- Sidebar сохраняет Product Part leadership order and marks participant review nodes.

### Phase G — Execution graph integration

- Использовать accepted Contract Graph для parallel/serial execution waves.
- Запретить module todo-plan generation до verified upstream graph.
- Заблокировать старт Product Part / Cluster / Module agents до assigned contract slice and wave unlock.
- Добавить conflict/ownership checks before parallel agent launch.
- Генерировать downstream agent prompt packs только из frozen structured artifacts.

### Phase H — Per-agent research artifact lifecycle

- Добавить Core-owned research artifact schema for workflow agents.
- Quality Gates и другие knowledge-dependent agents должны создавать focused research artifacts before recommending tools/rules.
- Project Manager должен показывать research artifacts for user review.
- Core должен связывать accepted recommendations с prompt packs, validators, gates and downstream artifacts.

## 16. Acceptance criteria for this planning scope

Planning document считается принятым, если пользователь согласовал:
- отдельный Project/Application Orchestrator как agent не нужен;
- `Diagram Modules` должен определять `leadProductPartId`;
- `Diagram Modules` должен располагать Product Parts по порядку лидерства, и этот порядок должен определять Development Tree root order;
- lead Product Part owns application-wide Contract Graph;
- participant Product Parts / Clusters review assigned contracts instead of negotiating freely;
- top-down contracts + bottom-up feasibility порядок верен;
- Contract Graph нужен как visual/reviewable Core-owned artifact;
- Core должен выполнять downstream OUTDATED propagation after graph edits;
- после `Diagram Modules` доступен только старт lead Product Part agent, остальные agents открываются только через frozen Contract Graph waves;
- provider system instructions, structured outputs/tool schemas and prompts являются enforcement layers, но validation authority остается у Core validators/hooks;
- каждый Development Tree agent должен возвращать structured artifact, достаточный для автоматизации следующего шага;
- Quality Gates и другие agents, которым нужны актуальные внешние знания, должны создавать reviewable research artifact with sources before recommendations affect Core rules/prompts/gates.
