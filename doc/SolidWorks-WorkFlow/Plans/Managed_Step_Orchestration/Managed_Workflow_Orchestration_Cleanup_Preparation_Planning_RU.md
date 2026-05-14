# Managed Workflow Orchestration — Cleanup Preparation Planning

**Status:** draft planning source.
**Created:** 2026-05-14.
**Owner:** Oleksandr + Codex.
**Scope:** подготовить кодовую базу к чистой имплементации нового кластера `Managed Workflow Orchestration` через последовательное удаление старого рассыпанного orchestration ownership.

## 1. Зачем нужен этот документ

Новый кластер оркестрации нельзя безопасно строить поверх старого orchestration path. Текущая реализация уже доказала, что точечные фиксы оставляют хвосты:

- transition logic живет одновременно в post-turn service, plan mutators, generated workspace scripts, read-model paths, provider feedback и session dispatch;
- один и тот же шаг может выглядеть завершенным в UI, но оставаться незавершенным в child plan, workspace ledger или Git history;
- commit markers и phase anchors могут появляться до реального Git commit;
- user acceptance может быть перехвачен одним контуром и пропущен другим;
- read-model и recovery paths знают слишком много о write-side orchestration.

Цель cleanup scope: удалить старого владельца managed orchestration так, чтобы перед созданием нового кластера в кодовой базе не осталось второго конкурирующего transition owner.

## 2. Граница Scope

Входит:

- инвентаризация всех legacy managed orchestration entrypoints, writers и tests;
- временный fail-closed boundary для managed documentation steps на время переписывания;
- удаление или нейтрализация старых transition writers;
- удаление старых generated scenario/mutator paths;
- очистка импортов, тестов, fixture data и документационных ссылок, которые описывают старый владелецкий путь как активный;
- компиляция и проверки dead code / links после cleanup.

Не входит:

- создание нового кластера `Managed Workflow Orchestration`;
- реализация state machine, snapshot reader, effect executor или provider gateway;
- перенос Diagram Modules / Application Skeleton / Quality Gates на новый runtime path;
- проектирование полного future user-return/revision workflow после persistent return anchor.

Следующий planning-документ после этого cleanup scope должен описывать уже организацию нового кластера и последовательную проверку трех шагов в порядке:

1. `Diagram Modules`;
2. `Application Skeleton`;
3. `Quality Gates`.

## 3. Исходные Документы

Этот cleanup plan опирается на:

- `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md`;
- `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`;
- `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`;
- `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md`;
- `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md`;
- `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Managed_Orchestration_Planning_RU.md`;
- `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`;
- `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`;
- `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`;
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.

## 4. Что Считается Старым Оркестратором

Legacy managed orchestration ownership включает все runtime paths, которые сегодня могут самостоятельно:

- создавать или продвигать child plan tasks/phases;
- писать commit hash или pseudo-hash;
- запускать Core-owned managed commit;
- отправлять provider-visible continuation/repair/acceptance messages;
- классифицировать user acceptance внутри managed review phase;
- открывать Phase 4 / persistent return anchor;
- принимать recovery decision и тут же мутировать plan/session state;
- запускать эти действия из read-model, polling или UI snapshot paths.

Первичная зона инвентаризации:

- `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`;
- `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts`;
- `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts`;
- `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts`;
- `packages/core/src/remote-bridge/handlers/*-repair-orchestration.ts`;
- `packages/core/src/remote-bridge/handlers/*-revision-injection-runner.ts`;
- `packages/core/src/remote-bridge/handlers/*-continuation-dispatcher.ts`;
- `packages/core/src/remote-bridge/handlers/*accept-contract*`;
- `packages/core/src/managed-workspace/managed-*-plan-mutator.ts`;
- `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts`;
- `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts`;
- tests and fixtures that assert old behavior as the active path.

Important boundary: repo-local `scripts/plan-orchestrator/**` is the development lifecycle used by this repository and must not be deleted as part of the product managed-workflow cleanup unless a separate plan explicitly replaces the repository planning lifecycle. Cleanup targets the Core-generated user-workspace orchestration path and scattered managed workflow runtime ownership.

## 5. Cleanup Principles

1. **No two owners.** После cleanup ни один legacy handler/mutator/read-model path не должен оставаться способным продвинуть managed stage.
2. **Fail closed.** Пока новый кластер не создан, managed documentation steps from `Diagram Modules` onward должны отвечать явным Core blocker/disabled state, а не пытаться продолжить старый сценарий.
3. **Compile after each removal wave.** Удаление идет малыми wave-ами с обязательной сборкой затронутого контура.
4. **Read-model stays read-only.** PM/workflow-state projection может показывать disabled/blocker state, но не может запускать commits, provider messages или plan mutations.
5. **No synthetic state.** `included-in-commit`, fake phase completion, duplicate empty tasks и synthetic hash markers не должны пережить cleanup.
6. **No hidden provider dispatch.** Acceptance/revision/repair feedback не должен уходить provider-у из старых helper paths после введения cleanup boundary.
7. **Dead code is removed, not hidden.** Если после fail-closed boundary код больше недостижим, он удаляется вместе с тестами и документированными ссылками на active behavior.

## 6. Последовательность Работ Для Следующего `todo-plan.md`

### Phase 1 — Baseline And Legacy Inventory

Цель: получить точную карту старого orchestration ownership перед удалением.

Работы:

- зафиксировать baseline: `git status --short`, `npm run plan:status`, `npm run build:core`;
- собрать reachability map через `rg` по managed workflow symbols, imports и tests;
- разделить найденные файлы на группы:
  - delete: старые transition owners;
  - replace with fail-closed boundary: public entrypoints, которые нужны для компиляции до нового кластера;
  - keep/rehome: stack-neutral helpers без managed transition ownership;
  - protect: repo-local lifecycle tooling, не относящийся к product managed orchestration;
- оформить kill list в active `todo-plan.md` или отдельном tracked cleanup note, если список слишком длинный.

DoD:

- есть явная kill list;
- нет неразобранных старых owner paths;
- команда `npm run build:core` проходит на исходном baseline или known failure записан как blocker до удаления.

### Phase 2 — Temporary Fail-Closed Managed Boundary

Цель: сначала перекрыть старый runtime path, затем удалять внутренности.

Ожидаемое поведение:

- старт managed documentation stage, post-turn managed arbitration, user acceptance command и managed recovery не запускают старый сценарий;
- Core возвращает typed disabled/blocker decision вроде `managed_workflow_rewrite_in_progress`;
- PM получает понятное состояние: managed steps temporarily unavailable during orchestration rewrite;
- provider turn не стартует из старого managed entrypoint;
- child plan/workspace ledger не мутируются из старого path.

Проверки:

- tests на no provider dispatch;
- tests на no plan mutation;
- tests на read-model-only projection для disabled state.

### Phase 3 — Remove Generated Scenario And Plan-Mutator Ownership

Цель: убрать старую генерацию сценарной логики для user workspaces.

Кандидаты:

- `managed-plan-orchestrator-shim-source.ts`;
- `managed-application-skeleton-plan-mutator.ts`;
- `managed-diagram-modules-plan-mutator.ts`;
- `managed-quality-gates-plan-mutator.ts`;
- installer tests that assert generated scenario behavior;
- hook/bootstrap code that exists only to install the old generated scenario path.

Оставлять можно только stack-neutral managed workspace bootstrap pieces, если они не создают/продвигают managed step tasks and phases.

Проверки:

- `rg "inject.*TaskPair|create.*PlanMutator|createPlanCliShim|included-in-commit" packages/core/src`;
- `npm run build:core`;
- targeted unit tests for surviving managed workspace bootstrap helpers.

### Phase 4 — Remove Post-Turn Commit And Feedback Ownership

Цель: удалить старый Core-owned transition pipeline из remote-bridge handlers.

Кандидаты:

- post-turn arbitration service;
- managed documentation commit transaction;
- workflow-state managed documentation commit helpers;
- acceptance feedback;
- stage accept contract runners;
- repair orchestration helpers;
- revision injection runners;
- continuation dispatchers.

Сохраняемые public surfaces должны либо:

- возвращать fail-closed disabled decision;
- либо быть удалены вместе с import/caller chain.

Проверки:

- `rg "ManagedWorkflowPostTurnService|ManagedDocumentationCommitTransaction|WorkflowAgentAcceptanceFeedback|commitManagedDocumentationStageIfReady" packages/core/src`;
- `npm run build:core`;
- tests that old acceptance phrases are not routed into provider dispatch through legacy code.

### Phase 5 — Clean Project Manager / Read Model Coupling

Цель: убрать side-effect assumptions из workflow-state/read-model paths.

Работы:

- проверить `workflow-state-service` и related progress readers на hidden writes/provider dispatch;
- заменить старые active managed progress assumptions на disabled/blocker projection until new cluster exists;
- удалить UI tests, которые ожидают старый managed orchestration completion path;
- оставить просмотр существующих артефактов только если он read-only и не открывает new start/repair/acceptance flow.

Проверки:

- `npm run build:project-manager`;
- `npm run typecheck:webview`;
- targeted tests for disabled managed state rendering, если они есть в затронутом контуре.

### Phase 6 — Remove Legacy Tests, Fixtures, And Allowlist Debt

Цель: убрать тестовый и архитектурный хвост старого оркестратора.

Работы:

- удалить tests that verify old generated scripts/mutators/post-turn behavior;
- удалить fixture files used only by deleted paths;
- очистить `scripts/check-architecture-rules/max-lines-debt-allowlist.txt` от legacy entries, если файлы удалены;
- удалить stale docs references that describe legacy path as active implementation.

Проверки:

- `npm run check:architecture`;
- `npm run lint`;
- `npm run check:knip`;
- `npm run format:fix`.

### Phase 7 — Final Verification And Dead-Link Cleanup

Цель: доказать, что кодовая база готова к чистой имплементации нового кластера.

Обязательные команды:

```bash
npm run build:core
npm run build:project-manager
npm run typecheck:webview
npm run check:knip
npm run check:links
npm run check:dup
```

Если затронуты shared packages или compile-level imports, дополнительно:

```bash
npm run compile
```

DoD:

- no TypeScript compile errors;
- no knip dead exports/files from old orchestration;
- no broken Markdown links;
- no jscpd regression above threshold;
- no references to `included-in-commit`;
- no imports of removed legacy owner classes;
- old managed workflow entrypoints fail closed until the new cluster implementation scope starts.

## 7. Acceptance Criteria Cleanup Scope

Cleanup scope считается завершенным, когда:

- старый managed orchestration ownership физически удален или заменен на минимальный fail-closed boundary;
- `Diagram Modules`, `Application Skeleton`, `Quality Gates` больше не имеют legacy transition writers;
- generated scenario/mutator logic не участвует в runtime path;
- read-model code не выполняет writes/commits/provider dispatch;
- все surviving managed workflow files имеют понятную не-orchestration ответственность;
- документационные ссылки не называют удаленный path активным владельцем;
- сборка и проверки из Phase 7 прошли;
- пользователь принял, что кодовая база готова к следующему planning-документу про новый кластер.

## 8. Что Должен Описать Следующий Документ

Следующий planning-документ после cleanup должен описать не удаление, а создание нового orchestration cluster:

- skeleton modules and facades;
- typed events/snapshots/decisions/effects;
- read-only snapshot reader;
- pure state machine;
- effect executor;
- plan store;
- provider gateway;
- recovery arbiter;
- step controllers in order `Diagram Modules -> Application Skeleton -> Quality Gates`;
- sequential regression matrix for all three steps.

До acceptance cleanup scope новый cluster code не создается.
