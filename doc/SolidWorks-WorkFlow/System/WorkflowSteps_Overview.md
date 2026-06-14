# Workflow Steps Overview — от идеи к реализации (SSOT)

**Status:** Active SSOT
**Updated:** 2026-06-14
**Owner:** Oleksandr

**2026-05-15 orchestration rewrite note, updated 2026-06-05:** the previous managed workflow orchestration runtime for `Diagram Modules`, `Application Skeleton`, and `Quality Gates Baseline` is removed from active code paths. The replacement cluster now owns the active managed lifecycles for all three technical trunk stages: `Diagram Modules` runs Product Part Type A subturns and then opens user review, `Application Skeleton` runs draft review followed by accepted-only Core materialization and automatic completion on successful validation, and `Quality Gates Baseline` runs draft contract review, accepted-only gate integration, formal gate verification, and persistent user return. Core creates managed stage plans, validates provider turns, records Git commits, and dispatches continuations only after the commit boundary completes. Project Manager and future clients are projections only: they may collect user decisions and display Core state, but they are never the source of truth for stage phase, prompt selection, validation, Git, or unlock state.

**2026-05-25 Clear/rollback note, updated 2026-06-14 for main-workspace Product Part documentation:** workflow stage `Clear` uses Core-owned Git boundary commits, not undo ledgers, checkpoints, runtime-slice copies, inferred path deletion, or separate session cleanup ownership. Core creates a `codeai-boundary: <Stage Label>` commit before each trunk stage starts, beginning with `Description` at workspace activation after the workspace runtime capsule baseline exists. Git log/boundary commits are the rollback authority; any boundary registry file is a rebuildable projection only. Clear restores the selected boundary with Git reset/clean, rematerializes the pruned `workflow/boundaries.json` registry projection before the `codeai-clear:*` commit, resets Core/PM projections from the restored filesystem, and Project Manager must immediately run restart-equivalent status/session/history rehydration after the Clear completes. Git-owned rollback truth consists of accepted artifacts, managed workflow state, boundary commits, todo plans, Development Tree drafts/order files and materialized product files. `.codeai-hub/<workspaceSlug>/runtime/**` is local execution residue: provider-native homes, unified logs, settings/localization runtime, shell snapshots and caches are ignored/untracked, removed from legacy indexes by Core clean boundaries, and recreated or refreshed from tracked workflow truth. Preliminary `Description` / `Virtual Simulation` acceptance must wait until Core's completion message and any tracked artifact writes are persisted before the accepted-step Git commit, otherwise the next-step unlock remains blocked by a dirty Git tree. After `Application Skeleton` materialization, Core must also persist the final managed completion message and commit terminal tracked residue before unlocking `Quality Gates Baseline`. Product Part documentation starts after accepted `Diagram Modules` in the main workspace and is independent of later trunk materialization: clear `Application Skeleton` or `Quality Gates Baseline` must preserve Development Tree Product Part artifacts, managed decisions, continuity entries and TODO scaffolds, while clear `Diagram Modules` or earlier must remove them. Development Tree Product Part Clear/Undo for this documentation mode is main-workspace and commit/path scoped; legacy Product Part worktree cleanup is compatibility cleanup only. Cluster/module node clear remains fail-closed until separate downstream branch/worktree boundaries exist.

**2026-05-27 managed review gate note:** Core-owned review gates are commands, not provider-visible typed text. `managed-workflow-user-review` cards expose an inline `Подтверждаю` button, but the button submits a Core review action with the active review message id; stale cards remain readable history and cannot dispatch duplicate provider turns. Provider `turn_completed` events for managed workflow turns must not unlock user input until Core has persisted provider messages, completed post-turn managed arbitration, and either opened a valid user gate or settled the turn. Application Skeleton and Quality Gates review states render as in-progress/yellow even if an older invalid/progress event is still in memory. Quality Gates draft/review phases must restore or clean prohibited integration edits (`package.json`, hooks, lockfiles, gate scripts) before the pre-acceptance review commit.

**2026-06-11 Development Tree Product Part / downstream note, updated 2026-06-14 for main-workspace documentation mode:** Product Part review sessions are Core-projected Development Tree node sessions, including non-lead Product Parts, and managed startup must persist the primary unified dialog history before provider/translation side effects can race ahead. Accepted Diagram Modules now bootstraps every planned Product Part documentation agent from the complete Product Part leadership order in the current workspace: no Product Part pre-code worktrees are created, and draft artifacts, managed state, Product Part TODO ledgers, persisted prompts, continuity and sessions all belong to the main workspace. Application Skeleton and Quality Gates may continue as trunk stages in parallel with this documentation work. Product Part manual `Start node` and Product Part root Clear/Restart use the same Product Part bootstrap path as explicit recovery only. Project Manager hides stale Development Tree dialog continuity entries that have neither a live runtime session nor persisted unified history. One Core-owned user-gate cursor chooses the active review gate, keeps queued gates read-only, and drives the sidebar amber attention marker/auto-focus. The lead Product Part `DevelopmentOrderPlan` assignment is behind a Core-owned all-brief barrier: every planned Product Part brief must be user-accepted in managed Product Part state, and the lead prompt embeds the full accepted brief markdown for all Product Parts inline. After user acceptance of the lead `DevelopmentOrderPlan`, Core validates the order plan, records Product Part unlock state, leaves the accepted artifacts in main, and does not start Cluster/Module sessions. Diagram Modules acceptance persists `workflow/state.json.lastActive.stage = "application_skeleton"` so reconnecting Project Manager clients recover the next-step card even if the realtime activation event was missed. Cluster/Module downstream work is deferred until a later verified-main phase; `merged` remains reserved for code-ready integration with validation evidence.

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

### Ветки (branches) — Product Part documentation first, code later:

После accepted `Diagram Modules` Core уже может открыть Product Part documentation sessions в основном workspace. Это не code stage: агенты создают Product Part briefs и lead `DevelopmentOrderPlan`, пока `Application Skeleton` и `Quality Gates Baseline` продолжают готовить будущую кодовую базу. Code-writing ветки и downstream worktrees открываются позже, только после materialized `Application Skeleton` и verified `Quality Gates Baseline`.

```text
Diagram Modules
 └─ Product Part Documentation (main workspace session per part)
     ├─ Cluster Facade Boundary (future verified-main worktree per cluster)
     │   ├─ Cluster Facade Contract (внешний pre-code контракт кластера)
     │   ├─ Cluster Facade Class (code-ready boundary before merge)
     │   └─ Module (один узел per module; спецификации/контракты/код открываются справа)
     └─ Standalone Module (один узел per module; тот же module workflow без cluster layer)
```

Ключевое решение: **фасады не являются отдельным шагом ствола**. Для cluster первичной pre-code границей является `Cluster Facade Contract`; отдельная long-form `Cluster Specification` не является архитектурным SSOT и остаётся только legacy/compat residue до завершения downstream refactor. Спецификации принадлежат module nodes. Левый Development Tree показывает только реальные Product Part / Cluster / Module nodes; cluster/module workflow details, worker progress и semantic integration являются правопанельными артефактами/состояниями выбранной node session, а не дочерними строками дерева.

Сквозной принцип: **feedback loop + OUTDATED propagation**. Любое изменение upstream-артефакта помечает downstream-шаги как требующие синхронизации.

### Managed Technical Trunk Boundary — Diagram Modules and later

`Description` и `Virtual Simulation` остаются обычными document steps и продолжают работать как входы для технического ствола. Начиная с `Diagram Modules`, active runtime contract принадлежит Core-owned managed cluster:
- шаги сохраняют свои canonical artifact contracts и read-model semantics;
- Core создаёт `doc/TODO/workspace.plan.md` и stage `todo-plan.md`, открывает активную microtask pair, валидирует provider output и выполняет managed Git commit до любой следующей continuation;
- Project Manager может показывать artifacts/status и отправлять пользовательский текст в Core, но не отправляет provider-visible continuation/acceptance messages самостоятельно;
- provider prompts получают только текущий assigned scope и не обещают Git ownership, automatic acceptance, managed commits или downstream unlock без Core;
- user review gates являются Core фазами: принятие или правки пользователя классифицируются по stage plan, а не по UI state.
- Artifact parsing, graph/read-model validation, and repair diagnostics for managed technical stages are Core-owned contract outputs. Project Manager, VS Code, future mobile clients, and Wi-Fi clients may render the parsed projection and submit user repair intent, but they must not own a separate parser schema or decide which artifact failed.
- Review acceptance buttons are Core actions scoped to the current review gate message. Clients render only the latest actionable gate; older `managed-workflow-user-review` cards stay in dialog history without active buttons.

Практическое следствие: если `Diagram Modules`, `Application Skeleton` или `Quality Gates Baseline` не могут продолжить работу без открытого Project Manager до явного user gate, контракт нарушен и должен чиниться в Core/orchestrator logic, а не в клиенте.

### Workflow Clear Boundary

Core creates one Git rollback boundary before each trunk step starts:
- `codeai-boundary: Description`
- `codeai-boundary: Virtual Simulation`
- `codeai-boundary: Diagram Modules`
- `codeai-boundary: Application Skeleton`
- `codeai-boundary: Quality Gates`

The first boundary is created when a workspace is activated, before Description questionnaire work. Later boundaries are created before Project Manager stage sessions and before managed technical-stage scaffold/plan side effects. A boundary commit is a clean-tree empty pre-step anchor: Core must not stage implicit workspace changes into `codeai-boundary:*`, and stage start is blocked if the workspace Git tree is already dirty. Project Manager keeps the Clear command surface, but the endpoint delegates workflow-stage Clear to Core's boundary facade. Git history is also the Core-owned development timeline for future agent recovery: accepted step output is committed as `codeai-step: <Stage Label> accepted` before the next trunk step may start, including managed technical review acceptance such as `Diagram Modules`.

Workflow-specific execution state lives inside the workspace-owned runtime capsule, but the whole `.codeai-hub/<workspaceSlug>/runtime/**` tree is local-only. Git commits include workflow state outside runtime, accepted artifacts, managed decisions, Development Tree drafts/order files, stage todo plans and materialized product files. Clear runs the selected boundary rollback as a normal Git transaction (`reset --hard` plus `clean -fd`), writes the pruned rebuildable boundary registry projection even when `boundaries.json` did not exist in the target boundary commit, and uses restart-equivalent Project Manager rehydration after success. Provider auth tokens, API/OAuth credentials, login files, package installs, caches, SQLite databases, logs, binaries, model caches, shell snapshots, provider `Caches/` folders, provider `*-cache.json` files, provider-native session histories, unified session histories, settings and localization runtime remain ignored/untracked. Accepted-step and managed-terminal cleanup must untrack any legacy `.codeai-hub/<workspaceSlug>/runtime/**` entries before clean-Git validation. Translation/localization provider-native sessions are one-shot runtime implementation detail and may be deleted after successful translation; finalized tracked workflow/product artifacts remain the retained output. Project Manager saves settings/localization changes through Core into the active workspace runtime without adding them to workflow history.

When a workflow start card changes the active provider model or reasoning, the workspace settings file is saved but not committed. Core creates the next `codeai-boundary: <Stage Label>` anchor after ensuring any legacy tracked runtime entry is removed from the index. The tracked artifact/state commit captures the immutable workflow decisions needed to reproduce the next run; old runtime transcripts are never used as rollback authority.

### Preliminary Review Gate — Description and Virtual Simulation

`Description` и `Virtual Simulation` не используют managed technical stage plan, но их переход к следующему trunk step всё равно подтверждается Core-owned review gate:
- стартовый prompt и последующие правки пользователя всегда уходят агенту как provider-direct работа;
- Core не показывает completion/review card перед первым provider turn и не перехватывает стартовый prompt как acceptance;
- после каждого завершённого provider turn Core добавляет system review-card с inline-кнопкой `Подтверждаю`;
- если пользователь отвечает на вопросы агента или просит правки, сообщение уходит агенту, а после следующего provider turn Core снова показывает ту же review-card;
- нажатие `Подтверждаю` принимает текущий preliminary artifact only after Core persists the Core completion message, waits for tracked artifact writes, commits the accepted artifact plus tracked workflow state directly, untracks local runtime residue, and verifies that `git status --porcelain` is clean; if Git remains dirty, Core blocks the next-step return path with a visible validation message.

### Core Runtime как Product Part с контрактами

Core Runtime является самостоятельным `Product Part`, а не набором независимых helper-процессов. Все его кластеры, которые взаимодействуют с Project Manager, provider adapters, agent sessions, Git и Plan Orchestrator, должны проектироваться через явные контракты: сначала boundary contract, затем функции модулей внутри boundary.

Главное правило для будущего workflow orchestration cluster: **у каждого внешнего направления должен быть один canonical ingress и один canonical egress**.
- Project Manager является UI/read-model consumer и command surface, но не автором provider-visible continuation/acceptance messages.
- Provider adapters являются transport/runtime boundary и сообщают Core о ходе turn-а через SDK/provider events; они не принимают решений о workflow acceptance.
- Settings, workflow state, provider SDK terminal events и Git state являются отдельными canonical sources; UI-карточки и status panels только записывают или отображают эти источники, но не создают параллельную правду.

### Client Projection Boundary

Every workflow step is evaluated from Core-owned state. Project Manager, VS Code surfaces, future mobile clients, and Wi-Fi/remote clients are replaceable projections only: they may collect user input and display Core snapshots, but they must never be the source of truth for stage phase, active microtask, expected commit, prompt/template selection, source-artifact selection, artifact validity, gating, localization target, Core/system messages, managed state, or commit lifecycle.

A trunk or managed step must keep running while all clients are closed until Core reaches an explicit user gate. If opening Project Manager is required for `Diagram Modules`, `Application Skeleton`, `Quality Gates Baseline`, or any future workflow step to advance before that gate, the workflow contract is broken and must be repaired in Core/orchestrator logic, not by duplicating truth in the client.

Any client-side artifact parser for a managed step is transitional implementation debt unless it consumes a Core-owned parser module or a Core-produced parse result. If the Project Manager graph, a future mobile graph, or another client needs Product Part / Cluster / Module data, Core must expose the canonical parsed projection plus diagnostics. Client repair buttons send only raw user intent and Core diagnostics back to Core; Core owns failing-artifact selection, repair microtask creation, paired `Git Commit` insertion, provider-visible repair prompt composition, validation, and accepted/rejected attempt commits.

В active managed runtime старый post-turn arbitration contract retired. Любой код, который читает workflow state для Project Manager, sidebar, cards, status panel или artifact panes, обязан оставаться side-effect free относительно provider-visible messages. Read-path может возвращать snapshot и diagnostics, но не должен запускать acceptance, Git mutation, plan advancement или continuation. Session summary, commit owner, continuation orchestrator, stage validator, first-prompt composer и repair prompt composer входят в Core-owned Managed Workflow Orchestration cluster с общим contract envelope и детерминированным order of operations.

Continuity chains remain stage-family agnostic. The same load/persistence rules apply to `description`, `virtual_simulation`, `diagram_modules`, `application_skeleton`, `quality_gates`, and all nested `development_tree/...` sessions; no step may depend on a separate card-only fallback once a recoverable chain exists.

Текущий статус реализации Development Tree:
- Read model: workflow-state API отдаёт `developmentTree` snapshot из Diagram Modules product-part artifacts и Core-owned `.codeai-hub/<workspaceSlug>/development_tree/materialized/...` artifact workspace. Snapshot остаётся backward-compatible, но cluster/module nodes больше не получают operation children (`Workers`, `Integration`, `Module / Facade Specification`, `Implementation`) в левой tree projection; cluster/module workflow details должны открываться в правой Project Manager panel. Snapshot может содержать `artifactWorkspacePath`, optional `codeWorkspacePath` из accepted/materialized Application Skeleton map и non-cluster/module `operations[]` там, где Core явно поддерживает branch-level operation rows.
- Materialization gate: Core keeps production code readiness disabled until `application-skeleton-map.json` contains committed `materialized: true` with `foundationReady: true`, and `quality-gates.json` contains committed `integrated: true`, `verificationState: "verified"` and formal command evidence for the required gate scripts and hook paths. `foundationReady` requires empty `openQuestions`, package manager metadata, package manifest/lockfile, required scripts, config files, and first-wave production entrypoints. Product Part documentation sessions are allowed before this code-readiness gate; code-writing turns, code-ready merge, and final downstream integration are not.
- Materialization: after final accepted Diagram Modules Product Part, Core runs the Development Tree materializer from the canonical Diagram Modules read model and creates neutral P/C/M artifact scaffolding under `.codeai-hub/<workspaceSlug>/development_tree/materialized/product-parts/...` plus the matching `doc/TODO/stages/development-tree/product-parts/...` service scaffold. Fresh scaffolding mirrors only real Product Part / Cluster / Module nodes; it does not pre-create `workers/` or `integration` operation folders. Worker transcripts, Implementation TODO Plan rows, and semantic integration state are right-panel workflow artifacts created later by the selected node workflow. Application Skeleton remains the only owner of production `product-parts/...` code projection; Development Tree only exposes optional `codeWorkspacePath` after the skeleton map is accepted/materialized.
- Orphan handling: when Diagram Modules structure changes, Core summarizes existing materialized artifact folders against the new plan. Empty orphan folders may be auto-delete candidates; populated orphan folders require explicit user disposition (`archive`, `keep_detached`, or `delete`) and are not deleted by the materializer.
- Product Part documentation lifecycle: after accepted Diagram Modules, Core bootstraps every planned Product Part root node from `product-parts.index.md` in one transaction in the main workspace. The bootstrap creates/reuses the managed todo-plan, branch-root draft, projected workflow session, persisted start prompt, and first provider turn without creating `<workspace>.worktrees/.../product-parts/<partId>/precode`. The expected set is not hard-coded; Core uses `leadProductPartId`, declared `productPartLeadershipOrder`, and any remaining planned Product Part ids. Quality Gates terminal handoff must not rerun this bootstrap; missing Product Part sessions are recovered only through accepted Diagram Modules handoff retry, Product Part manual `Start node`, or Product Part root Clear/Restart.
- Downstream node lifecycle: Cluster / Module nodes remain downstream-controlled and must not start from Product Part documentation closeout. Future downstream starts must use a verified main workspace base, validate clean Git and materialized node folders, write draft artifacts only for that node, and create the matching session with `runSlug: "development-tree"`.
- Branch-node selection: `pm:branch:selected` opens the real working surface: left node session pane and right draft artifact pane.
- Live refresh: when an agent writes required draft artifacts, the right artifact pane and sidebar readiness/color refresh without switching steps or reopening the workspace.
- Context boundary: Product Part node first prompts receive the exact owner `diagram_modules/product-parts/<part-id>.md` whole; Cluster/Module prompts receive scoped relevant excerpts. Automatic first-draft sessions may use only first-prompt context and listed target draft files until the user explicitly permits additional reads.
- Product Part review lifecycle: after a Product Part agent creates the branch-root draft in the main workspace and Core opens the review card, ordinary user text remains a provider-directed revision turn. Explicit acceptance is a Core-owned review action scoped to the active review message. Core records `reviewState: "accepted"` in main and advances secondary Product Parts to `User Return And Revisions`. Product Part managed review sessions, including non-lead Product Parts, are projected as first-class Development Tree node sessions in Project Manager and must have a persisted primary unified dialog history before later provider/translation messages can appear. Manual `Start node` for a Product Part is only a recovery path through Product Part bootstrap, not a generic session creation shortcut.
- Product Part brief barrier: the lead Product Part does not enter `Development Order Plan Draft` until every planned Product Part brief has a Core-owned user-accepted managed review state and accepted brief markdown in main. Core evaluates the barrier from `product-parts.index.md`, managed Product Part review decisions, and main-workspace Product Part brief drafts. When the final secondary brief opens the barrier, Core dispatches the lead `DevelopmentOrderPlan` assignment into the lead Product Part session and embeds every accepted brief's full markdown in the prompt.
- Lead Product Part planning closeout: after user acceptance of `DevelopmentOrderPlan.draft.json`, Core validates `codeai-development-order-plan-v2`, writes Product Part unlock-state, and leaves the accepted order plan artifacts/Product Part ledger in main. This closes the Product Part documentation checkpoint; it does not start cluster contract sessions, create cluster/module documents, or mark any downstream node as `merged`. `merged` is reserved for a later code-ready cluster/standalone-module return that includes code artifacts and validation evidence.
- Product Part Clear/Undo MVP: right-click Clear/Undo on `development_tree/materialized/product-parts/<partId>` is not a node-level Git rollback ledger. Core clears the old Product Part session artifacts listed in the Clear/rollback note and immediately recreates the Product Part todo-plan/draft/session from the current accepted Diagram Modules / Application Skeleton / Quality Gates truth through the same Product Part bootstrap path used by manual start. The Project Manager clear event includes `productPartRestart` with deleted and recreated path lists so retest can confirm old sessions and old Product Part plans were replaced. If an older Development Tree continuity entry survives without live runtime state or a unified history file, Project Manager must hide that stale dialog projection rather than opening an empty chat.
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
- редактор анкеты при открытии прокручивается к первой незаполненной обязательной секции, а после заполнения всех обязательных секций — к нижней зоне отправки; optional-секции не блокируют готовность анкеты;
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
- после каждого ответа Description Agent Core показывает review-card с кнопкой `Подтверждаю`; ответы пользователя на вопросы агента продолжают итерацию, а кнопка подтверждает текущий `Final_Description.md` и открывает карточку `Virtual Simulation`.

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
- после каждого ответа Virtual Simulation Agent Core показывает review-card с кнопкой `Подтверждаю`; ответы пользователя продолжают итерацию с агентом, а кнопка подтверждает текущий `virtual-simulation.md` и открывает карточку `Diagram Modules`.

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
- active replacement lifecycle for `Diagram Modules` is Core-managed: startup scaffold, first index turn, one Product Part subturn per index entry, a managed Git commit boundary after every accepted subturn, and user review only after the final Product Part is accepted;
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
- он обязан фиксировать `leadProductPartId` и `productPartLeadershipOrder`; первый элемент leadership order должен совпадать с lead Product Part, а сам порядок становится порядком корневых Product Part nodes в Development Tree;
- по нему visual shell может показать skeleton общей картины ещё до materialization всех part-файлов.

`product-parts/<part-id>.md` являются canonical semantic artifacts отдельных `Product Part`.
Каждый такой файл materialize-ит один ownership subtree `Product Part -> Cluster -> Module`.
This is the intentional Markdown semantic SSOT exception among the managed technical stages until a future machine-readable semantic sidecar is explicitly introduced.

`module-map.flow.json` хранит layout/view state визуального редактора — placeholder positions, viewport и (в формате v2) опциональную секцию `layoutParams` с declarative CSS Grid overrides (`columns`/`targetAspectRatio` на ProductPart, `moduleColumns` на Cluster).
Visual diagram materialize-ится runtime из Core-owned parsed projection of index + part artifacts и не требует отдельного raw semantic map-файла в workspace. Parser requirements for `part_id`, Product Part identity, Cluster/Module fields, graph diagnostics, and renderability belong to the Core/shared artifact contract; Project Manager renders the projection and layout sidecar only.

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

Зафиксировать и материализовать технологический каркас приложения до появления кода Development Tree.

Этот шаг выбирает языки, фреймворки, package/workspace layout, build/runtime assumptions и создаёт `application-skeleton-map.json`, который связывает `Product Part -> Cluster -> Module` с production `codePath` внутри workspace. После explicit acceptance тот же агент материализует не только папки, а полноценный installable project foundation: package-manager metadata, deterministic install path, required scripts, TypeScript config when selected, минимальные first-wave source/facade entrypoints и Product Part / Cluster / Module folder projection. Основные папки будущего кода должны быть аналогичны Development Tree, но оставаться совместимыми с индустриальным skeleton выбранного стека.

Application Skeleton не выбирает и не интегрирует quality-gate продукты. Ultracite/Biome/ESLint/test runners/secret scanners/hooks/CI policy принадлежат следующему шагу `Quality Gates Baseline`. Его входом должен быть уже installable foundation, а не пустая структура папок.

`Application Skeleton` uses the Core-owned managed lifecycle implemented by the replacement cluster. Phase 1 drafts `application-skeleton.md` and `application-skeleton-map.json` only. The draft must include `projectFoundation` decisions and an `openQuestions` list; materialization is illegal while that list is non-empty or while stack/package/build/test/source-layout ambiguity remains. Phase 2 opens user review from Core state. A direct acceptance immediately closes the Core-managed input gate and advances the stage plan to accepted-only materialization without forwarding the user acceptance text as an agent task; requested corrections stay in the active review task and are sent as a scoped revision prompt. Phase 3 materializes the accepted installable project foundation and Product Part / Cluster / Module folder projection only after acceptance, then Core validates and records the managed commit. A successful Core-owned materialization is not a new semantic user decision: Core auto-completes `Application Skeleton`, persists the final managed completion message and translation overlay, commits that terminal session residue, opens persistent user return, and activates `Quality Gates Baseline` without a second post-materialization `managed-workflow-user-review`. If materialization or environment validation fails, Core keeps the input gate closed, records failed materialization state, and sends a repair turn to the agent when the failure can be expressed as contract/scaffold diagnostics; only unrecoverable Core boundary failures are surfaced as validation/blocker messages.

The stage indicator is Core-owned: when the Application Skeleton continuity chain/session is active, workflow-state must project the step as in progress before final artifacts exist, so Project Manager and future clients render the orange active marker from Core state instead of inferring status locally.

The stable artifact contract remains:
- `application-skeleton.md` is the user-facing review artifact: Core validates that it exists and belongs to the Application Skeleton stage, but it is not runtime lifecycle state after materialization;
- `application-skeleton-map.json` is the machine-readable contract and materialization authority;
- `projectFoundation`, empty `openQuestions`, package manifest/lockfile, required scripts, config files, and first-wave source/facade entrypoints are validated by Core before downstream unlock;
- Quality Gates Baseline remains locked until Core validates and commits that Application Skeleton materialization includes the accepted project foundation, not just `materialized: true`; successful validation auto-completes Application Skeleton without a second user review gate;
- Development Tree bootstrap remains locked until Core has committed validated materialized skeleton output and Quality Gates formal verification evidence.

Provider-visible instructions for this step stay content-scoped: write/update the canonical artifacts requested by the current Core prompt and stop with a readiness/update note. They must not promise PM Accept Contract shortcuts, typed acceptance commands, direct UI-owned commits, unmanaged child-plan mutation, or Git ownership.

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

`Quality Gates Baseline` uses the Core-owned managed lifecycle implemented by the replacement cluster. Phase 1 drafts the quality contract only after Application Skeleton has a Core-validated installable foundation; it must not compensate for missing package/workspace metadata that belonged to Application Skeleton. Phase 2 opens user review from Core state. A direct acceptance advances the stage plan to accepted-only integration without forwarding the user acceptance text as an agent task; requested corrections stay in the active review task and are sent as a scoped revision prompt. Phase 3 integrates the accepted gate baseline into package scripts, hook wiring, and accepted gate infrastructure, then Core validates `accepted: true`, `integrated: true`, `integrationState: "integrated"`, required scripts, and required hook calls before committing and dispatching Phase 4. Phase 4 formally verifies that hook-referenced `npm run` scripts resolve through `package.json`, builds one ordered verification plan, runs the available gate commands (`qg:before-module-execution`, `qg:before-commit`, `qg:before-push`, `qg:all`, `sh .husky/pre-commit`, `sh .husky/pre-push`) sequentially in one workspace, and records `verificationState: "verified"` plus `verificationEvidence.executionMode: "sequential"` and ordered per-command evidence in `quality-gates.json`. Only verified Quality Gates output may open Phase 5 persistent user return and unlock production code/code-ready Development Tree execution; Product Part documentation sessions may already be active from accepted Diagram Modules, but this terminal handoff must not start, recover, or rebootstrap Product Part sessions.

### Входы

- `application-skeleton.md`
- `application-skeleton-map.json`

### Артефакты

- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md`
- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json`

### Execution contract

- **Draft contract:** агент пишет только `quality-gates.md` и `quality-gates.json`; он не создаёт package scripts, configs, hooks, CI files, gate scripts, Development Tree artifacts или production code.
- **Artifact authority:** `quality-gates.md` is the user-facing review artifact; `quality-gates.json` owns accepted/integrated state, gate availability, integration paths, and verification data for Core validation.
- **Draft cleanup:** before a draft/review commit, Core restores or removes prohibited integration residue such as `package.json`, package-manager lockfiles, `.husky/pre-commit`, `.husky/pre-push`, and `scripts/quality-gates/**`. These paths become valid outputs only after user acceptance opens the Integration phase.
- **Review:** пользователь может принять contract или перечислить правки. Core классифицирует это по активному stage plan; acceptance открывает integration phase, а правки остаются review revision task.
- **Integration:** агент интегрирует gates только после Core prompt Phase 3 Quality Gates Integration и только в accepted scope: package scripts/lockfiles, `.husky/pre-commit`, `.husky/pre-push`, `scripts/quality-gates/**`, selected configs/CI files, and accepted gate artifacts.
- **Formal verification:** после integration commit Core запускает отдельный Phase 4 prompt. Агент обязан проверить и, где возможно, выполнить все formal gate commands последовательно в одном workspace. Dependency restore/install/clean/delete commands and any hook/aggregate that may invoke them are exclusive workspace mutation commands; the next command must not start until the previous command exits and dependency/install side effects settle. Then the agent records `verificationState: "verified"`, `verificationEvidence.executionMode: "sequential"`, and ordered per-command results (`sequence`, `command`, `status: "passed"`, `exitCode: 0`) into `quality-gates.json`.
- Hook structure имеет Core validation owner: every gate listed in `requiredBeforeCommit` or `requiredBeforePush` must have a package script and a direct lifecycle hook call before the step can complete.
- `quality-gates.json` обязан разделять намерение и фактическую исполнимость: `desiredStatus`, `availability`, `integrationRequired`, `plannedIntegrationPaths`, `blockingIn`, `accepted`, `integrated`, `integrationState`, `integratedPaths`, `verificationState`, `verificationEvidence`.
- Terminal completion must not infer required gate state from Markdown prose or tables. Markdown must remain present with the `# Quality Gates Baseline` heading, while JSON, package scripts, hooks, verification evidence, and filesystem evidence decide whether the stage can complete.
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
- first and repair prompts must embed the exact Product Part index template, Product Part artifact template, field reference, required identity fields, and parser-visible examples as inline text. Referencing asset paths is not enough because the provider must receive the full artifact contract before its first write turn;
- after each provider turn Core validates the current artifact and advances the managed stage plan through a Git commit boundary. Transient `.git/index.lock` failures are retried under a workspace-scoped queue; persistent lock failures block continuation and surface as Core/user-visible status instead of silently leaving the session idle;
- Mermaid `.mmd` больше не является workflow SSOT.

Шаги `Application Skeleton` и `Quality Gates Baseline` работают через bundled agent assets:
- `packages/agents/application-skeleton-agent/assets/` задаёт skeleton prompt/contract и ожидает `application-skeleton.md` + `application-skeleton-map.json`;
- `packages/agents/quality-gates-agent/assets/` задаёт gates prompt/contract и ожидает `quality-gates.md` + `quality-gates.json`;
- Quality Gates bundled prompt/contract является единственным владельцем research/draft/review/integration/formal-verification lifecycle instruction; runtime prompt pack не добавляет отдельный `Work phases` narrative для этого шага.
- только после materialized skeleton + verified gates Core может создавать Development Tree sessions.

Managed steps follow the no-stop dual-outcome policy: every Core settlement ends as an agent repair/continuation dispatch or as a button gate with a concrete user action. Dirty Git at managed boundaries is auto-committed (step-owned residue into the step commit, everything else into `chore: preserve workspace changes`), repair loops are bounded (3 attempts, then the review gate opens with the artifact as is), and Project Manager releases the input on every Core gate event.

Workflow prompt/runtime contracts:
- Core Runtime pre-creates stage directories before provider prompt: `description/`, `virtual_simulation/`, `diagram_modules/`, `diagram_modules/product-parts/`, `application_skeleton/`, and `quality_gates/`.
- First prompts and rollover prompts must carry required source artifact text inline. They should not include extra user-facing links/paths for the same sources unless a bounded fallback/truncation mode explicitly says why the agent may read from disk.
- Любое архитектурное изменение workflow ownership, prompt context, acceptance, continuation или Git/plan boundary требует full prompt audit по всем шагам и всем provider-visible prompt surfaces: bundled agent assets, prompt-pack builder tails, initial prompts, repair/feedback prompts, continuation prompts, rollover/autocompact envelopes, native request capture scenario prompts, and Development Tree node first prompts. Нельзя считать шаг исправленным, если проверен только один visible first prompt.
- For technical stages without an accepted replacement lifecycle, prompt surfaces must use content-scoped wording: the agent writes/updates only explicitly requested owned artifacts and reports readiness. `Diagram Modules` is the current accepted exception: Core may promise managed scaffold, commit boundary, plan advancement, and Product Part continuation only through the tested replacement controller.
- Core-visible Diagram Modules status/blocker/review messages are authored as stable English source messages and appended as `system` dialog messages. The session translation overlay localizes them through `Settings > General > Messages for the User`; prompt instructions, artifact DSL, ids, paths, headings, and Git hashes stay source-stable.
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
