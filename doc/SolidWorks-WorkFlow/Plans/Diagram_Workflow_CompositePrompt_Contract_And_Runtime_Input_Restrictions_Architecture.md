# Diagram Workflow Composite Prompt Contract And Runtime Input Restrictions Architecture

**Date:** 2026-03-23
**Owner:** Oleksandr / Codex
**Status:** Proposed follow-up after user retest of release `1.1.769`

---

## 1. Problem

Пользовательский retest `1.1.769` показал, что проблема больше не ограничивается одним текстовым asset для `Diagram Modules`.
Проблема живёт в составном prompt contract, который собирается из нескольких слоёв:
- базовый agent prompt asset;
- PM prompt pack с user-visible stage header;
- runtime workflow contract;
- `templatePath`, который PM добавляет в prompt как `Шаблон (absolute)`;
- appendix/reference assets, которые подмешиваются к prompt текстом;
- synced template files, которые агент считает допустимым discovery-target.

### 1.1. `Diagram Modules` продолжает тратить turn на лишний discovery

Во время retest агент вместо немедленного обновления `product-parts.index.md` сначала:
- проверял, нет ли compatibility inventory;
- проверял, существует ли старый `diagram_modules` каталог / staged examples;
- искал formal staged template;
- проверял continuity/runtime helper files.

Промежуточные сообщения из живого retest подтверждают именно этот сценарий:
- агент ищет `compatibility inventory`, хотя runtime aggregate не должен быть его рабочим входом по умолчанию;
- агент ищет staged examples и runtime templates на диске, хотя staged contract уже должен быть fully specified в самом prompt;
- агент пытается удостовериться, что не существует старый giant-flow baseline, вместо того чтобы сразу materialize-ить текущий target artifact.

Следствие:
- тратятся лишние токены и время до первой полезной записи;
- user-visible commentary выглядит так, будто агент reconcilе-ит старую и новую архитектуру прямо во время рабочей итерации;
- staged flow остаётся внутренне недоопределённым, даже после релиза `1.1.769`.

### 1.2. Корень проблемы — отсутствие explicit negative space

Сейчас prompt хорошо описывает желаемый output, но плохо описывает:
- какие входы действительно даны на текущем turn-е;
- какие файлы не нужно искать самостоятельно;
- какие legacy артефакты не надо использовать, если runtime их явно не передал;
- когда template/reference уже встроен в prompt и дополнительный disk discovery запрещён.

Итог:
- модель ведёт себя осторожно и начинает проверять лишние ветки;
- это выглядит как "агент тупит", хотя фактически он выполняет двусмысленные инструкции.

### 1.3. `Diagram Facades` находится в зоне такого же риска

Пока живой retest был про `Diagram Modules`, но `Diagram Facades` уже сейчас имеет те же потенциально проблемные паттерны:
- prompt asset разрешает continuity files и runtime templates как допустимый источник discovery;
- PM prompt pack показывает generic `Шаблон (absolute)`;
- contract тоже строится составно и оставляет агенту свободу для лишнего disk scouting.

Даже если `facade-map` template корректен semantic-wise, user-visible contract по-прежнему не задаёт достаточно жёстко:
- exact inputs текущего turn-а;
- explicit non-inputs;
- запрет на поиск continuity/template files вне того, что runtime уже дал.

---

## 2. Goals

Нужно привести оба diagram-stage prompt contract к одной строгой модели:

1. User-visible compose prompt перечисляет exact inputs текущего turn-а.
2. Prompt явно перечисляет non-inputs и запрещённый discovery.
3. Агент не ищет compatibility aggregate, staged examples, continuity files и template files, если runtime явно не дал их как вход.
4. `Diagram Modules` не получает generic monolithic template hint, который отсылает обратно к `module-inventory` baseline.
5. `Diagram Facades` не получает такой же generic template-discovery contract, даже если его semantic template валиден.
6. Appendix/reference content остаётся доступным, но как already-provided prompt content, а не как повод для disk scouting.
7. После фиксов собирается новый локальный release для повторного пользовательского retest.

---

## 3. Target Contract Model

### 3.1. Общий принцип для diagram stages

Для `diagram_modules` и `diagram_facades` prompt должен описывать три разные категории:

#### A. Inputs for this turn
- только те артефакты, которые runtime реально считает canonical входами этого turn-а;
- только текущий target artifact и upstream semantic artifact(s);
- только runtime-provided merge/change summary, если он действительно приложен.

#### B. References already embedded in the prompt
- field reference;
- merge rules;
- staged shape guidance;
- любые дополнительные DSL restrictions.

Если эти материалы уже встроены в prompt appendices, агенту нельзя искать их на диске повторно.

#### C. Explicit non-inputs
- continuity files;
- compatibility aggregates, если они не указаны как текущий вход;
- legacy stage directories;
- staged examples / old artifacts, не перечисленные runtime;
- parser/runtime implementation и тесты CodeAI Hub.

### 3.2. `Diagram Modules`

`Diagram Modules` должен получить жёсткий staged contract:
- первый visible turn работает только с `Final_Description.md`, `virtual-simulation.md` и target `product-parts.index.md`;
- continuation turn работает только с текущим `product-parts/<part-id>.md` и уже materialized staged artifacts, которые runtime явно указал как вход;
- `module-inventory.md` не читается и не ищется проактивно, если runtime отдельно не дал его как carry-over reference;
- generic `Шаблон (absolute)` для stage-level diagram contract не показывается;
- staged template guidance либо already embedded в prompt, либо заменена строгим текстовым contract без disk scouting.

### 3.3. `Diagram Facades`

`Diagram Facades` должен получить такой же explicit contract:
- прямой semantic input — `module-inventory.md`;
- optional existing target — `facade-map.md`;
- optional runtime change summary — только если он реально передан;
- continuity files, extra template scouting и свободный повторный обход workspace не требуются по умолчанию;
- generic `Шаблон (absolute)` для diagram stage не должен попадать в user-visible compose prompt.

---

## 4. Implementation Streams

### Stream A. Planning baseline and retest capture

Нужно зафиксировать:
- findings пользовательского retest `1.1.769`;
- состав composite prompt chain;
- observed wasteful agent commentary;
- acceptance criteria нового follow-up scope.

### Stream B. Diagram Modules prompt surface cleanup

Нужно обновить:
- `module-inventory-prompt.md`;
- PM prompt pack для `diagram_modules`.

Цель:
- удалить legacy/discovery хвост;
- объяснить exact inputs;
- добавить explicit "do not search" ограничения;
- убрать generic template hint из user-visible compose prompt.

### Stream C. Diagram stage contract assembly cleanup

Нужно обновить runtime contract assembly для diagram stages так, чтобы:
- diagram stages больше не выглядели как single-template flow;
- appendix/reference content продолжал попадать в prompt;
- generic stage template path не провоцировал лишний scouting.

### Stream D. Diagram Facades prompt surface cleanup

Нужно отдельно проверить и ужесточить:
- `facade-map-prompt.md`;
- compose prompt для `diagram_facades`.

Цель:
- зафиксировать exact inputs и non-inputs;
- убрать continuity/template scouting как default behaviour.

### Stream E. Regression coverage

Нужно тестами закрепить:
- отсутствие legacy prompt strings;
- отсутствие generic `Шаблон (absolute)` для diagram stages;
- корректный strict contract для `diagram_modules`;
- корректный strict contract для `diagram_facades`.

### Stream F. Release and handoff

После фиксов:
- синхронизировать release notes;
- собрать новый локальный релиз;
- оформить новый session handoff.

---

## 5. Acceptance Criteria

Считаем scope завершённым, когда одновременно выполняется всё ниже:

1. В live prompt для `Diagram Modules` больше нет инструкций, которые подталкивают агента:
   - искать `module-inventory.md` по умолчанию;
   - искать staged examples;
   - искать continuity files;
   - сверяться с generic monolithic template path.
2. В live prompt для `Diagram Facades` больше нет default-инструкций про continuity/template scouting.
3. PM compose prompt для diagram stages больше не показывает generic `Шаблон (absolute)`.
4. Runtime contract всё ещё подмешивает обязательные DSL references, но это не выглядит для агента как повод искать дополнительные template files на диске.
5. Повторный пользовательский retest показывает, что агент быстрее переходит к прямой работе с target artifact и не тратит commentary на reconciliation старых diagram artifacts.
6. После фиксов собирается новый локальный release baseline.

---

## 6. Out Of Scope

В этот follow-up не входят:
- redesign semantic DSL самих `module-inventory` / `facade-map` parser-ов;
- переработка `Diagram Modules` orchestration beyond prompt/contract scope;
- новый layout/refinement `React Flow`;
- redesign upstream `Description` или `Virtual Simulation` prompt layers.
