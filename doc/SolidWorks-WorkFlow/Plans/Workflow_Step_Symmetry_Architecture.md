# Workflow Step Symmetry Architecture

**Status:** Approved scope (2026-04-06)
**Created:** 2026-04-06
**Owner:** Oleksandr + Codex
**Scope:** Retrofit the released trunk workflow so `Description`, `Virtual Simulation`, `Diagram Modules`, and `Foundation Envelope` all use one canonical step-passport and startup-restore model, with formal regression coverage and a packaged release at the end.

---

## 1. Problem

Текущий trunk workflow уже semantic-целостный:

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`
4. `Foundation Envelope`

Но persistence и restore этого trunk пока несимметричны.

Практическое проявление уже найдено:

- canonical artifact `foundation-envelope.md` существует;
- continuity для `foundation_envelope` существует;
- provider JSONL для шага существует;
- но workspace-level active pointer может оставаться на более раннем шаге.

Следствие:

- после cold start Project Manager может открыть не тот шаг;
- одна часть системы может считать последним шагом `Foundation Envelope`, а другая `Description` или `Diagram Modules`;
- шаги начинают отличаться не только по смыслу, но и по способу хранения истины о себе;
- каждый следующий шаг становится всё дороже и рискованнее добавлять.

Проблема не в потере данных, а в split truth о состоянии workflow.

---

## 2. Goal

Сделать так, чтобы все released trunk steps жили по одной и той же модели ответа на четыре вопроса:

1. Что это за шаг?
2. Какой у него canonical artifact?
3. Какая dialog / continuity chain к нему относится?
4. Какой шаг сейчас активен в workspace после restart?

Wave считается успешной, когда:

- каждый trunk step имеет симметричный canonical step passport;
- startup restore читает один workspace truth chain;
- stale legacy workspace metadata self-heal-ится при открытии workspace;
- PM после cold start открывает тот же шаг, который реально подтверждён artifacts + continuity;
- regression tests покрывают весь trunk, а не только последний добавленный шаг.

---

## 3. Non-Goals

Эта wave не должна:

- добавлять новый workflow step;
- внедрять `foundation-envelope.flow.json` или visual projection для `Foundation Envelope`;
- начинать branch-level specifications;
- менять provider feature set, кроме той части, которая нужна для correct restore / continuity binding;
- переделывать пользовательский смысл самих trunk artifacts.

---

## 4. Core Decisions

### 4.1. Scope covers all released trunk steps

В scope входят:

- `description`
- `virtual_simulation`
- `diagram_modules`
- `foundation_envelope`

Исправление только последнего шага считается недостаточным. Цель wave — выровнять весь trunk.

### 4.2. Every step must expose one canonical step passport

Минимальный step passport для каждого шага:

1. canonical `stageId`;
2. canonical artifact reference;
3. canonical readiness / status snapshot;
4. canonical continuity binding;
5. canonical active-stage eligibility for workspace restore;
6. `updatedAt`, достаточный для deterministic conflict resolution.

Важно: это именно canonical contract. Его внутренняя реализация может быть shared, но product truth не должен собираться по догадкам.

### 4.3. Workflow-state owns startup truth

При cold start ответ на вопрос `какой шаг сейчас активен` принадлежит workflow-state layer.

Continuity при этом отвечает за другое:

- какой dialog относится к выбранному шагу;
- какую history-backed chain нужно открыть;
- как избежать duplicate roots / empty dialogs.

То есть continuity хранит dialog truth, но не подменяет workflow active truth.

### 4.4. Released asymmetry must self-heal

Так как bug уже попал в реальные workspace, wave обязана содержать legacy repair path.

Если при startup system видит, что:

- у более позднего шага существует canonical artifact;
- continuity тоже дошла до этого шага;
- а старый active pointer застрял раньше,

то stale metadata должна автоматически подниматься до реально достигнутого шага.

### 4.5. Description-only special treatment must be removed as startup truth

Текущая ситуация, где `Description` имеет более явный metadata surface, а поздние шаги во многом восстанавливаются по косвенным признакам, не должна оставаться частью живой архитектуры.

`Description` может сохранить свои step-specific файлы, но startup truth и step identity должны читаться по тем же законам, что и у остальных шагов.

### 4.6. PM restore must be route-symmetric

После wave следующие действия обязаны вести к одному и тому же результату:

- workspace open;
- toolbar click;
- tree stage click;
- tree artifact click;
- tree session click;
- restore after restart.

Итог должен быть один: одинаковый `activeStage + session + artifact`.

### 4.7. Tests are part of the architecture, not a later add-on

Так как проблема формализуема, тесты входят в обязательную конструкцию wave.

Нужны:

- core tests на workflow-state / last-active reconciliation;
- continuity tests на history-backed dialog restore;
- PM tests на startup auto-select и route symmetry;
- legacy workspace tests на self-heal stale metadata.

### 4.8. The wave ends only with a packaged release

Пользователь валидирует packaged VSIX, а не только source-tree happy path.

Поэтому release stream является частью scope, а не послесловием.

---

## 5. Target Architecture

### 5.1. Canonical workspace startup truth

Workspace startup truth должен давать один deterministic read model:

- current active step;
- canonical artifact for that step;
- current status of each trunk step;
- continuity target for the selected step.

Если разные UI surfaces или handlers хотят узнать startup truth, они должны читать один и тот же result, а не строить его заново по собственным эвристикам.

### 5.2. Canonical step-passport symmetry

Для каждого trunk step runtime обязан уметь одинаково materialize-ить:

- `stageId`
- `status`
- `artifactPath`
- `dialogId/rootSessionId/providerSessionId`
- `updatedAt`

Шаг может иметь дополнительные step-specific данные, но этот minimum contract обязан быть одинаковым.

### 5.3. Legacy repair / backfill

Wave должна поддержать уже созданные workspace без ручной чистки пользователем.

Минимальный backfill law:

- более поздний confirmed artifact + matching continuity chain имеют право поднять stale active pointer;
- duplicate empty dialog не может победить history-backed dialog;
- repaired startup truth должен записываться обратно в canonical state, чтобы следующий restart не повторял старую ошибку.

### 5.4. Artifact semantics remain step-specific

Симметрия не означает, что все шаги получают одинаковые файлы.

Например:

- `Diagram Modules` по-прежнему имеет staged set артефактов;
- `Foundation Envelope` в этой wave остаётся text-first шагом;
- `Description` по-прежнему начинается с `questionnaire.md`.

Симметрия относится к identity, restore и active-state truth, а не к одинаковому содержимому artifacts.

---

## 6. Acceptance And Test Matrix

Для каждого trunk step проверяется один и тот же базовый набор:

1. artifact materialization updates canonical step truth;
2. workflow-state reports correct status after cold start;
3. active step after cold start points to the latest real step, not to stale metadata;
4. PM startup auto-select opens the correct stage;
5. PM session panel resolves the correct dialog for that stage;
6. PM artifact panel resolves the correct canonical artifact for that stage.

Дополнительные retrofit tests:

1. stale `lastActive` behind continuity/artifact is repaired automatically;
2. duplicate continuity entries still resolve to the history-backed dialog;
3. `Diagram Modules` keeps correct staged readiness after restart;
4. `Foundation Envelope` survives restart as a first-class latest step.

---

## 7. Execution Slices

### Slice A. Guardrails and planning SSOT

- strengthen rollout guardrails with retrofit law for existing steps;
- register this scope in `Docs_Index`;
- cut an execution `todo-plan` with dedicated test and release streams.

### Slice B. Core startup truth and step-passport symmetry

- unify workflow-state / last-active / continuity reconciliation;
- make late trunk steps first-class in the same startup read model;
- add legacy self-heal for stale workspace metadata.

### Slice C. PM startup and route symmetry

- make PM startup follow the canonical workspace truth only;
- align stage/session/artifact auto-selection across all entry paths.

### Slice D. Regression coverage

- add formal tests for trunk-step symmetry, stale-state repair, and restart restore.

### Slice E. Release

- sync release-facing docs;
- build all artifacts;
- package and validate VSIX.

---

## 8. Success Criteria

Wave считается завершённой только если одновременно выполнены все условия:

1. Все четыре released trunk steps используют один startup truth chain.
2. `workflow-state` и `continuity` не расходятся по active step после restart.
3. Поздний trunk step не может существовать только как artifact without canonical active-state truth.
4. Legacy workspace открывается без ручной чистки stale metadata.
5. Regression suite формально ловит возврат несимметричности.
6. Пакетный релиз проходит и подтверждает поведение вне source-tree режима.
