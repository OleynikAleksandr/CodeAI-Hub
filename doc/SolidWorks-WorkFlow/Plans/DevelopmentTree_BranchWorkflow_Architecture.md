# Development Tree Branch Workflow Architecture

**Status:** Reference Architecture (updated 2026-06-02). Sidebar visualization of Product Part / Cluster / Module branch structure and automatic first-draft materialization are already implemented in production. This document defines the next branch workflow model after `Quality Gates Baseline`: compact filesystem scaffolding, one module node, one module-agent session, artifact/user-review phases, interactive Implementation TODO Plan, and read-only worker sessions.
**Created:** 2026-04-07
**Updated:** 2026-06-02
**Owner:** Oleksandr + Codex
**Scope:** Формализовать Development Tree после `Diagram Modules`, `Application Skeleton` и `Quality Gates Baseline`: `Product Part Specification`, `Cluster Design`, managed module workflow, worker visibility, user review gates, and MVP boundaries for implementation execution.

**Синхронизирован с:** `Plans/Backlog/DevelopmentTree_Sidebar_Visualization_Architecture.md` (rev 3, Accepted) — sidebar/session visual baseline.

---

## 1. Problem

После `Quality Gates Baseline` пользователь ожидает не абстрактный список документов, а рабочее дерево разработки в стиле SolidWorks:

- слева видна структура продукта;
- справа видны артефакты выбранного узла;
- в сессии можно обсуждать именно тот узел, который выбран;
- реализация идёт по принятому плану, а не по импровизации агента.

Старая версия этого документа описывала `Module Design`, `Module Planning` и `Module Execution` как три отдельные module sessions. После обсуждения это признано слишком раздробленной моделью для первого рабочего варианта.

Практическая проблема такая:

- один и тот же агент должен понимать фасад, внутреннюю спецификацию и план реализации;
- пользователь должен общаться с этим верхним агентом модуля, а не с Core-оркестратором и не с worker-ами;
- worker-сессии должны быть видимыми для проверки, но не должны становиться отдельными чатами пользователя;
- `Implementation TODO Plan` может содержать десятки или сотни микрозадач, поэтому их нельзя напрямую разворачивать в левом дереве как полноценные узлы.

---

## 2. Product Goal

Development Tree должен работать так:

1. `Diagram Modules` даёт принятую ownership-структуру продукта.
2. `Application Skeleton` создаёт installable project foundation.
3. `Quality Gates Baseline` интегрирует базовые проверки.
4. После этого Development Tree разблокирует branch workflow:
   - `Product Part`;
   - `Cluster`;
   - `Module`.
5. Для каждого `Module` существует один module node и одна основная module-agent session.
6. Внутри module-agent session последовательно создаются и принимаются пользователем три главных артефакта:
   - `Facade Contract`;
   - `Module Specification`;
   - `Implementation TODO Plan`.
7. После принятия `Implementation TODO Plan` worker-ы выполняют микрозадачи, а пользователь видит ход работы через интерактивный план справа.
8. Worker-сессии доступны read-only: пользователь может открыть transcript конкретной микрозадачи, но не пишет worker-у напрямую.
9. Если пользователю не нравится результат микрозадачи, он пишет module agent-у. Module agent принимает, отклоняет или переоткрывает работу.
10. Core-оркестратор остаётся формальным механизмом: статусы, gates, формат документов, коммиты, проверки, сохранение истории. Он не является собеседником пользователя.

Ключевое решение:

> Левое дерево показывает продуктовую структуру. Правая панель показывает артефакты, интерактивный план и worker progress. Пользователь общается только с агентом выбранного product/cluster/module node.

Fresh Development Tree scaffolding follows the same rule. Core creates only real Product Part / Cluster / Module directories in `.codeai-hub/<workspaceSlug>/development_tree/materialized/...` and `doc/TODO/stages/development-tree/...`. It does not pre-create `workers/` or `integration/` operation folders; those concerns live in right-panel artifacts, managed plans, and session snapshots when the selected node workflow actually reaches them.

---

## 3. Non-Goals

Этот planning scope не должен:

- реализовывать весь branch workflow прямо сейчас;
- превращать Core-оркестратор в conversational agent;
- делать worker-сессии редактируемыми пользовательскими чатами;
- разворачивать каждую микрозадачу `Implementation TODO Plan` в левом Development Tree;
- требовать полностью автоматического исполнения implementation plan Core-ом в первой версии;
- сохранять отдельный required artifact `Implementation Foundation` как обязательную фазу модуля;
- менять уже принятые правила: Core owns workflow truth, Project Manager is projection.

---

## 4. Core Decisions

### 4.1. Trunk ends before Development Tree

Trunk workflow заканчивается на технически готовой базе:

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`
4. `Application Skeleton`
5. `Quality Gates Baseline`

Development Tree начинается только после того, как Core видит принятую структуру модулей, installable skeleton и baseline gates.

### 4.2. Product Part Specification remains the branch root

Для каждого выбранного `Product Part` нужен branch-root artifact:

- роль части продукта;
- границы ответственности;
- clusters;
- standalone modules;
- первая implementation wave;
- open decisions.

Это не facade contract. Это паспорт ветки продукта.

### 4.3. Cluster Design keeps one session and two artifacts

`Cluster` проектируется одной cluster-agent session и создаёт два артефакта:

- `Cluster Specification`;
- `Cluster Facade Contract`.

Спецификация отвечает за внутреннюю роль cluster-а. Facade contract отвечает за его публичную boundary.

### 4.4. Module uses one module-agent session

Для `Module` больше не используется модель трёх отдельных sessions (`Design` / `Planning` / `Execution`).

Правильная единица работы:

- один module node в Development Tree;
- одна основная module-agent session;
- несколько managed phases внутри этой session;
- несколько artifact tabs справа.

Module agent последовательно ведёт пользователя через:

1. `Facade Contract`;
2. `Module Specification`;
3. `Implementation TODO Plan`;
4. worker execution supervision;
5. module assembly / semantic integration.

Почему так:

- тот же агент знает внешний контракт модуля;
- тот же агент знает внутреннюю спецификацию;
- тот же агент составил implementation plan;
- поэтому он лучше всех может понять, принять ли результат worker-ов и как собрать модуль.

### 4.5. Facade Contract goes before Module Specification

Для модуля первой проектируется публичная boundary:

- какие входы есть у модуля;
- какие выходы он обещает;
- какие ошибки/статусы видит внешний мир;
- что запрещено обходить напрямую.

После этого пишется `Module Specification`: что модуль делает внутри, какие алгоритмы использует, какие данные держит и какие ограничения соблюдает.

### 4.6. Implementation TODO Plan is an interactive right-panel artifact

`Implementation TODO Plan` не должен быть только markdown-файлом.

Он должен отображаться в правой части Project Manager как интерактивная рабочая доска:

- фазы;
- stream-ы;
- микрозадачи;
- serial/parallel markers;
- статус каждой микрозадачи;
- worker/run identity;
- результат;
- changed files;
- ссылка на worker session transcript.

MVP-поведение:

- пользователь видит строки плана и статусы;
- клик по строке открывает read-only worker session в левой session area;
- поле ввода в worker session отсутствует;
- feedback по микрозадаче пользователь пишет в module-agent session.

Later controls могут добавить `pause`, `retry`, `accept`, `reject`, `comment`, но это не обязательный первый slice. Даже такие действия должны идти через Core-managed intervention, а не через прямой обход плана.

### 4.7. Workers are visible but read-only

Worker — это исполнитель микрозадачи, а не собеседник пользователя.

Пользователь может:

- открыть worker transcript;
- посмотреть prompt;
- посмотреть результат;
- посмотреть изменённые файлы;
- понять, почему задача принята или отклонена.

Пользователь не может:

- писать worker-у напрямую;
- менять worker prompt вручную;
- принимать worker result в обход module agent-а и Core rules.

Если результат не нравится, пользователь пишет в module-agent session:

> Проверь результат задачи `clock.worker.017`, я не согласен с таким поведением.

Дальше module agent решает, что делать: принять, отклонить, переоткрыть, уточнить specification или изменить implementation plan.

### 4.8. Core orchestrator is not a chat participant

Core-оркестратор:

- создаёт managed `todo-plan.md`;
- следит за фазами;
- валидирует формат документов;
- фиксирует commits;
- запускает gates;
- хранит worker/session state;
- блокирует переходы без acceptance.

Но Core не является интеллектом и не является пользователем-visible собеседником.

Пользователь общается с module agent-ом. Core остаётся script/rules layer.

### 4.9. MVP execution is module-agent supervised

Полностью автоматизировать выполнение `implementation-plan.json` Core-ом в первой версии не нужно.

MVP:

- Core держит формальный план и gates;
- module agent ведёт реализацию по плану, как Codex сейчас ведёт `doc/TODO/todo-plan.md`;
- worker-ы могут выполнять отдельные микрозадачи;
- module agent проверяет смысловой результат worker-ов;
- пользователь контролирует всё через module-agent session и interactive plan.

Позже Core может постепенно забирать больше automation: scheduling, parallel batches, retries, dependency locks. Но первая версия не должна зависеть от полной автономии Core.

### 4.10. Standalone modules use the same module workflow

Если module принадлежит `Product Part`, но не входит в cluster, он проходит тот же путь:

- один module node;
- одна module-agent session;
- `Facade Contract`;
- `Module Specification`;
- `Implementation TODO Plan`;
- worker execution visibility;
- module assembly.

Разница только в path: standalone module живёт под `product-parts/<part-id>/modules/<module-id>/`, а cluster module живёт под `product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/`.

### 4.11. Microtask completion always has a Git Commit boundary

`Implementation TODO Plan` должен использовать тот же принцип, что и основной `doc/TODO/todo-plan.md` CodeAI Hub:

- каждая implementation microtask имеет отдельную строку задачи;
- сразу после неё идёт отдельная строка `Git Commit: <message>`;
- commit boundary нельзя пропустить или объединить с другой microtask без явного перепланирования.

Этот `Git Commit` запускается через Core-managed commit lifecycle. На commit boundary срабатывают pre-commit hooks, включая Quality Gates, подготовленные на предыдущем шаге `Quality Gates Baseline`.

Следовательно, microtask считается законченной не тогда, когда worker написал "готово", а когда:

1. module agent принял смысловой результат;
2. Core применил изменения в canonical workspace;
3. Core выполнил Git Commit item;
4. pre-commit hooks / Quality Gates прошли или failure записан в план.

### 4.12. Module agent owns commit intent; workers do not commit

Worker не должен быть владельцем commit-а.

Правильное разделение:

- worker выполняет microtask и возвращает результат: patch, changed files, notes, validation output;
- module agent решает, принимать ли результат по смыслу;
- Core применяет принятый результат к canonical workspace и выполняет managed commit;
- pre-commit hooks запускают Quality Gates;
- interactive `Implementation TODO Plan` обновляет статус microtask и связанного Git Commit item.

Причина простая: worker видит только маленький кусок задачи. Module agent видит facade contract, specification, весь implementation plan и пользовательский feedback. Поэтому именно module agent должен решать, готов ли результат к commit boundary.

### 4.13. Parallel workers use isolated workspaces by default

Для MVP безопасное правило такое:

- serial microtasks могут выполняться в canonical workspace под supervision module agent-а;
- parallel writable microtasks запускаются в отдельных worker sandboxes/worktrees от одного base commit;
- worker не коммитит в общий repo;
- worker возвращает patch/result snapshot;
- module agent и Core мержат результаты обратно последовательно, через отдельный Git Commit item после каждой microtask.

Один общий workspace для нескольких workers допустим только для read-only analysis или строго serial execution. Даже если две parallel microtasks кажутся независимыми, по умолчанию лучше дать им разные sandboxes: это убирает race conditions, грязное рабочее дерево и скрытые file conflicts.

### 4.14. Lead Product Part orchestration is the first branch event

После завершения всего `Documentation Tree` (`Description`, `Virtual Simulation`, `Diagram Modules`, `Application Skeleton`, `Quality Gates Baseline`) первый реальный Development Tree workflow должен стартовать не с произвольного module node.

Правильная первая рабочая точка:

```text
doc/TODO/stages/development-tree/product-parts/<lead-part-id>/todo-plan.md
```

Этот managed plan принадлежит `Lead Product Part` agent-у. Core материализует его после того, как:

1. `Diagram Modules` принят и содержит `leadProductPartId`;
2. `Diagram Modules` содержит `productPartLeadershipOrder`;
3. первый item `productPartLeadershipOrder` совпадает с `leadProductPartId`;
4. `Application Skeleton` материализован и принят;
5. `Quality Gates Baseline` integrated and accepted.

`Diagram Modules` отвечает за выбор lead Product Part и порядок Product Parts. Этот порядок не декоративный: он задает leadership / contract orchestration priority и порядок root nodes в Development Tree.

`Lead Product Part` agent не является отдельным абстрактным `Project/Application Orchestrator`. Мы отказываемся от отдельного верхнего project-agent-а, потому что lead Product Part уже является естественным владельцем главной boundary приложения.

Lead Product Part workflow создает application-wide `Contract Graph`:

- какие Product Parts, clusters и modules обмениваются commands/events/queries/state/artifacts;
- какие facade boundaries являются публичными;
- какие dependencies разрешены;
- какие dependencies запрещены;
- какие payload names / ports / shared interfaces нужны;
- какие execution waves можно запускать serial или parallel;
- какие downstream nodes ждут assigned contract slice.

Минимальная логика:

```text
Quality Gates Baseline accepted
  -> Core materializes Development Tree branch scaffolding
  -> Core creates lead Product Part managed todo-plan.md
  -> Core unlocks only the lead Product Part agent start action
  -> non-lead Product Parts / clusters / modules stay visible but locked
  -> Lead Product Part agent drafts Contract Graph
  -> Core validates graph structure and references
  -> user reviews / revises / accepts Contract Graph
  -> Core freezes accepted graph revision
  -> Core materializes downstream contract artifacts
  -> Core unlocks only the first allowed Product Part / Cluster / Module wave
```

До frozen `Contract Graph` нельзя запускать обычные Product Part / Cluster / Module agents, потому что у них еще нет assigned contract slice. Иначе module agent начнет проектировать facade/specification в отрыве от общего приложения.

После downstream work Lead Product Part возвращается как application-level integration owner:

```text
Module implementation
  -> Cluster integration
  -> Product Part integration
  -> Lead Product Part application integration
  -> final user review
```

Implementation status as of 2026-06-02:

- Core prompt/validation layer for `Diagram Modules` already requires `leadProductPartId` and `productPartLeadershipOrder`.
- Core/PM read-model types already carry these fields.
- Sidebar projection already has a `Lead Product Part Orchestration` operation shape.
- Filesystem scaffolding already knows `lead-product-part-orchestration/contract-graph`, `cross-part-contracts`, `shared-interfaces`, and `execution-waves` directories.
- Missing implementation: Core does not yet create the lead Product Part managed `todo-plan.md` at `doc/TODO/stages/development-tree/product-parts/<lead-part-id>/todo-plan.md`.
- Missing implementation: Core does not yet bootstrap the Lead Product Part agent session as the first unlocked branch workflow after `Quality Gates Baseline`.
- Missing implementation: current Development Tree materialization path must pass `leadProductPartId` and `productPartLeadershipOrder` into the filesystem planner, not only `plannedPartIds` / `generatedPartIds`.

---

## 5. Target Workflow

### 5.1. Top-level order

1. `Description` (trunk)
2. `Virtual Simulation` (trunk)
3. `Diagram Modules` (trunk)
4. `Application Skeleton` (trunk)
5. `Quality Gates Baseline` (trunk)
6. `Lead Product Part Orchestration` / `Contract Graph` (branch root)
7. `Product Part Specification` / participant contract review (branch)
8. `Cluster Design` (branch)
9. `Module Workflow` (branch)

### 5.2. Development Tree shape

Левое дерево остаётся компактным:

```text
Development Tree
└─ engine
   └─ time-info
      ├─ Clock
      └─ Greeting
```

`Workers`, `Integration`, `Facade Contract`, `Module Specification` и `Implementation TODO Plan` не являются дочерними строками левого дерева. Они открываются справа для выбранного cluster/module node.

Основные детали живут справа:

```text
Clock right panel
├─ Facade Contract
├─ Module Specification
├─ Implementation TODO Plan
│  ├─ task rows
│  ├─ statuses
│  ├─ parallel/serial markers
│  └─ links to worker sessions
└─ Assembly / Integration Notes
```

### 5.3. Module managed phase map

Для каждого module Core создаёт managed module `todo-plan.md` со следующей логикой:

1. `Managed Input Checkpoint`
   - Core фиксирует входные артефакты и состояние repo.
2. `Module Session Bootstrap`
   - Core открывает/восстанавливает module-agent session.
3. `Facade Contract Draft`
   - module agent создаёт markdown + json.
4. `Facade Contract User Review`
   - пользователь принимает или продолжает обсуждение.
5. `Module Specification Draft`
   - module agent создаёт markdown + json.
6. `Module Specification User Review`
   - пользователь принимает или продолжает обсуждение.
7. `Implementation TODO Plan Draft`
   - module agent создаёт user markdown и machine json plan.
8. `Implementation TODO Plan User Review`
   - пользователь принимает plan before execution.
9. `Worker Execution`
   - worker-ы выполняют микрозадачи; interactive plan показывает ход.
10. `Core Worker Acceptance`
   - Core проверяет форматы, commits, gates, changed files.
11. `Module Assembly / Semantic Integration`
   - module agent получает worker results и собирает смысловой результат.
12. `Final User Review`
   - пользователь проверяет собранный module result.
13. `Module Closeout`
   - Core архивирует managed plan state и фиксирует итоговые artifacts.

---

## 6. Canonical File And Session Surface

### 6.1. Branch artifact root

Branch-level user artifacts живут под:

`.codeai-hub/<workspaceSlug>/development_tree/`

Это отделяет их от:

- trunk artifacts;
- source code;
- Core managed stage plans;
- transient provider state.

### 6.2. Product Part artifacts

Для каждого `Product Part`:

`.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/product-part-specification.md`

### 6.3. Cluster artifacts

Для каждого `Cluster`:

- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/cluster-specification.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/cluster-facade-contract.md`

### 6.4. Module artifacts inside a cluster

Для каждого `Module` внутри `Cluster`:

- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-facade-contract.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-facade-contract.json`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-specification.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-specification.json`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/implementation-todo-plan.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/implementation-plan.json`

### 6.5. Standalone module artifacts

Для standalone modules тот же набор живёт под:

`.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/modules/<module-id>/`

### 6.6. Core managed module plan

Core-owned lifecycle state для module workflow живёт отдельно от user artifacts:

`doc/TODO/stages/development-tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/todo-plan.md`

Для standalone module:

`doc/TODO/stages/development-tree/product-parts/<part-id>/modules/<module-id>/todo-plan.md`

Это service plan, а не пользовательский artifact. Он нужен Core-у и module agent-у для phase tracking, gates, commits, recovery и closeout.

### 6.7. Module-agent session snapshot

Durable snapshot основной module-agent session должен быть привязан к module path:

`doc/TODO/stages/development-tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-session/`

Минимальный состав:

- `transcript.md`;
- `session-state.json`;
- `artifacts.json`;
- `decisions.md`.

UI может хранить provider-native session id отдельно, но Core-owned snapshot должен позволять восстановить смысловое состояние module workflow.

### 6.8. Worker session snapshots

Worker run snapshots are created only when implementation execution reaches a worker task. They are not pre-created as `workers/` operation folders during fresh Development Tree materialization.

Suggested service path:

`doc/TODO/stages/development-tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/worker-runs/<task-id>/<run-id>/`

Минимальный состав:

- `prompt.json`;
- `transcript.md`;
- `status.json`;
- `result.json`;
- `changed-files.json`;

Эти snapshots открываются из интерактивного `Implementation TODO Plan` read-only.

---

## 7. Required Artifact Shape

### 7.1. Product Part Specification

Минимальные разделы:

1. `Identity`
2. `Role in Diagram Modules Structure`
3. `Owned Branch Structure`
4. `Responsibilities`
5. `Dependency Boundaries`
6. `Implementation Waves`
7. `Open Decisions`

### 7.2. Cluster Specification

Минимальные разделы:

1. `Identity`
2. `Purpose`
3. `Role inside Product Part`
4. `Constituent Modules`
5. `Responsibilities`
6. `Internal Coordination`
7. `Dependencies and Seams`
8. `Non-Goals`
9. `Open Decisions`

### 7.3. Cluster Facade Contract

Минимальные разделы:

1. `Facade Identity`
2. `Public Entry Points`
3. `Visible Inputs`
4. `Visible Outputs`
5. `Allowed Consumers`
6. `Hidden Internal Structure`
7. `Failure / Status Semantics`
8. `Observability Requirements`

### 7.4. Module Facade Contract

Минимальные разделы:

1. `Facade Identity`
2. `Public API Surface`
3. `Inputs`
4. `Outputs`
5. `Error / Status Semantics`
6. `Allowed Consumers`
7. `Forbidden Direct Access`
8. `Invariants`
9. `Traceability / Logging Expectations`

### 7.5. Module Specification

Минимальные разделы:

1. `Identity`
2. `Purpose`
3. `Responsibilities`
4. `Internal Behavior / Algorithms`
5. `Collaborators`
6. `Dependencies`
7. `State / Data Ownership`
8. `Constraints`
9. `Non-Goals`
10. `Open Decisions`

### 7.6. Implementation TODO Plan

Минимальные разделы:

1. `Context Pack`
2. `Execution Rules`
3. `Phases`
4. `Streams`
5. `Microtasks`
6. `Serial / Parallel Markers`
7. `Worker Assignment Hints`
8. `Expected Commit Messages`
9. `Validation Gates`
10. `Assembly Notes`

Markdown version is user-readable. JSON version is machine-readable and drives the interactive right-panel view.

Внутри `Microtasks` каждая реальная work item должна быть парой:

```text
1. [TODO] Implement clock payload formatter (parallel group A; worker candidate)
2. [TODO] Git Commit: docs/code: implement clock payload formatter
```

Для пользователя это должно отображаться как одна work row with commit boundary details или как две связанные строки. Для Core это всегда две связанные записи: work item и commit item.

`implementation-plan.json` должен явно хранить:

- microtask id;
- paired commit id;
- expected commit message;
- execution mode: `serial`, `parallel`, or `read-only`;
- workspace policy: `canonical`, `worker-sandbox`, or `read-only`;
- Quality Gates result for the paired commit.

### 7.7. Worker Run Snapshot

Минимальные поля:

1. task id;
2. run id;
3. prompt/input;
4. status;
5. result summary;
6. changed files;
7. validation output;
8. module-agent acceptance state.

### 7.8. Facade process alignment

Cluster/module facade contracts должны быть согласованы с:

- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

Фасад остаётся единственной публичной точкой входа. Скрытые обходы модуля не допускаются.

---

## 8. Gates

### 8.1. Product Part gate

`Cluster Design` можно начинать только после принятого или draft-ready `Product Part Specification`.

### 8.2. Cluster gate

Module workflow внутри cluster можно начинать только после:

1. `cluster-specification.md`
2. `cluster-facade-contract.md`

Standalone module не требует cluster gate.

### 8.3. Module artifact gates

Внутри module workflow:

1. `Module Specification Draft` не стартует, пока `Facade Contract` не создан и не отправлен на user review.
2. `Implementation TODO Plan Draft` не стартует, пока `Facade Contract` и `Module Specification` не приняты пользователем или явно разрешены как draft-ready.
3. `Worker Execution` не стартует, пока `Implementation TODO Plan` не принят пользователем.
4. `Module Assembly` не стартует, пока Core не зафиксировал worker acceptance state.

### 8.4. User review gates

После каждого главного artifact draft есть отдельный user gate:

- пользователь принимает;
- пользователь продолжает обсуждение с module agent-ом;
- module agent правит artifact;
- Core не переводит фазу дальше без явного acceptance.

### 8.5. Core acceptance gates

Core проверяет формальное:

- artifact exists;
- markdown/json формат валиден;
- task statuses валидны;
- commit lifecycle не нарушен;
- changed files лежат в разрешённом scope;
- gates прошли или failure записан.

Core не принимает смысловое решение вместо module agent-а.

### 8.6. Commit and Quality Gates gate

Каждая implementation microtask закрывается только через связанный `Git Commit` item.

Commit gate делает две вещи:

1. фиксирует accepted worker/module-agent result в repo history;
2. запускает pre-commit hooks, которые выполняют Quality Gates из предыдущего stage.

Если hook или Quality Gate падает:

- microtask не считается закрытой;
- paired Git Commit item остаётся failed/pending;
- module agent получает failure summary;
- пользователь видит failure в интерактивном `Implementation TODO Plan`;
- исправление идёт через module-agent session, а не через direct worker chat.

---

## 9. OUTDATED Propagation

### 9.1. Upstream to branch roots

Изменение `Diagram Modules` product-part artifacts делает downstream branch artifacts `OUTDATED`:

- `Product Part Specification`;
- `Cluster Specification`;
- `Cluster Facade Contract`;
- module workflow artifacts;
- implementation plan and worker execution state.

### 9.2. Product Part to cluster/module

Изменение `Product Part Specification` делает `OUTDATED`:

- cluster design artifacts этого Product Part;
- standalone module artifacts этого Product Part;
- module implementation plans, которые опираются на старую branch boundary.

### 9.3. Cluster to module

Изменение `Cluster Specification` или `Cluster Facade Contract` делает `OUTDATED`:

- module facade/specification artifacts внутри cluster;
- implementation plans этих modules;
- worker execution state, если изменения затрагивают уже выполненные microtasks.

### 9.4. Module artifacts to implementation

Изменение `Module Facade Contract` или `Module Specification` делает `OUTDATED`:

- `Implementation TODO Plan`;
- worker tasks, созданные по старому plan;
- module assembly notes.

### 9.5. Worker results to module assembly

Если worker result отклонён module agent-ом или пользователем через module-agent session:

- соответствующая microtask возвращается в `TODO` / `REOPENED`;
- зависимые microtasks получают `BLOCKED` или `OUTDATED`;
- worker transcript остаётся read-only history;
- новый worker run создаётся отдельно, без перезаписи старого transcript.

---

## 10. Recommended Execution Order

Для одной выбранной ветки:

1. Прочитать accepted `Diagram Modules` artifacts.
2. Выбрать `Product Part`.
3. Создать и принять `Product Part Specification`.
4. Для нужного cluster создать и принять `Cluster Specification` + `Cluster Facade Contract`.
5. Для module открыть module-agent session.
6. Создать и принять `Module Facade Contract`.
7. Создать и принять `Module Specification`.
8. Создать и принять `Implementation TODO Plan`.
9. Выполнить worker microtasks с интерактивным progress view.
10. После каждой accepted microtask выполнить paired Git Commit через Core-managed lifecycle.
11. На каждом commit boundary запустить pre-commit hooks / Quality Gates.
12. Вернуть worker results module agent-у.
13. Module agent выполняет assembly / semantic integration.
14. Пользователь принимает module result.
15. Core закрывает module workflow.

---

## 11. First Implementation MVP

Первый slice должен быть проще полной автоматизации.

### 11.1. Must Have

- один module node в Development Tree;
- одна writable module-agent session;
- artifact tabs: `Facade Contract`, `Module Specification`, `Implementation TODO Plan`;
- managed module `todo-plan.md` under `doc/TODO/stages/development-tree/...`;
- user review gates after each main artifact;
- interactive Implementation TODO Plan rows in right panel;
- click row -> open read-only worker transcript in left session area;
- no input field in worker transcript view;
- user feedback goes to module-agent session;
- Core validates formats, commits and gates.
- each implementation microtask has a paired Git Commit item;
- module agent owns accept/reject decisions for worker results;
- Core owns the actual managed commit and pre-commit Quality Gates boundary;
- writable parallel workers run in isolated worker sandboxes/worktrees by default.
- fresh Development Tree filesystem scaffolding contains Product Part / Cluster / Module directories only; no pre-created `workers/` or `integration/` operation folders.

### 11.2. May Come Later

- full Core scheduler for parallel worker batches;
- pause/retry/accept/reject buttons on each microtask row;
- automatic dependency blocking;
- automatic worker retry policies;
- rich diff viewer per worker result;
- cross-module implementation waves.

### 11.3. Explicit Exclusions For MVP

- direct user chat with Core;
- direct user chat with worker;
- left-tree expansion of every implementation microtask;
- fully autonomous execution of `implementation-plan.json` without module-agent supervision.

---

## 12. Verification Target

Этот planning scope считается достаточно подготовленным, если после review можно однозначно ответить:

1. Что появляется в Development Tree после `Quality Gates Baseline`?
2. Почему module имеет одну module-agent session, а не три отдельные sessions?
3. Какие три главных module artifacts создаются до worker execution?
4. Где находится Core-owned module `todo-plan.md`?
5. Где находятся user-facing markdown/json artifacts?
6. Где находятся worker session snapshots?
7. Как пользователь видит ход worker execution?
8. Почему worker sessions read-only?
9. Куда пользователь пишет feedback по микрозадаче?
10. Что делает Core, а что делает module agent?
11. Кто принимает worker result и кто выполняет Git Commit boundary?
12. Как pre-commit hooks / Quality Gates связаны с implementation microtasks?
13. В каких workspaces запускаются parallel workers?
14. Что входит в первый MVP, а что оставлено на later automation?

---

## 13. Expected Outcome

После реализации этого planning scope CodeAI Hub должен получить понятную branch workflow модель:

- trunk даёт описание, simulation, diagram modules, skeleton и quality gates;
- Development Tree показывает Product Part / Cluster / Module структуру;
- module node остаётся одним узлом, без раздувания дерева сотнями microtasks;
- module agent является главным собеседником пользователя по модулю;
- Core является формальным оркестратором и validator-ом, но не chat participant;
- `Facade Contract`, `Module Specification` и `Implementation TODO Plan` создаются последовательно и проходят user review;
- `Implementation TODO Plan` становится интерактивной правой панелью;
- каждая implementation microtask имеет paired Git Commit item, который запускает pre-commit Quality Gates;
- module agent принимает или отклоняет worker result, worker сам не коммитит;
- parallel writable workers работают в isolated sandboxes/worktrees, а merge в canonical workspace идёт последовательно через Core-managed commits;
- worker sessions видимы read-only через строки плана;
- feedback по worker result идёт module agent-у;
- первая версия остаётся реалистичной: module agent supervises execution, Core enforces lifecycle.
