# Application Skeleton Phase 2 — Contract Review Planning

**Статус:** архивный принятый planning source; реализован и принят в релизе `1.2.274`.
**Создан:** 2026-05-14.
**Scope:** точная спецификация Phase 2 шага `Application Skeleton` для нового managed orchestration cluster.
**Тип фазы:** [Type B — User-Led Review](Managed_Workflow_Orchestration_Cluster_Planning.md#type-b--user-led-review).
**Предыдущий документ:** `Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`.
**Следующая тема обсуждения:** Phase 3 `Application Skeleton Materialization`.

## 1. Назначение Phase 2

Phase 2 открывается только после того, как Core успешно завершил Phase 1:

- draft Application Skeleton artifacts созданы агентом;
- Core проверил их форму;
- Core сделал real Git commit `docs: draft application skeleton contract`;
- Core создал Phase 2 и отправил пользователю явное сообщение о начале review.

Phase 2 относится к reusable Type B `User-Led Review`.

В самом начале Phase 2 пользователь должен получить явное сообщение от Core, из которого понятно, что теперь именно пользователь проверяет контракт и должен либо подтвердить его, либо перечислить правки. Одновременно поле ввода пользователя должно быть свободно и готово к ответу; пользователь не должен ждать скрытой работы Core или агента.

Главная задача Phase 2:

```text
Пользователь проверяет Application Skeleton contract по смыслу и либо принимает его, либо просит внести правки перед материализацией.
```

Phase 2 не является работой Core с агентом по умолчанию. Агент подключается только если пользователь дал замечания.

## 2. Участники

### Core

Core владеет:

- созданием Phase 2 после Phase 1 commit;
- явным user-visible сообщением пользователю;
- классификацией пользовательского решения;
- отправкой пользовательских правок агенту;
- проверкой исправленного контракта;
- Git transaction для реальных contract revisions;
- no-commit disposition, если пользователь принял контракт без правок;
- открытием следующей review-задачи после реальной revision;
- открытием Phase 3 после принятия контракта.

### Agent

Agent участвует только в ветке пользовательских правок.

Agent владеет:

- исправлением Application Skeleton draft artifacts по замечаниям пользователя;
- сохранением исправлений только в Application Skeleton artifact files;
- завершением turn с content-readiness note.

Agent не владеет:

- пользовательским acceptance decision;
- созданием Phase 3;
- Git commit;
- child plan status/hash;
- workspace ledger;
- самостоятельным выставлением `materialized: true`.

### User

User владеет содержательным решением:

- принять контракт;
- запросить правки;
- задать уточняющий вопрос или дать неясный ответ.

## 3. Входное состояние

Ожидаемое состояние после Phase 1:

```text
phase = Phase 2 — Application Skeleton Contract Review
stream = User-Led Review
currentTaskId = application-skeleton.phase2.review.task1
expectedCommitMessage = docs: revise application skeleton review revision 1
lastRecordedCommit = <real Phase 1 draft commit hash>
```

Child plan должен содержать одну review-микрозадачу и её paired outcome line:

```md
3. [IN_PROGRESS] `application-skeleton.phase2.review.task1` User reviews Application Skeleton contract and either accepts it or requests revision (scope: user decision + `.codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json`; expected commit: `docs: revise application skeleton review revision 1`).
4. [TODO] Git Commit: `docs: revise application skeleton review revision 1` (hash: TBD)
```

Эта `Git Commit` строка является conditional outcome line:

- если пользователь запросил правки и агент их внёс, строка получает real Git hash;
- если пользователь принял контракт без правок, строка получает machine disposition `not-created-user-accepted-without-review-revision`.

Это не placeholder для будущей отдельной acceptance-задачи.

## 4. User-Visible Core Message

При открытии Phase 2 Core обязан написать пользователю явное сообщение в Project Manager dialog на выбранном языке интерфейса.

Для русского языка:

```text
Core завершил проверку черновика Application Skeleton.

Форма артефактов корректна, поэтому открыт этап пользовательского review.

Пожалуйста, проверьте Application Skeleton по смыслу. Если всё подходит, напишите «подтверждаю». Если нужны изменения, перечислите правки, которые нужно внести перед материализацией.
```

Инвариант:

- пользователь не должен угадывать переход в Phase 2 по разблокированному полю ввода;
- агент не обязан правильно сформулировать просьбу о подтверждении;
- Core message является обязательным сигналом начала пользовательской работы.

## 5. Review Task Model

Phase 2 состоит из повторяющихся review cycles.

Каждый cycle имеет ровно одну review-микрозадачу:

```text
application-skeleton.phase2.review.task<N>
```

и ровно одну paired outcome line:

```text
Git Commit: docs: revise application skeleton review revision <N>
```

Нельзя создавать дополнительные task ids вида:

```text
application-skeleton.phase2.review.revision<N>.task1
application-skeleton.phase2.acceptance.task1
```

Причина:

- review.task<N> уже является микрозадачей пользовательского review;
- замечание пользователя запускает работу внутри этой же микрозадачи;
- принятие пользователя является исходом этой же микрозадачи;
- отдельная acceptance-задача создаёт лишний lifecycle boundary и искажает сценарий.

## 6. User Intent Classification

Core классифицирует новое пользовательское сообщение только когда active task находится в Phase 2 review.

Результаты классификации:

```text
ACCEPTED
REVISION_REQUESTED
UNCLEAR_OR_DISCUSSION
```

Core не должен строить классификацию только на полном списке фраз.

Допустимая модель:

- явная кнопка/command `Accept Contract` -> `ACCEPTED`;
- короткое подтверждающее сообщение в review context -> `ACCEPTED`;
- сообщение с требованиями изменить/добавить/исправить -> `REVISION_REQUESTED`;
- вопрос, двусмысленный ответ или отвлечённый текст -> `UNCLEAR_OR_DISCUSSION`.

Пользовательские примеры `ACCEPTED`:

```text
подтверждаю
окей
давай дальше
всё хорошо
принимаю
```

Эти примеры не являются исчерпывающим hardcoded pattern list. Решение принимает `UserIntentClassifier` с учётом текущего managed review context.

## 7. Ветка A — Пользователь Принял Контракт Без Правок

Условия:

- active task: `application-skeleton.phase2.review.task<N>`;
- user intent: `ACCEPTED`;
- нет новых user-requested contract changes;
- нет agent turn, который нужно дождаться;
- нет dirty artifact diff, требующего commit.

Core effects:

1. Не отправлять сообщение агенту.
2. Не создавать `application-skeleton.phase2.acceptance.task1`.
3. Пометить `application-skeleton.phase2.review.task<N>` как `DONE`.
4. Пометить paired outcome line как `DONE`.
5. Вместо Git hash записать:

   ```text
   hash: not-created-user-accepted-without-review-revision
   ```

6. Не менять `lastRecordedCommit` на этот disposition.
7. Сохранить факт user acceptance в managed state/audit.
8. Открыть Phase 3 `Application Skeleton Materialization`.
9. Установить:

   ```text
   currentTaskId = application-skeleton.phase3.materialize.task1
   expectedCommitMessage = feat: materialize application skeleton
   ```

10. Отправить агенту Phase 3 prompt, где явно сказано, что пользователь принял контракт и можно выполнять материализацию.

Важно:

- `not-created-user-accepted-without-review-revision` не является Git hash;
- это machine disposition для conditional outcome line;
- он допустим только если пользователь принял контракт без правок;
- Phase 3 real commit позже зафиксирует материализацию и актуальное lifecycle state artifacts.

## 8. Ветка B — Пользователь Попросил Правки

Условия:

- active task: `application-skeleton.phase2.review.task<N>`;
- user intent: `REVISION_REQUESTED`.

Core effects before provider turn:

1. Не создавать новую review/revision task.
2. Оставить текущий review task `IN_PROGRESS`.
3. Оставить paired outcome line `TODO` / `hash: TBD`.
4. Сформировать provider-visible prompt с замечаниями пользователя.
5. Сохранить prompt как `lastCorePromptForTask`.
6. Отправить prompt агенту.

Provider prompt должен содержать:

- что это Phase 2 пользовательское review;
- исходный текст замечаний пользователя;
- какие artifacts можно менять;
- что нельзя начинать materialization;
- что нельзя менять Git/plan/workspace ledger;
- что после исправления нужно остановиться с content-readiness note.

Пример:

```text
Пользователь попросил внести правки в Application Skeleton contract перед материализацией.

Замечания пользователя:
- <user feedback>

Исправьте только:
- .codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md
- .codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json

Не создавайте product-parts/**, не выставляйте materialized: true и не выполняйте Git-команды.
Когда исправления готовы, завершите turn content-readiness сообщением.
```

## 9. Core Validation После Исправлений Агента

Когда agent turn завершился, Core перечитывает snapshot.

Core проверяет:

- изменены только Application Skeleton contract artifacts и Core-owned child plan state, если нужно;
- markdown/json still valid;
- contract всё ещё не materialized;
- правки не создали `product-parts/**`;
- `accepted` не выставлен агентом самовольно, если это запрещено текущей artifact contract model;
- нет dirty files outside Phase 2 allowlist.

### 9.1 Revision Accepted By Core

Если исправления валидны:

1. Core stages allowed files.
2. Core commits:

   ```text
   docs: revise application skeleton review revision <N>
   ```

3. Paired outcome line получает real Git hash.
4. `application-skeleton.phase2.review.task<N>` становится `DONE`.
5. `lastRecordedCommit` обновляется real hash.
6. Core создаёт следующий review cycle:

   ```text
   application-skeleton.phase2.review.task<N+1>
   Git Commit: docs: revise application skeleton review revision <N+1>
   ```

7. `currentTaskId` указывает на новый review task.
8. Core отправляет пользователю новое сообщение:

   ```text
   Core принял исправления Application Skeleton contract.

   Пожалуйста, проверьте обновлённый контракт. Если всё подходит, напишите «подтверждаю». Если нужны изменения, перечислите правки, которые нужно внести перед материализацией.
   ```

### 9.2 Revision Rejected By Core

Если исправления невалидны:

1. Не закрывать текущий review task.
2. Не писать hash в paired outcome line.
3. Не создавать следующий review task.
4. Не создавать отдельный `repair<N>` task, если ошибка является исправимой в рамках текущей пользовательской правки.
5. Отправить агенту provider-visible repair prompt в рамках того же `review.task<N>`.

Repair prompt должен быть actionable:

```text
Core не принял исправления Application Skeleton contract.

Проверка не прошла:
- <diagnostic>

Продолжайте текущую Phase 2 review revision. Исправьте только Application Skeleton contract artifacts и снова остановитесь с content-readiness note.
```

Отдельный Core blocker нужен только если причина не agent-actionable.

## 10. Ветка C — Неясный Ответ Или Обсуждение

Условия:

- active task: `application-skeleton.phase2.review.task<N>`;
- user intent: `UNCLEAR_OR_DISCUSSION`.

Core effects:

1. Не отправлять сообщение агенту.
2. Не менять artifacts.
3. Не менять Git outcome line.
4. Не создавать новый task.
5. Ответить пользователю уточнением.

Пример:

```text
Core ожидает решение по Application Skeleton contract.

Если контракт подходит, напишите «подтверждаю». Если нужны изменения, перечислите правки, которые нужно внести перед материализацией.
```

## 11. Recovery / Watchdog

Recovery Phase 2 не должен пытаться строить сложную историю причин сбоя.

Базовое правило:

```text
Core перечитывает currentTaskId, paired outcome line, dirty files, last provider turn state и last user intent.
После этого повторяет deterministic action для текущего review cycle.
```

### 11.1 Waiting For User

Если:

- current task = `review.task<N>`;
- paired outcome line = `hash: TBD`;
- нет active provider turn;
- нет dirty artifact diff;
- last user intent отсутствует или уже обработан.

Core:

- ничего не отправляет агенту;
- при необходимости повторяет user-visible review prompt;
- оставляет поле ввода пользователя активным.

### 11.2 Provider Turn Interrupted

Если:

- last user intent = `REVISION_REQUESTED`;
- provider turn был начат;
- terminal event отсутствует;
- artifacts не изменены или неполны.

Core:

- повторяет `lastCorePromptForTask`;
- не создаёт новый review task;
- не создаёт новый commit line.

### 11.3 Dirty Artifacts On Recheck

Если:

- current task = `review.task<N>`;
- есть dirty Application Skeleton contract artifacts;
- provider turn завершён или состояние восстановлено после restart.

Core:

- запускает validation из раздела 9;
- при success делает real revision commit;
- при agent-actionable failure отправляет repair prompt в рамках той же task.

### 11.4 Accepted Disposition Already Written

Если:

- review.task<N> уже `DONE`;
- paired outcome line содержит `not-created-user-accepted-without-review-revision`;
- Phase 3 уже создана.

Core:

- не создаёт acceptance task;
- не возвращается в Phase 2;
- продолжает Phase 3 по текущему `currentTaskId`.

## 12. Durable State

Минимальное состояние для Phase 2:

```text
phaseId
reviewCycleNumber
currentTaskId
expectedCommitMessage
lastRecordedCommit
lastUserIntent
lastUserMessageId
lastCorePromptForTask
lastProviderTurnStartedAt
lastProviderTerminalEventAt
lastCoreDecision
lastOutcomeDisposition
```

`lastRecordedCommit` всегда хранит только real Git hash.

`lastOutcomeDisposition` может хранить:

```text
not-created-user-accepted-without-review-revision
```

но это значение нельзя использовать как Git hash.

## 13. Hard Invariants Phase 2

1. Phase 2 не создаётся без real Phase 1 draft commit.
2. Review task является настоящей микрозадачей пользовательского review.
3. У каждого review task есть paired conditional outcome line.
4. При пользовательских правках нельзя создавать `review.revision<N>.task1`.
5. При принятии контракта нельзя создавать `acceptance.task1`.
6. `not-created-user-accepted-without-review-revision` допустим только для direct acceptance без правок.
7. Если пользователь просил правки и агент внёс валидные изменения, outcome line получает real Git hash.
8. После real revision commit Core открывает следующий review task.
9. После direct acceptance Core открывает Phase 3.
10. `lastRecordedCommit` обновляется только real Git hash.
11. Core message пользователю обязателен при каждом новом review cycle.
12. Agent не должен узнавать acceptance через догадки по пользовательскому тексту; Core передаёт Phase 3 prompt после принятия.
13. Core не отправляет provider repair/revision prompt до того, как определил текущий review cycle.
14. Recovery не создаёт повторные пустые review tasks.

## 14. Будущая Нарезка На Микрозадачи

Когда этот planning будет принят, Phase 2 можно нарезать примерно так:

1. Заменить open anchor semantics на `review.task<N>` как active user-review microtask.
2. Убрать generation `application-skeleton.phase2.review.revision<N>.task1`.
3. Убрать generation `application-skeleton.phase2.acceptance.task1`.
4. Реализовать conditional outcome line disposition for direct acceptance.
5. Реализовать user intent classifier для `ACCEPTED`, `REVISION_REQUESTED`, `UNCLEAR_OR_DISCUSSION`.
6. Реализовать provider prompt для user-requested revisions внутри текущего review task.
7. Реализовать validation/commit текущей review task после agent revision.
8. Реализовать создание следующего review cycle после real revision commit.
9. Реализовать Phase 3 creation после direct acceptance без отдельного acceptance commit.
10. Покрыть regression tests:
    - direct acceptance -> no acceptance task -> Phase 3;
    - user revision -> same review task -> real hash -> next review task;
    - second revision -> second real hash -> third review task;
    - unclear user reply -> clarification only;
    - provider interruption -> replay same prompt;
    - invalid agent revision -> repair prompt in same task;
    - restart after accepted disposition -> continue Phase 3;
    - no `lastRecordedCommit = not-created...`.

## 15. Не Обсуждается В Этом Документе

Этот документ не описывает:

- Phase 3 filesystem materialization details;
- когда именно materialization writes `accepted: true` into artifacts;
- Phase 4 persistent user-return revisions;
- Quality Gates-specific review behavior;
- Diagram Modules-specific post-completion behavior.

Эти темы должны быть описаны отдельными planning-документами после обсуждения.
