# Workflow Steps Overview — от идеи к реализации (SSOT)

**Status:** Active SSOT
**Updated:** 2026-05-14
**Owner:** Oleksandr

**2026-05-14 orchestration rewrite note:** the previous managed workflow orchestration runtime for `Diagram Modules`, `Application Skeleton`, and `Quality Gates Baseline` is suspended and being removed from active code paths. The formed step artifacts remain valid, but the old runtime must not be described as active: no Core-owned acceptance commits, post-turn managed commits, automatic continuation prompts, managed child-plan advancement, accept-contract routes, typed acceptance routers, or downstream unlocks are available until the replacement orchestration cluster is implemented and accepted. Runtime boundaries during the rewrite are intentionally fail-closed for managed technical stages.

**2026-05-13 continuity note:** the post-`1.2.250` hotfix scope hardens the provider-neutral session continuity store used by every trunk and Development Tree step. Project Manager must prefer an existing continuity session over a Start/confirmation card whenever a recoverable `chain.json` exists, even if the file was left as a complete JSON object with trailing corrupt bytes by an interrupted concurrent write. Core now serializes chain/index writes per path, writes through temp-file rename, recovers legacy trailing-corrupt JSON on read, and rewrites recovered chains as clean JSON on the next save.

---

## 0) Философия Workflow

Главный принцип: **от простого к сложному**.

Пользователь не обязан «продумать всё заранее» на первом шаге. Каждый шаг добавляет только один слой ясности и формирует артефакт, который нужен следующему шагу.

### Навигация по стволу — sidebar-only (начиная с v1.1.924):
- Верхний stage toolbar удалён. Единственная навигационная поверхность — sidebar Workflow Tree.
- Sidebar разделён на две секции: **Documentation Tree** (trunk stages) и **Development Tree** (branch nodes).
- Trunk stages отображаются как leaf nodes с трёхцветными индикаторами: gray (idle), orange (in_progress), green (artifact available).
- При открытии workspace sidebar автоматически выбирает последний активный (не idle) stage.

### Ствол (trunk) — реализован:
- **Шаг 1 (Description):** что за продукт, для кого, и какие базовые сценарии должны работать.
- **Шаг 2 (Virtual Simulation):** как продукт должен вести себя в сценариях использования.
- **Шаг 3 (Diagram Modules):** из каких Product Part / Cluster / Module состоит система.
- **Шаг 4 (Application Skeleton):** какой технологический каркас и файловая структура приложения будут созданы перед кодом.
- **Шаг 5 (Quality Gates Baseline):** какие команды качества обязаны быть доступны перед запуском Development Tree sessions.

### Ветки (branches) — materialized first-draft Development Tree:

После materialized `Application Skeleton` и integrated `Quality Gates Baseline` ствол заканчивается и начинается дерево разработки (Development Tree). Работа ведётся по веткам, привязанным к структуре продукта и уже наложенным на созданный project skeleton:

```text
Diagram Modules
 └─ Product Part Specification (ветка per part)
     ├─ Cluster Design (ветка per cluster)
     │   ├─ Cluster Specification (функции, модули, зона ответственности)
     │   ├─ Cluster Facade Contract (внешний контракт кластера)
     │   └─ Module Design (ветка per module)
     │       ├─ Module Specification (интерфейсы, методы, зависимости)
     │       ├─ Module Facade Contract (публичный API модуля)
     │       ├─ Implementation Foundation (subtree/env/scripts/gates для выбранной wave)
     │       ├─ TODO Plan (фазы, стримы, микро-задачи ≤3 файлов)
     │       └─ Implementation (код + синхронные обновления документации)
     └─ Standalone Module Design
         ├─ Module Specification
         ├─ Module Facade Contract
         ├─ Implementation Foundation (если standalone module входит в выбранную wave)
         ├─ TODO Plan
         └─ Implementation
```

Ключевое решение: **фасады не являются отдельным шагом ствола**. Для cluster и module используется один design-step, который materialize-ит сразу два артефакта: specification и facade contract. Это позволяет проектировать внутреннюю структуру и публичную boundary одновременно, не превращая фасады в неуправляемый плоский список.

Сквозной принцип: **feedback loop + OUTDATED propagation**. Любое изменение upstream-артефакта помечает downstream-шаги как требующие синхронизации.

### Orchestration rewrite boundary — Diagram Modules and later

`Description` и `Virtual Simulation` остаются обычными документными шагами и продолжают работать как входы для технического ствола. Начиная с `Diagram Modules`, старый managed lifecycle больше не является active runtime contract. На время rewrite:
- шаги сохраняют свои canonical artifact contracts и read-model semantics;
- runtime не должен создавать или продвигать managed child plans для этих шагов старым механизмом;
- Project Manager может показывать уже созданные artifacts/status, но не должен отправлять provider-visible continuation/acceptance messages;
- provider prompts не должны обещать Git ownership, automatic acceptance, managed commits, continuation dispatch или downstream unlock;
- replacement cluster заново определит lifecycle, sequencing и quality gates для `Diagram Modules -> Application Skeleton -> Quality Gates`.

Практическое следствие: технические managed stages могут быть read-only/fail-closed в runtime до появления нового orchestration cluster. Это ожидаемое состояние чистой базы, а не ошибка сформированных шагов.

### Core Runtime как Product Part с контрактами

Core Runtime является самостоятельным `Product Part`, а не набором независимых helper-процессов. Все его кластеры, которые взаимодействуют с Project Manager, provider adapters, agent sessions, Git и Plan Orchestrator, должны проектироваться через явные контракты: сначала boundary contract, затем функции модулей внутри boundary.

Главное правило для будущего workflow orchestration cluster: **у каждого внешнего направления должен быть один canonical ingress и один canonical egress**.
- Project Manager является UI/read-model consumer и command surface, но не автором provider-visible continuation/acceptance messages.
- Provider adapters являются transport/runtime boundary и сообщают Core о ходе turn-а через SDK/provider events; они не принимают решений о workflow acceptance.
- Settings, workflow state, provider SDK terminal events и Git state являются отдельными canonical sources; UI-карточки и status panels только записывают или отображают эти источники, но не создают параллельную правду.

Во время rewrite активный runtime не имеет старого post-turn arbitration contract. Любой код, который читает workflow state для Project Manager, sidebar, cards, status panel или artifact panes, обязан оставаться side-effect free относительно provider-visible messages. Read-path может возвращать snapshot и diagnostics, но не должен запускать acceptance, Git mutation, plan advancement или continuation. Если будущему Core cluster понадобятся session summary, commit owner, continuation orchestrator или stage validator, они должны войти в один новый orchestration cluster с общим contract envelope и детерминированным order of operations.

Continuity chains remain stage-family agnostic. The same load/persistence rules apply to `description`, `virtual_simulation`, `diagram_modules`, `application_skeleton`, `quality_gates`, and all nested `development_tree/...` sessions; no step may depend on a separate card-only fallback once a recoverable chain exists.

Текущий статус реализации Development Tree:
- Read model: workflow-state API отдаёт `developmentTree` snapshot из product-part artifacts; sidebar проецирует Product Part / Cluster / Module как collapsible branch nodes в секции Development Tree.
- Materialization gate: Core держит Development Tree sessions disabled, пока `application-skeleton-map.json` не содержит committed `materialized: true`, а `quality-gates.json` не содержит committed `integrated: true`. Sidebar показывает locked-row вместо раннего session bootstrap.
- Materialization: Application Skeleton Agent создаёт project skeleton и production code folder projection, Quality Gates Agent интегрирует gate tooling, затем Core создаёт neutral filesystem tree under `.codeai-hub/<workspaceSlug>/development_tree/materialized/`. Core больше не pre-creates все node draft files и не bootstraps все Product Part / Cluster / Module sessions автоматически.
- User-started node lifecycle: каждый Product Part / Cluster / Module node получает `lifecycle.startState = "not_started"` и `startable: true`, пока у него нет node session. Пользователь выбирает нужный node, provider/model/reasoning на Start card и запускает только этот node. Core проверяет clean Git, materialized node folder, пишет draft artifacts только выбранного node и создаёт session с `runSlug: "development-tree"`.
- Branch-node selection: `pm:branch:selected` opens the real working surface: left node session pane and right draft artifact pane.
- Live refresh: when an agent writes required draft artifacts, the right artifact pane and sidebar readiness/color refresh without switching steps or reopening the workspace.
- Context boundary: Product Part node first prompts receive the exact owner `diagram_modules/product-parts/<part-id>.md` whole; Cluster/Module prompts receive scoped relevant excerpts. Automatic first-draft sessions may use only first-prompt context and listed target draft files until the user explicitly permits additional reads.
- Deferred: full branch-level implementation waves, provider inheritance for future per-branch handoffs, outdated propagation beyond current draft readiness, and progress counters.

---

## Шаг 1 — Description

### Зачем нужен этот шаг

Шаг `Description` запускает workflow: он превращает анкету в первый читаемый `Final_Description.md`, который пользователь обсуждает с агентом и который является входом для `Virtual Simulation`.

Ключевая идея шага: сначала появляется документ, потом идут уточнения.

### 1.1 Pre-submit (без runtime-сессии)

**Кто ведёт:** пользователь.

Пользователь заполняет:
- `questionnaire.md` (по шаблону `questionnaire-template.md`).

UI на этом этапе:
- левая панель (`Sessions`) показывает user-facing Help для шага Description;
- правая панель (`Artifacts`) показывает редактор `questionnaire.md`;
- runtime-сессии ещё нет.

### 1.2 Submit и запуск Description Agent

**Кто ведёт:** Description Agent (resume-сессия).

После `Submit questionnaire`:
1. Project Manager запускает runtime-сессию шага `description`.
2. Core включает полный текущий `questionnaire.md` в первый prompt как authoritative inline source с path/provenance.
3. Агент **сразу** формирует первый черновик `Final_Description.md` (file-first).
4. Дальше агент итеративно обновляет файл и задаёт только критичные вопросы.

UI после submit:
- левая панель возвращается к обычному Session UI;
- правая панель поддерживает переключатель `Artifacts/Help`.

### 1.3 Что должно быть в `Final_Description.md`

Минимум для передачи в `Virtual Simulation`:
- проблема/ценность;
- целевые пользователи;
- ключевые сценарии в количестве, достаточном для покрытия продукта (актор/цель → действие → ожидаемый результат → критерий успеха);
- ограничения/допущения;
- `out of scope`;
- ключевые сущности/термины (чтобы следующий агент не стартовал с нуля);
- открытые вопросы.

### 1.4 Артефакты шага

- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`
- Internal compat only: `.codeai-hub/<workspaceSlug>/description/description.md` может читаться runtime/store, но не является product-visible SSOT.

### 1.5 Reviewer boundary

Встроенного reviewer-подшага в `Description` нет.
Standalone reviewer остаётся отдельным deferred-модулем и не входит в базовый chain 1→6.
Ручной `↻ Restart attempt` в шаге `Description` отсутствует.

### 1.6 Legacy naming boundary

- В живом workflow нет отдельного шага `Idea`.
- Название шага, Help, provider picker и артефакты первого шага используют только `Description`.
- Если в коде ещё встречаются `Idea` / `Idea Collector`, это internal compat/deferred legacy слой, а не поддерживаемая product-семантика текущего workflow.

---

## Шаг 2 — Virtual Simulation

### Цель

Зафиксировать ключевые сценарии поведения системы в виде `virtual-simulation.md` без искусственного числового лимита.

### Подход

Manual start из PM + resume-сессия агента:
- если у шага ещё нет continuity session, левая панель `Sessions` показывает confirmation card с upstream artifact, inline selector провайдера и кнопкой `Start step`;
- провайдер по умолчанию наследуется от `Description.primarySession.providerId`, но пользователь может до старта выбрать любой `connected` provider;
- если пользователь не меняет выбор, запуск остаётся one-click path и идёт на унаследованном provider;
- Core включает полный `Final_Description.md` в первый prompt как authoritative inline source; path остаётся fallback/reference;
- агент задаёт только уточнения, которые реально улучшают сценарии;
- агент обновляет `virtual-simulation.md` итеративно.

### Артефакт

- `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`

---

## Шаг 3 — Diagram Modules

### Цель

Преобразовать сценарии в карту модулей/кластеров и связей.

Это главный user-review step всего workflow:
- именно здесь предыдущие текстовые шаги впервые превращаются в понятную визуальную структуру;
- именно здесь ожидается максимальный объём пользовательских уточнений и архитектурных правок;
- этот шаг не обязан угадывать идею продукта "с первого раза", но обязан давать понятную форму для коррекции мысли пользователя.

### Подход

Manual start из sidebar Workflow Tree:
- пользователь сам решает, когда `virtual-simulation.md` уже достаточно хороший для перехода на следующий шаг;
- запуск требует доступный canonical upstream artifact `virtual-simulation.md`;
- PM не должен дополнительно требовать точный upstream status `DONE` / `completed`, если artifact уже существует и gating не блокирует старт.
- во время rewrite provider session creation для технического ствола fail-closed: старый managed workspace bootstrap, child plans, hook shims и lifecycle validation удалены из active runtime, а новый lifecycle появится только через replacement orchestration cluster;
- если continuity session для шага ещё нет, confirmation card предвыбирает провайдера последнего trunk-step (`virtual_simulation`), а не провайдера из `Description`;
- пользователь может прямо на карточке переключить provider до запуска; выбранный provider становится authoritative identity для новой step-session bootstrap path;
- provider/model/reasoning controls присутствуют на всех Start/confirmation cards. При Start выбранные значения сохраняются в canonical Settings defaults выбранного provider и seed-ят новую session identity; existing continuity sessions не перепривязываются от Settings.
- после materialization новой step-session нижняя model/status surface и header usage-limits surface должны перейти на выбранный provider/runtime identity; когда у шага уже есть continuity session, confirmation card не показывается и resume path остаётся без pre-start provider override.

### Входы

- `Final_Description.md` — включается Core в первый prompt полностью.
- `virtual-simulation.md` — включается Core в первый prompt полностью.

### Артефакты

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json`

`product-parts.index.md` является первым canonical orchestration artifact этого шага:
- он фиксирует список `Product Part`, их порядок, purpose и generation status;
- по нему visual shell может показать skeleton общей картины ещё до materialization всех part-файлов.

`product-parts/<part-id>.md` являются canonical semantic artifacts отдельных `Product Part`.
Каждый такой файл materialize-ит один ownership subtree `Product Part -> Cluster -> Module`.

`module-map.flow.json` хранит layout/view state визуального редактора — placeholder positions, viewport и (в формате v2) опциональную секцию `layoutParams` с declarative CSS Grid overrides (`columns`/`targetAspectRatio` на ProductPart, `moduleColumns` на Cluster).
Visual diagram materialize-ится runtime из index + part artifacts и не требует отдельного raw semantic map-файла в workspace.

### User-facing baseline

- `Diagram Modules` обязан быть читаемым уже при первом открытии, даже если `module-map.flow.json` ещё не существует.
- Шаг должен materialize-иться progressive:
  - сначала появляется skeleton planned `Product Part` из `product-parts.index.md`;
  - затем visual shell последовательно заменяет placeholders реальными ownership trees по мере появления `product-parts/<part-id>.md`;
  - пользователь не обязан подтверждать каждый `Product Part` через чат между turn-ами.
- First-open layout для ownership hierarchy полностью декларативен через nested CSS Grid:
  - runtime отдаёт visual shell semantic tree (`Product Part -> Cluster -> Module`) и optional layout params из sidecar v2;
  - CSS Grid контейнеры раскладывают child cards нативно — без JS measure/place pass и без pixel-level container constraints;
  - standalone modules компактизируются через owning product part grid track, а не через отдельную band-logic;
  - permanent composition overrides пользователь задаёт через right-click context menu (`columns`, `targetAspectRatio`, `moduleColumns`), и они сохраняются в sidecar v2 `layoutParams`.
- `Product Part` и `Cluster` обязаны показывать короткий purpose/description layer, чтобы пользователь видел не только состав, но и назначение уровня иерархии.
- Relation lines и cross-part graph wiring не входят в обязательный baseline первого полезного результата `Diagram Modules`; базовый review-step должен сначала стабилизировать структуру `Product Part -> Cluster -> Module`.

---

## Шаг 4 — Application Skeleton

### Цель

Зафиксировать технологический каркас приложения до появления кода Development Tree.

Этот шаг выбирает языки, фреймворки, package layout, build/runtime assumptions и создаёт `application-skeleton-map.json`, который связывает `Product Part -> Cluster -> Module` с production `codePath` внутри workspace. После explicit acceptance тот же агент материализует real project scaffold и Product Part / Cluster / Module folder projection. Основные папки будущего кода должны быть аналогичны Development Tree, но оставаться совместимыми с индустриальным skeleton выбранного стека.

`Application Skeleton` currently owns only its canonical artifacts and, after a future accepted orchestration lifecycle exists, the real project scaffold/materialized folder projection. During the rewrite the old Application Skeleton Phase 1/2/3 orchestration pilot, accept-contract command, typed acceptance fallback, acceptance commit policy, materialization continuation dispatcher, and managed repair/revision injection paths are not active runtime behavior.

The stable artifact contract remains:
- draft/review artifacts are `application-skeleton.md` and `application-skeleton-map.json`;
- materialization state is represented in `application-skeleton-map.json`;
- Development Tree bootstrap remains locked until a future accepted orchestration cluster has materialized skeleton output and Quality Gates integration evidence.

Provider-visible instructions for this step must therefore stay content-scoped: write/update the canonical artifacts requested by the prompt and stop with a readiness/update note. They must not promise PM Accept Contract shortcuts, typed acceptance commands, Core acceptance commits, automatic materialization continuations, managed child-plan mutation, or Git ownership.

### Входы

- `diagram_modules/product-parts.index.md`
- `diagram_modules/product-parts/<part-id>.md`

### Артефакты

- `.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md`
- `.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json`

---

## Шаг 5 — Quality Gates Baseline

### Цель

Зафиксировать минимальный contract качества для будущего кода: install/build/typecheck/lint/test/package commands, workspace assumptions и expected outputs. После explicit acceptance тот же агент интегрирует gate scripts/configs/package entries и gate manifest/scripts в materialized skeleton.

Без этого шага Development Tree sessions не стартуют: агентам нельзя писать код, пока project skeleton не создан и quality gates не интегрированы в реальную файловую систему.

Во время orchestration rewrite старый lifecycle этого шага не активен. `Quality Gates Baseline` сохраняет artifact contract и read-model semantics, но runtime больше не должен обещать Core-owned acceptance commit, managed integration continuation, child-plan mutation или hook-registry wiring через старый managed mechanism. Integration в реальную файловую систему будет снова разрешена только после того, как replacement orchestration cluster определит и реализует новый последовательный lifecycle.

### Входы

- `application-skeleton.md`
- `application-skeleton-map.json`

### Артефакты

- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md`
- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json`

### Execution contract

- **Draft contract:** агент пишет только `quality-gates.md` и `quality-gates.json`; он не создаёт package scripts, configs, hooks, CI files, gate scripts, Development Tree artifacts или production code.
- **Review:** пользователь может обсуждать и корректировать contract content, но старый runtime не превращает эти правки в managed child-plan commits.
- **Integration:** отключена до replacement orchestration cluster. Агент не должен интегрировать gates в materialized skeleton без нового runtime assignment.
- Hook structure пока не имеет active old managed owner. Quality Gates может описывать desired gate content, а новый cluster позже определит deterministic wiring/validation ownership.
- `quality-gates.json` обязан разделять намерение и фактическую исполнимость: `desiredStatus`, `availability`, `integrationRequired`, `plannedIntegrationPaths`, `blockingIn`, `accepted`, `integrated`, `integrationState`, `integratedPaths`, `verification`.
- Advisory/planned/deferred gates не могут быть active blockers. `availability: "not_integrated"` для required gate допустим только с `integrationRequired: true` и конкретными `plannedIntegrationPaths`.

---

## Сквозные механизмы

### OUTDATED propagation

- Изменение `Final_Description.md` → `Virtual Simulation = OUTDATED`.
- Изменение `virtual-simulation.md` → `Diagram Modules = OUTDATED`.
- Изменение `Diagram Modules` artifacts → `Application Skeleton = OUTDATED`.
- Изменение `application-skeleton-map.json` → `Quality Gates Baseline = OUTDATED`.

### Resume-by-default для workflow шагов

Описание шагов 1–5 предполагает «живые» сессии: пользователь может возвращаться и корректировать результат без переинициализации workflow.

### Template model (текущее состояние)

Шаблоны шага `Description` статически bundled и синхронизируются при старте Core:
- `questionnaire-template.md` (анкета),
- `description-template.md` (Help),
- `description-collector-prompt.md` (инструкции агента).

Шаг `Virtual Simulation` работает в режиме **prompt-only**:
- bundled только `virtual-simulation-prompt.md`;
- отдельный artifact template не поставляется и не отправляется агенту;
- структура `virtual-simulation.md` задаётся контрактом шага и минимальными инвариантами валидации.

Шаг `Diagram Modules` работает через agent asset pack:
- prompt, field reference и merge rules живут в `packages/agents/diagram-modules-agent/assets/` (`diagram-modules-prompt.md`, `diagram-modules-field-reference.md`, `diagram-modules-merge-rules.md`);
- runtime отправляет агенту current target identity, generated `Change Summary` и full inline upstream sources (`Final_Description.md` + `virtual-simulation.md`) in the first prompt; file paths are Core-owned write targets/fallback diagnostics and must not be presented as documents the agent should re-read when the text is already embedded;
- Mermaid `.mmd` больше не является workflow SSOT.

Шаги `Application Skeleton` и `Quality Gates Baseline` работают через bundled agent assets:
- `packages/agents/application-skeleton-agent/assets/` задаёт skeleton prompt/contract и ожидает `application-skeleton.md` + `application-skeleton-map.json`;
- `packages/agents/quality-gates-agent/assets/` задаёт gates prompt/contract и ожидает `quality-gates.md` + `quality-gates.json`;
- Quality Gates bundled prompt/contract является единственным владельцем двухфазной инструкции draft/integration; runtime prompt pack не добавляет отдельный `Work phases` narrative для этого шага.
- только после materialized skeleton + integrated gates Core может создавать Development Tree sessions.

Workflow prompt/runtime contracts:
- Core Runtime pre-creates stage directories before provider prompt: `description/`, `virtual_simulation/`, `diagram_modules/`, `diagram_modules/product-parts/`, `application_skeleton/`, and `quality_gates/`.
- First prompts and rollover prompts must carry required source artifact text inline. They should not include extra user-facing links/paths for the same sources unless a bounded fallback/truncation mode explicitly says why the agent may read from disk.
- Любое архитектурное изменение workflow ownership, prompt context, acceptance, continuation или Git/plan boundary требует full prompt audit по всем шагам и всем provider-visible prompt surfaces: bundled agent assets, prompt-pack builder tails, initial prompts, repair/feedback prompts, continuation prompts, rollover/autocompact envelopes, native request capture scenario prompts, and Development Tree node first prompts. Нельзя считать шаг исправленным, если проверен только один visible first prompt.
- Для технических stages во время rewrite все prompt surfaces должны использовать content-scoped wording: агент пишет/обновляет только явно запрошенные owned artifacts and reports readiness; prompt не обещает staging, managed commit, plan advancement, continuation или downstream unlock до нового orchestration cluster.
- First prompts may include localized instruction blocks from `Settings > General > Reasoning`; artifact prose follows `Settings > General > Artifacts for the User`.
- Protected canonical tokens remain stable: filenames, ids, statuses, YAML/frontmatter keys, HTML comments, `agent-fill`, DSL markers, method/event names, and structural headings.
- Draft/artifact templates are patch-friendly: `agent-fill` regions have stable sentinel shape, UTF-8 + LF, and agents are instructed to patch content rather than emit routine technical retry chatter.

---

## Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
