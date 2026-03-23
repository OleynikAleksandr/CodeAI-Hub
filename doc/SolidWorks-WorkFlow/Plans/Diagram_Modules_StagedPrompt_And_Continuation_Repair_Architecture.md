# Diagram Modules Staged Prompt And Continuation Repair Architecture

**Date:** 2026-03-23
**Owner:** Oleksandr / Codex
**Status:** Proposed follow-up after retest of release `1.1.768`

---

## 1. Problem

Ретест `1.1.768` показал два связанных дефекта в новом staged `Diagram Modules` flow.

### 1.1. Prompt/template contract остаётся внутренне противоречивым

В релизе одновременно живут:
- новый PM-side staged header, который требует `product-parts.index.md`, далее `product-parts/<part-id>.md`, а `module-inventory.md` оставляет runtime-owned aggregate;
- старый user-facing `diagram_modules` prompt/template layer, который по-прежнему инструктирует агента строить один `module-inventory.md`, запрещает дополнительные Markdown artifacts и ожидает relations как часть прямого agent output.

Итог:
- агент получает гибридную инструкцию;
- успешное выполнение `Phase 1` происходит “вопреки” template contract, а не благодаря ему;
- другой provider/model может интерпретировать тот же prompt иначе и уйти обратно в giant inventory flow.

### 1.2. Hidden continuation не стартует после `Phase 1`

Во время live retest агент создал `product-parts.index.md`, а `React Flow` корректно materialize-ил skeleton `Product Part`.

Но продолжение sequence не произошло:
- PM orchestration ждёт artifact event, извлекаемый через `extractIdeaCollectorArtifact(...)`;
- этот extractor принимает только `structured_output`;
- в живом `Codex` turn `Phase 1` завершился прямым `file_change` и обычным assistant summary, без `structured_output`;
- из-за этого PM не перечитал `workflowState`, не увидел `currentPartId` и не отправил hidden continuation turn.

Следствие:
- staged flow внешне выглядит частично рабочим;
- на практике он останавливается после index creation и ждёт следующего user-visible turn.

---

## 2. Goals

Нужно довести `Diagram Modules` до реально непротиворечивой staged архитектуры:

1. Агент получает один coherent user-facing contract без старых giant-inventory инструкций.
2. `Phase 1` официально и явно materialize-ит `product-parts.index.md`.
3. `Phase 2+` официально и явно materialize-ят по одному `product-parts/<part-id>.md`.
4. `module-inventory.md` остаётся runtime-owned compatibility aggregate.
5. Base slice `Diagram Modules` не требует relation lines.
6. Hidden continuation должен запускаться не только после `structured_output`, но и после direct file-write/file-change path.

---

## 3. Target Model

### 3.1. User-facing staged artifacts

Для `diagram_modules` нужны отдельные canonical runtime assets:
- `product-parts.index.md` prompt/template contract;
- `product-part.md` prompt/template contract для одного `Product Part`;
- обновлённые field reference / merge rules, согласованные со staged flow;
- явная фиксация, что `module-inventory.md` больше не является прямой первой целью агента.

### 3.2. Prompt contract

Новый user-facing prompt должен:
- прямо описывать `Phase 1 -> Phase 2 -> runtime aggregate`;
- не запрещать staged Markdown artifacts, которые сам runtime требует;
- не инструктировать агента возвращаться к giant single-file `module-inventory.md`;
- не требовать relation lines как базовую часть первого полезного результата;
- честно объяснять, что следующий hidden subturn может прийти от runtime автоматически.

### 3.3. Continuation trigger

Для `diagram_modules` нельзя больше считать `structured_output` единственным trigger path.

PM/runtime orchestration должен уметь продолжать sequence, когда:
- агент создал staged artifact прямым file write;
- turn завершился обычным assistant message;
- `workflowState` уже видит новый `diagramModulesProgress.currentPartId`.

Практический принцип:
- после каждого terminal event текущего `diagram_modules` turn нужно делать post-turn state re-read;
- если state показывает `generate_product_part` или `compose_aggregate` и нет blocking ambiguity, runtime отправляет hidden continuation;
- `structured_output` остаётся поддерживаемым, но не обязательным transport path.

---

## 4. Implementation Streams

### Stream A. Repair user-facing prompt/template layer

Нужно обновить:
- `diagram_modules` prompt asset;
- staged index template;
- staged single-product-part template;
- связанные field reference / merge rules;
- bundled template generation и sync coverage.

### Stream B. Repair hidden continuation trigger

Нужно обновить orchestration так, чтобы следующий hidden turn запускался:
- после `structured_output`;
- после post-turn workflow-state refresh для direct file-write path.

### Stream C. Regression coverage

Нужно добавить проверки на два реальных сценария:
- агент создаёт `product-parts.index.md` прямым `file_change`, после чего hidden continuation всё равно стартует;
- user-facing prompt pack и synced templates больше не содержат монолитных инструкций про giant direct `module-inventory.md`.

---

## 5. Acceptance Criteria

Считаем scope завершённым, когда одновременно выполняется всё ниже:

1. Live prompt для `Diagram Modules` больше не содержит прямых указаний:
   - что единственный canonical output этого turn-а — `module-inventory.md`;
   - что дополнительные Markdown artifacts запрещены;
   - что relations обязательны уже в первом staged slice.
2. Runtime template set содержит явные staged assets для index и single-part generation.
3. После `Phase 1` и появления `product-parts.index.md` hidden continuation автоматически запускает следующий `Product Part` turn без user-visible `Продолжай`.
4. `React Flow` по-прежнему показывает skeleton сразу после index и progressively materialize-ит реальные parts по мере появления файлов.
5. `module-inventory.md` остаётся runtime-owned aggregate и downstream compatibility artifact для `Diagram Facades`.
6. После фиксов собирается новый локальный release для пользовательского ретеста.

---

## 6. Out Of Scope

В этот follow-up не входят:
- redesign visual layout `Product Part` placeholders;
- relation lines для `Diagram Modules`;
- semantic пересмотр самих найденных `Product Part`;
- крупный DSL redesign за пределами staged prompt/template contract.
