# Implementation Foundation Architecture

**Status:** Draft for review (2026-04-05)
**Created:** 2026-04-04
**Updated:** 2026-04-05
**Owner:** Oleksandr + Codex
**Scope:** Define a late, technology-aware workflow step that runs after `Application Foundation Envelope` and after the selected implementation branch already has approved `Product Part / Cluster / Module` specifications and required contracts. The step must materialize real implementation substrate for the selected wave inside the already-defined application envelope.

---

## 1. Problem

После `Diagram Modules` продукт уже понятен семантически, но этого недостаточно для старта безопасной реализации.

После обсуждения в этой сессии зафиксировано, что слишком рано пытаться materialize-ить весь implementation substrate сразу для всего workspace. На этапе сразу после диаграммы у нас ещё обычно нет:

- подтверждённого `Application Root`;
- формализованных `Shared Zones`;
- формализованных `Integration Seams`;
- согласованных intended technologies per `Product Part`;
- детальных спецификаций и контрактов ветки, которую мы реально собираемся реализовывать первой.

Поэтому ранний global `Implementation Foundation` приводит к неверной архитектуре:

- он пытается слишком рано выбирать языки, фреймворки и environments для всех частей приложения;
- он смешивает application-wide structural decisions с branch-level materialization;
- он вынуждает агента угадывать то, что ещё не оформлено в спецификациях и контрактах;
- он толкает workflow к premature bootstrap вместо детерминированного branch-driven движения.

Но и откладывать foundation до момента, когда код уже пишется, тоже нельзя:

- implementation-агент снова начнёт импровизировать с layout, configs, scripts и toolchains;
- quality gates и build/test entrypoints появятся случайно, а не как часть управляемого workflow;
- knowledge pack по стеку будет каждый раз добываться заново вместо materialized workspace artifacts.

Следовательно, нужен отдельный шаг, но он должен стоять **позже**:

- после `Application Foundation Envelope`;
- после спецификаций и контрактов выбранной ветки;
- до `TODO Plan` и до реальной реализации кода.

---

## 2. Product Goal

`Implementation Foundation` должен переводить **выбранную implementation wave** из состояния “ветка хорошо описана” в состояние “ветка готова к написанию кода без bootstrap-импровизации”.

Шаг считается успешным, когда для выбранного scope materialize-ено следующее:

1. Выбранный scope реализации зафиксирован явно.
2. Technology choices этой wave уточнены и привязаны к уже существующему `Application Foundation Envelope`.
3. В файловой структуре создан реальный subtree/skeleton для выбранного scope.
4. Установлены или инициализированы необходимые environments, packages и toolchains для этого scope.
5. Созданы canonical scripts и wrappers, которыми должны пользоваться downstream implementation-агенты.
6. Настроены и проверены stack-specific quality gates для materialized subtree.
7. Подготовлены knowledge artifacts по выбранному стеку, если они требуются.
8. Создан machine-readable `foundation-manifest.json`, который фиксирует результат, readiness status и blockers.

Ключевой принцип этого шага:

- `Implementation Foundation` materialize-ит **реальную technical surface** для выбранной ветки, но не переопределяет global application structure, уже заданную более ранним шагом `Application Foundation Envelope`.

---

## 3. Non-Goals

Этот шаг не должен:

- заменять собой `Application Foundation Envelope`;
- заново определять `Application Root`, `Shared Zones` или `Integration Seams`;
- писать бизнес-логику модулей;
- заменять собой `Product Part / Cluster / Module` specifications;
- подменять собой contracts той ветки, которая идёт в реализацию;
- пытаться за один проход materialize-ить весь workspace, если к этому моменту не выбран конкретный implementation scope;
- оставлять критичные implementation decisions только в чате без materialized artifacts.

---

## 4. Core Decisions

### 4.1. Шаг переносится после `Application Foundation Envelope` и после branch specs/contracts

Новая целевая позиция шага:

1. `Diagram Modules`
2. `Application Foundation Envelope`
3. `Product Part / Cluster / Module Specifications`
4. Required contracts for the selected wave
5. `Implementation Foundation`
6. `TODO Plan`
7. `Implementation`

Это означает, что `Implementation Foundation` больше не является bridge step сразу после диаграммы.
Он становится поздним, technology-aware preparation step перед кодом.

### 4.2. Единица materialization — implementation wave, а не отдельный модуль и не весь workspace по умолчанию

Шаг должен работать не для “всего приложения обязательно целиком” и не для “одного модуля в отрыве от контекста”.

Базовая единица — **implementation wave**.

Обычно это:

- один `Product Part`;
- или один `Product Part` плюс тесно связанные с ним shared/integration surfaces;
- или небольшой набор связанных `Product Part`, если их нельзя корректно materialize-ить раздельно.

Это сохраняет детерминированность branch-driven workflow:

- движение идёт малыми шагами;
- каждый шаг опирается на уже описанную ветку;
- application structure не теряется, потому что wave materialize-ится внутри ранее зафиксированного envelope.

### 4.3. Шаг встроен в продукт, но outputs живут в workspace

`Implementation Foundation` как workflow capability живёт в ядре CodeAI Hub.

Core обязан заранее знать:

- место шага в pipeline;
- state machine шага;
- input/output contract;
- canonical artifact paths;
- manifest schema;
- readiness states;
- policy/allowlist для installers, tooling и knowledge sources.

Но результат шага всегда materialize-ится в конкретном workspace пользователя:

- subtree/scaffold;
- manifests/configs;
- scripts;
- quality-gate configs;
- stack-specific setup;
- knowledge artifacts.

### 4.4. Ядро задаёт invariant baseline, агент достраивает stack-specific реализацию wave

Для этого шага нужно жёстко разделить две зоны ответственности.

Что обязаны предусмотреть мы как разработчики продукта:

- invariant artifact surface;
- manifest schema и readiness rules;
- canonical categories для `quality/build/test/scaffold`;
- policy по допустимым installation/materialization действиям;
- базовые инструкции step-agent'у;
- traceability rules.

Что должно быть делегировано step-agent'у:

- уточнение branch-level technology profile;
- выбор и доустановка stack-specific tooling в рамках policy;
- materialization реальных configs/scripts/scaffold для выбранной wave;
- подготовка knowledge artifacts по выбранному стеку;
- прогон readiness checks и фиксация blockers.

То есть агент не “придумывает шаг”.
Он завершает вариативную часть внутри уже заданного product contract.

### 4.5. Technology profile наследуется от envelope, а здесь уточняется и реализуется

К этому шагу у нас уже должен быть ранний application-level документ, который фиксирует intended technologies per `Product Part`.

Задача `Implementation Foundation` — не выбирать всё с нуля, а:

- прочитать envelope;
- посмотреть approved specs/contracts выбранной ветки;
- уточнить technology profile до уровня real implementation decisions;
- materialize-ить эти решения в workspace.

Именно здесь технологическое намерение превращается в:

- реальные manifests;
- реальные framework configs;
- реальные scripts;
- реальные environments.

### 4.6. Scripts и configs важнее повторяющихся инструкций агенту

Все repeatable operations, которые можно автоматизировать, должны становиться workspace scripts и config surface, а не prose-напоминаниями downstream implementation-агентам.

Примеры:

- `scripts/check-quality.*`
- `scripts/build-wave.*`
- `scripts/test-wave.*`
- `scripts/scaffold-module.*`
- `scripts/setup-wave-foundation.*`

После завершения `Implementation Foundation` downstream implementation-агент должен опираться именно на эти materialized entrypoints.

### 4.7. Quality gates должны сочетать общий application baseline и wave-specific слой

Часть quality contract может быть общей для всего приложения, но конкретный tooling и конфигурация будут зависеть от стека выбранной wave.

Например:

- для TypeScript/React могут потребоваться `ultracite`, `tsc`, `vitest`, `playwright`;
- для Python — другой набор;
- для C# / .NET — другой набор.

Следовательно:

- envelope или product policy задают общие expectations и categories;
- `Implementation Foundation` materialize-ит конкретную stack-specific реализацию;
- downstream agents должны видеть не “какие практики обычно бывают”, а какие gates реально установлены именно для этой wave.

### 4.8. Knowledge pack materialize-ится локально для выбранной wave

Этот шаг не должен каждый раз заставлять downstream implementation-агентов заново искать базовые framework conventions.

Вместо этого шаг обязан:

- определить, какие знания реально нужны для выбранной wave;
- взять их из доверенных источников;
- materialize-ить их в workspace-local artifacts;
- связать их с `foundation-manifest.json`.

Приоритет источников:

1. official docs / primary sources;
2. curated internal templates;
3. явно разрешённые external knowledge packs.

### 4.9. Empty subtree — это defect

После этого шага выбранная wave не должна оставаться “хорошо описанной, но физически пустой”.

Финал шага обязан дать:

- реальный subtree/scaffold;
- реальные manifests/configs;
- реальные scripts;
- реальные readiness checks;
- при необходимости реальные knowledge files.

Если этого нет, implementation для данной wave считается начатой преждевременно.

---

## 5. Target Architecture

### 5.1. Placement in workflow

Целевой порядок выглядит так:

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`
4. `Application Foundation Envelope`
5. `Product Part / Cluster / Module Specifications`
6. `Required contracts for the selected implementation wave`
7. `Implementation Foundation`
8. `TODO Plan`
9. `Implementation`

`Implementation Foundation` — это bridge between approved branch design and executable code work.

### 5.2. Input contract of the step

Минимальные входы:

- `Final_Description.md`
- `virtual-simulation.md`
- `product-parts.index.md`
- `product-parts/<part-id>.md`
- `application-foundation-envelope.md`
- выбранные `Product Part / Cluster / Module` specifications для implementation wave
- релевантные contracts этой wave

Дополнительные входы:

- technology decisions, помеченные в envelope как `Proposed` / `Needs decision`
- ограничения среды пользователя
- policy по допустимым tooling/plugin/source категориям
- явный выбор implementation wave, если параллельно готовы несколько веток

Если часть technology choices для этой wave ещё не зафиксирована окончательно, шаг обязан сначала уточнить их и записать в свои artifacts, а уже затем materialize-ить subtree.

### 5.3. Core responsibilities vs Step-agent responsibilities

**Product Core должен:**

- проверить наличие и пригодность upstream artifacts;
- проверить, что application envelope уже существует;
- подготовить canonical workspace-local surface шага;
- создать skeleton артефактов шага;
- передать агенту policy, manifest schema, readiness expectations и execution boundaries;
- зафиксировать identity выбранной implementation wave.

**Step Agent должен:**

- прочитать envelope и approved specs/contracts выбранной wave;
- уточнить technology profile выбранной wave;
- доустановить stack-specific toolchains, frameworks и packages в рамках policy;
- materialize-ить subtree/config/script surface;
- подготовить knowledge pack;
- прогнать readiness checks;
- записать результат в traceable workspace artifacts и `foundation-manifest.json`.

**Step Agent не должен:**

- заново определять global structure приложения;
- переопределять envelope-level contracts;
- произвольно менять schema артефактов;
- оставлять критичные decisions только в чате;
- писать бизнес-логику модулей, кроме минимального scaffold baseline.

### 5.4. Output layers

Шаг должен строить не один файл, а несколько взаимосвязанных слоёв workspace:

1. **Scope Layer**
   - identity выбранной implementation wave
   - mapping wave -> covered `Product Part / Cluster / Module`
2. **Technology Layer**
   - refined branch-level technology profile
   - framework/runtime/package choices for this wave
3. **Filesystem Layer**
   - subtree layout
   - source/test/scripts/config skeleton
4. **Environment Layer**
   - runtime/toolchain installation or initialization
   - package restore/bootstrap
5. **Quality Layer**
   - lint/type/test/build gates for this wave
   - canonical commands and wrappers
6. **Knowledge Layer**
   - stack notes
   - framework rules
   - local references for later agents
7. **Manifest Layer**
   - machine-readable summary of what was created, verified, and still blocked

### 5.5. Recommended artifact surface

Внутри `.codeai-hub/<workspaceSlug>/implementation_foundation/<scopeSlug>/` шаг должен вести traceable artifact set:

- `technology-profile.md`
- `implementation-foundation.md`
- `foundation-manifest.json`
- `quality-gates.md`
- `knowledge-pack.index.md`

Где `scopeSlug` — это identity выбранной implementation wave.

Дополнительно в самом workspace root materialize-ятся реальные рабочие поверхности:

- каталоги и packages выбранной wave;
- root или branch-level manifests/configs;
- quality-gate configs;
- install/bootstrap scripts;
- knowledge files, если они нужны для работы downstream agents.

### 5.6. Downstream contract

После этого шага downstream implementation-агенты больше не должны:

- самостоятельно выбирать layout выбранной wave;
- изобретать scripts с нуля;
- решать, какие quality gates запускать;
- каждый раз заново искать общий framework baseline.

Они должны:

- читать `foundation-manifest.json`;
- использовать materialized scripts и configs;
- учитывать knowledge pack этой wave;
- уважать envelope-level contracts;
- писать только свою часть кода поверх уже подготовленной основы.

---

## 6. Risks And Mitigations

### 6.1. Premature realization before specs/contracts are ready

Риск:

- шаг стартует до того, как выбранная ветка реально описана.

Смягчение:

- запуск шага разрешён только после approved specs/contracts выбранной wave;
- missing branch design должен блокировать completion.

### 6.2. Fragmentation across waves

Риск:

- разные wave будут materialize-иться несовместимо друг с другом.

Смягчение:

- все waves обязаны подчиняться единому `Application Foundation Envelope`;
- wave-level manifests должны ссылаться на envelope-level assumptions.

### 6.3. Drift between envelope and real implementation substrate

Риск:

- branch-level materialization начнёт фактически ломать более ранние assembly decisions.

Смягчение:

- агент обязан читать envelope перед materialization;
- conflicts должны фиксироваться как blockers или upstream revisions, а не замалчиваться.

### 6.4. Over-installation and unsafe tooling

Риск:

- шаг начнёт бесконтрольно ставить community tooling и knowledge packs.

Смягчение:

- installer/materializer действия ограничены policy и allowlist;
- materialized artifacts фиксируются в `foundation-manifest.json`.

---

## 7. Execution Outline

Реализация этого scope должна идти в таком порядке:

1. Выбрать implementation wave.
2. Прочитать `Application Foundation Envelope`.
3. Прочитать approved specs/contracts выбранной wave.
4. Уточнить branch-level technology profile.
5. Materialize-ить subtree, configs, scripts и environments.
6. Materialize-ить knowledge pack.
7. Прогнать readiness checks.
8. Зафиксировать результат и blockers в `foundation-manifest.json`.

---

## 8. Verification Target

Шаг считается спроектированным корректно, если его конечное состояние можно проверить следующими условиями:

1. Для выбранной wave существует реальный subtree в workspace.
2. Technology choices этой wave уточнены и зафиксированы в artifacts.
3. Необходимые environments/toolchains действительно установлены или инициализированы.
4. Есть machine-readable manifest с перечислением materialized surface и readiness status.
5. Есть canonical scripts для quality/build/test/scaffold операций этой wave.
6. При необходимости есть локальные knowledge artifacts для выбранного стека.
7. Первый downstream implementation-agent может начать работу без повторного bootstrap-анализа среды.

---

## 9. Expected Outcome

После реализации этого planning scope CodeAI Hub должен получить поздний branch-level workflow step, который:

- не пытается слишком рано выбрать technology reality для всего приложения;
- не заставляет implementation-агента импровизировать в пустом репозитории;
- materialize-ит реальную technical surface ровно для той ветки, которая уже готова к реализации.

Итоговый принцип:

- global assembly structure фиксируется раньше в `Application Foundation Envelope`;
- detailed branch design фиксируется в specs/contracts;
- `Implementation Foundation` переводит выбранную ветку в `implementation-ready` состояние;
- только после этого начинается `TODO Plan` и код.
