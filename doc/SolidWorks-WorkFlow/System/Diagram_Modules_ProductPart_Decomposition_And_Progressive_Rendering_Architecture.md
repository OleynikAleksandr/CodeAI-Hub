# Diagram Modules Product Part Decomposition And Progressive Rendering — Architecture Draft

**Статус:** Accepted planning baseline
**Дата:** 2026-03-23
**Охват:** decomposition `Diagram Modules` по `Product Part`, index-first artifact model, скрытая runtime-оркестрация последовательных turn-ов, progressive React Flow materialization, deferred relation lines, compatibility aggregate для downstream `Diagram Facades`

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `doc/Sessions/Archive/Session132.md`
- `doc/Sessions/Archive/Session133.md`
- `doc/TODO/todo-plan.md`

---

## 1. Почему нужен новый refactor

Релиз `1.1.767` подтвердил, что dense `Diagram Modules` упирается уже не только в autolayout.

Пользовательский retest выявил два structural failure mode:
- input unlock происходит раньше, чем шаг реально заканчивает generation артефакта и derived diagram;
- long-running `Codex` turn может умереть по ложному `idle_timeout`, после чего не появляется ни `structured_output`, ни `module-inventory.md`, ни итоговая диаграмма.

Отдельно стало видно, что основная сложность текущего `Diagram Modules` растёт прежде всего из количества `Product Part`, а не из relation lines.

Следствие:
- giant single-turn generation одного `module-inventory.md` больше не считается масштабируемой базовой архитектурой шага;
- пользователю нужен ранний графический прогресс по мере materialization `Product Part`;
- relation lines не должны блокировать основной review-step состава системы.

---

## 2. Принятые user-facing выводы

### 2.1. Что остаётся главным смыслом шага

`Diagram Modules` остаётся главным user-review step workflow, потому что именно здесь пользователь впервые видит продукт как графическую структуру.

На этом шаге пользователь должен в первую очередь оценивать:
- набор `Product Part`;
- состав cluster-ов внутри каждого `Product Part`;
- набор standalone module-ов;
- краткое назначение каждого уровня.

### 2.2. Что убирается из базового scope

Relation lines и cross-part graph wiring не являются обязательной частью первого полезного результата `Diagram Modules`.

Их можно вынести:
- либо в отдельный optional substep внутри `Diagram Modules`;
- либо полностью в следующий архитектурный слой после stabilizing структуры.

Базовый review-step состава системы не должен ждать semantic lines.

### 2.3. Что пользователь должен видеть

Пользователь не должен вручную подтверждать каждый отдельный `Product Part` через чат.

Вместо этого он должен:
- видеть постепенное появление общей картины в `React Flow`;
- наблюдать placeholders для запланированных `Product Part`;
- получать полный visual review после materialization всех parts или при blocking ambiguity.

---

## 3. Принятая модель шага

`Diagram Modules` переходит из модели:

- `one giant turn -> one giant module-inventory.md -> one final graph`

в модель:

- `index turn -> sequential product-part turns -> progressive graph -> final aggregate`

### 3.1. Первый артефакт шага

Первым артефактом шага становится отдельный index-файл:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`

Его задача:
- дать `React Flow` канонический список будущих `Product Part`;
- зафиксировать порядок генерации;
- позволить UI показать skeleton общей картины ещё до появления part-файлов.

Минимальное содержимое index:
- ordered list of `Product Part`;
- `id`;
- `title`;
- `purpose`;
- generation status (`planned`, `in_progress`, `generated`, `reviewed`).

### 3.2. Артефакты отдельных Product Part

Каждый `Product Part` materialize-ится отдельным Markdown-артефактом:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`

Один provider turn отвечает только за один `Product Part`.

Внутри такого part-файла живёт локальная ownership-aware структура:
- один `Product Part`;
- вложенные `Cluster`;
- standalone `Module`;
- локальные notes/open questions для этого part.

### 3.3. Compatibility aggregate

Чтобы не ломать downstream `Diagram Facades`, runtime собирает compatibility aggregate:

- `.codeai-hub/<workspaceSlug>/diagram_modules/module-inventory.md`

Этот aggregate не является первичным user-generation artifact в новом процессе.
Он materialize-ится runtime-ом из:
- `product-parts.index.md`;
- всех `product-parts/<part-id>.md`.

Следствие:
- user-facing generation остаётся progressive;
- downstream stage всё ещё получает один привычный canonical input.

---

## 4. Принятая orchestration-модель

### 4.1. Один шаг workflow, несколько runtime subturn-ов

Для пользователя это по-прежнему один шаг `Diagram Modules`.

Для runtime внутри него появляется последовательность subturn-ов:
1. discovery/index turn;
2. `Product Part 1` turn;
3. `Product Part 2` turn;
4. ...;
5. final aggregate compose/review handoff.

### 4.2. Кто запускает следующий turn

Следующий turn запускает runtime, а не пользователь.

Но это не fake user message `Продолжай`.

Это скрытый orchestration-turn с runtime origin:
- не user-visible как обычное chat message;
- не должен засорять бесконечную пользовательскую историю;
- должен нести чёткий continuation packet: какой `Product Part` следующий, что уже materialized, где лежат предыдущие part-артефакты и когда нужно остановиться для пользователя.

### 4.3. Когда последовательность останавливается

Runtime auto-continues sequence, пока не случится одно из двух:
- все planned `Product Part` materialized;
- агент зафиксировал blocking ambiguity, которую нельзя честно решить без пользователя.

Промежуточная пауза после каждого part по умолчанию не требуется.

### 4.4. Lock contract

Пока runtime гонит внутреннюю последовательность subturn-ов:
- user input остаётся заблокирован;
- input не должен отпускаться между part-turn-ами;
- unlock происходит только на blocking ambiguity или на финальном review boundary.

Иначе decomposition не решит текущий premature-unlock bug.

---

## 5. Принятая React Flow-модель

### 5.1. Index-first skeleton

Как только появился `product-parts.index.md`, `React Flow` должен:
- создать top-level containers для всех planned `Product Part`;
- расположить их в фиксированном порядке;
- показать ещё не materialized parts как placeholders / semi-transparent blocks.

### 5.2. Progressive replacement

После каждого нового `product-parts/<part-id>.md`:
- graph перечитывает index + уже готовые part-files;
- placeholder соответствующего `Product Part` заменяется реальным container tree;
- уже materialized parts не очищаются;
- graph постепенно регенерируется, а не строится заново из пустоты.

### 5.3. Layout baseline

Базовый top-level порядок остаётся простым и user-readable:
- `Product Part` добавляются последовательно;
- общий граф растёт постепенно;
- relation lines на этой стадии отсутствуют;
- layout фокусируется на читаемости ownership tree, а не на graph routing.

---

## 6. Почему relation lines откладываются

На текущем этапе relation lines:
- не являются главным источником пользы для пользователя;
- сильно усложняют prompt, runtime, parser и visual shell;
- не определяют качество структуры `Product Part -> Cluster -> Module`.

Принятое решение:
- в первом slice refactor relation lines исключаются из обязательного `Diagram Modules` output;
- отдельный substep для relation lines возможен позже, если после stabilizing структуры действительно появится user value.

Это уменьшает combinatorics и делает refactor выполнимым.

---

## 7. Что refactor обязан решить технически

### 7.1. Масштабируемость шага

Генерация больше не должна зависеть от одного giant `module-inventory.md` turn-а.

### 7.2. Progressive visibility

Пользователь должен видеть, что шаг реально движется:
- сначала skeleton planned parts;
- затем последовательное появление готовых `Product Part`.

### 7.3. Session stability

Даже после decomposition отдельный `Product Part` может быть тяжёлым.

Поэтому refactor не отменяет отдельную задачу:
- исправить ложный `Codex` `idle_timeout`;
- перестать терять late provider messages;
- перестать убивать turn до `structured_output`.

### 7.4. Downstream compatibility

`Diagram Facades` не должен зависеть от того, что пользователь руками склеивает множество part-файлов.

Compatibility aggregate обязателен.

---

## 8. Что не входит в первый implementation slice

- Cross-part relation lines.
- Visual routing edges.
- Новый user-facing чат-режим с обязательным подтверждением после каждого part.
- Полный redesign `Diagram Facades`.
- Попытка сразу перевести все downstream инструменты на multi-file read без compatibility aggregate.

---

## 9. Execution streams

### Stream A — Contracts and artifact model

- Зафиксировать новые артефакты: `product-parts.index.md` и `product-parts/<part-id>.md`.
- Зафиксировать compatibility aggregate `module-inventory.md`.
- Обновить workflow/docs и artifact-path contracts.

### Stream B — Hidden runtime orchestration

- Ввести sequential subturn model для `Diagram Modules`.
- Реализовать runtime-controlled continuation packet.
- Держать user input locked до final review или blocking ambiguity.

### Stream C — Progressive React Flow materialization

- Читать index artifact как graph skeleton.
- Materialize готовые `Product Part` поверх placeholders.
- Регeнерировать граф инкрементально без visual reset.

### Stream D — Downstream compatibility and completion gate

- Собирать aggregate inventory из part-файлов.
- Закрывать stage только после полного набора part-артефактов и aggregate compose.
- Не требовать relation lines для базового completion.

### Stream E — Codex long-turn resilience

- Убрать ложный `idle_timeout`.
- Сохранить late provider commentary/final messages в unified session и UI.
- Убедиться, что decomposition не держится на хрупком timeout workaround.

### Stream F — Release

- Обновить release notes и user-facing workflow docs.
- Выполнить `./scripts/build-all.sh`.
- Выполнить `./scripts/build-release.sh --use-current-version`.

---

## 10. Ожидаемый результат

После refactor пользователь должен получать:
- ранний visual skeleton будущей системы;
- постепенное появление `Product Part` в `React Flow`;
- более надёжный `Diagram Modules` без giant single-turn bottleneck;
- stage, который по умолчанию обсуждает структуру, а не линии;
- compatibility aggregate для `Diagram Facades`;
- новый локальный релиз, на котором этот flow можно реально тестировать.
