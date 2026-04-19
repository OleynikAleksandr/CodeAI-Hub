# Claude + Codex Duplication And PM Refresh — Umbrella Planning Doc

## 1. Purpose

Этот planning-doc объединяет три уже созданных design-intake scope в один execution umbrella:
- `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_LiveText_OrderSafe_Finalization_1.2.19.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Dialog_Duplication_StopResend_And_FinalAnswer_1.2.19.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_MultiWorkspace_Performance_And_EventDriven_UsageRefresh_1.2.19.md`

Цель umbrella-документа:
- открыть один активный `doc/TODO/todo-plan.md` вместо трёх параллельных планов;
- зафиксировать общий phase map;
- определить execution sequencing, где независимые задачи можно вести в любом порядке, а где нужен wave-order.

Важно:
- этот документ **не заменяет** child planning-doc по problem statement и evidence;
- child planning-doc остаются источником деталей по своим локальным bug classes;
- umbrella-док владеет только unified execution strategy и orchestration rules.

## 2. Planning Inputs And Bug Scope

### Claude follow-up
- Planning source: `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_LiveText_OrderSafe_Finalization_1.2.19.md`
- Bug: `BUG-2026-04-18-03`
- Проблема: после корректного final answer может появляться orphan suffix assistant bubble (`ell.`) из-за order-sensitive dual finalization.

### Codex duplication pair
- Planning source: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Dialog_Duplication_StopResend_And_FinalAnswer_1.2.19.md`
- Bugs:
  - `BUG-2026-04-18-04` — transient duplicate user bubble после `Stop` + fast resend;
  - `BUG-2026-04-18-05` — persisted duplicate final assistant answer из rollout finalization.

### PM/Core performance scope
- Planning source: `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_MultiWorkspace_Performance_And_EventDriven_UsageRefresh_1.2.19.md`
- Bug: `BUG-2026-04-18-06`
- Проблема: multi-workspace usage порождает repeated refresh/bootstrap/polling churn и делает ownership `usageLimits`/`tokenUsage` mount-driven вместо event-driven.

## 3. Why One Unified `todo-plan.md`

Один unified execution cycle здесь предпочтительнее трёх отдельных `todo-plan.md`, потому что:
- Claude и Codex duplication fixes независимы по provider files, но сходятся в одних и тех же release/docs/update gates;
- PM optimistic duplicate и PM performance churn пересекаются по одним и тем же PM dialog/controller файлам, поэтому их нужно координировать в одном execution dashboard;
- пользователю нужен один прозрачный active plan, где видно не только список задач, но и какие из них независимы, а какие обязаны идти wave-by-wave.

Следовательно:
- active execution cycle открывается одним `doc/TODO/todo-plan.md`;
- child planning-doc остаются supporting references внутри context pack;
- execution sequencing переносится в явные wave/order markers внутри `todo-plan.md`.

## 4. Unified Scope Statement

В этот umbrella cycle входят четыре user-visible bug class:
1. Claude orphan suffix after completed final answer.
2. PM transient duplicate user bubble after `Stop` + fast resend.
3. Codex persisted duplicate final assistant answer from rollout terminal pair.
4. PM/Core background churn from repeated usage refresh/bootstrap/polling across multiple open workspaces.

### In scope
- provider-local fixes в Claude и Codex messaging/rollout layers;
- PM optimistic reconciliation;
- event-driven ownership for `usageLimits` / `tokenUsage`;
- visibility-aware suppression of idle/background PM polling;
- required regression guards, SSOT sync и release closeout.

### Out of scope
- глобальная cross-provider дедупликация всех message classes;
- redesign Session UI visual model;
- изменение native provider rollout/event schemas;
- доказательство process leak без отдельного profiler scope;
- новая продуктовая функциональность вне этого bugfix umbrella.

## 5. Execution Decomposition

### Stream A — Claude order-safe finalization
- Ownership: `packages/Claude_Module/src/messaging/*`
- Goal: single-owner finalization для одного Claude text block и suppression orphan suffix after final answer.

### Stream B — Codex rollout terminal dedupe
- Ownership: `packages/Codex_Module/src/rollout/*`, replay tests in `packages/Codex_Module/src/messaging/*`
- Goal: one semantic final assistant emission across `final_answer` and `task_complete`, включая observed case без `turn_id`.

### Stream C — PM optimistic reconciliation
- Ownership: `src/client/project-manager/components/sessions/*`
- Goal: схлопнуть optimistic user bubble с canonical tail history после `Stop` + fast resend.

### Stream D — PM/Core event-driven telemetry and polling budget
- Ownership:
  - PM session surfaces and dialog lifecycle;
  - workflow/artifact polling services;
  - core replay/bootstrap ownership;
  - provider turn-completion telemetry guarantees.
- Goal: убрать mount-driven automatic refresh и repeated idle churn.

### Stream E — SSOT, release notes, archive closeout
- Ownership: `doc/SolidWorks-WorkFlow/*`, `README.md`, `CHANGELOG.md`, `doc/TODO/*`
- Goal: синхронизировать contracts, собрать release, закрыть bugs и archive planning scope.

## 6. Execution Sequencing Contract

### Independent streams
- Независимая микро-задача может выполняться в любом порядке относительно других независимых задач.
- Это допустимо только если write-scope не пересекается с другими незавершёнными задачами.
- Как только выявляется file overlap или скрытая dependency, задача должна быть переведена в wave-ordered поток до начала реализации.

### `WAVE-N`
- Микро-задача принадлежит волне `N` и не стартует раньше закрытия blocking задач предыдущей волны.
- Используется там, где есть file overlap, dependency on prior refactor, или где нужен deliberate integration order.

### Additional execution rules
- Если в ходе разработки выясняется, что declared independent-задача реально пересекается по write-scope с другой активной задачей, `todo-plan.md` обязан быть переписан до старта реализации.
- Commit step наследует sequencing marker своей парной микро-задачи: ownership одной write-scope не разрывается между разными шагами плана.

## 7. Canonical Phase Map

### Phase 1 — Independent duplication fixes
- `Stream A / Claude` — независимый provider-local stream.
- `Stream B / Codex rollout` — независимый provider-local stream.
- `Stream C / PM optimistic reconciliation` — независимый PM stream, но должен завершиться до PM performance tasks, которые трогают те же dialog/controller files.

### Phase 2 — PM/Core performance hardening
- Сначала идёт wave around PM session/usage ownership.
- Затем dialog/bootstrap suppression.
- Затем visibility-aware polling.
- Затем core/provider replay guarantees.

То есть Phase 2 intentionally волновая, потому что внутри неё есть пересечение по PM/Core ownership и нужен controlled integration order.

### Phase 3 — SSOT sync and release closeout
- Обновление module/cluster/system contracts.
- Final release notes and closeout packaging.
- Build/release closeout.
- Archive active planning scope and close Bug Registry entries.

## 8. Context Pack For Active `todo-plan.md`

Перед implementation новый active plan должен ссылаться минимум на:
- `doc/BugRegistry.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- все три child planning-doc из §1.

## 9. Execution Readiness

На момент создания umbrella-дока согласованы следующие решения:
- три planning-doc объединяются в один active execution cycle;
- в `doc/TODO/todo-plan.md` добавляется execution sequencing marker;
- marker должен различать независимые задачи и задачи, требующие wave-order;
- текущая сессия intentionally останавливается на planning-only kickoff без начала реализации.

Следующий шаг этой же execution line:
- создать active `doc/TODO/todo-plan.md` на базе этого umbrella-дока;
- не начинать кодовую реализацию, пока пользователь explicitly не переведёт сессию из planning kickoff в implementation work.
