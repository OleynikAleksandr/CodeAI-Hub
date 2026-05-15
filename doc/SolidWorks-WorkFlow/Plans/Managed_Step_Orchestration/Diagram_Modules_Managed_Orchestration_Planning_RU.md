# Diagram Modules — Managed Orchestration Planning

**Статус:** черновик принятого сценария для будущей реализации.
**Создан:** 2026-05-14.
**Scope:** сценарий managed orchestration для шага `Diagram Modules`.
**Опорные типы фаз:** [Type A — Core-Gated Agent Work](Managed_Workflow_Orchestration_Cluster_Planning.md#type-a--core-gated-agent-work), [Type B — User-Led Review](Managed_Workflow_Orchestration_Cluster_Planning.md#type-b--user-led-review), [Persistent Return Open Boundary](Managed_Workflow_Orchestration_Cluster_Planning.md#persistent-return-open-boundary).

## 1. Цель

Diagram Modules должен состоять из трёх фаз:

1. Phase 1 — Diagram Modules Artifacts, reusable Type A.
2. Phase 2 — Diagram Modules User-Led Review, reusable Type B.
3. Phase 3 — Persistent Diagram Modules User Return, только открытие persistent return boundary.

Текущая ошибка старого сценария: после Phase 1 сразу создаётся `Persistent Diagram Modules User Return`. Это неверно, потому что пользователь ещё не подтвердил содержательную корректность диаграмм. Между Core-gated генерацией и persistent return должна быть нормальная user-led review фаза.

## 2. Phase 1 — Diagram Modules Artifacts

**Тип фазы:** [Type A — Core-Gated Agent Work](Managed_Workflow_Orchestration_Cluster_Planning.md#type-a--core-gated-agent-work).

### Stream: Diagram Modules Artifacts

Core по очереди ставит агенту задачи на создание Diagram Modules artifacts:

- startup scaffold для managed workspace: `doc/TODO/workspace.plan.md`, `doc/TODO/stages/**/todo-plan.md`, `scripts/plan-orchestrator/plan-cli.mjs`, hooks и plan scripts;
- `product-parts.index.md` как первый provider turn;
- Product Part diagram artifacts, например `project-manager.md`, `vs-code-extension.md`, `core-runtime.md`, `ai-providers.md`;
- любые следующие Product Part artifacts из canonical workflow index.

Core owns:

- startup scaffold до первого provider prompt;
- prompt для текущего subturn: сначала index, затем ровно один Product Part из принятого index;
- validation artifact form/paths;
- Git commit каждой safe attempt;
- sequencing следующего Product Part;
- переход в Phase 2 после accepted commit последнего Product Part.

Agent owns:

- содержание только текущего named artifact;
- исправление Core diagnostics внутри текущей Type A attempt.

После каждого валидного subturn Core делает real Git commit и пишет real hash. Safe rejected attempts могут быть закоммичены как durable history, если они принадлежат Diagram Modules owned scope.

Phase 1 завершается, когда все Product Part diagram artifacts созданы, проверены Core и имеют real commits.

Runtime continuation invariant:

- агент не должен сам переходить от index к Product Part или от одного Product Part к следующему;
- окончание каждого provider turn является триггером Core post-turn arbitration;
- Core обязан либо отправить repair diagnostics, либо отправить continuation prompt на следующий Product Part, либо открыть Phase 2;
- молчаливое завершение provider turn в `Diagram Modules` является дефектом оркестратора.

Acceptance finding from release `1.2.259`:

- Core successfully accepted the index turn and dispatched the next Product Part prompt for `project-manager`;
- Core did not create the managed workspace scaffold at Diagram Modules start in the actual provider workspace;
- after rejecting `product-parts/project-manager.md` with invalid heading diagnostics, Core only wrote a passive visible diagnostic and did not dispatch a provider-visible repair prompt.

Repair invariant: a rejected current subturn is still an active Type A attempt. Core must send the provider an executable repair prompt that includes the exact target path and deterministic diagnostics, then wait for the next provider terminal turn. The user input may be free for observation, but provider repair must not depend on the user manually copying Core diagnostics back to the agent.

## 3. Phase 2 — Diagram Modules Review

**Тип фазы:** [Type B — User-Led Review](Managed_Workflow_Orchestration_Cluster_Planning.md#type-b--user-led-review).

### Stream: User-Led Review

После успешной Phase 1 Core создаёт Phase 2:

```text
## Phase 2 — Diagram Modules Review

### Stream: User-Led Review
```

Core пишет пользователю localized message в Project Manager dialog / persistent managed session:

```text
Core завершил проверку Diagram Modules artifacts.

Все Product Part диаграммы созданы и зафиксированы в Git. Открыт этап пользовательского review: проверьте диаграммы по смыслу.

Если всё подходит, напишите «подтверждаю». Если нужны изменения, перечислите правки, которые нужно внести перед завершением шага Diagram Modules.
```

Поле ввода пользователя должно быть свободно сразу после этого сообщения.

Phase 2 использует общий Type B contract:

- direct acceptance закрывает review task с non-commit disposition и открывает Phase 3;
- user revision request остаётся внутри текущей review task;
- Agent исправляет Diagram Modules artifacts;
- Core валидирует исправления;
- valid revision получает real Git hash;
- после real revision commit Core открывает следующий review task;
- ambiguous text получает clarification message, а не provider prompt.

Нельзя называть Phase 2 `User Return And Revisions`: это ещё не post-completion return, а обычное пользовательское review перед завершением шага.

## 4. Phase 3 — Persistent Diagram Modules User Return

**Тип boundary:** [Persistent Return Open Boundary](Managed_Workflow_Orchestration_Cluster_Planning.md#persistent-return-open-boundary).

### Stream: User Return And Revisions

Phase 3 создаётся только после того, как пользователь подтвердил Diagram Modules в Phase 2.

Core создаёт:

```text
## Phase 3 — Persistent Diagram Modules User Return

### Stream: User Return And Revisions
```

Core пишет пользователю localized message:

```text
Core принял Diagram Modules.

Диаграммы Product Part зафиксированы в Git, и шаг Diagram Modules завершён. Для него открыт постоянный режим возврата: вы можете в любой момент вернуться к этому шагу и попросить изменить диаграммы.

Поле ввода доступно для будущих правок по Diagram Modules. Если правок сейчас нет, продолжайте следующий шаг workflow.
```

Этот документ не описывает полный future user-return/revision workflow. Будущие возвраты пользователя, refactoring requests, downstream impact и repeated revision commits должны проектироваться отдельно в user-return/revision orchestration module.

## 5. Hard Invariants

1. Phase 2 не создаётся до real commit последнего Product Part artifact.
2. Phase 2 всегда называется `User-Led Review`, не `User Return And Revisions`.
3. Phase 3 не создаётся до пользовательского acceptance в Phase 2.
4. Phase 3 только открывает persistent return boundary.
5. Core messages пользователю пишутся в persistent managed session.
6. Пользовательское поле ввода свободно при старте Phase 2 и после открытия Phase 3.
7. `lastRecordedCommit` хранит только real Git hash.
8. Managed scaffold создаётся при старте Diagram Modules до первого provider prompt.
9. Каждый Product Part prompt формируется из принятого `product-parts.index.md`; hardcoded Product Part list запрещён.
