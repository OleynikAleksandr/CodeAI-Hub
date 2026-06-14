# Рефакторинг downstream-исполнения Development Tree

**Статус:** активный стратегический planning-документ, открыт 2026-06-10; Product Part pre-code worktree lanes доведены до accepted brief/order-plan checkpoint модели в релизе `1.2.509`, а незавершённая стратегическая линия остаётся за cluster/module/code-ready downstream waves.
**Решение 2026-06-14:** Product Part pre-code lanes являются short-lived planning lanes. После accepted Product Part briefs и accepted lead `DevelopmentOrderPlan.v2` Core переносит эти accepted artifacts/decisions в основной workspace и закрывает pre-code lanes как execution residue. Cluster/module documents, facade contracts и code-ready work не должны стартовать в ранних "голых" Product Part lanes до materialized Application Skeleton и verified Quality Gates.
**Связь с текущими директивами:** этот документ теперь является консолидированной активной линией downstream-исполнения Development Tree. `Plans/Archive/DevelopmentTree_BranchWorkflow_Architecture.md` остаётся историческим reference baseline, а `Plans/Archive/DevelopmentTree_ProductPartSubagentOrchestration.md` остаётся поглощённым implementation planning source. Их устойчивые решения перенесены в текущие SSOT-документы и в эту downstream-refactor линию; они больше не являются отдельными активными директивами в корне `Plans/`.

## 1. Проблема

Ретест FinderWidget показал, что текущий MVP Development Tree умеет открыть первого cluster-contract sub-agent в worktree, принять его draft-артефакты и скопировать эти draft-артефакты обратно в основной workspace. Для целевой downstream-модели этого недостаточно.

Текущая реализация использовала слово `merged` для doc-only переноса cluster contract. Это вводит в заблуждение. Downstream cluster tree нельзя считать готовым к merge в основной workspace, пока он не произвёл code artifacts и не прошёл соответствующие gates. Копирование `ClusterFacadeContract.draft.*` обратно в основной workspace может быть максимум planning/review checkpoint, но не integration.

Тот же ретест показал, что `DevelopmentOrderPlan.v2` пока не используется как реальный исполняемый wave graph. Lead Product Part запускается первым потому, что он должен определить, какие downstream-узлы можно выполнять параллельно, а какие должны ждать предыдущие результаты. Если Core открывает только первый cluster contract и затем останавливается, lead Product Part order plan ещё не даёт своей основной архитектурной ценности.

Дополнительный ретест `FinderWidget-Test01` показал более раннюю ошибку момента запуска: первый `cluster-contracts/note-discovery` worktree был создан от Product Part pre-code lane до того, как основной workspace получил materialized Application Skeleton и verified Quality Gates. Такой worktree не имеет будущей code filesystem, hook/gate surface и актуального parent/main state. Его draft artifacts можно использовать как seed/reference, но эту lane нельзя считать правильной базой для дальнейшего cluster/module/code workflow.

## 2. Направление решения

Downstream-модель должна перейти от "ветки документа cluster-contract" к "дереву исполнения cluster".

Основной workspace владеет:

- принятыми trunk workflow artifacts;
- sequential accepted Product Part brief checkpoints;
- принятым lead `DevelopmentOrderPlan.v2`;
- высокоуровневым coordination state для Product Part.

Product Part worktree lane владеет:

- draft `ProductPartDevelopmentBrief`;
- Product Part agent session/runtime home;
- локальными коммитами Product Part agent;
- user-review evidence до принятого merge/checkpoint в main;
- later lead order-plan turn, если lane принадлежит lead Product Part.
- только pre-code planning lifecycle до accepted brief/order-plan checkpoint; lane не владеет cluster/module documents и не является undo/refactor mechanism после checkpoint.

Downstream cluster worktree владеет:

- границей cluster facade;
- будущим классом cluster facade;
- спецификациями модулей, принадлежащих cluster;
- module facade contracts/classes, когда их можно безопасно создать в том же cluster worktree;
- локальными коммитами, sessions, validation evidence и node-level review state.

Основной workspace не должен получать downstream cluster artifacts как финальный merge, пока cluster worktree не создал code boundary, необходимую для следующего integration step. Doc-only copy допустим только если он явно называется review snapshot или planning checkpoint, но никогда не `merged`.

Downstream cluster/module worktree должен создаваться только от актуального accepted main checkpoint после materialized Application Skeleton и verified Quality Gates. Это гарантирует, что draft contracts, facade classes, module specs и последующий код создаются рядом с реальной code filesystem и проверяются теми же gates, которые будут применяться к integration result.

Product Part brief является более ранним исключением с другим смыслом: это не code-ready merge downstream-узла, а accepted planning checkpoint, который нужен lead Product Part для построения `DevelopmentOrderPlan.v2`. Поэтому Core может последовательно переносить accepted `ProductPartDevelopmentBrief` из Product Part lane в main workspace, но обязан называть это accepted checkpoint/brief merge, а не downstream code integration.

После accepted Product Part brief checkpoints и accepted lead `DevelopmentOrderPlan.v2` Core должен считать Product Part pre-code lanes завершёнными. Старые worktrees можно удалить/закрыть; если пользователь позже возвращается к brief или order plan, Core создаёт новую revision lane от текущего accepted main, а не оживляет старую lane.

Защитное состояние, реализованное к релизу `1.2.509`:

- Product Part review sessions, включая non-lead Product Parts, отображаются как Development Tree node sessions в Project Manager.
- Product Part managed startup сохраняет primary unified dialog history до того, как provider/translation activity может уйти вперёд и создать race.
- Acceptance для Cluster Contract пишет `boundary-accepted` coordination checkpoint и оставляет worktree активным; он не копирует draft cluster documents в main и не помечает cluster как `merged`.
- Lead `DevelopmentOrderPlan` assignment блокируется через Product Part Brief Barrier, пока каждый planned Product Part brief не принят пользователем.
- Product Part pre-code agents запускаются в deterministic worktree lanes, Project Manager показывает их как Development Tree node sessions, main workspace остаётся orchestration/checkpoint surface, а accepted briefs последовательно возвращаются в main как managed checkpoints.

## 3. Форма границы кластера

У cluster не должно быть отдельной длинной "Cluster Specification" как основного артефакта. Граница уровня cluster — это facade.

Ожидаемые артефакты уровня cluster:

- `ClusterFacadeContract.draft.{md,json}`, пока boundary ещё находится на review;
- реальный class cluster facade после acceptance границы для code generation;
- validation evidence, доказывающий, что facade boundary и сгенерированный code совпадают.

Ожидаемые артефакты уровня module:

- module specifications;
- module facade contracts/classes, где это нужно;
- module implementation plans и code на следующих execution phases.

Specifications принадлежат modules. Cluster должен координировать modules через свой facade и через явные module boundary contracts, а не через параллельный cluster specification document, который может разойтись с facade.

## 4. Почему лидирующий Product Part запускается первым

Lead Product Part не запускается первым для того, чтобы выполнить всю downstream-работу самостоятельно. Он запускается первым потому, что создаёт execution map, читаемую Core:

- какие nodes можно стартовать в одной wave;
- какие nodes должны ждать принятых upstream boundaries;
- какие nodes принадлежат другому Product Part, но зависят от этого Product Part;
- какие downstream trees требуют worktrees;
- какие merge/review gates должны быть выполнены перед mainline integration.

Core должен использовать этот graph как execution input, а не как advisory prose. Будущий wave runner должен оценивать принятый `DevelopmentOrderPlan.v2`, Core-owned Product Part acceptance state, node dependencies, worktree state и review results перед стартом каждой wave.

Lead agent может предложить graph, но Core владеет truth:

- Product Part brief acceptance должен читаться из Core-managed review state, а не из agent-written `requiredBriefs`;
- только Core запускает downstream worktrees;
- только Core продвигает node status;
- только Core решает, когда downstream tree готов к merge.

### Барьер Product Part Brief

Core не должен отправлять lead Product Part `DevelopmentOrderPlan` assignment, пока каждый planned Product Part не имеет user-accepted `ProductPartDevelopmentBrief.draft.md`, созданный в Product Part lane и последовательно перенесённый в main как Core-managed accepted checkpoint.

Barrier оценивается по:

- planned Product Part ids и leadership order, объявленным в `product-parts.index.md`;
- каждому Product Part managed review decision в `.codeai-hub/<workspace>/workflow/managed/development-tree-product-parts/<partId>.json`;
- полному markdown принятого brief в main workspace после accepted lane merge/checkpoint.

Если какой-либо planned Product Part brief отсутствует или не принят, Core записывает lead order-plan task как blocked и не отправляет internal provider prompt. Когда barrier открывается, Core собирает lead prompt с полным текстом каждого accepted Product Part brief inline и отправляет его в lead Product Part session, даже если финальный acceptance произошёл в secondary Product Part session. Paths включаются как provenance, но prompt не должен требовать от lead agent самостоятельно искать или читать brief files.

Lead agent может суммировать эти briefs и рассуждать по ним, но не должен выдумывать `requiredBriefs`. JSON-список `requiredBriefs` в `DevelopmentOrderPlan.v2` должен отражать Core-supplied accepted brief set.

## 5. Product Part worktree lanes перед cluster/module worktrees

Product Part lanes являются первым практическим слоем той же worktree-модели, которая позже понадобится для cluster, module и code execution.

Причина выбора именно Product Part:

- agents уже являются Development Tree nodes и требуют собственных sessions;
- они пока создают pre-code documents, поэтому риск реализации ниже, чем при параллельном code generation;
- текущая main-workspace fan-out загрязняет Git и блокирует managed Documentation Tree steps;
- пользователь готов очищать тестовые workspaces до questionnaire, поэтому compatibility migration не нужна.

Ветка без отдельного checkout не решает проблему. `git branch` изолирует историю, но не изолирует working tree и index. Любая параллельная Product Part agent работа должна идти в отдельном `git worktree`, созданном Core от принятого main checkpoint.

Минимальная модель:

```text
main workspace
  -> Diagram Modules accepted
  -> Core creates product-part lane worktrees
  -> Documentation Tree can continue from clean main

product-part lane
  -> ProductPartDevelopmentBrief draft
  -> user review through main Project Manager projection
  -> Core sequential accepted checkpoint back to main

lead product-part lane
  -> ordinary ProductPartDevelopmentBrief draft
  -> waits for every accepted Product Part checkpoint in main
  -> receives DevelopmentOrderPlan.v2 prompt with full inline briefs
```

Такой слой не заменяет будущие cluster/module worktrees, а подготавливает их runtime contract: create lane, run agent, show session in main tree, accept artifact, merge/copy checkpoint sequentially, clear/undo lane safely.

Граница Product Part lane заканчивается на accepted planning checkpoint. Она не должна открывать cluster/module draft sessions, `ClusterFacadeContract`, `ModuleSpecification` или code-ready artifacts. После принятия всех Product Part briefs и lead order plan Core возвращается в основной workspace, продолжает/завершает Application Skeleton и Quality Gates, и только затем создаёт downstream cluster/module lanes от актуальной verified базы.

## 6. Cluster worktree и параллельность модулей

Первая реализация не обязана выделять каждый module в отдельный worktree. Cluster worktree может быть начальной execution surface для cluster facade и всех принадлежащих ему module specifications/facades. Это сохраняет цельный контекст и не создаёт преждевременную orchestration complexity.

Cluster worktree стартует не из Product Part pre-code lane, а из актуального accepted main после materialized Application Skeleton и verified Quality Gates. Accepted Product Part briefs и lead order plan используются как inline seed/context, но не как рабочая файловая база.

Параллельная module work должна быть оптимизацией второго уровня:

1. Core открывает cluster worktree от принятой main workspace boundary.
2. Cluster worktree устанавливает cluster facade и module boundary contracts.
3. Если module work может идти независимо, Core может форкнуть module worktrees из состояния cluster worktree.
4. Module worktrees merge-ятся обратно в cluster worktree.
5. Cluster worktree merge-ится обратно в main только после завершения cluster code boundary и gates.

Так parallelism остаётся доступным, но ранние design artifacts не обязаны сразу становиться отдельными main-workspace branches.

## 7. Этапы рефакторинга для будущей нарезки

Этот документ собирает несколько refactor topics. Первые известные stages:

1. Остановить предварительное создание пустых `doc/TODO/stages/development-tree/...` directories для unopened cluster/module nodes. `doc/TODO` должен содержать только реальные managed plans. Для non-lead Product Part main-workspace scaffolding это реализовано в `1.2.489`; более широкий cleanup cluster/module остаётся частью downstream execution refactor.
2. Переименовать или разделить текущий doc-only cluster contract transfer так, чтобы он не отображался как final merge. Защитное поведение реализовано в `1.2.488` как `boundary_accepted`.
3. Заменить `ClusterSpecification` на facade-centered cluster boundary model.
4. Перевести Product Part pre-code agents в deterministic worktree lanes и возвращать accepted briefs в main только sequential Core-owned checkpoint commits.
5. Закрывать Product Part pre-code lanes после accepted brief/order-plan checkpoint в main; старые lanes не использовать как undo/refactor state.
6. Запретить старт cluster/module document generation из Product Part pre-code lanes до materialized Application Skeleton и verified Quality Gates.
7. Добавить Core-owned wave runner, который выполняет принятый `DevelopmentOrderPlan.v2` дальше первой cluster-contract wave от verified main base.
8. Добавить downstream node executors для standalone modules, cluster module specifications, cluster facade code и более поздней implementation work.
9. Добавить merge-ready gates, которые требуют code artifacts и validation evidence перед возвратом downstream work в main workspace.

## 8. Первый защитный шаг

Первый implementation step должен остановить поведение, при котором текущий doc-only cluster contract acceptance выглядит как mainline merge.

Требуемое поведение сейчас:

1. User/lead принимает cluster facade boundary в cluster worktree.
2. Core записывает это review decision как boundary checkpoint.
3. Core может записать main-workspace coordination artifact с явным именем вроде `boundary-accepted`, но не должен копировать draft cluster documentation в основной workspace как integration result.
4. Core не должен помечать cluster node как `merged`.
5. Cluster worktree остаётся активным downstream execution tree для следующих phases.

Этот шаг намеренно меньше финального wave runner. Он предотвращает ложное состояние `merged`, сохраняя место для дальнейшего execution graph:

```text
cluster worktree opened
  -> cluster facade boundary accepted
  -> cluster facade class created
  -> owned module specifications created
  -> owned module facade contracts/classes created
  -> owned module code created
  -> cluster gates pass
  -> cluster tree code-ready
  -> merge complete cluster contents to main
```

Standalone modules должны следовать тому же правилу. Standalone module не должен возвращаться в main как финальный результат, пока его specification, facade boundary/class где нужно, code и validation evidence не присутствуют. Разница только в форме subtree: cluster возвращает всё принадлежащее cluster содержимое вместе; standalone module возвращает своё standalone-содержимое.

Следующий защитный шаг должен остановить преждевременное создание downstream cluster/module worktrees из Product Part pre-code lanes. После accepted Product Part brief/order-plan checkpoint Core должен закрыть Product Part lanes и ждать verified main base для cluster/module execution.

## 9. Словарь merge-состояний

Рефакторинг должен зарезервировать `merged` для реальной mainline integration code-ready downstream content.

Промежуточные термины должны быть явными:

- `boundary_accepted`: user/lead принял facade boundary, но code ещё не готов.
- `brief_checkpoint_accepted`: Product Part brief создан в lane, принят пользователем и последовательно перенесён в main как input для lead planning.
- `worktree_active`: downstream execution продолжается в node worktree.
- `code_ready`: downstream tree имеет необходимые code artifacts и local validation evidence.
- `merged`: Core интегрировал downstream code-ready result в основной workspace.

## 10. Refactor And Change Management Model

Development Tree не должен превращаться в путь в один конец. При этом Core не должен пытаться скриптами заранее закодировать все возможные варианты смыслового рефакторинга. Устойчивый контракт разделяет deterministic orchestration и agent reasoning.

Default policy: **additive-first**. Новая функция по умолчанию создаётся как новый Product Part, Cluster или Module. Уже принятые Product Parts, Clusters и Modules считаются стабильными boundaries; их меняем только если новый additive boundary не решает задачу или создаёт более опасный обход.

Existing-node changes допускаются только через explicit managed change scope:

1. user intent формулирует изменение;
2. AI impact/planning agent создаёт schema-valid `Change Proposal` / `Impact Plan`;
3. Core валидирует proposal формально: affected nodes, scope, dependency impact, outdated propagation, required lanes, expected gates;
4. пользователь принимает scope;
5. Core создаёт short-lived affected lanes от текущего accepted main;
6. agents правят документы/код только в approved scope;
7. Core запускает gates, фиксирует commits и обновляет managed state.

Core остаётся authority для state machine, Git/worktree lifecycle, locks, task ids, commits, artifact schemas, user gates, validation и merge/checkpoint decisions. AI не заменяет Core и не получает право свободно мутировать проект. AI отвечает за смысловое предложение: какие nodes добавить, изменить, deprecate, в каком порядке мигрировать и какие риски есть.

Undo/refactor не должен опираться на сохранённые старые worktree lanes. Accepted truth живёт в main: accepted artifacts, Git commits, managed decisions and validation evidence. Если нужно вернуться к принятому Product Part brief, order plan, cluster boundary или module spec, Core создаёт новую revision lane от актуального main, а не оживляет старую рабочую директорию.

Application Skeleton и Quality Gates пересчитываются по impact, а не всегда целиком:

- добавление нового Product Part/Cluster/Module обычно требует incremental skeleton patch: новые folders, entrypoints, package/workspace links where needed;
- Quality Gates обычно остаются прежними и просто проверяют расширенную codebase;
- пересчёт Quality Gates нужен только при смене stack, package topology, gate policy, hooks/scripts или enforcement surface.

Такой подход оставляет Core scriptable для транзакций и gates, но вводит AI impact planner там, где скрипт не может надёжно понять смысл API, алгоритма, boundary drift или cross-Product-Part migration.

## 11. Открытые вопросы

- Нужно ли копировать accepted cluster facade contract в main как видимый review snapshot, или он должен оставаться только внутри cluster worktree до появления code? Текущий защитный ответ: не копировать draft document в main; Core может писать только явный boundary-accepted coordination evidence, пока code не существует.
- Какой минимальный code artifact делает cluster worktree merge-ready: facade class stub, facade плюс module facade stubs или полностью реализованный cluster slice?
- Должны ли standalone modules сразу запускаться в собственных worktrees, или их можно вести внутри lead Product Part / cluster coordination tree до момента, когда parallelism действительно понадобится?
- Как Project Manager должен называть промежуточные состояния, чтобы пользователь различал `review_snapshot`, `boundary_accepted`, `code_ready` и `merged_to_main`?
- Для Product Part brief accepted checkpoint первый срез может использовать controlled copy + main commit вместо raw `git merge --no-ff`, если это проще и безопаснее для managed Git lifecycle. В обоих случаях checkpoint обязан сохранять lane commit provenance.
