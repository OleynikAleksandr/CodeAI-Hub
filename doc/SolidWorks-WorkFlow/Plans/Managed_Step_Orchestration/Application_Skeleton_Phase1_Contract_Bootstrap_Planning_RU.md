# Application Skeleton Phase 1 — Contract Bootstrap Planning

**Статус:** черновик для обсуждения.
**Создан:** 2026-05-14.
**Scope:** точная спецификация Phase 1 шага `Application Skeleton` для будущей реализации в новом managed orchestration cluster.
**Следующая тема обсуждения:** Phase 2 `Application Skeleton Contract Review`.

## 1. Назначение Phase 1

Phase 1 создаёт первый черновик Application Skeleton contract artifacts и проверяет их машинной Core-проверкой.

Фаза относится к типу `Core-Gated Agent Work`:

- пользователь не участвует в содержательной проверке;
- агент создаёт артефакты по Core prompt;
- Core проверяет форму, структуру и допустимые файлы;
- только после успешной Core-проверки и real Git commit открывается Phase 2 для пользовательского review.

Phase 1 не должна пытаться оценивать, нравится ли пользователю архитектура. Она проверяет только то, что может проверить скрипт.

## 2. Участники

### Core

Core владеет:

- стартовым prompt для агента;
- machine validation;
- Git transaction;
- child plan mutation;
- workspace ledger update;
- user-visible handoff message при переходе в Phase 2;
- recovery/watchdog повторной проверкой.

### Agent

Agent владеет только содержимым assigned artifacts:

- `.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md`;
- `.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json`.

Agent не владеет:

- Git;
- child plan status/hash;
- workspace ledger;
- acceptance flags;
- materialization;
- Phase 2 creation.

### User

Пользователь в Phase 1 не принимает решений по содержанию.

Пользователь должен получить явное сообщение от Core только после успешного перехода в Phase 2 или при Core-owned blocker.

## 3. Входное состояние

Ожидаемое состояние child plan:

```text
phase = Phase 1 — Application Skeleton Contract Bootstrap
stream = Core-Gated Initial Draft
currentTaskId = application-skeleton.phase1.draft.task1
expectedCommitMessage = docs: draft application skeleton contract
lastRecordedCommit = previous real Git hash | TBD
```

Ожидаемое состояние workspace:

- managed workspace lifecycle установлен;
- `doc/TODO/workspace.plan.md` существует;
- active stage указывает на `application_skeleton`;
- active child plan path указывает на `doc/TODO/stages/application-skeleton/todo-plan.md`;
- upstream Diagram Modules accepted/committed;
- provider session существует или может быть восстановлена.

## 4. Core Prompt Для Agent

Core отправляет агенту стартовый prompt Phase 1.

Prompt должен быть durable и сохраняться как `lastCorePromptForTask`.

Prompt должен явно сказать агенту:

- какие input artifacts встроены Core в prompt;
- какие output files нужно создать/обновить;
- что нужно создать только draft contract;
- что нельзя ставить `accepted: true`;
- что нельзя ставить `materialized: true`;
- что нельзя создавать `product-parts/**`;
- что Git/commit/plan advancement принадлежат Core;
- что в конце turn нужно дать content-readiness note.

Agent не должен сам запускать Git, plan commands или materialization.

## 5. Артефакты Phase 1

Обязательные output artifacts:

```text
.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md
.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json
```

Допустимые dirty files для успешного Phase 1 commit:

```text
.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md
.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json
doc/TODO/stages/application-skeleton/todo-plan.md
```

Примечание:

- child plan может быть изменён только Core;
- если agent изменил child plan, это должно считаться violation;
- production/materialized paths в Phase 1 недопустимы.

## 6. Machine Validation Criteria

Core проверяет только формальные критерии.

### 6.1 Required Files

Core проверяет:

- `application-skeleton.md` существует;
- `application-skeleton-map.json` существует;
- оба файла находятся в canonical application_skeleton artifact directory.

Ошибки:

- `missing_markdown`;
- `missing_map_json`;
- `wrong_artifact_path`.

### 6.2 JSON Parse And Shape

Core проверяет:

- JSON парсится;
- root является object;
- есть contract fields, необходимые для draft;
- есть список planned/materialized paths или эквивалентная canonical структура, согласованная в artifact contract;
- path values являются relative workspace paths;
- path values не содержат `..`;
- path values не указывают в `node_modules`.

Ошибки:

- `json_parse_error`;
- `json_root_not_object`;
- `missing_required_field`;
- `invalid_path_value`;
- `unsafe_path_value`.

### 6.3 Draft Lifecycle Flags

Core проверяет:

- `accepted` не равен `true`;
- `materialized` не равен `true`;
- `materializationState` не равен `materialized`;
- нет признака, что Phase 3 уже началась.

Ошибки:

- `premature_accepted_true`;
- `premature_materialized_true`;
- `premature_materialization_state`.

### 6.4 Markdown / JSON Consistency

Core проверяет минимальное соответствие:

- markdown описывает Application Skeleton, а не другой stage;
- markdown не заявляет accepted/materialized state;
- основные sections не пустые;
- declared paths/modules из JSON не противоречат markdown summary.

Ошибки:

- `markdown_wrong_stage`;
- `markdown_premature_acceptance`;
- `markdown_missing_required_section`;
- `markdown_json_mismatch`.

### 6.5 Dirty Scope

Core проверяет:

- dirty files входят в Phase 1 allowlist;
- нет `product-parts/**`;
- нет package/config changes;
- нет изменений других stages;
- нет staged files outside active microtask.

Ошибки:

- `out_of_scope_dirty_file`;
- `premature_product_parts_projection`;
- `foreign_stage_dirty_file`;
- `staged_outside_active_microtask`.

## 7. Выходы Phase 1

Phase 1 имеет только три допустимых выхода.

## 7.1 Выход A — Valid Draft Committed

Условия:

- все machine validation criteria passed;
- Git dirty scope допустим;
- Core Git transaction successful;
- real Git hash получен.

Core effects:

1. Stage only Phase 1 owned files.
2. Commit:

   ```text
   docs: draft application skeleton contract
   ```

3. Получить real commit hash.
4. Пометить Phase 1 task и paired `Git Commit` как `DONE`.
5. Записать real hash в child plan.
6. Обновить `lastRecordedCommit` real hash.
7. Записать commit в `workspace.plan.md acceptedCommits`.
8. Открыть Phase 2:

   ```text
   ## Phase 2 — Application Skeleton Contract Review
   ### Stream: User-Led Review
   ```

9. Создать review anchor task:

   ```text
   application-skeleton.phase2.review.task1
   ```

10. Отправить user-visible Core handoff message.

Core message пользователю:

```text
Core завершил проверку черновика Application Skeleton.

Форма артефактов корректна, поэтому открыт этап пользовательского review.

Пожалуйста, проверьте Application Skeleton по смыслу. Если всё подходит, напишите «подтверждаю». Если нужны изменения, перечислите правки, которые нужно внести перед материализацией.
```

Инвариант:

- пользователь узнаёт о Phase 2 не по косвенным признакам, а из явного Core message.

## 7.2 Выход B — Repairable Not Ready

Условия:

- success criteria не выполнены;
- причина относится к agent-owned artifact work;
- Core может сформулировать provider-actionable repair.

Примеры:

- missing file;
- malformed JSON;
- missing required field;
- markdown/json mismatch;
- premature lifecycle flag;
- no meaningful artifact diff;
- agent created wrong draft content.

Core effects:

1. Не открывать Phase 2.
2. Не считать draft accepted.
3. Зафиксировать rejected attempt durable способом:
   - если artifact diff полезен и в owned scope, commit rejected attempt/evidence;
   - если artifact diff отсутствует или опасен, записать tracked failed-attempt evidence.
4. Открыть repair task pair:

   ```text
   application-skeleton.phase1.draft.repair<N>.task1
   Git Commit: docs: repair application skeleton phase1.draft attempt <N>
   ```

5. Отправить provider-visible repair prompt.

Repair prompt должен содержать:

- что Core проверял;
- какие критерии не прошли;
- какие файлы можно менять;
- какие файлы нельзя менять;
- что агент должен исправить;
- что после исправления нужно остановиться с content-readiness note.

Пример короткой формы:

```text
Core отклонил черновик Application Skeleton.

Проверка не прошла:
- application-skeleton-map.json отсутствует или не парсится.

Исправьте только Application Skeleton draft artifacts:
- .codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md
- .codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json

Не создавайте product-parts/**, не выставляйте accepted/materialized и не выполняйте Git-команды.
Когда исправление готово, завершите turn content-readiness сообщением.
```

## 7.3 Выход C — Core Boundary Blocked

Условия:

- Core не может безопасно продолжить;
- причина не является agent-owned artifact repair.

Примеры:

- malformed child plan;
- active plan не совпадает с workspace plan;
- Git transaction failed;
- staged files outside active stage;
- partial plan mutation detected;
- невозможно прочитать workspace;
- provider session отсутствует и не может быть восстановлена;
- Core validator internal error.

Core effects:

1. Не открывать Phase 2.
2. Не отправлять agent repair prompt, если agent не может исправить причину.
3. Не продвигать child plan.
4. Не писать pseudo hash.
5. Создать user-visible Core blocker message.
6. Записать durable audit event.
7. При следующем wakeup/restart снова выполнить deterministic snapshot recheck.

Core blocker message должен быть коротким и точным:

```text
Core не может завершить Phase 1 Application Skeleton из-за ошибки managed boundary.

Причина:
- <точная причина>

Работа агента временно не продолжается. После устранения blocker Core повторно проверит текущее состояние шага и продолжит сценарий.
```

## 8. Упрощённый Recovery / Watchdog

Recovery не должен пытаться понять причину сбоя глубже, чем нужно для следующего deterministic action.

Базовое правило:

```text
Пока Phase 1 не имеет accepted draft commit, Core при любом wakeup/restart/turn-end/timeout перечитывает snapshot.
Если draft валиден — commit и переход в Phase 2.
Если draft невалиден или отсутствует — repair/replay агенту.
Если Core boundary blocked — user-visible blocker без продвижения плана.
```

## 8.1 Recovery Triggers

Recovery/watchdog запускается при:

- provider turn completed;
- provider turn failed;
- timeout без terminal event;
- Core restart;
- workspace reopen;
- session restored;
- dirty files changed;
- user manually reopens the step;
- periodic watchdog tick для active managed task.

Все triggers ведут к одному действию:

```text
read canonical snapshot for current task
```

## 8.2 Recovery Decision

После snapshot Core выбирает один из вариантов:

### Success On Recheck

Если artifacts уже валидны:

- Core делает normal success path;
- не повторяет prompt агенту;
- открывает Phase 2.

### Replay Last Core Prompt

Если:

- provider turn не дошёл до terminal event;
- artifact diff отсутствует;
- task всё ещё active;
- нет доказанного completed invalid attempt.

Core:

- повторяет `lastCorePromptForTask`;
- не создаёт новую task;
- не мутирует plan без commit.

### Send Validation Repair Prompt

Если:

- provider attempt завершён;
- artifacts есть, но invalid;
- ошибка agent-actionable.

Core:

- создаёт repair task pair;
- отправляет validation repair prompt.

### User/Core Blocker

Если:

- причина Core-owned;
- Git/plan/session boundary не позволяет продолжить.

Core:

- пишет user-visible blocker;
- ждёт устранения или следующего watchdog recheck.

## 9. Durable State Для Recovery

Минимально нужно хранить:

```text
taskId
phaseId
lastCorePromptForTask
lastCorePromptSentAt
lastProviderTurnStartedAt
lastProviderTerminalEventAt
lastCoreDecision
retryCount
lastRealCommitHash
```

Этого достаточно, чтобы не классифицировать все виды аварий отдельно.

## 10. Hard Invariants Phase 1

1. Phase 2 не создаётся без real commit `docs: draft application skeleton contract`.
2. `lastRecordedCommit` никогда не содержит `included-in-commit`.
3. Commit hash в child plan появляется только после успешного Git commit.
4. `accepted: true` запрещён в Phase 1.
5. `materialized: true` запрещён в Phase 1.
6. `product-parts/**` запрещены в Phase 1.
7. Agent не меняет child plan.
8. Core не отправляет provider repair message до создания repair task pair.
9. Core-owned blocker не отправляется агенту как repair.
10. User-visible Phase 2 handoff message обязателен.
11. Watchdog/recovery сначала перечитывает snapshot, а потом решает action.
12. Repeated watchdog/replay не создаёт repeated empty `taskN`.

## 11. Будущая Нарезка На Микрозадачи

Когда этот planning будет принят, Phase 1 можно нарезать примерно так:

1. Ввести types для `ManagedPhaseType.CoreGatedAgentWork`, Phase 1 snapshot и validation result.
2. Реализовать Application Skeleton Phase 1 validator.
3. Реализовать atomic commit transition без `included-in-commit`.
4. Реализовать Phase 2 creation только после real commit hash.
5. Реализовать localized user-visible Core handoff message.
6. Реализовать repair task injection для Phase 1 validation failures.
7. Реализовать simplified watchdog recovery для active Phase 1 task.
8. Покрыть regression tests:
   - valid draft -> commit -> Phase 2 -> user message;
   - missing files -> repair prompt;
   - malformed JSON -> repair prompt;
   - premature accepted/materialized -> repair prompt;
   - provider failure/no terminal event -> replay last prompt;
   - Core restart -> recheck snapshot;
   - commit failure -> blocker without plan advancement.

## 12. Не Обсуждается В Этом Документе

Этот документ не описывает:

- Phase 2 User-Led Review;
- user acceptance/revision rules;
- Phase 3 materialization;
- Phase 4 user-return revisions;
- downstream OUTDATED propagation;
- Quality Gates-specific behavior.

Эти темы должны быть описаны отдельными planning-документами после обсуждения.

