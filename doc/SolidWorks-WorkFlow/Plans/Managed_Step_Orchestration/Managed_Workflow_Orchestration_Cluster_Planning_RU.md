# Планирование кластера Managed Workflow Orchestration

**Статус:** черновик planning source.
**Создан:** 2026-05-14.
**Владелец:** Oleksandr + Codex.
**Scope:** перепроектировать Core-оркестрацию managed documentation steps до следующих точечных исправлений.

## 1. Зачем нужен этот planning

Текущая реализация managed workflow дошла до состояния, когда изолированные фиксы больше не дают надёжного результата.

Повторяющиеся дефекты видны на разных провайдерах и шагах:

- Core записывает синтетические маркеры commit-а вроде `included-in-commit` до появления реального Git commit.
- Managed step может выглядеть завершённым визуально, хотя `workspace.plan.md`, child plan и Git history всё ещё считают его незавершённым.
- Quality Gates может дойти до `integrated: true`, но Phase 4 user-return anchor не создаётся.
- Provider-visible feedback может одновременно содержать actionable rejection и wait-only инструкции.
- Пользовательские фразы подтверждения могут потеряться, уйти провайдеру или обработаться по-разному в разных шагах.
- Session restore может открыть start card вместо существующей workflow session.
- Recovery-поведение размазано между post-turn handlers, generated shell scripts, read-model code и provider dispatch.

Общая причина архитектурная: managed step orchestration сейчас не реализована как одна явная state machine. Она распределена между generated `plan-cli.mjs`, plan mutators, progress readers, post-turn arbitration, acceptance runners, feedback builders, provider dispatch, continuity restore и UI read-model projection.

Новый scope должен начинаться с архитектуры модулей/кластера, затем описывать фазы и сценарии переходов, и только после этого переходить к переписыванию реализации.

## 2. Текущая as-is структура

Сейчас логический "Core orchestrator" не является одним workflow-модулем.

Основные зоны кода:

- `packages/core/src/orchestrator/core-orchestrator.ts` запускает Core service, но не владеет managed workflow semantics.
- `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts` создаёт workflow sessions и подготавливает managed workspace lifecycle.
- `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts` устанавливает generated workspace scripts и hooks.
- `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts` генерирует `scripts/plan-orchestrator/plan-cli.mjs`.
- `packages/core/src/managed-workspace/managed-*-plan-mutator.ts` вставляет step-specific task pairs и phase anchors.
- `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts` выполняет post-turn arbitration.
- `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts` пытается выполнить Core-owned commits.
- `packages/core/src/remote-bridge/handlers/*-progress.ts` выводит phase/progress шага из artifacts и файлов workspace.
- `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts` отправляет provider-visible feedback.
- `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` маршрутизирует пользовательские сообщения и typed acceptance.

Текущие источники данных:

- `session.stage`;
- `doc/TODO/workspace.plan.md`;
- `doc/TODO/stages/<stage>/todo-plan.md`;
- `.codeai-hub/<workspaceSlug>/<stage>/**` artifacts;
- Git status и Git history;
- continuity chain;
- provider terminal events;
- UI workflow-state snapshot.

Текущий риск:

Нет единого модуля, который владеет полным переходом:

`provider turn completed` -> `validate` -> `commit` -> `advance child plan` -> `update workspace ledger` -> `send next prompt or open user phase`.

## 3. Целевой кластер

Нужно выделить отдельный Core Runtime cluster:

`Managed Workflow Orchestration`

Этот кластер владеет managed documentation steps начиная с `Diagram Modules` и предоставляет один canonical ingress/egress для state transitions.

Целевые модули:

1. `ManagedWorkflowOrchestrationFacade`
   - публичная точка входа для managed step orchestration;
   - принимает typed events от session/runtime boundaries;
   - возвращает typed decisions и effects;
   - скрывает внутренние модули от `remote-bridge`.

2. `ManagedWorkflowStepRegistry`
   - canonical registry managed steps;
   - связывает `stageId` со step controller, artifact contract, phase table, owned paths, prompts, validators и recovery policy;
   - предотвращает local drift между Diagram Modules, Application Skeleton и Quality Gates.

3. `ManagedWorkflowStateMachine`
   - чистый transition engine;
   - вход: current snapshot + event;
   - выход: next state + effect list;
   - без file writes, provider calls и Git commands.

4. `ManagedWorkflowSnapshotReader`
   - собирает один canonical snapshot из plan, workspace ledger, artifacts, Git, continuity, session state и provider turn state;
   - обнаруживает невозможные смешанные состояния, например `integrated: true` без integration commit.

5. `ManagedWorkflowEffectExecutor`
   - выполняет state-machine effects в детерминированном порядке;
   - вызывает plan mutation, Git transaction, provider message gateway, UI event emitter и continuity services;
   - записывает каждый завершённый effect.

6. `ManagedWorkflowCommitTransaction`
   - владеет atomic Git commit semantics;
   - никогда не переводит child plan в `DONE` до успешного реального Git commit;
   - никогда не пишет pseudo-hashes в `lastRecordedCommit`;
   - откатывает или переводит в blocked state при commit failure.

7. `ManagedWorkflowPlanStore`
   - читает/пишет child plans и workspace ledger;
   - заменяет scenario logic из generated scripts;
   - хранит только real Git hashes или явные non-commit dispositions.

8. `ManagedWorkflowProviderGateway`
   - provider-neutral dispatch Core messages в Claude/Codex/Gemini sessions;
   - гарантирует, что Core messages видны в session history/audit согласно назначению;
   - нормализует provider turn completion и failure events.

9. `ManagedWorkflowUserIntentClassifier`
   - классифицирует user messages внутри user-owned review phases;
   - различает acceptance, revision request, question/discussion и unrelated text;
   - поддерживает естественные подтверждения вроде `подтверждаю`, `окей`, `да`, `давай дальше`, `все хорошо`, `принимаю`, `согласен` и английские аналоги без разбросанных regex по dispatch code.

10. `ManagedWorkflowRecoveryArbiter`
    - решает, что делать, если orchestration выглядит зависшей;
    - обрабатывает network interruption, provider failure, missing terminal event, stale binding, rollover failure, partial commit state, user ambiguity и invalid provider output;
    - отдаёт typed recovery decisions, а не выполняет ad hoc mutations напрямую.

11. `ManagedWorkflowReadModelProjector`
    - проецирует canonical state в PM/sidebar/artifact panes;
    - read-only;
    - не может отправлять provider messages или запускать commits.

12. `ManagedWorkflowAuditLog`
    - записывает typed Core decisions, effects, blockers, recovery actions и provider-visible messages;
    - делает каждый retry/rejection/recovery восстановимым из durable evidence.

## 4. Целевой runtime flow

Все managed step decisions должны идти по одному пути:

```text
event received
  -> build canonical snapshot
  -> classify event
  -> run pure state-machine transition
  -> execute ordered effects
  -> re-read snapshot
  -> project read model
  -> emit exactly one next visible decision
```

Важное правило:

Plan advancement и workspace ledger updates происходят только после того, как effect, который они описывают, реально завершён.

Примеры:

- Task становится `DONE` только после успешного real commit.
- `Git Commit:` item получает real hash только после `git rev-parse HEAD`.
- `lastRecordedCommit` может быть real Git hash, `TBD` или `null`; никогда `included-in-commit`.
- Phase 4 user-return anchors вставляются только после финального accepted materialization/integration commit.
- Blocked Core-owned commit не создаёт provider repair work, если provider не может исправить причину.

## 5. Managed Step Controllers

Каждый managed step становится модулем за общим interface.

### 5.1 Diagram Modules Step Controller

Владеет:

- product-parts index;
- per Product Part artifacts;
- product-part sequence;
- repair task injection;
- final user-return phase.

Обязательные фазы:

1. Product Part index draft.
2. Product Part artifact generation loop.
3. Persistent user-return revisions.

Особое поведение:

- одновременно активен только один expected Product Part;
- downstream step не unlock-ится, пока все planned Product Parts не accepted и committed;
- финальный accepted Product Part открывает user-return anchor.

### 5.2 Application Skeleton Step Controller

Владеет:

- draft contract;
- user-led contract review;
- acceptance transition;
- filesystem materialization;
- post-completion user-return revisions.

Обязательные фазы:

1. Core-gated draft contract.
2. User-led review.
3. Accepted-only materialization.
4. Persistent user-return revisions.

Особое поведение:

- user acceptance должна быть Core command, а не provider message;
- materialization prompt стартует только после acceptance commit;
- Phase 4 открывается только после materialization commit.

### 5.3 Quality Gates Step Controller

Владеет:

- draft contract;
- user-led contract review;
- acceptance transition;
- Quality Gates integration;
- lifecycle hook wiring;
- post-completion user-return revisions.

Обязательные фазы:

1. Core-gated draft contract.
2. User-led review.
3. Accepted-only integration.
4. Persistent user-return revisions.

Особое поведение:

- `.husky/pre-commit` и `.husky/pre-push` являются agent-owned content во время Phase 3 integration, но validation и commit принадлежат Core;
- `integrated: true` недостаточно для завершения шага; должны существовать integration commit и запись в workspace ledger;
- Phase 4 должна открываться после любого финального validated `feat: integrate quality gates baseline` commit, включая split integration repair commits.

## 6. Event Model

Все переходы должны управляться typed events.

Core events:

- `STEP_STARTED`;
- `PROVIDER_TURN_STARTED`;
- `PROVIDER_TURN_COMPLETED`;
- `PROVIDER_TURN_FAILED`;
- `USER_MESSAGE_RECEIVED`;
- `USER_INTENT_ACCEPTED`;
- `USER_INTENT_REVISION_REQUESTED`;
- `USER_INTENT_DISCUSSION`;
- `VALIDATION_PASSED`;
- `VALIDATION_FAILED`;
- `COMMIT_REQUESTED`;
- `COMMIT_SUCCEEDED`;
- `COMMIT_BLOCKED`;
- `COMMIT_FAILED`;
- `ROLLOVER_REQUIRED`;
- `ROLLOVER_COMPLETED`;
- `SESSION_RESTORED`;
- `RECOVERY_TIMER_ELAPSED`;
- `WORKSPACE_DIRTY_CHANGED`.

Events должны содержать:

- workspace slug/root;
- stage id;
- session id/dialog id, если применимо;
- provider id, если применимо;
- current phase;
- current task id;
- correlation id;
- timestamp.

## 7. Матрица сценариев фаз

Каждая фаза должна явно описывать поведение для следующих сценариев.

### 7.1 Agent Turn Completed

Случаи:

- artifacts valid;
- artifacts invalid, но provider может исправить;
- artifacts invalid, потому что Core-owned boundary заблокирован;
- нет релевантного artifact diff;
- artifact diff вне owned scope;
- provider изменил файлы другого stage;
- provider слишком рано выставил lifecycle flags.

Ожидаемые выходы:

- commit accepted artifacts;
- inject repair task до provider-visible repair feedback;
- block for user/Core, если provider не может действовать;
- write failed-attempt evidence при необходимости;
- не отправлять generic wait-only provider instruction для actionable provider errors.

### 7.2 User Message Received In Review Phase

Случаи:

- явное acceptance;
- естественная фраза подтверждения;
- correction/revision request;
- question/discussion;
- ambiguous message;
- negated acceptance.

Ожидаемые выходы:

- acceptance command;
- revision task pair;
- discussion turn to provider только если phase это разрешает;
- clarification prompt to user;
- отсутствие accidental provider dispatch для acceptance commands.

### 7.3 Commit Boundary

Случаи:

- clean commit success;
- dirty files outside active stage allowlist;
- staged files outside active microtask;
- commit hook failure;
- plan mutation failure;
- ledger commit failure;
- no staged changes;
- partial plan mutation already exists.

Ожидаемые выходы:

- atomic success with real hash;
- blocked state with exact blocker owner;
- rollback partial markers;
- отсутствие `included-in-commit` persistence;
- отсутствие next task или Phase 4 до commit success.

### 7.4 Provider Or Network Failure

Случаи:

- stream interruption;
- нет terminal event;
- stale provider binding;
- provider session missing after restart;
- rollover materialization missing;
- Core message не виден в session log;
- provider resumes with wrong context.

Ожидаемые выходы:

- retry same provider turn, если это безопасно;
- rebind/resume provider session;
- create rollover continuation envelope;
- показать user-visible blocked state, если automatic recovery небезопасен;
- durable audit record.

### 7.5 Post-Completion User Return

Случаи:

- пользователь открывает completed step;
- пользователь просит revision;
- пользователь задаёт только вопрос;
- пользователь подтверждает, что изменений нет;
- user revision влияет на downstream stages.

Ожидаемые выходы:

- user-return anchor остаётся открытым;
- конкретная `revisionN` task pair создаётся только когда запрошена реальная revision work;
- discussion не создаёт fake commits;
- downstream OUTDATED propagation явная и durable.

## 8. Recovery Arbiter

`ManagedWorkflowRecoveryArbiter` является обязательным модулем, а не future enhancement.

Он получает canonical snapshot и решает, находится ли система в одном из состояний:

- normal wait for user;
- normal wait for provider;
- normal Core commit in progress;
- recoverable provider/session failure;
- recoverable partial Core transaction;
- user-actionable blocker;
- unrecoverable panic stop.

Пример typed decisions:

```ts
type ManagedWorkflowRecoveryDecision =
  | { kind: "wait_user"; reason: string }
  | { kind: "wait_provider"; reason: string }
  | { kind: "retry_provider_turn"; reason: string }
  | { kind: "resume_or_rebind_session"; sessionId: string }
  | { kind: "recover_rollover"; targetSessionId: string }
  | { kind: "rollback_partial_plan_mutation"; diagnostics: string[] }
  | { kind: "finalize_pending_commit"; expectedCommit: string }
  | { kind: "open_repair_task"; diagnostics: string[] }
  | { kind: "block_for_user"; blockers: string[] }
  | { kind: "panic_stop"; diagnostics: string[] };
```

Recovery arbiter не должен молча мутировать планы. Он возвращает decision; effect executor выполняет action и записывает результат.

## 9. Provider Factor

Различия провайдеров должны быть изолированы ниже orchestration state machine.

State machine не должна знать, что provider это Claude, Codex или Gemini, кроме normalized capabilities:

- supports shell tools;
- can write files;
- streams terminal events reliably;
- supports resume by provider session id;
- requires post-stop resume;
- has small context / rollover sensitivity;
- emits multi-segment assistant messages;
- supports hidden/internal messages.

Provider-specific behavior должно жить в:

- provider adapters;
- provider gateway normalization;
- session continuity/rebind logic;
- prompt envelope compatibility.

Managed step logic должен потреблять только normalized events:

- provider turn completed;
- provider turn failed;
- provider output persisted;
- provider session stale;
- rollover required;
- rollover completed.

## 10. Жёсткие инварианты

Эти инварианты должны обеспечиваться кодом и тестами.

1. `lastRecordedCommit` никогда не равен `included-in-commit`.
2. `Git Commit` hash может быть только `TBD`, real Git hash или явный non-commit disposition, например `not-created-user-accepted-without-review-revision`.
3. Commit task становится `DONE` только после появления real commit.
4. Plan mutation, описывающая commit, происходит после commit success или откатывается при failure.
5. Provider-visible repair message не отправляется до создания соответствующей repair task pair.
6. Core-owned blockers не отправляются как provider repair instructions.
7. User acceptance commands не отправляются provider-у.
8. User revision requests создают revision task pairs до provider work.
9. Phase 4 user-return anchor открывается только после final materialization/integration commit.
10. UI/read-model code не может запускать commits, отправлять provider messages или мутировать plans.
11. Каждое Core message к provider-у видно в managed audit log и, если нужно, в session feed.
12. Session restore должен предпочитать history-backed continuity новой start card.
13. Повторные content-readiness notes не могут создавать повторные пустые `taskN` items без commit.
14. Dirty files outside active stage allowlist блокируют Core transaction без продвижения child plan.
15. Rollover не может потерять current managed context, user acceptance command или active task.

## 11. Стратегия реализации

Не удалять всё сразу.

Рекомендуемый порядок миграции:

1. Заморозить новые point fixes, кроме аварийных blockers.
2. Добавить planning и state-machine design documents.
3. Ввести pure types: stage, phase, event, snapshot, decision, effect.
4. Реализовать `ManagedWorkflowSnapshotReader`.
5. Реализовать `ManagedWorkflowStateMachine` без side effects.
6. Реализовать atomicity в `ManagedWorkflowCommitTransaction` и убрать persistence `included-in-commit`.
7. Перевести Application Skeleton на новую state machine первым как reference step.
8. Перевести Quality Gates на ту же state machine.
9. Перевести Diagram Modules на ту же state machine.
10. Заменить scenario logic из generated `plan-cli.mjs` на `ManagedWorkflowPlanStore`.
11. Добавить `ManagedWorkflowRecoveryArbiter`.
12. Заменить разбросанный provider feedback/continuation dispatch на `ManagedWorkflowProviderGateway`.
13. Перевести PM workflow-state paths в read-only projection.
14. Удалить legacy duplicated mutators после прохождения parity tests.

## 12. Обязательная regression matrix

Минимальные scenario tests:

- пользователь сразу accepts;
- пользователь пишет `окей` вместо `подтверждаю`;
- пользователь даёт одну revision и потом accepts;
- пользователь даёт две revisions и потом accepts;
- provider создаёт valid draft;
- provider создаёт invalid draft;
- provider слишком рано выставляет accepted/integrated;
- provider пишет files outside stage scope;
- Core commit blocked by unrelated dirty file;
- Git commit fails after staging;
- plan mutation fails;
- ledger commit fails;
- repeated content-ready after blocked commit;
- `included-in-commit` не может сохраниться;
- Phase 4 opens after Application Skeleton materialization;
- Phase 4 opens after Quality Gates integration;
- Diagram Modules final part opens user-return;
- Core message appears in session/audit;
- rollover before user acceptance;
- rollover after user acceptance before integration prompt;
- rollover during provider integration;
- restart opens existing session, not start card;
- Claude, Codex и Gemini provider paths produce the same managed decisions.

## 13. Открытые design decisions

1. Должны ли review-anchor tasks использовать `SKIPPED` вместо synthetic non-commit hashes?
2. Должен ли `doc/TODO/stages/<stage>/todo-plan.md` оставаться execution state, или structured `.json` state должен стать machine source, а Markdown только projection?
3. Должны ли managed workspace scripts продолжать существовать в user workspaces, или Core должен владеть всей orchestration без generated scenario scripts?
4. Какая часть user intent classification должна быть rule-based, а какая model-assisted?
5. Где хранить recovery decisions: в `workspace.plan.md`, отдельном audit log или в обоих местах?
6. Как представлять downstream OUTDATED propagation после post-completion user-return revisions?

## 14. Acceptance Criteria для этого planning scope

Этот planning scope считается accepted, когда:

- согласованы целевой cluster/modules;
- согласована state/event/effect model;
- для каждого managed step есть phase scenario table;
- согласованы responsibilities recovery arbiter;
- implementation migration plan нарезан на microtasks;
- code rewrite не начинается до review state machine contract.

## 15. Handoff Для Реализации В Новом Worktree

Следующий implementation scope должен начаться в отдельном Git worktree, а не в текущем planning tree.

Рекомендуемый worktree:

```text
/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-managed-orchestrator
```

Рекомендуемая branch:

```text
codex/managed-orchestration-rewrite
```

Новый worktree должен считать этот planning package recovery-контекстом для агента с нулевым контекстом. В начале implementation scope нужно прочитать:

1. `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md`;
2. `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning_RU.md`;
3. `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`;
4. `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md`;
5. `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md`;
6. `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`;
7. `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Managed_Orchestration_Planning_RU.md`;
8. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`;
9. `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`;
10. `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`;
11. `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`;
12. `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`.

Смысл implementation scope:

- создать новый cluster `Managed Workflow Orchestration`, а не продолжать точечно чинить текущую размазанную реализацию;
- использовать legacy orchestrator code как reference, пока новый cluster вводится;
- не допускать двух спорящих владельцев одного transition: каждый migrated stage должен идти ровно через один orchestration path;
- мигрировать шаги по одному: сначала Diagram Modules, затем Application Skeleton, затем Quality Gates, если implementation plan явно не изменит порядок;
- удалять legacy generated-script/mutator/post-turn logic только после того, как соответствующий шаг полностью перешёл под новую state machine и прошёл regression tests.

Первый implementation plan не должен начинаться с удаления кода. Он должен начинаться с skeleton нового cluster, typed events/snapshots/effects, read-only snapshot reader и pure state machine tests. Удаление старого кода выполняется позже как controlled cutover, а не как первая задача.
