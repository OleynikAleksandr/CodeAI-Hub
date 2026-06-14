# Курсор пользовательских review-gates в Development Tree

**Статус:** archived completed planning source, открыт 2026-06-12 и закрыт после пользовательского acceptance релиза `1.2.512`. Product Part pre-code worktree lane slice реализован и принят в релизе `1.2.509`; Core-owned review cursor / attention-marker fixes приняты в `1.2.512`.
**Родительская стратегическая линия:** `Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`.
**Disposition:** стабильное поведение перенесено в `System/SystemArchitecture.md`, `System/WorkflowSteps_Overview.md`, `Clusters/ManagedWorkflowOrchestration.md` и `Docs_Index.md`; будущие cluster/module/code gates остаются в активной стратегической линии `Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`.
**Область:** параллельное pre-code исполнение Development Tree в отдельных worktree lanes с Core-owned последовательным курсором user review и attention markers в дереве Project Manager.

## 1. Проблема

Development Tree может выполнять больше работы параллельно, чем пользователь способен параллельно review-ить.

После acceptance шага `Diagram Modules` Core уже знает Product Parts, clusters, standalone modules, lead Product Part и leadership order. Product Part briefs, lead order planning, cluster facade contracts и module specifications являются semantic/pre-code work. Для них ещё не нужен финально созданный application codebase.

Одновременно пользователь не должен получать несколько параллельных review prompts и несколько включённых confirmation buttons. Если шесть Product Part или node artifacts доходят до review почти одновременно, UI не должен просить пользователя действовать по всем ним сразу. Пользователь может читать много sessions, но активная точка принятия решения должна быть ровно одна.

Текущая marker model уже имеет базовые состояния обычного прогресса:

- gray: не начато;
- yellow: выполняется;
- green: завершено/принято.

Ей не хватает сильного состояния "система ждёт твоего действия именно здесь" и Core-owned правила выбора, какой pending review получает активный user input.

## 2. Решение

Использовать существующий sidebar Documentation Tree / Development Tree как основной surface ориентации пользователя. Для этого refactor не создавать отдельный action inbox.

Core владеет единственным review cursor:

```text
activeUserGate: UserGate | null
queuedUserGates: UserGate[]
```

Только `activeUserGate` принимает user action. Queued gates видимы и читаемы, но их review controls и chat input заблокированы, пока Core не повысит этот gate до active.

Project Manager отображает этот Core-owned cursor в существующем дереве:

- running nodes остаются yellow;
- completed nodes остаются green;
- active user gate получает pulsing amber/orange marker;
- queued user gates получают non-pulsing amber/orange marker или muted attention marker;
- blocker/error states остаются red и не должны смешиваться с обычным user review.

Pulsing marker — это сигнал "ответь здесь сейчас". Red остаётся зарезервированным для failed validation, blocked orchestration, missing artifacts или unrecoverable runtime errors.

## 3. Модель параллельного исполнения

Процесс Development Tree после accepted `Diagram Modules` должен быть разделён на две lanes.

### Линия A: фундамент проекта

Эта lane остаётся code-foundation owned:

```text
Application Skeleton
  -> Quality Gates Baseline
  -> verified code-generation readiness
```

`Quality Gates Baseline` по-прежнему зависит от accepted/materialized Application Skeleton. Этот refactor не снимает эту зависимость.

### Линия B: pre-code планирование Development Tree

Эта lane может выполняться параллельно с Lane A, но не в main workspace. Main workspace является orchestration/merge surface и должен оставаться чистым для managed Documentation Tree steps. Product Part agents получают отдельные deterministic worktree lanes уже на стадии pre-code документов:

```text
Product Part Development Briefs
  -> all Product Part briefs accepted
  -> lead DevelopmentOrderPlan.v2
  -> first allowed cluster / standalone module contract waves
  -> cluster facade contracts and module specifications
```

Lane B может производить pre-code artifacts, пока Lane A ещё готовит application foundation. Но она не должна производить implementation code или code-ready merges, пока Lane A не достигла verified readiness.

Новый invariant:

```text
main workspace
  -> только Core-owned orchestration, accepted checkpoints и sequential merges

product-part worktree lane
  -> agent-owned ProductPartDevelopmentBrief draft/session/commits
  -> user review gate
  -> Core-owned accepted merge back to main
```

Branches без worktree не считаются достаточной изоляцией: branch изолирует историю, но не изолирует working tree/index. Любая параллельная agent work должна иметь отдельный checkout через `git worktree`.

Разрешено до verified Quality Gates:

- Product Part Development Briefs;
- lead `DevelopmentOrderPlan.v2`;
- Core-readable wave/dependency graph;
- cluster facade contracts;
- module facade contracts;
- module function/specification artifacts;
- implementation TODO plans, описывающие будущую code work.

Запрещено до verified Quality Gates:

- писать production implementation code;
- утверждать, что cluster/module находится в состоянии code-ready;
- merge-ить downstream tree contents в main как implementation;
- запускать final code integration gates, которым нужен реальный skeleton/gate surface.

Если раннему pre-code artifact нужны точные file paths, которые ещё неизвестны до acceptance Application Skeleton, он должен использовать logical/provisional paths и помечать их как `pending_skeleton_alignment`. Core сможет repair или reconcile эти paths после Skeleton materialization.

## 4. Барьер Product Part Brief

Core должен запускать каждого planned Product Part agent для pre-code lane в отдельном Product Part worktree. Количество Product Parts произвольное и приходит из accepted `Diagram Modules`.

Каждый Product Part agent создаёт draft `ProductPartDevelopmentBrief`.

Только lead Product Part позже получает `DevelopmentOrderPlan.v2` assignment, и только после того, как Core записал user acceptance и последовательный accepted merge для каждого planned Product Part brief. Lead brief может быть создан в своём lane worktree как обычный Product Part brief, но order-plan turn остаётся заблокированным до barrier.

Barrier принадлежит Core:

```text
all planned Product Part briefs accepted?
  no  -> lead order-plan task remains blocked
  yes -> Core dispatches the lead order-plan prompt
```

Когда barrier открывается, lead prompt должен содержать полный текст каждого accepted Product Part brief inline. Paths являются только provenance; lead agent не должен быть вынужден самостоятельно искать или читать brief files.

User-review cursor делает это понятным в UI:

- secondary Product Part brief review gates могут становиться active по одному;
- lead Product Part order-plan node остаётся blocked или pending, пока эти review gates не resolved;
- когда все briefs accepted, Core promotes или dispatches lead order-plan task.

Existing test workspaces are not compatibility targets for this refactor. If the lane model changes workflow state deeply, FinderWidget-style test workspaces may be cleared back to the questionnaire and rerun from scratch.

## 5. Правила курсора user review

Core выбирает active review gate детерминированно.

Рекомендуемый порядок:

1. dependency-unblocking gates перед dependent gates;
2. Product Part brief gates перед lead `DevelopmentOrderPlan.v2`;
3. provider turns, завершившиеся раньше, перед provider turns, завершившимися позже;
4. tree order как последний tie-breaker.

Только active gate имеет включённые user actions:

- review buttons;
- revision/feedback input;
- accept/reject controls;
- managed repair entrypoints.

Queued gates являются read-only:

- пользователь может открыть node;
- пользователь может читать session history и artifacts;
- пользователь видит, почему input заблокирован;
- acceptance/revision action не принимается, пока Core не повысит gate до active.

Это parallel orchestration с sequential user decisions.

## 6. Поведение auto-open

Когда `activeUserGate` меняется, Project Manager должен один раз автоматически открыть соответствующие node, session и artifact panel.

Правила:

- auto-open происходит только при promotion to active, а не при каждом snapshot refresh;
- если пользователь уходит на другой node, pulsing marker остаётся доступным для ручного возврата;
- queued gates не должны перехватывать focus;
- переподключившиеся Project Manager clients читают тот же Core-owned cursor и показывают то же active/queued state;
- закрытие Project Manager не должно останавливать Core до следующего user gate.

## 7. Контракт snapshot

Core должен отдавать достаточно state, чтобы clients могли отображать дерево, не владея workflow truth.

Минимальные read-model fields:

```json
{
  "activeUserGate": {
    "id": "product-part:f1/brief-review",
    "nodeId": "product-part:f1",
    "reason": "review_required",
    "artifactPaths": [],
    "sessionId": "..."
  },
  "queuedUserGates": [
    {
      "id": "product-part:f2/brief-review",
      "nodeId": "product-part:f2",
      "reason": "waiting_for_user_review_cursor"
    }
  ],
  "nodes": [
    {
      "id": "product-part:f2",
      "status": "awaiting_user_review_queued",
      "inputLocked": true,
      "inputLockReason": "Another user gate is active."
    }
  ]
}
```

Точная TypeScript shape может отличаться, но ownership boundary не должна меняться: Core решает active/queued status; Project Manager отображает его.

## 8. Срезы реализации

Реализованные code refactor slices:

1. После acceptance `Diagram Modules` Core запускает Product Part pre-code lane: материализует нейтральный Development Tree artifact workspace, создаёт Product Part managed plans/drafts/sessions и отправляет первый prompt каждому planned Product Part agent по leadership order.
2. `Quality Gates Baseline` больше не является trigger или recovery/idempotency path для Product Part briefs; terminal handoff не запускает, не восстанавливает и не rebootstrap-ит Product Part sessions.
3. `Application Skeleton -> Quality Gates` остаётся code-readiness lane: production code, code-ready merge и final integration по-прежнему запрещены до verified Quality Gates.
4. Product Part pre-code agents работают в deterministic worktree lanes, поэтому main workspace остаётся clean после `Diagram Modules` acceptance.
5. Project Manager сохраняет tree projection: session физически живёт в lane worktree, но node отображается в основном Development Tree.
6. После user acceptance Core последовательно переносит accepted Product Part brief из lane в main workspace и делает managed checkpoint/merge commit.
7. User-gate cursor предъявляет review gates по одному: secondary briefs перед lead Product Part review/order-plan.
8. Lead `DevelopmentOrderPlan.v2` dispatch получает inline accepted briefs только после accepted checkpoint всех Product Part briefs.

## 9. Критерии приёмки

- Несколько Development Tree agents могут выполняться одновременно.
- Параллельные Product Part agents не оставляют dirty files в main workspace.
- `Application Skeleton` и `Quality Gates Baseline` могут стартовать из clean main workspace, пока Product Part lanes работают отдельно.
- Если несколько review gates становятся ready, ровно один gate active для user input.
- Active gate виден в sidebar через pulsing amber/orange marker.
- Queued gates видимы, но read-only.
- Selecting queued gate показывает его session/artifacts и Core-provided lock reason.
- Acceptance/rejection/revision active gate promotes следующий queued gate без полного restart Project Manager.
- Lead `DevelopmentOrderPlan.v2` не стартует, пока каждый Product Part brief не accepted.
- Clear/undo Product Part lane до merge удаляет lane worktree/branch/session state без изменений main workspace; после merge использует Core-owned sequential revert.
- Implementation остаётся Core-owned и работает, если Project Manager закрыт до следующего user gate.

## 10. Вне области

- Строить отдельный action inbox/dashboard.
- Позволять Project Manager выбирать active review gate.
- Разрешать несколько включённых user acceptance buttons одновременно.
- Генерировать production implementation code до готовности Application Skeleton и Quality Gates.
- Считать doc-only cluster boundary финальным merge.
- Запускать параллельные Product Part agents в main workspace.
- Поддерживать compatibility migration для уже созданных тестовых workspaces после глубокого изменения lane lifecycle.

## 11. Открытые вопросы

- Должны ли queued gates использовать static amber marker или более мягкий gray/amber marker?
- Должен ли Core persist-ить last auto-opened gate per client, или только отдавать global cursor, а каждый client сам suppress-ит повторный auto-open локально?
- Должны ли pre-code cluster/module contract waves стартовать сразу после accepted lead `DevelopmentOrderPlan.v2`, даже если Application Skeleton ещё выполняется, или первый релиз этого refactor должен ограничиться Product Part brief/order-plan gating?
