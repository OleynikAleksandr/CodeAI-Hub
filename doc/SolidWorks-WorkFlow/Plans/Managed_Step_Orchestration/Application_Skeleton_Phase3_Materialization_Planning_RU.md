# Application Skeleton Phase 3 — Materialization Planning

**Статус:** черновик принятого сценария для будущей реализации.
**Создан:** 2026-05-14.
**Scope:** точная спецификация Phase 3 шага `Application Skeleton` для нового managed orchestration cluster.
**Предыдущий документ:** `Application_Skeleton_Phase2_Contract_Review_Planning_RU.md`.
**Следующая тема обсуждения:** Phase 4 `Persistent Application Skeleton User Return`.

## 1. Назначение Phase 3

Phase 3 открывается только после того, как пользователь принял Application Skeleton contract в Phase 2.

Phase 3 относится к типу `Core-Gated Agent Work`:

- Core создаёт задачу материализации;
- Core первым сообщением нового provider turn объясняет агенту, что контракт уже принят пользователем;
- Agent материализует файловую систему по принятому контракту;
- Core проверяет результат;
- Core коммитит каждую безопасную попытку материализации, включая отклонённые попытки;
- Core создаёт Phase 4 только после принятой материализации.

Git в Phase 3 является не только механизмом фиксации успешного результата, но и durable history для будущего агента с нулевым контекстом. Поэтому безопасные, но отклонённые Core попытки должны попадать в историю Git с диагностикой в child plan.

## 2. Участники

### Core

Core владеет:

- созданием Phase 3 после принятия контракта;
- стартовым prompt для агента;
- materialization validation;
- классификацией попытки как accepted, rejected-safe или unsafe/core-blocked;
- Git transaction для каждой safe attempt;
- записью diagnostics в child plan;
- созданием следующей materialization attempt task после rejected-safe attempt;
- созданием Phase 4 после accepted attempt;
- user-visible completion message в Project Manager dialog / persistent managed session.

### Agent

Agent владеет:

- созданием и обновлением файлов materialized Application Skeleton;
- обновлением canonical Application Skeleton artifacts так, чтобы они отражали materialized state;
- исправлением materialization diagnostics, если Core отклонил safe attempt;
- завершением каждого turn content-readiness note.

Agent не владеет:

- Git;
- child plan status/hash;
- workspace ledger;
- Phase 4 creation;
- downstream step unlock.

### User

User в Phase 3 не участвует в проверке каждой попытки.

User получает сообщение только когда:

- Core принял materialization и открыл Phase 4;
- Core столкнулся с blocker, который агент не может исправить.

## 3. Входное Состояние

Ожидаемое состояние после Phase 2:

```text
phase = Phase 3 — Application Skeleton Materialization
stream = Filesystem Projection
currentTaskId = application-skeleton.phase3.materialize.task1
expectedCommitMessage = feat: materialize application skeleton attempt 1
lastRecordedCommit = <last real Phase 1/2 commit hash>
```

Child plan должен содержать первую materialization attempt task:

```md
7. [IN_PROGRESS] `application-skeleton.phase3.materialize.task1` Materialize the user-accepted Application Skeleton contract into the workspace filesystem and stop for Core validation (scope: `product-parts/**, package.json, package-lock.json, tsconfig*.json, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json`; expected commit: `feat: materialize application skeleton attempt 1`).
8. [TODO] Git Commit: `feat: materialize application skeleton attempt 1` (hash: TBD)
```

Примечание:

- `task1` не означает guaranteed success;
- это первая попытка материализации;
- если Core отклонит safe attempt, эта попытка всё равно получит real Git hash и будет закрыта как rejected;
- следующая попытка получит `task2`.

## 4. Core Prompt Для Agent

Core отправляет агенту provider-visible prompt первым сообщением Phase 3.

Prompt должен быть также записан в persistent managed session transcript как Core-authored message, чтобы пользователь и будущий recovery-контур видели, какую задачу Core поставил агенту.

Prompt должен явно сказать:

- Application Skeleton contract принят пользователем;
- теперь нужно выполнить materialization;
- какие input artifacts являются источником правды;
- какие files/directories можно создавать или менять;
- какие lifecycle flags нужно выставить после материализации;
- что нельзя менять Git/plan/workspace ledger;
- что после работы нужно остановиться с content-readiness note.

Пример:

```text
Core открывает Phase 3 Application Skeleton Materialization.

Пользователь принял Application Skeleton contract. Материализуйте его в файловую систему workspace.

Можно менять:
- product-parts/**
- package.json / package-lock.json, если это требуется принятой структурой workspace
- tsconfig*.json, если это требуется принятой структурой workspace
- .codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md
- .codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json

Нужно обновить canonical artifacts так, чтобы они отражали materialized state.

Нельзя выполнять Git-команды, менять child plan status/hash или workspace ledger.
Когда материализация готова, завершите turn content-readiness сообщением.
```

## 5. Materialization Validation

Когда agent turn завершён, Core перечитывает snapshot.

Core проверяет:

- canonical `application-skeleton.md` существует;
- canonical `application-skeleton-map.json` существует и парсится;
- artifact flags показывают accepted/materialized state;
- materialized paths из контракта существуют на диске;
- declared product parts, clusters и modules согласованы с filesystem;
- materialized paths не созданы внутри `.codeai-hub/**/product-parts/**`;
- нет dirty files outside Phase 3 allowlist;
- package/config changes допустимы текущим materialization contract;
- child plan изменял только Core;
- workspace ledger ещё не продвинут вручную агентом.

Типовые diagnostics:

```text
missing_materialized_path
artifact_not_materialized
map_markdown_mismatch
wrong_product_parts_location
out_of_scope_dirty_file
unsafe_path_value
agent_modified_child_plan
workspace_ledger_modified_by_agent
```

## 6. Ветка A — Accepted Attempt

Условия:

- materialization validation passed;
- dirty scope safe;
- Git transaction successful.

Core effects:

1. Stage only Phase 3 owned files.
2. Commit current attempt message:

   ```text
   feat: materialize application skeleton attempt <N>
   ```

3. Записать real Git hash в paired `Git Commit` line.
4. Пометить current materialization task как `DONE`.
5. При необходимости добавить к task result:

   ```text
   Result: accepted by Core.
   ```

6. Обновить `lastRecordedCommit` real hash.
7. Записать accepted materialization commit в `workspace.plan.md`.
8. Создать Phase 4:

   ```text
   ## Phase 4 — Persistent Application Skeleton User Return
   ### Stream: User Return And Revisions
   ```

9. Создать persistent user-return task:

   ```text
   application-skeleton.phase4.user-return.task1
   ```

10. Установить active task на Phase 4 user-return task.
11. Не отправлять агенту новый provider prompt.
12. Записать user-visible completion message в Project Manager dialog / persistent managed session.
13. Оставить пользовательское поле ввода свободным.

## 7. User-Visible Message При Переходе В Phase 4

Core должен написать пользователю:

```text
Core принял материализацию Application Skeleton.

Файловый каркас workspace создан и зафиксирован в Git. Шаг Application Skeleton завершён, но для него открыт постоянный режим возврата: вы можете в любой момент вернуться к этому шагу и написать правки по контракту или материализованным файлам.

Поле ввода доступно для будущих правок по Application Skeleton. Если правок сейчас нет, продолжайте следующий шаг workflow.
```

Инварианты:

- это сообщение пишет Core, а не Agent;
- сообщение появляется в persistent managed session, а не только в Core log;
- Agent не получает продолжение после accepted attempt;
- пользователь понимает, зачем создана Phase 4.

## 8. Ветка B — Rejected-Safe Attempt

Условия:

- materialization validation failed;
- dirty files принадлежат Phase 3 materialization scope;
- изменения безопасно коммитить как историю попытки;
- причина agent-actionable.

Core effects:

1. Stage safe Phase 3 owned files.
2. Commit current attempt message:

   ```text
   feat: materialize application skeleton attempt <N>
   ```

3. Записать real Git hash в paired `Git Commit` line.
4. Пометить current materialization task как `DONE`.
5. Добавить result/diagnostics к task:

   ```text
   Result: rejected by Core; diagnostics: <diagnostics>
   ```

6. Обновить `lastRecordedCommit` real hash.
7. Создать следующую materialization attempt task:

   ```text
   application-skeleton.phase3.materialize.task<N+1>
   Git Commit: fix: repair application skeleton materialization attempt <N+1>
   ```

8. Установить:

   ```text
   currentTaskId = application-skeleton.phase3.materialize.task<N+1>
   expectedCommitMessage = fix: repair application skeleton materialization attempt <N+1>
   ```

9. Отправить агенту provider-visible repair prompt.
10. Записать этот Core prompt в persistent managed session transcript.

Repair prompt должен содержать:

- что Core проверял;
- что было закоммичено как rejected attempt;
- real Git hash отклонённой попытки;
- diagnostics;
- allowed files;
- запрет на Git/plan/workspace ledger;
- требование остановиться с content-readiness note.

Пример:

```text
Core отклонил Application Skeleton materialization attempt <N>.

Попытка безопасно зафиксирована в Git как история работы:
- <commit hash>

Проверка не прошла:
- <diagnostic 1>
- <diagnostic 2>

Исправьте materialization в рамках Phase 3 attempt <N+1>. Меняйте только разрешённые Application Skeleton materialization files. Не выполняйте Git-команды и не меняйте child plan/workspace ledger.
Когда исправление готово, завершите turn content-readiness сообщением.
```

## 9. Ветка C — Unsafe Or Core Boundary Blocked

Условия:

- dirty files outside Phase 3 allowlist;
- staged files не принадлежат текущей task;
- child plan malformed;
- Git transaction impossible;
- workspace ledger corrupted;
- provider/session boundary не позволяет безопасно продолжить;
- Core validator internal error.

Core effects:

1. Не коммитить unsafe attempt.
2. Не закрывать current materialization task.
3. Не создавать Phase 4.
4. Не отправлять агенту prompt, если причина не agent-actionable.
5. Записать user-visible blocker в Project Manager dialog / persistent managed session.
6. Записать durable audit event.
7. На следующем watchdog/restart выполнить deterministic recheck.

Core blocker message:

```text
Core не может безопасно завершить Application Skeleton materialization.

Причина:
- <точная причина>

Работа агента временно не продолжается. После устранения blocker Core повторно проверит текущее состояние Phase 3 и продолжит сценарий.
```

## 10. Recovery / Watchdog

Recovery Phase 3 использует deterministic snapshot recheck.

Базовое правило:

```text
Core перечитывает currentTaskId, paired outcome line, dirty files, artifact state, filesystem state, last provider turn state и last Core decision.
После этого повторяет deterministic action для текущей materialization attempt.
```

### 10.1 Provider Turn Interrupted

Если provider turn был начат, terminal event отсутствует, а materialization diff отсутствует или явно неполон:

- Core повторяет `lastCorePromptForTask`;
- не создаёт новую task;
- не коммитит пустую попытку.

### 10.2 Safe Dirty Attempt After Restart

Если после restart Core видит safe dirty Phase 3 materialization diff:

- Core запускает validation;
- accepted diff коммитится как accepted attempt;
- rejected-safe diff коммитится как rejected attempt и создаёт следующую task.

### 10.3 Already Rejected Attempt

Если current task уже `DONE` с real hash и `Result: rejected by Core`, а следующая task создана:

- Core не создаёт повторную repair task;
- Core продолжает по currentTaskId следующей attempt task.

### 10.4 Already Accepted Attempt

Если accepted materialization commit уже записан и Phase 4 создана:

- Core не повторяет Phase 3 prompt;
- Core не создаёт ещё одну Phase 4;
- Core продолжает Phase 4 user-return state.

## 11. Durable State

Минимальное состояние для Phase 3:

```text
phaseId
attemptNumber
currentTaskId
expectedCommitMessage
lastRecordedCommit
lastCorePromptForTask
lastProviderTurnStartedAt
lastProviderTerminalEventAt
lastCoreDecision
lastAttemptResult
lastAttemptDiagnostics
lastAcceptedMaterializationCommit
phase4Created
```

`lastRecordedCommit` всегда хранит real Git hash.

## 12. Hard Invariants Phase 3

1. Phase 3 не создаётся без принятого пользователем Application Skeleton contract.
2. Core первым сообщением Phase 3 ставит агенту materialization task.
3. Agent не управляет Git, child plan или workspace ledger.
4. Каждая safe materialization attempt получает real Git commit.
5. Rejected-safe attempt сохраняется в Git как durable history.
6. Unsafe/Core-boundary blocked attempt не коммитится.
7. После rejected-safe attempt Core создаёт следующую materialization attempt task.
8. Phase 4 создаётся только после accepted attempt.
9. При создании Phase 4 Agent не получает новый prompt.
10. Пользователь получает clear Core completion message в persistent managed session.
11. Поле ввода пользователя свободно после открытия Phase 4.
12. Recovery не создаёт дубликаты Phase 4 или повторные empty attempts.

## 13. Будущая Нарезка На Микрозадачи

Когда этот planning будет принят, Phase 3 можно нарезать примерно так:

1. Реализовать Phase 3 attempt task model с attemptNumber.
2. Изменить commit messages на attempt-aware messages.
3. Реализовать materialization validator для accepted/rejected-safe/unsafe outcomes.
4. Реализовать rejected-safe commit path с diagnostics в child plan.
5. Реализовать next attempt task creation после rejected-safe attempt.
6. Реализовать accepted attempt -> Phase 4 creation.
7. Реализовать user-visible Phase 4 completion message.
8. Реализовать persistent transcript запись Core prompts/messages.
9. Реализовать watchdog recheck для interrupted provider turn и safe dirty attempt.
10. Покрыть regression tests:
    - accepted first attempt -> real hash -> Phase 4 -> user message;
    - rejected first safe attempt -> real hash -> task2 -> repair prompt;
    - rejected then accepted second attempt -> two real hashes -> Phase 4;
    - unsafe dirty file -> blocker, no commit;
    - restart with safe dirty materialization -> validation/commit;
    - restart after Phase 4 creation -> no duplicate Phase 4.

## 14. Не Обсуждается В Этом Документе

Этот документ не описывает:

- полный сценарий Phase 4 user-return revisions;
- Quality Gates handoff details;
- Diagram Modules-specific behavior;
- Development Tree unlock.

Эти темы должны быть описаны отдельными planning-документами после обсуждения.
