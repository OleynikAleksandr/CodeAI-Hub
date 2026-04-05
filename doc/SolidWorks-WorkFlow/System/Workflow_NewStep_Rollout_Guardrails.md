# Workflow New Step Rollout Guardrails (SSOT)

**Status:** Active
**Updated:** 2026-04-05
**Owner:** Oleksandr + Codex
**Scope:** System-level protocol for adding a new workflow step without shipping partial stage shells, localization gaps, broken continuity paths, or mismatched Project Manager behavior.

---

## 1. Purpose

Этот документ фиксирует обязательный системный подход к добавлению нового шага в workflow CodeAI Hub.

Документ существует потому, что rollout `Foundation Envelope` показал повторяемый класс ошибок:

- новый шаг был добавлен не как полный system contract, а как частичный stage shell;
- user-facing тексты не были сразу проведены через правильную localization boundary;
- Project Manager tree/session surfaces были доведены до parity только после релиза;
- continuity path и handoff path остались на fallback `unknown`, из-за чего stage session не открывалась правильно в левой панели;
- cold-start persistence не была синхронно обновлена для нового `stageId`.

Следовательно, новый workflow step больше нельзя внедрять как “ещё одну кнопку” или “ещё один prompt”.

Новый шаг обязан внедряться как **полный end-to-end contract**.

---

## 2. Core Principle

### 2.1. Не invent new step behavior from scratch

Если в продукте уже есть зрелый шаг с похожей topology, новый шаг обязан сначала **полностью скопировать его системный rollout pattern**:

- stage contract в core;
- artifact path contract;
- Project Manager stage shell;
- session/continuity routing;
- localization ownership;
- persistence and cold-start hydration;
- verification and release acceptance.

Правильный first move:

1. выбрать reference step с максимально похожим UX/continuity profile;
2. составить full surface inventory;
3. перенести этот contract на новый `stageId`;
4. только потом добавлять step-specific semantics.

### 2.2. Новый шаг считается feature-complete только при parity с mature steps

Если новый шаг:

- появляется в Toolbar,
- но не открывает ту же session/artifact pair, что и mature steps,
- или пишет continuity в `unknown`,
- или не имеет localization ids,

то шаг **не считается внедрённым**, даже если artifact уже materialize-ится.

---

## 3. Mandatory Rollout Sequence

### 3.1. Сначала design intake, потом implementation

До начала кода должен существовать planning/intake документ, который фиксирует:

- product goal шага;
- место шага в trunk order;
- canonical input contract;
- canonical output artifacts;
- gating rule;
- non-goals;
- first implementation wave и deferred waves.

### 3.2. Сначала reference-surface matrix, потом edits

Перед первым кодовым изменением нужно составить matrix всех обязательных поверхностей.

Нельзя начинать rollout с UI или только с prompt/template.

Минимальная matrix обязана покрыть:

1. Workflow stage identity
2. Artifact paths and validation
3. Gating and hydration
4. PM toolbar/tree/panel/session surfaces
5. Localization ownership and dictionary ids
6. Continuity and handoff persistence
7. Last-active / cold-start persistence
8. Tests
9. Packaged release acceptance

### 3.3. Сначала localization ownership, потом copy

Новый шаг не имеет права добавлять product-owned text без явной классификации по `UserFacing_Text_Localization_Boundary.md`.

### 3.4. Сначала packaged release validation, потом acceptance

Local dev success недостаточен.

Новый шаг считается подтверждённым только после проверки packaged VSIX/release артефакта, потому что именно там всплывают:

- отсутствующие localization bundles;
- broken runtime packaging;
- stale manifests;
- drift между runtime persistence и PM startup behavior.

---

## 4. Mandatory Surface Inventory

## 4.1. Stage identity contract

Новый шаг обязан быть first-class `stageId` во всех canonical stage lists/order maps.

Обязательные вопросы:

1. Где stage ids перечислены в core?
2. Где тот же order перечислен в client/PM?
3. Где есть parser/allowlist, который silently drops unknown stage ids?
4. Где есть fallback `unknown`, который надо заменить на новый canonical `stageId`?

Если хотя бы один stage parser не обновлён, rollout считается незавершённым.

## 4.2. Artifact contract

Для каждого нового шага заранее фиксируются:

- canonical workspace folder;
- canonical semantic artifact(s);
- optional sidecar/view artifacts;
- validation rule;
- repair/fix/reopen path;
- watcher coverage.

Artifact path обязан жить под:

`/.codeai-hub/<workspaceSlug>/<stageId>/...`

Итоговый artifact contract должен быть одинаково известен:

- Core watcher/state;
- HTTP/artifact services;
- Project Manager;
- repair/open flows;
- tests.

## 4.3. Gating and outdated propagation

Новый шаг обязан иметь explicit upstream gate, основанный на **реальной semantic readiness**, а не на первом случайно найденном файле.

Если upstream step materialize-ит aggregate artifact и дочерние semantic files, gate должен учитывать именно aggregate-ready condition.

Также заранее определяется:

- что делает step `READY`;
- что делает его `DONE`;
- что делает его `ERROR`;
- какие upstream changes делают его `OUTDATED`.

## 4.4. Project Manager parity

Для шага сразу проектируется полный PM contract:

- toolbar label;
- stage button state;
- blocked-title;
- help surface;
- stage panel content;
- artifact open/select path;
- workspace auto-select priority;
- stage click sync;
- tree node contract;
- right-panel empty state;
- runtime/dialog session reopen path.

Если mature reference step имеет:

- parent stage row,
- child session line,
- child artifact line,

то новый шаг обязан materialize-ить тот же contract.

Partial PM rollout запрещён.

## 4.5. Continuity and handoff contract

Для нового шага обязательно проверяются и обновляются:

- continuity chain stage normalization;
- continuity storage path;
- handoff report path;
- handoff prompt stage rendering;
- continuity tracker stage matching;
- continuity index entries;
- root-session resolution;
- provider-session matching.

Canonical continuity path для любого шага:

`/.codeai-hub/<workspaceSlug>/continuity/<stageId>/<rootSessionId>/...`

Fallback к `continuity/unknown/...` допустим только для реально неизвестных legacy cases, но никогда для официально поддерживаемого нового шага.

## 4.6. Cold-start and last-active persistence

Новый шаг обязан переживать restart продукта.

Следовательно, rollout считается незавершённым, пока новый `stageId` не участвует в:

- workflow state readback;
- last-active parsing;
- startup hydration;
- PM restore behavior;
- restored artifact/session selection.

## 4.7. Localization contract

Каждая новая text surface шага обязана быть классифицирована заранее:

- `UI Labels`
- `UI Helper Text`
- `Messages for the User`
- `Artifacts for the User`
- `Internal Agent Instructions`

Для нового шага особенно легко забыть следующие surfaces:

- stage label;
- blocked-title;
- session label format with provider placeholder;
- help title/body;
- empty-state guidance;
- load/error/fallback messages;
- artifact shell text;
- provider/session status lines.

Обязательные правила:

1. canonical English source text живёт в source dictionaries;
2. React component / helper / presenter не является source of truth;
3. prompt body остаётся `Internal Agent Instructions` и English-only;
4. user-facing output language thread must be explicit, never implied.

## 4.8. Release and runtime packaging

Если новый шаг зависит от:

- templates,
- prompts,
- localization catalogs,
- runtime assets,
- provider/runtime packages,

то release acceptance обязана проверить packaged artifact, а не только workspace source tree.

---

## 5. Canonical Folder Structure Rules

Для каждого нового шага нужно заранее зафиксировать три разные filesystem зоны:

### 5.1. Step artifact folder

`/.codeai-hub/<workspaceSlug>/<stageId>/...`

Здесь живут canonical artifacts шага.

### 5.2. Continuity folder

`/.codeai-hub/<workspaceSlug>/continuity/<stageId>/<rootSessionId>/...`

Здесь живут chain/handoff continuity artifacts шага.

### 5.3. Workflow state folder

`/.codeai-hub/<workspaceSlug>/workflow/...`

Здесь живут last-active и другие workflow-level persisted snapshots.

Критический запрет:

- artifact folder и continuity folder не могут иметь разные effective `stageId` для одного и того же официального шага.

Если artifact лежит под `foundation_envelope`, а continuity под `unknown`, это считается системной поломкой rollout-а.

---

## 6. New Step Acceptance Checklist

Новый шаг не считается готовым, пока одновременно не выполняются все пункты:

1. Новый `stageId` добавлен во все canonical stage registries, order maps и parsers.
2. Canonical artifact path определён и проходит watcher/state/validation path.
3. Upstream gate основан на semantic readiness, а не на случайном presence-only signal.
4. PM toolbar/tree/panel/session surfaces доведены до parity с выбранным mature reference step.
5. В tree у шага есть правильная child structure, если reference step её имеет.
6. Stage click, child click, toolbar click и auto-select открывают одну и ту же artifact/session pair.
7. Все user-facing тексты размечены по localization ownership и имеют dictionary ids.
8. Help/empty-state/load-error surfaces реагируют на выбранный язык пользователя.
9. Continuity chain, handoff path и tracker routing используют canonical `stageId`, а не `unknown`.
10. Last-active persistence и cold-start hydration не теряют новый шаг после restart.
11. Есть прямые regression tests на artifact path, PM parity и persistence/continuity path.
12. Packaged release artifact проверен пользователем или release validation pass явно подтверждён.

Если хотя бы один пункт не выполнен, rollout должен считаться `INCOMPLETE`, а не “почти готов”.

---

## 7. Minimum Verification Matrix

Для нового шага обязательны как минимум такие проверки:

### 7.1. Core

- stage normalization test;
- artifact path test;
- gating/outdated test;
- continuity path test;
- handoff path test;
- last-active readback test.

### 7.2. Project Manager

- tree child parity test;
- stage selection sync test;
- auto-select restore test;
- empty-state stage-awareness test;
- help/localization lookup test.

### 7.3. Release

- target package build;
- packaged runtime validation;
- VSIX/release smoke for the new step.

---

## 8. Anti-Patterns

Следующие подходы запрещены:

1. Добавить только Toolbar button и считать шаг внедрённым.
2. Добавить artifact path, но не обновить continuity normalization.
3. Писать user-facing copy inline и переносить localization “на потом”.
4. Делать отдельную special-case tree logic вместо parity с mature reference step.
5. Гейтить шаг по первому найденному upstream file вместо semantic completion.
6. Считать local dev run достаточным доказательством release readiness.
7. Добавлять новый step через scattered one-off edits без общей surface matrix.

---

## 9. Practical Rule For Future Sessions

При начале любого нового workflow-step rollout исполнитель обязан ответить письменно на 5 вопросов до первого кодового коммита:

1. Какой mature step является reference pattern?
2. Какой canonical `stageId` и какой canonical artifact path у нового шага?
3. Какие exact PM surfaces должны вести себя identically to reference step?
4. Какие localization categories владеют всеми новыми text surfaces?
5. Какие persistence paths обязаны использовать этот же `stageId` на artifact, continuity и cold-start уровнях?

Если эти ответы не сформулированы, implementation не должен стартовать.

---

## 10. Related SSOT

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`
