# Development Tree Branch Workflow Architecture

**Status:** Reference Architecture (updated 2026-06-07). Sidebar visualization of Product Part / Cluster / Module branch structure and automatic first-draft materialization are already implemented in production. This document defines the next branch workflow model after `Quality Gates Baseline`: compact filesystem scaffolding, one module node, one module-agent session, artifact/user-review phases, interactive Implementation TODO Plan, read-only worker sessions, and Git-first Clear/Undo reconciliation.
**Created:** 2026-04-07
**Updated:** 2026-06-07
**Owner:** Oleksandr + Codex
**Scope:** Формализовать Development Tree после `Diagram Modules`, `Application Skeleton` и `Quality Gates Baseline`: `Product Part Development Brief`, `Lead Development Order Plan`, `Cluster Design`, managed module workflow, worker visibility, user review gates, and MVP boundaries for implementation execution.

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
- строить отдельный rollback ledger, generation store или shadow-Git поверх Git;
- использовать `Clear` как способ удалить Product Part / Cluster / Module из продукта; изменение состава дерева является refactoring через upstream artifacts;
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

### 4.1.1. Git-first Clear/Undo and refactoring model

Development Tree Clear/Undo не должен вводить собственный механизм отката поверх Git. Git остаётся единственной историей того, в какой точке программный продукт считался корректным. Core/Project Manager после любого Git rollback, checkout, revert или refactoring commit должны заново вывести состояние workflow из текущего `HEAD`, файловой системы и принятых артефактов.

Общий принцип:

1. Git возвращает workspace или отдельную branch/worktree в выбранную точку.
2. Core выполняет reconciliation from current truth, а не replay собственной rollback-памяти.
3. Core читает accepted artifacts (`Diagram Modules`, `Application Skeleton`, `Quality Gates`, Product Part briefs, Development Order Plan), существующие branches/worktrees и materialized files.
4. Project Manager показывает Core-derived состояние: `not_started`, `in_progress`, `awaiting_review`, `accepted`, `stale`, `orphaned`, `ready_for_integration` or equivalent lifecycle labels.

`Clear` и `Refactoring` используют один и тот же reconciliation механизм, но имеют разный смысл:

- `Clear` означает: текущий узел или шаг сделан плохо, его нужно пересоздать из той же текущей продуктовой структуры.
- `Refactoring` означает: сама продуктовая структура изменилась. Пользователь возвращается к upstream artifact (`Diagram Modules`, later `Development Order Plan`) и удаляет, добавляет или переносит Product Part / Cluster / Module там.

Если после `Clear` текущая Git/filesystem truth всё ещё требует существования cleared step, Core обязан автоматически создать новую fresh session этого шага. Отдельная UX-опция `Clear only` для Development Tree узлов не нужна: если узел всё ещё описан в accepted structure, отсутствие его сессии является временным состоянием, которое orchestrator должен закрыть перезапуском. Если узел больше не нужен, это не `Clear`, а refactoring upstream artifacts.

Session state не является rollback truth. При Clear конкретного шага Core удаляет обе эпостаси его сессии:

- provider-neutral / unified session history and continuity entry;
- provider-native session history, binding and runtime metadata;
- Core/system review cards/messages, managed decision files and step-local runtime residue created for that step.

После Clear session всегда стартует с нуля. Core не пытается анализировать старый transcript и не пытается привязать его к новому `HEAD`.

Product Part agents are the last Development Tree sessions that run in the main workspace. They create branch-root Product Part briefs and, for the lead Product Part, the Development Order Plan that coordinates downstream work. Cluster and Module work must run in separate Git worktrees/branches created from the accepted main-workspace state. This keeps rollback simple and enables parallel execution:

- main workspace owns trunk stages, Product Part Development Briefs and accepted Development Order Plan;
- cluster/module worktrees own their own commits, sessions and implementation artifacts;
- rollback of a cluster/module step is a normal Git operation inside that branch/worktree;
- integration back into the main product is a later merge/PR/patch step governed by the accepted Development Order Plan and Quality Gates.

After restart, Core must not rely on stale in-memory state. It rehydrates Development Tree by comparing current Git/filesystem truth with accepted artifacts and existing Git worktrees/branches. Branches/worktrees not described by current accepted artifacts are reported as stale/orphaned refactoring outcomes; branches/worktrees required by current artifacts but missing are `not_started` and may be created by the orchestrator.

### 4.1.2. Projected worktree session/dialog invariant

Product Part sessions run in the main workspace. Cluster and Module sessions run in separate Git worktrees/branches. That creates two identities for one visible Development Tree node:

- graph/projection identity in the main workspace, owned by the Product Part coordination read-model;
- runtime/dialog identity in the node worktree, owned by the sub-agent session, JSONL history, provider-native binding, and local managed plan.

Project Manager may select the node from the main workspace graph, but the right dialog panel must route session history and user actions to the resolved worktree root. The client must not infer the dialog runtime root from the selected main workspace after Core has returned a projected worktree dialog.

Required Core/client contract:

1. Core projection entries for cluster/module sessions must include enough runtime identity to route commands: `worktreePath`, dialog/session id, root/provider session id, model binding, and node ids.
2. The client must store the resolved projected dialog intent and use it for live refresh, history reload, review actions, and user messages.
3. Every projected `dialog:list`, `dialog:history`, `dialog:open`, and `dialog:send` command must carry the explicit target `workspacePath`.
4. Core must validate requested `workspacePath`: allowed values are the selected workspace root or a descendant of the sibling worktree root `<selectedWorkspace>.worktrees/...`.
5. Core must read/write dialog history in the requested root after validation. A projected cluster/module dialog must never silently fall back to main-workspace JSONL.
6. Clear/Undo for a cluster/module node must remove both identities: the main-workspace projection/coordination state and the worktree runtime/session/native traces. Rebootstrap starts from a fresh session; stale root/session ids must not survive.

Managed review actions are part of the dialog protocol, not a side channel. For projected cluster/module dialogs:

- `Подтверждаю`, revision text, and future accept/reject controls must go through `dialog:send`;
- `turnOptions.managedReviewAction` must survive the Core session-resolution path into the provider turn handler;
- direct `session:message` may be used only for ordinary non-projected runtime sessions;
- the UI may set a temporary local managed-review lock after a click, but Core/System review state is authoritative.

Concrete regression signals:

- if the visible dialog appears stuck on an old reasoning message until the user toggles the sidebar, the live refresh/history path is reading the wrong root or not tailing the resolved worktree JSONL;
- if the `Подтверждаю` button appears but clicking it only blocks the input, the review action is probably bypassing `dialog:send`, losing `turnOptions`, or using the wrong workspace root;
- if Clear/Undo leaves a node worktree or session traces behind, Core is treating Git/worktree state and projection state as separate cleanup problems instead of one node rollback boundary.

These bugs are Core/Project Manager integration bugs. They must not be fixed by prompt changes, provider retries, or manual sidebar refresh assumptions.

### 4.2. Product Part Development Brief remains the branch root

Для каждого `Product Part` нужен короткий branch-root artifact:

- роль части продукта;
- что входит в эту часть;
- clusters;
- standalone modules;
- очевидные зависимости из `Diagram Modules`;
- что важно помнить следующим cluster/module agents.

Это не полный facade contract и не самостоятельная спецификация алгоритмов. `Product Part` является формальной веткой продукта, но он обязан задать contract envelope для нижних узлов: кто потребитель, какие входы/выходы ожидаются, какие статусы/ошибки обязательны, какие ограничения нельзя нарушать и какие вопросы блокируют дальнейший спуск.

Реальные pre-code контракты создаются ниже: у cluster-ов, standalone module-ов и module-ов. Но нижний агент не должен изобретать смысл публичной boundary заново. Он получает верхнеуровневый seed и уточняет его до конкретного будущего кода.

### 4.2.1. Top-down contract ownership

Development Tree проектируется сверху вниз:

1. `Product Part` определяет contract seeds для своих Cluster и Standalone Module узлов.
2. `Cluster` уточняет свой Product Part seed до Cluster Facade Contract и задаёт boundary contracts для owned modules.
3. `Standalone Module` уточняет Product Part seed до Module Facade Contract, Function Specification и Implementation TODO Plan.
4. `Cluster Module` уточняет Cluster-owned module boundary contract до Module Specification, Function Specification и Implementation TODO Plan.

Нижний агент может уточнять имена, DTO, edge cases, алгоритмические детали и тестовые сценарии. Он не может молча менять смысл входов/выходов, потребителя, статусную модель или ответственность узла. Если seed недостаточен или противоречив, агент должен остановиться на blocking question / revision request, а не заполнять пробелы догадками.

### 4.3. Cluster Design keeps one session and two artifacts

`Cluster` проектируется одной cluster-agent session и создаёт два артефакта:

- `Cluster Specification`;
- `Cluster Facade Contract`.

Спецификация отвечает за внутреннюю роль cluster-а. Facade contract отвечает за его публичную boundary.

`Cluster Facade Contract` является pre-code artifact, а не архитектурным эссе. Он обязан указывать будущий кодовый surface:

- имя facade class;
- путь будущего facade-файла;
- public method signatures;
- input DTOs;
- output DTOs и discriminated result union;
- status/error model;
- owned module call order;
- boundary contract каждого owned module;
- blocking и non-blocking open questions.

Если в контракте нет будущего класса, файла, методов и DTO, Core должен считать такой контракт недостаточным для запуска module agents.

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

Module agent не придумывает внешний контракт из пустоты. Для standalone module он получает seed от Product Part. Для cluster module он получает boundary contract от Cluster agent. Его задача — уточнить этот контракт до code-ready module artifacts.

### 4.5. Facade Contract goes before Module Specification

Для модуля первой проектируется публичная boundary:

- какие входы есть у модуля;
- какие выходы он обещает;
- какие ошибки/статусы видит внешний мир;
- что запрещено обходить напрямую.

Facade Contract должен быть конкретным описанием будущего кода: class/file path, method signatures, DTO/interfaces, result union and error model. После этого пишется `Module Specification`: что модуль делает внутри, какие алгоритмы использует, какие функции нужны, какие данные держит и какие ограничения соблюдает.

После `Module Specification` module agent создаёт `Function Specification`: function names, inputs, outputs, preconditions, processing steps, edge cases, failure handling and tests. Только после этих двух принятых документов создаётся `Implementation TODO Plan` для разработки конкретного кода.

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

### 4.14. Product Part coordination is the first branch event

После завершения всего `Documentation Tree` (`Description`, `Virtual Simulation`, `Diagram Modules`, `Application Skeleton`, `Quality Gates Baseline`) первый реальный Development Tree workflow должен стартовать не с произвольного module node.

Принятое решение:

- каждый `Product Part` получает свой `Product Part Development Brief`;
- brief-и разных Product Parts можно готовить параллельно;
- только lead Product Part дополнительно создаёт `Development Order Plan`;
- `Development Order Plan` должен быть понятен Core-оркестратору и управлять тем, какие cluster/module agents открывать первыми;
- `Open Questions` не является отдельным обязательным артефактом. Если агенту не хватает информации, он задаёт вопросы пользователю в своей session до финального draft-а.

Core создаёт managed plans после того, как:

1. `Diagram Modules` принят и содержит `leadProductPartId`;
2. `Diagram Modules` содержит `productPartLeadershipOrder`;
3. первый item `productPartLeadershipOrder` совпадает с `leadProductPartId`;
4. `Application Skeleton` материализован и принят;
5. `Quality Gates Baseline` integrated and accepted.

Для каждого Product Part:

```text
doc/TODO/stages/development-tree/product-parts/<part-id>/todo-plan.md
```

Этот plan заставляет Product Part agent сделать только `Product Part Development Brief` и пройти user review.

Для lead Product Part тот же plan содержит дополнительную часть: `Development Order Plan`.

`Diagram Modules` отвечает за выбор lead Product Part и порядок Product Parts. Этот порядок не декоративный: он задаёт leadership / coordination priority и порядок root nodes в Development Tree.

`Lead Product Part` agent не является отдельным абстрактным `Project/Application Orchestrator`. Он не проектирует входы/выходы всего приложения и не создаёт контракты за cluster/module agents. Его задача проще: собрать понятный порядок начала разработки по уже принятой структуре.

`Product Part Development Brief` отвечает обычным языком:

- что это за часть продукта;
- зачем она нужна;
- какие clusters и standalone modules в неё входят;
- какие ограничения из skeleton / Quality Gates надо помнить;
- какие очевидные зависимости видны из `Diagram Modules`.

`Development Order Plan` отвечает на вопросы Core:

- какие Product Part brief-и должны быть готовы перед стартом wave;
- какие cluster agents можно открыть первыми;
- какие standalone module agents можно открыть первыми;
- что можно делать параллельно;
- что должно ждать результата другого узла;
- какие узлы остаются заблокированными до user acceptance.

Если агент видит критичную неясность, без которой нельзя честно создать brief или order plan, он не выдумывает. Он задаёт пользователю вопросы в session. Финальный артефакт создаётся только после того, как критичные вопросы закрыты.

Минимальная логика:

```text
Quality Gates Baseline accepted
  -> Core materializes Development Tree branch scaffolding
  -> Core creates Product Part managed todo-plan.md for every Product Part
  -> Product Part agents draft Product Part Development Briefs in parallel
  -> user reviews / revises / accepts each brief
  -> Lead Product Part agent drafts Development Order Plan
  -> Core validates the plan shape and node references
  -> user reviews / revises / accepts Development Order Plan
  -> Core unlocks only the first allowed cluster / standalone module wave
```

До accepted `Development Order Plan` нельзя запускать cluster/module agents автоматически. Пользователь может видеть всё дерево, но Core не должен открывать нижние agents без понятного порядка старта.

После downstream work Product Part agents могут вернуться как integration reviewers:

```text
Module implementation
  -> Cluster integration
  -> Product Part integration
  -> Lead Product Part coordination review if cross-part order changed
  -> final user review
```

Implementation status as of 2026-06-02:

- Core prompt/validation layer for `Diagram Modules` already requires `leadProductPartId` and `productPartLeadershipOrder`.
- Core/PM read-model types already carry these fields.
- Sidebar projection already has a `Lead Product Part Orchestration` operation shape.
- Missing implementation: Core does not yet create Product Part managed `todo-plan.md` files at `doc/TODO/stages/development-tree/product-parts/<part-id>/todo-plan.md`.
- Missing implementation: Core does not yet bootstrap Product Part agent sessions for Development Brief creation after `Quality Gates Baseline`.
- Missing implementation: Core does not yet create/validate the lead-only `Development Order Plan`.
- Missing implementation: current Development Tree materialization path must pass `leadProductPartId` and `productPartLeadershipOrder` into the filesystem planner, not only `plannedPartIds` / `generatedPartIds`.

---

## 5. Target Workflow

### 5.1. Top-level order

1. `Description` (trunk)
2. `Virtual Simulation` (trunk)
3. `Diagram Modules` (trunk)
4. `Application Skeleton` (trunk)
5. `Quality Gates Baseline` (trunk)
6. `Product Part Development Briefs` (branch root, parallel)
7. `Lead Development Order Plan` (lead Product Part only)
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

`.codeai-hub/<workspaceSlug>/development_tree/product-parts/<part-id>/product-part-development-brief.md`

Для lead Product Part дополнительно:

- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<lead-part-id>/development-order-plan.md`
- `.codeai-hub/<workspaceSlug>/development_tree/product-parts/<lead-part-id>/development-order-plan.json`

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

### 6.6. Core managed Product Part plan

Core-owned lifecycle state для Product Part workflow живёт отдельно от user artifacts:

`doc/TODO/stages/development-tree/product-parts/<part-id>/todo-plan.md`

Для обычного Product Part этот plan ведёт `Product Part Development Brief`.

Для lead Product Part этот же plan дополнительно ведёт `Development Order Plan`, который Core использует как карту разблокировки первых cluster / standalone module agents.

Это service plan, а не пользовательский artifact. Он нужен Core-у и Product Part agent-у для phase tracking, clarification gates, user review, validation, commits, recovery и closeout.

### 6.7. Core managed module plan

Core-owned lifecycle state для module workflow живёт отдельно от user artifacts:

`doc/TODO/stages/development-tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/todo-plan.md`

Для standalone module:

`doc/TODO/stages/development-tree/product-parts/<part-id>/modules/<module-id>/todo-plan.md`

Это service plan, а не пользовательский artifact. Он нужен Core-у и module agent-у для phase tracking, gates, commits, recovery и closeout.

### 6.8. Product Part agent session snapshot

Durable snapshot основной Product Part agent session должен быть привязан к Product Part path:

`doc/TODO/stages/development-tree/product-parts/<part-id>/product-part-session/`

Минимальный состав:

- `transcript.md`;
- `session-state.json`;
- `artifacts.json`;
- `decisions.md`.

### 6.9. Module-agent session snapshot

Durable snapshot основной module-agent session должен быть привязан к module path:

`doc/TODO/stages/development-tree/product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/module-session/`

Минимальный состав:

- `transcript.md`;
- `session-state.json`;
- `artifacts.json`;
- `decisions.md`.

UI может хранить provider-native session id отдельно, но Core-owned snapshot должен позволять восстановить смысловое состояние module workflow.

### 6.10. Worker session snapshots

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

### 7.1. Product Part Development Brief

Минимальные разделы:

1. `Identity`
2. `Role in the Application`
3. `What Belongs Here`
4. `Clusters and Standalone Modules`
5. `Known Dependencies From Diagram Modules`
6. `Skeleton and Quality Gate Notes`
7. `User Decisions Already Clarified`

Это обычное описание ветки продукта. Оно не задаёт facade API и не объявляет входы/выходы Product Part.

### 7.2. Lead Development Order Plan

Минимальные разделы markdown version:

1. `Input Summary`
2. `Briefs Required Before Wave Unlock`
3. `First Cluster / Standalone Module Wave`
4. `Parallel Groups`
5. `Sequential Dependencies`
6. `Blocked Nodes`
7. `User Review Notes`

Machine-readable `development-order-plan.json` должен хранить:

- `leadProductPartId`;
- `productPartLeadershipOrder`;
- список Product Part brief-ов и их acceptance status;
- first wave node ids;
- для каждого node: `kind`, `partId`, optional `clusterId`, optional `moduleId`;
- execution marker: `parallel` или `serial`;
- dependency node ids;
- locked reason, если node ещё нельзя открыть.

Если у lead agent есть критичные вопросы, без которых нельзя честно создать этот plan, они задаются пользователю до draft-а. Неясности не выносятся в отдельный обязательный artifact.

### 7.3. Cluster Specification

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

### 7.4. Cluster Facade Contract

Минимальные разделы:

1. `Facade Identity`
2. `Public Entry Points`
3. `Visible Inputs`
4. `Visible Outputs`
5. `Allowed Consumers`
6. `Hidden Internal Structure`
7. `Failure / Status Semantics`
8. `Observability Requirements`

### 7.5. Module Facade Contract

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

### 7.6. Module Specification

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

### 7.7. Implementation TODO Plan

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

### 7.8. Worker Run Snapshot

Минимальные поля:

1. task id;
2. run id;
3. prompt/input;
4. status;
5. result summary;
6. changed files;
7. validation output;
8. module-agent acceptance state.

### 7.9. Facade process alignment

Cluster/module facade contracts должны быть согласованы с:

- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

Фасад остаётся единственной публичной точкой входа. Скрытые обходы модуля не допускаются.

---

## 8. Gates

### 8.1. Product Part gate

`Cluster Design` можно начинать только после:

1. принятого или draft-ready `Product Part Development Brief` owning Product Part;
2. accepted `Development Order Plan`, если Development Tree содержит lead Product Part workflow;
3. unlock marker для этого cluster / standalone module в Core-readable order plan.

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

- `Product Part Development Brief`;
- `Development Order Plan`;
- `Cluster Specification`;
- `Cluster Facade Contract`;
- module workflow artifacts;
- implementation plan and worker execution state.

### 9.2. Product Part to cluster/module

Изменение `Product Part Development Brief` или lead `Development Order Plan` делает `OUTDATED`:

- cluster design artifacts этого Product Part;
- standalone module artifacts этого Product Part;
- module implementation plans, которые опираются на старое описание ветки или старый порядок unlock.

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
2. Core создаёт Product Part managed plans.
3. Product Part agents параллельно создают `Product Part Development Brief`.
4. Если агенту не хватает информации, он задаёт вопросы пользователю до финального draft-а.
5. Пользователь принимает brief каждого Product Part.
6. Lead Product Part agent создаёт `Development Order Plan`.
7. Core валидирует machine-readable order plan.
8. Пользователь принимает Development Order Plan.
9. Core открывает только первую разрешённую wave cluster / standalone module agents.
10. Для нужного cluster создать и принять `Cluster Specification` + `Cluster Facade Contract`.
11. Для module открыть module-agent session.
12. Создать и принять `Module Facade Contract`.
13. Создать и принять `Module Specification`.
14. Создать и принять `Implementation TODO Plan`.
15. Выполнить worker microtasks с интерактивным progress view.
16. После каждой accepted microtask выполнить paired Git Commit через Core-managed lifecycle.
17. На каждом commit boundary запустить pre-commit hooks / Quality Gates.
18. Вернуть worker results module agent-у.
19. Module agent выполняет assembly / semantic integration.
20. Пользователь принимает module result.
21. Core закрывает module workflow.

---

## 11. First Implementation MVP

Первый slice должен быть проще полной автоматизации.

### 11.1. Must Have

- managed Product Part `todo-plan.md` under `doc/TODO/stages/development-tree/product-parts/<part-id>/todo-plan.md`;
- parallel `Product Part Development Brief` creation for every Product Part;
- clarification phase before final brief/order-plan draft when agent lacks critical information;
- lead-only `Development Order Plan` markdown + JSON;
- Core-readable unlock markers for the first cluster / standalone module wave;
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
2. Почему Product Part не имеет собственного facade contract?
3. Какие артефакты создаёт каждый Product Part agent?
4. Что дополнительно создаёт lead Product Part agent?
5. Что делает агент, если ему не хватает информации?
6. Как `Development Order Plan` управляет первым unlock cluster / standalone module agents?
7. Почему module имеет одну module-agent session, а не три отдельные sessions?
8. Какие три главных module artifacts создаются до worker execution?
9. Где находится Core-owned module `todo-plan.md`?
10. Где находятся user-facing markdown/json artifacts?
11. Где находятся worker session snapshots?
12. Как пользователь видит ход worker execution?
13. Почему worker sessions read-only?
14. Куда пользователь пишет feedback по микрозадаче?
15. Что делает Core, а что делает module agent?
16. Кто принимает worker result и кто выполняет Git Commit boundary?
17. Как pre-commit hooks / Quality Gates связаны с implementation microtasks?
18. В каких workspaces запускаются parallel workers?
19. Что входит в первый MVP, а что оставлено на later automation?

---

## 13. Expected Outcome

После реализации этого planning scope CodeAI Hub должен получить понятную branch workflow модель:

- trunk даёт описание, simulation, diagram modules, skeleton и quality gates;
- Development Tree показывает Product Part / Cluster / Module структуру;
- каждый Product Part сначала получает `Product Part Development Brief`;
- Product Part brief-и можно готовить параллельно;
- lead Product Part дополнительно создаёт Core-readable `Development Order Plan`;
- критичные вопросы задаются пользователю до финального draft-а, а не сохраняются как отдельный обязательный artifact;
- Core открывает первую cluster / standalone module wave только по принятому `Development Order Plan`;
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
