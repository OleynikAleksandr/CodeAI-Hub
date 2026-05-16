# Quality Gates — Managed Orchestration Planning

**Статус:** архивный принятый planning source; реализован и принят в релизе `1.2.274`.
**Создан:** 2026-05-14.
**Scope:** сценарий managed orchestration для шага `Quality Gates`.
**Опорные типы фаз:** [Type A — Core-Gated Agent Work](Managed_Workflow_Orchestration_Cluster_Planning.md#type-a--core-gated-agent-work), [Type B — User-Led Review](Managed_Workflow_Orchestration_Cluster_Planning.md#type-b--user-led-review), [Persistent Return Open Boundary](Managed_Workflow_Orchestration_Cluster_Planning.md#persistent-return-open-boundary).

## 1. Цель

Quality Gates должен состоять из четырёх фаз:

1. Phase 1 — Quality Gates Contract Bootstrap, reusable Type A.
2. Phase 2 — Quality Gates Contract Review, reusable Type B.
3. Phase 3 — Quality Gates Integration, reusable Type A.
4. Phase 4 — Persistent Quality Gates User Return, только открытие persistent return boundary.

Состав фаз должен быть аналогичен Application Skeleton: сначала Core проверяет форму draft contract, затем пользователь принимает или правит contract по смыслу, затем Core запускает accepted-only integration, и только после принятой integration создаёт persistent return фазу.

Старый сценарий нельзя переносить в новый cluster:

- Phase 2 не должна создавать отдельную `quality-gates.phase2.acceptance.task1`;
- пользовательское `подтверждаю` не должно уходить провайдеру как обычное сообщение;
- Phase 3 не должна завершаться synthetic marker `included-in-commit`;
- `integrated: true` в artifact не завершает шаг без real integration commit;
- Phase 4 должна создаваться всегда после accepted integration commit.

## 2. Phase 1 — Quality Gates Contract Bootstrap

**Тип фазы:** [Type A — Core-Gated Agent Work](Managed_Workflow_Orchestration_Cluster_Planning.md#type-a--core-gated-agent-work).

### Stream: Core-Gated Initial Draft

Core открывает Quality Gates step и отправляет агенту первый provider-visible prompt.

Agent должен подготовить canonical draft contract:

- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md`;
- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json`.

Core owns:

- стартовый prompt;
- contract form validation;
- проверку required fields и lifecycle flags;
- Git commit каждой safe Type A attempt;
- переход в Phase 2 после accepted draft commit.

Agent owns:

- содержание Quality Gates draft contract;
- исправление Core diagnostics внутри текущей Phase 1 attempt.

Phase 1 accepted state:

```text
accepted = false
integrated = false
integrationState = draft | not_started
```

Agent не должен самовольно выставлять `accepted: true` или `integrated: true` в Phase 1.

Если Core принимает draft contract, он делает real Git commit:

```text
docs: draft quality gates contract
```

После этого Core создаёт Phase 2 и пишет пользователю localized handoff message.

## 3. Phase 2 — Quality Gates Contract Review

**Тип фазы:** [Type B — User-Led Review](Managed_Workflow_Orchestration_Cluster_Planning.md#type-b--user-led-review).

### Stream: User-Led Review

После успешной Phase 1 Core создаёт:

```text
## Phase 2 — Quality Gates Contract Review

### Stream: User-Led Review
```

Core пишет пользователю localized message в Project Manager dialog / persistent managed session:

```text
Core завершил проверку черновика Quality Gates.

Форма артефактов корректна, поэтому открыт этап пользовательского review.

Пожалуйста, проверьте Quality Gates contract по смыслу. Если всё подходит, напишите «подтверждаю». Если нужны изменения, перечислите правки, которые нужно внести перед интеграцией.
```

Поле ввода пользователя должно быть свободно сразу после этого сообщения.

Child plan должен содержать review task и paired conditional outcome line:

```md
3. [IN_PROGRESS] `quality-gates.phase2.review.task1` User reviews Quality Gates contract and either accepts it or requests revision (scope: user decision + `.codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json`; expected commit: `docs: revise quality gates contract revision 1`).
4. [TODO] Git Commit: `docs: revise quality gates contract revision 1` (hash: TBD)
```

Нельзя создавать отдельную acceptance task. Review task уже является микрозадачей, у которой есть два исхода:

- direct acceptance закрывает outcome line с non-commit disposition `not-created-user-accepted-without-review-revision` и открывает Phase 3;
- user revision request остаётся внутри текущей review task, агент исправляет contract, Core валидирует и при успехе пишет real Git hash в эту же outcome line.

После valid revision commit Core открывает следующий review cycle:

```text
quality-gates.phase2.review.task<N+1>
Git Commit: docs: revise quality gates contract revision <N+1>
```

Ambiguous user text получает clarification message пользователю, а не provider prompt.

## 4. Phase 3 — Quality Gates Integration

**Тип фазы:** [Type A — Core-Gated Agent Work](Managed_Workflow_Orchestration_Cluster_Planning.md#type-a--core-gated-agent-work).

### Stream: Accepted-Only Integration

Phase 3 создаётся только после пользовательского acceptance в Phase 2.

Core открывает:

```text
## Phase 3 — Quality Gates Integration

### Stream: Accepted-Only Integration
```

Core первым provider-visible сообщением объясняет агенту:

- Quality Gates contract принят пользователем;
- теперь нужно интегрировать accepted baseline в workspace;
- какие artifacts являются source of truth;
- какие files/directories можно менять;
- что integration считается завершённой только после созданных scripts/configs/package scripts/hook wiring и Core validation;
- что нельзя выполнять Git-команды, менять child plan status/hash или workspace ledger;
- что после работы нужно остановиться с content-readiness note.

Phase 3 owned scope должен включать только явно разрешённые Quality Gates integration files, например:

- `.codeai-hub/<workspaceSlug>/quality_gates/**`;
- `package.json`;
- `package-lock.json`;
- quality gate configs;
- `scripts/quality-gates/**` или другой canonical scripts directory, выбранный contract;
- `.husky/pre-commit`;
- `.husky/pre-push`;
- CI/update files, если они прямо входят в accepted contract.

Core validation проверяет:

- canonical `quality-gates.md` и `quality-gates.json` существуют и согласованы;
- contract принят пользователем;
- declared gate commands есть в `package.json`;
- required gates wired into lifecycle hooks;
- `.husky/pre-commit` и `.husky/pre-push` соответствуют accepted contract;
- dirty files входят в Phase 3 allowlist;
- agent не менял child plan, hashes или workspace ledger;
- `integrated: true` и `integrationState: integrated` не выставлены без фактически созданной integration.

Accepted attempt:

1. Core stages только Phase 3 owned files.
2. Core commits:

   ```text
   feat: integrate quality gates baseline attempt <N>
   ```

3. Paired outcome line получает real Git hash.
4. Current integration task становится `DONE`.
5. `lastRecordedCommit` обновляется только real Git hash.
6. Workspace ledger фиксирует accepted integration commit.
7. Core создаёт Phase 4.

Rejected-safe attempt:

1. Core stages safe Phase 3 owned files.
2. Core commits current attempt как durable history.
3. Paired outcome line получает real Git hash.
4. Current task получает diagnostics `Result: rejected by Core`.
5. Core создаёт следующую integration attempt task.
6. Core отправляет агенту actionable repair prompt.

Unsafe/Core-boundary blocked attempt:

- не коммитится;
- не закрывает current integration task;
- не создаёт Phase 4;
- пишет user-visible blocker;
- при следующем watchdog/restart выполняется deterministic recheck.

Provider-visible rejection не должен смешивать actionable diagnostics с инструкцией `Do not update Quality Gates artifacts`. Если проблема agent-actionable, Core просит исправить. Если проблема Core-boundary, Core пишет blocker пользователю и не отправляет агенту wait-only repair prompt.

## 5. Phase 4 — Persistent Quality Gates User Return

**Тип boundary:** [Persistent Return Open Boundary](Managed_Workflow_Orchestration_Cluster_Planning.md#persistent-return-open-boundary).

### Stream: User Return And Revisions

Phase 4 создаётся только после accepted Phase 3 integration commit.

Core создаёт:

```text
## Phase 4 — Persistent Quality Gates User Return

### Stream: User Return And Revisions
```

Core пишет пользователю localized message:

```text
Core принял интеграцию Quality Gates.

Quality Gates baseline интегрирован, gate-команды и lifecycle hooks проверены и зафиксированы в Git. Шаг Quality Gates завершён, но для него открыт постоянный режим возврата: вы можете в любой момент вернуться к этому шагу и попросить изменить контракт или интеграцию quality gates.

Поле ввода доступно для будущих правок по Quality Gates. Если правок сейчас нет, продолжайте следующий шаг workflow.
```

Agent не получает новый provider prompt при открытии Phase 4.

Этот документ не описывает полный future user-return/revision workflow. Будущие возвраты пользователя, refactoring requests, downstream impact и repeated revision commits должны проектироваться отдельно в user-return/revision orchestration module.

## 6. Hard Invariants

1. Phase 2 не создаётся без real Phase 1 draft commit.
2. Phase 2 всегда называется `User-Led Review`.
3. Phase 2 использует `review.task<N>` и paired conditional outcome line.
4. При direct acceptance нельзя создавать `quality-gates.phase2.acceptance.task1`.
5. `not-created-user-accepted-without-review-revision` допустим только как outcome disposition, не как Git hash и не как `lastRecordedCommit`.
6. Phase 3 не создаётся до пользовательского acceptance.
7. Phase 3 всегда начинается Core prompt, где явно сказано, что пользователь принял contract.
8. Каждая safe Phase 3 attempt получает real Git commit.
9. `included-in-commit` запрещён как hash marker.
10. `lastRecordedCommit` хранит только real Git hash.
11. `integrated: true` без accepted integration commit не завершает шаг.
12. Phase 4 создаётся всегда после accepted integration commit.
13. Core messages пользователю пишутся в persistent managed session.
14. Пользовательское поле ввода свободно при старте Phase 2 и после открытия Phase 4.

## 7. Будущая Нарезка На Микрозадачи

Когда этот planning будет принят, Quality Gates scenario можно нарезать примерно так:

1. Реализовать Phase 1 Type A draft contract controller.
2. Реализовать Phase 2 Type B review controller без acceptance task.
3. Реализовать user intent classification для Quality Gates review context.
4. Реализовать accepted user decision -> Phase 3 accepted-only integration prompt.
5. Реализовать Phase 3 integration allowlist и validator.
6. Реализовать rejected-safe integration commits with diagnostics.
7. Реализовать blocker split: agent-actionable repair prompt vs Core-boundary user-visible blocker.
8. Реализовать accepted integration -> Phase 4 creation.
9. Реализовать localized Phase 4 user-visible message.
10. Покрыть regression tests:
    - direct acceptance -> no acceptance task -> Phase 3;
    - revision -> same review task -> real hash -> next review task;
    - accepted first integration attempt -> real hash -> Phase 4;
    - rejected-safe integration attempt -> real hash -> repair task;
    - Core-boundary blocker -> no provider wait-only prompt;
    - accepted integration in restored session -> Phase 4, no duplicate;
    - no `included-in-commit`;
    - no `lastRecordedCommit = not-created...`.
