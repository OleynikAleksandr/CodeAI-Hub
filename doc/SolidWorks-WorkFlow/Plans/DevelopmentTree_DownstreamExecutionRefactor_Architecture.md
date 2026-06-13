# Рефакторинг downstream-исполнения Development Tree

**Статус:** активный стратегический planning-документ, открыт 2026-06-10; защитные срезы реализованы до релиза `1.2.501`, следующий активный refactor переводит Product Part pre-code agents в отдельные worktree lanes до cluster/module/code-ready waves.
**Связь с текущими директивами:** этот документ теперь является консолидированной активной линией downstream-исполнения Development Tree. `Plans/Archive/DevelopmentTree_BranchWorkflow_Architecture.md` остаётся историческим reference baseline, а `Plans/Archive/DevelopmentTree_ProductPartSubagentOrchestration.md` остаётся поглощённым implementation planning source. Их устойчивые решения перенесены в текущие SSOT-документы и в эту downstream-refactor линию; они больше не являются отдельными активными директивами в корне `Plans/`.

## 1. Проблема

Ретест FinderWidget показал, что текущий MVP Development Tree умеет открыть первого cluster-contract sub-agent в worktree, принять его draft-артефакты и скопировать эти draft-артефакты обратно в основной workspace. Для целевой downstream-модели этого недостаточно.

Текущая реализация использовала слово `merged` для doc-only переноса cluster contract. Это вводит в заблуждение. Downstream cluster tree нельзя считать готовым к merge в основной workspace, пока он не произвёл code artifacts и не прошёл соответствующие gates. Копирование `ClusterFacadeContract.draft.*` обратно в основной workspace может быть максимум planning/review checkpoint, но не integration.

Тот же ретест показал, что `DevelopmentOrderPlan.v2` пока не используется как реальный исполняемый wave graph. Lead Product Part запускается первым потому, что он должен определить, какие downstream-узлы можно выполнять параллельно, а какие должны ждать предыдущие результаты. Если Core открывает только первый cluster contract и затем останавливается, lead Product Part order plan ещё не даёт своей основной архитектурной ценности.

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

Downstream cluster worktree владеет:

- границей cluster facade;
- будущим классом cluster facade;
- спецификациями модулей, принадлежащих cluster;
- module facade contracts/classes, когда их можно безопасно создать в том же cluster worktree;
- локальными коммитами, sessions, validation evidence и node-level review state.

Основной workspace не должен получать downstream cluster artifacts как финальный merge, пока cluster worktree не создал code boundary, необходимую для следующего integration step. Doc-only copy допустим только если он явно называется review snapshot или planning checkpoint, но никогда не `merged`.

Product Part brief является более ранним исключением с другим смыслом: это не code-ready merge downstream-узла, а accepted planning checkpoint, который нужен lead Product Part для построения `DevelopmentOrderPlan.v2`. Поэтому Core может последовательно переносить accepted `ProductPartDevelopmentBrief` из Product Part lane в main workspace, но обязан называть это accepted checkpoint/brief merge, а не downstream code integration.

Защитное состояние, реализованное на момент `1.2.490`:

- Product Part review sessions, включая non-lead Product Parts, отображаются как Development Tree node sessions в Project Manager.
- Product Part managed startup сохраняет primary unified dialog history до того, как provider/translation activity может уйти вперёд и создать race.
- Acceptance для Cluster Contract пишет `boundary-accepted` coordination checkpoint и оставляет worktree активным; он не копирует draft cluster documents в main и не помечает cluster как `merged`.
- Lead `DevelopmentOrderPlan` assignment блокируется через Product Part Brief Barrier, пока каждый planned Product Part brief не принят пользователем.
- Product Part review ordering и attention markers реализованы до уровня UI, но текущая main-workspace fan-out модель создаёт dirty Git при параллельном запуске Product Part agents. Следующий refactor заменяет её worktree lanes.

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

## 6. Cluster worktree и параллельность модулей

Первая реализация не обязана выделять каждый module в отдельный worktree. Cluster worktree может быть начальной execution surface для cluster facade и всех принадлежащих ему module specifications/facades. Это сохраняет цельный контекст и не создаёт преждевременную orchestration complexity.

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
5. Добавить Core-owned wave runner, который выполняет принятый `DevelopmentOrderPlan.v2` дальше первой cluster-contract wave.
6. Добавить downstream node executors для standalone modules, cluster module specifications, cluster facade code и более поздней implementation work.
7. Добавить merge-ready gates, которые требуют code artifacts и validation evidence перед возвратом downstream work в main workspace.

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

## 9. Словарь merge-состояний

Рефакторинг должен зарезервировать `merged` для реальной mainline integration code-ready downstream content.

Промежуточные термины должны быть явными:

- `boundary_accepted`: user/lead принял facade boundary, но code ещё не готов.
- `brief_checkpoint_accepted`: Product Part brief создан в lane, принят пользователем и последовательно перенесён в main как input для lead planning.
- `worktree_active`: downstream execution продолжается в node worktree.
- `code_ready`: downstream tree имеет необходимые code artifacts и local validation evidence.
- `merged`: Core интегрировал downstream code-ready result в основной workspace.

## 10. Открытые вопросы

- Нужно ли копировать accepted cluster facade contract в main как видимый review snapshot, или он должен оставаться только внутри cluster worktree до появления code? Текущий защитный ответ: не копировать draft document в main; Core может писать только явный boundary-accepted coordination evidence, пока code не существует.
- Какой минимальный code artifact делает cluster worktree merge-ready: facade class stub, facade плюс module facade stubs или полностью реализованный cluster slice?
- Должны ли standalone modules сразу запускаться в собственных worktrees, или их можно вести внутри lead Product Part / cluster coordination tree до момента, когда parallelism действительно понадобится?
- Как Project Manager должен называть промежуточные состояния, чтобы пользователь различал `review_snapshot`, `boundary_accepted`, `code_ready` и `merged_to_main`?
- Для Product Part brief accepted checkpoint первый срез может использовать controlled copy + main commit вместо raw `git merge --no-ff`, если это проще и безопаснее для managed Git lifecycle. В обоих случаях checkpoint обязан сохранять lane commit provenance.
