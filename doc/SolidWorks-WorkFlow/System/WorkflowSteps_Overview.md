# Workflow Steps Overview — от идеи к реализации (SSOT)

**Status:** Active SSOT
**Updated:** 2026-05-09
**Owner:** Oleksandr

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

### Managed workspace lifecycle — начиная с Diagram Modules

`Description` и `Virtual Simulation` остаются pre-managed документными шагами. Когда пользователь запускает `Diagram Modules`, Core до первого turn-а агента переводит workspace в managed mode:
- инициализирует Git repo, если его ещё нет;
- устанавливает минимальный Plan Orchestrator lifecycle: `doc/TODO/todo-plan.md`, scripts/shims, hooks и validation/repair commands;
- создаёт tracked control plane `.codeai-hub/workflow/` и ignored machine state `.codeai-hub/runtime/`, `.codeai-hub/logs/`, `.codeai-hub/cache/`;
- фиксирует `Description` и `Virtual Simulation` как read-only baselines: артефакты и история доступны для просмотра, но новые сообщения и прямые правки этих шагов блокируются.

После этого `Application Skeleton`, `Quality Gates Baseline` и Development Tree работают внутри уже управляемого workspace. Агентам не передаётся ownership за Git, hooks или plan scripts: они готовят только содержимое своих артефактов, а Core валидирует, ремонтирует и расширяет lifecycle алгоритмически. Prompt каждого managed stage обязан иметь Core-owned context preflight: без `## Managed Workflow Context Bundle` и строки `activeStage: "<stage>"` агент останавливается до записи файлов и сообщает Core preflight failure.

### Core Runtime как Product Part с контрактами

Core Runtime является самостоятельным `Product Part`, а не набором независимых helper-процессов. Все его кластеры, которые взаимодействуют с Project Manager, provider adapters, agent sessions, Git и Plan Orchestrator, должны проектироваться через явные контракты: сначала boundary contract, затем функции модулей внутри boundary.

Главное правило для workflow orchestration: **у каждого внешнего направления должен быть один canonical ingress и один canonical egress**.
- Project Manager является UI/read-model consumer и command surface, но не автором provider-visible continuation/acceptance messages.
- Provider adapters являются transport/runtime boundary и сообщают Core о ходе turn-а через SDK/provider events; они не принимают решений о workflow acceptance.
- Managed Git commit, stage acceptance, continuation prompt, rollover/autocompact и session summary должны получать состояние через один Core-owned post-turn contract, а не через конкурирующие read endpoints, timers или UI polling.
- Settings, active `todo-plan.md`, provider SDK terminal events и Git state являются отдельными canonical sources; UI-карточки и status panels только записывают или отображают эти источники, но не создают параллельную правду.

Для managed workflow stages порядок закрытия turn-а фиксирован:
1. Provider SDK/adapter emits terminal event (`turn_completed` / `turn_failed`) for the active turn.
2. Core flushes already received assistant/dialog messages into the session history and UI stream.
3. Core runs post-turn arbitration: summary/rollover context, plan status, current microtask/target context, managed Git boundary.
4. Core sends exactly one provider-visible decision for the next turn: acceptance continuation, rejection/repair feedback, pause, or handoff to user phase.

Provider-visible managed prompts are content-readiness contracts. Они не должны просить агента выполнить `git add`, `git commit`, `npm run plan:commit` или "commit before final response". Даже когда шаг физически создаёт несколько файлов (`Application Skeleton`, `Quality Gates Baseline`), durable acceptance происходит только в Core-owned post-turn transaction. Допустимы нейтральные констатации факта в content-readiness терминах: "Core has not yet finalized the managed commit … respond with a content-readiness note" или "Core is blocked by unrelated dirty paths … provider should not act on this". Запрещены императивы вида "Commit or clean these files", "do not run Git commands from the provider turn" и любые прямые просьбы к провайдеру выполнять Git-операции.

Runtime conformance constraints для managed post-turn arbitration (релиз 1.2.217):
- Каждый новый terminal event провайдера получает Core-normalized stable identity (provider id/timestamp + Core-owned monotonic fallback). Повторный delivery того же event — no-op для arbitration; in-flight guard на (sessionId) защищает от concurrent re-entry.
- Per-stage счётчик попыток arbitration сбрасывается, когда managed Git становится clean для owned files. По достижении лимита (default N=5) Core эмитит retry-limit notice и приостанавливает dispatch.
- Inbound acceptance phrases ("Подтверждаю контракт", "Принимаю контракт", "Утверждаю контракт", full-message match с whitespace/case normalization) распознаются как Core-owned команды и НЕ передаются провайдеру; они скипают provider dispatch и логируются без записи в user history.
- Managed commit boundary проверяет owned scope per-stage через диспатч-стратегии (диаграмма модулей сохраняет per-task narrowing; skeleton/quality_gates используют pass-through allowlist из `dirtyByStage`).
- Managed Core messages обслуживают два канала: (a) user-visible delivery через workflow events feed (`type: "managed.core.message"`); (b) durable audit storage в `<basename>.audit.jsonl` рядом с primary session log; audit stream изолирован от replay/rollover/transcript reconstruction.

Любой код, который читает workflow state для Project Manager, sidebar, cards, status panel или artifact panes, обязан оставаться side-effect free относительно provider-visible messages. Read-path может возвращать snapshot и diagnostics, но не должен запускать acceptance, managed commit или continuation. Если нескольким внутренним модулям Core нужны данные одного turn-а, они получают их из общего post-turn contract/cluster, а не каждый из своего наблюдателя.

Следствие для проектирования новых Core-модулей: если возникает функция вроде session summarizer, managed commit owner, continuation orchestrator или stage validator, она не должна добавлять новый источник истины и новый канал общения с агентом. Такие функции входят в один workflow orchestration cluster с общим contract envelope и детерминированным order of operations.

Текущий статус реализации Development Tree:
- Read model: workflow-state API отдаёт `developmentTree` snapshot из product-part artifacts; sidebar проецирует Product Part / Cluster / Module как collapsible branch nodes в секции Development Tree.
- Materialization gate: Core держит Development Tree sessions disabled, пока `application-skeleton-map.json` не содержит `materialized: true`, а `quality-gates.json` не содержит `integrated: true`. Sidebar показывает locked-row вместо раннего session bootstrap.
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
- перед provider session creation Core обязан выполнить managed workspace bootstrap и read-only freeze upstream шагов; если lifecycle validation возвращает blocker/debt, agent turn не запускается до repair или явного решения пользователя;
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

`Application Skeleton` получает уже управляемый workspace. Он не создаёт Git repo, hooks, Plan Orchestrator scripts или `.codeai-hub/workflow`; эти элементы принадлежат Core lifecycle. Если пользователь просит изменить skeleton, агент обновляет только свои canonical artifacts / materialized skeleton files и завершает turn content-readiness сообщением. Core выполняет managed commit flow и продвижение child plan.

**Managed-workflow context bundle ownership (shipped, Phase 11).** Core — единственный source of truth для managed-workflow context bundle. Bundle assembled Core-side (`buildManagedWorkflowContextBundleForInitialStage` + existing `buildManagedWorkflowContextBundle`) и exposed через HTTP endpoint `/api/v1/orchestrator/managed-context-bundle`. Project Manager — UI/control surface, не строит bundle самостоятельно; `managed-workflow-initial-context.ts` это thin HTTP wrapper, который запрашивает Core endpoint и embedь возвращённый текст verbatim. Это правило применяется ко всем future PM-side читателям managed state: PM не парсит plan-files, не читает workspace ledger напрямую, не дублирует authoritative bundle assembly.

**Phase orchestration pilot (shipped, Application Skeleton).** The Application Skeleton stage runs as an explicit `Phase 1 → Phase 2 → Phase 3` sequence. Type A / Type B remains a domain attribute describing phase ownership (Core-gated vs user-led), not a phase number suffix:
- **Phase 1 — Core-gated initial draft (Type A).** Core opens the stage, the agent produces the contract artifacts, and the Phase 1 post-turn structural guard validates only at the readiness + provider-terminal boundary (Observe-vs-Dispatch). A `repair_no_progress` decision asks the agent to either write the draft or report a blocker; a `repair_invalid_draft` decision lists structural gaps. Core never dispatches mid-turn corrections from filesystem observation alone. The draft commit is `docs: draft application skeleton contract`. Internal classifier value: `phase_1_draft`.
- **Phase 2 — User-led review (Type B).** The user drives the conversation. Phase 2 turns are classified diff-based: any tracked owned diff is a revision (Core injects a `phase2.review.revisionN.task1 + Git Commit` pair before the open-ended review task and the managed commit boundary fires `docs: revise application skeleton contract — revision N`); a turn without an owned diff is a discussion / no-op recorded only in session history. Phase 2 exits only via the Core-owned Accept Contract command. Internal classifier value: `phase_2_review`.
- **Phase 3 — Core-led materialization (Type A).** The materialization continuation prompt fires only when (a) the post-turn arbitration runs, (b) the session is in the `recentlyAcceptedSessions` marker set written by the Core accept-contract command handler, and (c) the substep is at least `awaiting_acceptance` and not yet `materialized`. User text alone never authorizes Phase 3. Internal classifier value: `phase_3_materialization`.

The Core accept-contract command surface has two transports — the Project Manager `Accept Contract` button at `/api/v1/orchestrator/managed-stage-accept-contract` (POST) and the typed-fallback acceptance phrase. Both go through `evaluateApplicationSkeletonAcceptContractCommand`, which validates Phase 2 preconditions (Core-clean draft, no uncommitted owned diff, no out-of-owner dirty paths) before recording acceptance and routing to the Phase 3 dispatcher (Acceptance Commit Policy: Option B — acceptance is folded into the Phase 3 transition, no separate accept commit).

A premature-materialization validator derives the blocked-path set from the Application Skeleton map (`materializedPaths` plus every `codePath` in the productParts tree) and runs from both Phase 1 and Phase 2 post-turn guards: any owned write inside the materialization scope before acceptance produces a single corrective `repair_premature_materialization` turn at the readiness + terminal boundary; the block lifts the moment the accept command fires. The decision is derived from the skeleton map, never from a hardcoded `product-parts/**` glob.

**Phase B / acceptance / materialisation runtime contract (shipped, Phase 10).** Phase 1 контракта — Type B диалог: пользователь и агент уточняют draft до acceptance. Acceptance phrase recogniser принимает любые сообщения, содержащие глагол `принимаю` / `подтверждаю` / `утверждаю` вместе с существительным `контракт` (не как substring отдельных слов, а как самостоятельные токены), при условии что сессия находится в acceptance-eligible Type B состоянии (`MANAGED_CONTRACT_ACCEPTANCE_STAGES = {application_skeleton, quality_gates}`). Negation form (`не принимаю …`) и сообщения без существительного отклоняются. После Core-registered acceptance отдельный dispatcher (`sendApplicationSkeletonContinuationIfReady`) посылает агенту явное Phase 2 materialisation continuation prompt; одна и та же session/substep сигнатура не повторяется. Phase 2 (Type A materialisation) завершается, когда `application-skeleton-map.json` обновляется до `materialized: true` и существующий commit-gate `hasCommittableApplicationSkeletonStage` фиксирует managed commit `feat: materialize application skeleton`, после чего embedded shim's `recordWorkspaceCommit` переключает `activeStage` workspace plan вперёд по mapping `application_skeleton → quality_gates`. Quality Gates симметричный fix остаётся вне Phase 10 scope.

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

### Входы

- `application-skeleton.md`
- `application-skeleton-map.json`

### Артефакты

- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md`
- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json`

### Execution contract

- **Draft phase:** до explicit acceptance агент пишет только `quality-gates.md` и `quality-gates.json`; он не создаёт package scripts, configs, hooks, CI files или production code.
- **Integration phase:** после explicit acceptance в той же сессии агент интегрирует accepted gates в materialized skeleton: package scripts/devDependencies, выбранные lint/format configs, Knip config, size/layout scripts, gate scripts/manifests и optional update automation config.
- Hook structure остаётся Core-owned: Quality Gates описывает и создаёт gate content, а Core валидирует manifest и детерминированно регенерирует hook wiring через Hook Registry.
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
- Любое архитектурное изменение workflow ownership, managed lifecycle, prompt context, acceptance, continuation или Git/plan boundary требует full prompt audit по всем шагам и всем provider-visible prompt surfaces: bundled agent assets, prompt-pack builder tails, initial prompts, repair/feedback prompts, continuation prompts, rollover/autocompact envelopes, native request capture scenario prompts, and Development Tree node first prompts. Нельзя считать шаг исправленным, если проверен только один visible first prompt.
- Для managed stages все prompt surfaces должны использовать content-readiness wording: агент пишет/обновляет только owned artifacts and reports readiness; Core owns staging, managed commit, plan advancement, continuation, and downstream unlock.
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
