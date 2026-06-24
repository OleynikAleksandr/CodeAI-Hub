# Provider Native Request Capture Workbench — Architecture

**Status:** Draft rev6 (Phase 1 implementation planning source)
**Created:** 2026-05-01
**Updated:** 2026-05-01 — rev2 учёл P1.1/P1.2/P1.3/P2.4/P2.5/P2.6; rev3 учёл P1 (Product Goal contract), P2 (Codex CLI hypothesis), P2 (Translation comparison contract), P3 (removed-provider Phase 2 file ownership); rev4 учёл P3 (internal section refs), P3 (Translation wording precision); 2026-05-02 rev5 — UI-scope ownership for Phase 1 Workbench moved to child plan `Plans/Backlog/Benchmarks/Capture_Workbench_UI_Architecture.md`: §3.4 run history wording and §3.5 first-iteration provider scope are explicitly superseded by the child rev2; rev6 — §3.7 closes the detached transport/localization pre-flight spike for Phase 1 implementation.
**Owner:** Oleksandr + Codex
**Scope:** Эволюция модуля `Provider Native Request Capture` из карточки в Settings → General в полноценный исследовательский полигон. Главная цель — сравнение `Vanilla CLI baseline` (provider bridge с дефолтами) и `CodeAI Hub Managed` (текущий applied turn config) в идентичных условиях `(provider, model, reasoning, userPrompt, workspace)` для одного и того же пользовательского запроса.

**Recommended starting scope для todo-plan:** не запускать весь Workbench в одном цикле. Первый `todo-plan.md` берёт **только Phase 1** — устранение ошибки со скриншота (PM-side bypass + тесты). Phase 2/3/4 — это отдельные планировочные циклы со своими todo-plan'ами и pre-flight spike'ами, описанными в §4.

---

## 1. Problem

Текущая реализация capture решает только одну задачу: «снять snapshot того, что уходит на сервер провайдера в managed-пайплайне». Этого недостаточно для трёх практических нужд:

1. **Невозможность сравнения.** У пользователя нет способа без пересборки расширения увидеть, что отправил бы тот же провайдерский bridge на тот же `(model, reasoning, prompt)` БЕЗ кастомизаций CodeAI Hub (custom system, custom tool list, `settingSources: []` для Claude, custom `baseInstructions` / `approvalPolicy` / `sandbox` для Codex App Server). Это блокирует основной валидационный цикл архитектуры: «доказать, что наша managed isolation реально сужает контекст и сокращает скрытые инструкции».

2. **Workflow gating блокирует диагностику.** Capture для сценария `Diagram Modules` падает с `Missing virtual-simulation.md. Complete Virtual Simulation step first.` если в активном workspace ещё нет upstream артефактов. Это нарушает саму идею исследовательского инструмента: capture должен быть доступен независимо от состояния workflow.

3. **UI слишком тесный для исследовательского сценария.** Карточка в Settings → General не предназначена для длительной работы — пользователю нужен второй монитор, развёрнутая comparison-таблица, parallel runs, история захватов. Поверх этого карточка размывает семантическую границу: capture — это **диагностический инструмент над приложением**, а не настройка приложения.

4. **Provider parity требует fresh scope.** Сейчас `captureNativeRequest` реализован только для Claude и Codex. Поддержка любого нового live provider требует отдельного capabilities/capture planning cycle; удалённый provider не остаётся deferred implementation path.

---

## 2. Product Goal

После выполнения этого плана:

1. У пользователя есть отдельное окно `Capture Workbench`, открываемое одной кнопкой из Settings → General. Окно живёт в собственном CEF popup и может быть перенесено на второй монитор.
2. В этом окне пользователь выбирает `(provider, model, reasoning/thinking)` и для каждого provider'а имеет **две независимые capture-кнопки**: `Capture Managed` и `Capture Vanilla`. Сценарий (Description / Virtual Simulation / Diagram Modules / Translation) определяет, какой workflow context используется при формировании prompt'а. Translation — особый случай (см. §3.6).
3. **Managed capture** — diagnostic path, переиспользующий production *contracts* (workflow prompt pack, applied turn config, model invocation profile, provider-home auth), но запускающий provider через capture-and-abort proxy + diagnostic services (`claude-native-request-capture-service.ts`, `codex-native-request-capture-service.ts`). Codex managed capture стартует **temporary** app-server, не использует активный. Это **не обычный workflow turn**.
4. **Vanilla capture** — отдельный bridge entry, который запускает provider (Claude SDK / `codex exec` subprocess) с параметрами `(model, reasoning, prompt)` и БЕЗ наших кастомизаций (`systemPrompt`, custom tools, `settingSources: []`, `baseInstructions`, `approvalPolicy`, `sandbox`, `persistExtendedHistory`).
5. Оба режима пишут пары артефактов `<correlation>-managed.{jsonl,md}` и `<correlation>-vanilla.{jsonl,md}` (см. §3.4), готовые для построчного diff.
6. Capture полностью read-only по отношению к workflow state, session state, binding, артефактам workspace. Phase 1 добавляет ровно одно изменение в существующий PM-side capture flow — флаг `bypassUpstreamGuard` в `resolveScenarioInputPath()`. Production workflow turns не задеваются вообще.
7. Workbench не нарушает invariants §5 (provider-home isolation), §33 (settings ownership) и §35 (model invocation profile boundary). Vanilla namesly демонстрирует разницу с Managed isolation, но сам остаётся внутри капкан-диагностического contour'а: настоящие user turns по-прежнему идут только через managed pipeline.

**Не входит в эту задачу (явно отложено):** editable envelope (in-UI редактирование system / tools / fields перед отправкой), provider response capture (сейчас только request, без получения ответа от сервера).

---

## 3. Architectural Decisions

### 3.1 Vanilla baseline = bridge провайдера + `(model, reasoning, prompt)`, без других опций

Vanilla не эмулирует сторонний CLI бинарь. Это наш собственный bridge, инициализированный с дефолтами провайдера. Принципиальный контракт:

- **Claude:** `query(...)` с минимальным набором options, в который входят только `model`, `thinking`, `prompt`, `cwd` и proxy/auth env. БЕЗ `systemPrompt`, БЕЗ `tools`, БЕЗ принудительного `settingSources: []`, БЕЗ `permissionMode`, БЕЗ `allowDangerouslySkipPermissions`. SDK сам выполнит filesystem discovery (`CLAUDE.md` от `cwd`, `.claude/settings.json`, `~/.codeai-hub/settings/`).
- **Codex:** subprocess `codex exec` с фиксированными `model` и `reasoning level`, без managed-кастомизаций (`--sandbox`, `--approval-policy`, custom `--profile`, наш `~/.codeai-hub` config bundle). НЕ через long-lived `codex app-server`. Этого пути в коде сейчас нет — добавляется новый thin invoker.
**Точный CLI / SDK shape — гипотеза, требующая валидации.** Конкретные флаги для каждого bridge (включая, например, `--reasoning` vs `-c model_reasoning_effort=...` для Codex, или какие именно SDK options обязательны для Claude `query(...)`) **не фиксируются в этом разделе как факт**. Они определяются результатами Phase 4 pre-flight spike (см. §4 Phases). Cледовательно:

- Если spike покажет, что `codex exec --reasoning` не существует в текущей версии CLI, единственный способ задать reasoning — через минимальный `-c model_reasoning_effort=<level>` config override. Этот override допустим **только** для reasoning passthrough и не отменяет общий запрет тащить наш `~/.codeai-hub` config bundle. Точную форму фиксируем в §7 References после spike.
- Если spike покажет, что Claude SDK требует обязательные options (`pathToClaudeCodeExecutable`, `cwd`), они тоже остаются в Vanilla — это infrastructure, не managed-кастомизация.

Vanilla работает в **активном workspace** пользователя — filesystem discovery провайдеров (CLAUDE.md / AGENTS.md / .codex/) намеренно НЕ изолируется. Это часть демонстрационной ценности: diff против Managed показывает, что наша isolation реально работает.

### 3.2 Managed capture — diagnostic path, переиспользующий production contracts

Важное уточнение: **Managed capture не является обычным workflow turn**. Это отдельный diagnostic transport path, который **переиспользует production contracts** (workflow prompt pack, applied turn config, model invocation profile, persisted settings snapshot), но запускает provider через capture-and-abort proxy и diagnostic services (`claude-native-request-capture-service.ts`, `codex-native-request-capture-service.ts`), а не через обычный `dispatchUserMessage`. Codex managed capture отдельно стартует **temporary app-server process**, а не использует long-lived рабочий app-server.

Что в Managed capture идентично production turn'у (контрактно):
- Workflow prompt сборка (`buildWorkflowPromptPack` — общий код для capture и обычного turn).
- Applied turn config build (effective model identity, reasoning, thinking).
- Model invocation profile (`workflow-agent` для Description/VS/DM, `translation` для Translation).
- Provider-home auth path (managed `~/.codeai-hub/providers/<id>/home`).

Что отличается от production turn'а (по дизайну, существует уже сейчас):
- Provider не выполняет реальный turn — capture-and-abort proxy перехватывает request до отправки.
- Provider adapter вызывается через отдельный entry `captureNativeRequest()`, не через `dispatchUserMessage`.
- Codex запускает temporary app-server, не использует активный.
- Не пишется session/binding/continuity, не двигается workflow state.

**Единственное содержательное изменение в Phase 1** — флаг `bypassUpstreamGuard: boolean` на PM-стороне в `buildNativeRequestCaptureScenarioPrompt()` → проброс в `resolveScenarioInputPath()`. При `bypassUpstreamGuard === true`:
- проверки `Missing Final_Description.md` и `Missing virtual-simulation.md` пропускаются;
- `resolveScenarioInputPath` возвращает canonical path даже если файла на диске нет.

`buildWorkflowPromptPack` менять **не нужно**: согласно findings (§4 Subagent 4), он не читает content входного артефакта — только печатает relative/absolute paths. Поэтому отсутствующий файл сам по себе не ломает prompt build (provider при реальной отправке тоже бы получил только paths). Маркер `[artifact not present in workspace]` живёт только в `.md` capture-артефакте как metadata-аннотация (см. §5 Resolved Decisions п.1), а provider-visible prompt shape остаётся неизменным.

`workflow-step-start-service.ts` и любые другие guards для **обычных user turns** не трогаем — capture идёт через свой PM-side prompt resolver, production workflow turns идут другой дорогой.

### 3.3 UI — detached CEF popup window

Архитектурный паттерн заимствован у уже работающего detached diagram window:

- `window.open("?mode=detached-capture&workspaceSlug=...&workspacePath=...", "_blank", "popup,width=1280,height=900")`.
- Entry-point в `src/client/project-manager/app.tsx` распознаёт `mode=detached-capture` и рендерит `<DetachedCaptureWorkbench />` вместо `MainLayout`.
- Workspace context приходит через URL params (как в diagram).
- Двусторонняя синхронизация через `BroadcastChannel("pm:capture:run-results")` — основной PM может отображать badge/notification о новых capture artifacts, а workbench получает обновления, если пользователь меняет workspace в основном PM.
- Localization & transport: workbench обязан жить в той же React tree что и основной PM по части `LocalizationProvider` и `useProjectManagerApi()`/settings hook. Detached diagram **не** монтирует ProjectManagerWorkbenchApp и не получает эти провайдеры — для capture workbench этот bypass невозможен (без api transport кнопки физически не отправят `settings:native-request-capture`). Также `project-manager/index.tsx` сейчас сбрасывает `window.__CODEAI_LOCALIZATION_BOOTSTRAP__ = null` после первого consume. Точный mount path и bootstrap delivery для detached capture окна проектируются в Phase 3 pre-flight spike (см. §4 Phases).

В Settings → General карточка `Provider Native Request Capture` сворачивается до одной launcher-кнопки `Open Capture Workbench` + краткое описание. Полные селекторы провайдера/модели/сценария уезжают в detached window.

**Risk note (из исследования).** Detached Settings popup был введён в 1.2.53 и отозван в 1.2.54 (см. инвариант №33 в SystemArchitecture.md). Мы не повторяем эту ошибку, потому что:

- Capture Workbench — **не Settings** (не владеет save/reset/persistence path), это диагностический инструмент над приложением.
- Семантически он ближе к detached diagram window, который успешно работает в production.
- Settings → General НЕ переезжает в popup, переезжает только capture surface; Settings остаётся in-shell takeover в правой панели PM.

### 3.4 Парные артефакты и naming

- В workbench для каждого провайдера — **две независимые кнопки**: `Capture Managed` и `Capture Vanilla`. Никакого `Capture Both` нет.
- **Семантическое разграничение:** Vanilla — **референс-точка**, снимается редко и фиксируется как baseline. Managed — **итерируемая часть**, снимается часто, каждый раз, когда меняются купированные инструкции / tool list / applied turn config. Заставлять пересобирать неизменный Vanilla при каждой итерации Managed — лишняя работа.
- Каждый клик пишет одну пару файлов:
  - `<timestamp>-<provider>-<scenario>-<correlation>-managed.{jsonl,md}` (для Managed-кнопки),
  - `<timestamp>-<provider>-<scenario>-<correlation>-vanilla.{jsonl,md}` (для Vanilla-кнопки).
- Workbench отображает захваты в одном run history list, сгруппированном по ключу `(provider, model, reasoning, scenario)`. Соседние захваты с одинаковым ключом и разными режимами визуально подсвечиваются как сравнимая пара, даже если они сделаны в разное время. **UI scope superseded by child plan rev2:** the Phase 1 Workbench replaces this generic run-history-list framing with a slot-based UI-side index (`workbench-index.json`) over the same immutable timestamped artifacts described above; `current + previous` per slot is a UI projection and does not change the writer naming or retention contract here. Diff view ships in Phase 1 (semantic section diff `Managed: current vs previous`), not deferred — see `Plans/Backlog/Benchmarks/Capture_Workbench_UI_Architecture.md` §3 and §4.

### 3.5 Scope управления провайдерами

Long-term scope of the Workbench covers currently live capture providers. **Phase 1 UI scope superseded by child plan rev2:** the first Workbench release ships with **Claude and Codex Managed capture only**; removed-provider placeholders are not rendered. The capture transport union (`NativeRequestCaptureProviderId = "claude" | "codex"`) is unchanged in Phase 1. See `Plans/Backlog/Benchmarks/Capture_Workbench_UI_Architecture.md` §2.1 and §5.2. Any new provider joins only through a fresh planning/todo cycle backed by a live provider module.

### 3.6 Translation как отдельный сравнительный контракт

Сценарий `Translation` НЕ удовлетворяет общему обещанию «Vanilla и Managed получают одинаковый user prompt из workflow scenario». Текущий Managed Translation capture работает иначе:

- Core facade выставляет `invocationPurpose = "translation"`, `workflowPrompt = null`.
- Codex использует **fixed small translation sample** (`packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts:16-21`) с translator-only system, `processProfileKey = "codex:translation"`, `approvalPolicy = "never"`, `sandbox = "read-only"`.
- Workspace artifacts вообще не читаются.

Чтобы Vanilla vs Managed Translation было честным сравнением, обе кнопки используют **тот же fixed sample** (`{sourceLanguage: "en", targetLanguage: "es", text: "CodeAI Hub native request capture translation sample."}`) как user prompt. Разница между режимами:

- **Managed Translation:** sample + translator-only system + наш processProfile + sandbox/approval guards.
- **Vanilla Translation:** sample + bridge с дефолтами провайдера (без translator-only system, без processProfile, без guards).

Это **не нарушает** Product Goal п.2 — sample стабилен и одинаков для обоих режимов; «scenario определяет user prompt» расширяется до «scenario определяет либо workflow prompt (Description/VS/DM), либо fixed sample (Translation)». Workflow scenarios остаются прямым отражением реальных workflow turns; Translation — отдельный диагностический контракт под существующее поведение.

### 3.7 Detached transport & localization plan (Phase 1 spike result)

Current facts from the codebase:

- `src/client/project-manager/app.tsx` handles `mode=detached-diagram` before rendering `ProjectManagerWorkbenchApp`.
- `ProjectManagerWorkbenchApp` is the path that calls `useProjectManagerSettings()` and wraps the main surface in `LocalizationProvider`.
- The websocket connection is currently started by `MainLayout` (`api.connect()`), so detached diagram does not connect to Core through `api`.
- `src/client/project-manager/index.tsx` clears `window.__CODEAI_LOCALIZATION_BOOTSTRAP__ = null` before rendering the PM app. Detached capture therefore cannot rely on inherited bootstrap globals from the opener window.
- Core already exposes `GET /api/v1/localization/bootstrap` through `localization-bootstrap-http-handler.ts`; PM already resolves `wsUrl` / `httpUrl` from `window.codeaiBridgeConfig` with localhost fallback.

Phase 1 detached Capture Workbench must **not** reuse the detached diagram bypass. It uses a small PM-owned runtime wrapper:

- `app.tsx` parses `mode=detached-capture`, `workspaceSlug`, and `workspacePath`.
- The detached capture branch renders a new `DetachedCaptureRuntime` (or equivalent name) rather than rendering `DetachedCaptureWorkbench` directly.
- `DetachedCaptureRuntime` owns `api.connect()` / `api.disconnect({ dispose: true })`, calls `useProjectManagerSettings()`, resolves `useResolvedLocalization(settings, localizationRuntime)`, wraps the workbench with `LocalizationProvider`, and passes only the workspace context plus service clients into the Workbench.
- The existing `MainLayout` connection ownership remains unchanged for the normal PM shell. Do not move `api.connect()` into the global entrypoint unless a later implementation spike proves the wrapper cannot isolate it safely.

Transport decision:

- `settings:native-request-capture`, `workbench:state:*`, and `workbench:artifact:read` all travel over the existing PM websocket stream (`api` singleton → `ProjectManagerSocketLifecycle` → Core `/api/v1/stream`).
- `api.ts` stays a thin facade with send/event accessors only. State persistence, artifact reading, slot rotation, and diff logic live in new Workbench services.
- The detached window may queue messages before socket open because `api.send()` already queues through `OutgoingMessageQueue`, but user-facing run buttons should still render a connecting/disabled state until the Workbench state client has completed its first load.

Localization bootstrap decision:

- Primary localization source is the live `settings:loaded` payload delivered by `useProjectManagerSettings()` after websocket connect.
- Initial detached capture render may seed from the existing Core HTTP endpoint `GET /api/v1/localization/bootstrap` using `resolveBridgeConfig().httpUrl` before or during the detached runtime mount. This is a seed only; live `settings:loaded` remains authoritative and may replace it.
- Do not use parent-window `postMessage` as the bootstrap delivery path. Detached capture must be reloadable as a standalone URL and must not depend on the opener window staying alive.
- Do not change Settings save/reset/load ownership. Capture Workbench consumes settings/localization runtime for labels and capture defaults; it does not become a Settings persistence surface.

---

## 4. Phases

### Phase 1 — Workflow gating bypass for capture (PM-side only)

**Scope строго ограничен PM-стороной.** Никаких изменений в Core facade, никаких изменений в `buildWorkflowPromptPack`, никаких изменений в provider adapters. Это минимальный фикс блокирующей боли со скриншота.

- Добавить параметр `bypassUpstreamGuard?: boolean` в `NativeRequestCaptureScenarioPromptParams` и `resolveScenarioInputPath()` в `src/client/project-manager/services/native-request-capture-scenario-prompt.ts`.
- Под флагом: пропустить throws (строки 87-89 для VS, строки 94-99 для DM), вернуть canonical path даже если соответствующее workflow state поле пустое или `gating.blocked.diagram_modules === true`.
- `ProjectManagerNativeRequestCaptureRunner` (`native-request-capture-runner.ts`) при вызове `buildNativeRequestCaptureScenarioPrompt()` передаёт `bypassUpstreamGuard: true` всегда — capture по определению является диагностическим режимом. Это **единственное место**, где флаг ставится в `true`. Production workflow turns не задействованы.
- На Core boundary `bypassUpstreamGuard` **не идёт** — facade получает уже готовый `scenarioPrompt` / `scenarioInputPath` и не знает о существовании флага.
- Маркер `[artifact not present in workspace]` (если решим показывать в `.md` capture-артефакте) добавляется **в writer**, не в prompt builder. Phase 1 минимальный вариант — без маркера, чтобы не раздувать scope: bypass только пропускает throws, capture запускается, в `.md`-артефакте просто видно canonical path. Marker — отдельная микрозадача, можно объединить с Phase 1 если влезает в ≤3 файла.
- Тесты: VS missing Final_Description, DM missing virtual-simulation, Translation/Description без изменений (они и сейчас работают).
- UI: ничего не меняется (карточка остаётся прежней). Кнопки начинают работать на пустых workspaces.

### Phase 2 — Additional provider capture parity (withdrawn until a live provider exists)

The old provider-specific Phase 2 is withdrawn after provider removal. Do not expand `NativeRequestCaptureProviderId` beyond `claude | codex` from this backlog alone. A future provider must bring a fresh capabilities analysis, live module, capture adapter plan, and microtask-sliced todo cycle before entering the Workbench union.

### Phase 3 pre-flight — Detached transport & localization spike

**До** старта Phase 3 implementation провести небольшой spike (исследовательский cycle, без production-кода):

- Подтвердить: при `window.open(?mode=detached-capture)` детач-окно получает свой websocket-канал к Core. Сейчас `pm:diagram:sidecar-sync` делает только UI-broadcast между окнами; настоящий transport для `settings:native-request-capture` приходит через `useProjectManagerApi()` / `ProjectManagerWorkbenchApp`. Detached diagram **bypass'ит** этот mount path. Capture workbench bypass'ить нельзя — без api transport кнопки не отправят команду. Spike: спроектировать, где именно монтируется api/settings hook в detached mode.
- Подтвердить: при detached open `__CODEAI_LOCALIZATION_BOOTSTRAP__` действительно injected в HTML popup-окна. Сейчас `project-manager/index.tsx` сбрасывает global в `null` после первого consume. Spike: спроектировать, откуда detached HTML получает свежий bootstrap snapshot (через query param, через отдельный bootstrap fetch, через postMessage от parent).
- Результат spike — короткий append-в этот же документ (новый раздел §3.7 «Detached transport & localization plan»). Только после этого переходим к Phase 3 implementation.

### Phase 3 — Detached Capture Workbench window

UI vehicle для будущего Vanilla режима.

- `?mode=detached-capture` entry в `app.tsx`.
- Компонент `DetachedCaptureWorkbench` с зонами: provider/model/reasoning селекторы, сценарий, кнопки capture, run history list, artifact links, status panels.
- `BroadcastChannel("pm:capture:run-results")` для двусторонней связи.
- Сворачивание Settings → General карточки до launcher-кнопки.

### Phase 4 pre-flight — Vanilla CLI contract validation spike

**До** старта Phase 4 implementation провести валидационный spike для каждого провайдера. Без этого Vanilla не сможет соблюдать заявленные идентичные условия `(model, reasoning)` с Managed:

**Codex:**
- Прогнать `codex exec --help` и `codex --help` локально, документировать **актуальный** механизм передачи reasoning level. На дату планирования предположение «`codex exec --model=X --reasoning=Y`» не подтверждено: `--reasoning` flag может отсутствовать в текущей версии CLI, и параметр придётся задавать через `-c model_reasoning_effort=Y` или другой config-mechanism. **Это конфликтует с заявленным запретом `--config` в §3.1**, и конфликт нужно разрешить здесь: либо разрешить `-c` для reasoning (минимальный config override, не наш `~/.codeai-hub` config bundle), либо найти CLI flag.
- Документировать: какие именно env vars / config файлы `codex exec` читает по умолчанию из `CODEX_HOME` (auth.json, config.toml, project-doc).
- Проверить: будет ли `codex exec` уважать `HTTPS_PROXY` env var, чтобы capture-and-abort proxy перехватил трафик.

**Claude:**
- Зафиксировать: SDK `query(...)` опции, которые сейчас передаёт Managed (`packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts:58-78`).
- Зафиксировать: какие из них **обязательны** для работы query (без них SDK падает) vs какие можно опустить для Vanilla. По исследованию `@anthropic-ai/claude-agent-sdk` отсутствует в node_modules — спайк включает чтение установленного SDK на dev-машине, либо запрос документации.
- Решить: для Vanilla опускаем `systemPrompt`, `tools`, `settingSources`, `permissionMode`, `allowDangerouslySkipPermissions` — оставляем только `model`, `thinking`, `prompt`, `cwd`, `env` (proxy creds), `pathToClaudeCodeExecutable`. Подтвердить, что `cwd` обязателен для capture proxy override.

Результат spike — короткий append-в `§7. References / Vanilla CLI contract validation results`. Только после этого переходим к Phase 4 implementation.

### Phase 4 — Vanilla baseline capture

Реализация Vanilla режима для Claude и Codex **на основе результатов pre-flight spike**.

- Claude: новый shape options для `query(...)` без managed-кастомизаций. Auth и `cwd` через тот же managed provider-home (`~/.codeai-hub/providers/claude/home`), чтобы среда была идентична Managed.
- Codex: новый thin subprocess invoker для `codex exec`. Точный shape флагов (включая reasoning) фиксируется по результатам spike. `CODEX_HOME` — managed `~/.codeai-hub/providers/codex/home`, не legacy `~/.codex/`.
- Парные артефакты с naming контракта 3.4 (две независимые кнопки `Capture Managed` / `Capture Vanilla`).
- Translation НЕ использует workflow prompt pack (см. §3.6 — Translation как отдельный сравнительный контракт). Workflow scenarios (Description / Virtual Simulation / Diagram Modules) используют workflow prompt packs, Translation использует fixed translation sample для **обоих** режимов. Managed Translation продолжает идти через текущий `codex-app-server-translation-service` (translator-only system, `processProfileKey: "codex:translation"`, `approvalPolicy: "never"`). Vanilla Translation использует тот же fixed sample, но через bridge с дефолтами провайдера — без translator-only system, без processProfile, без guards. Разница между Managed и Vanilla — только в provider initialization/envelope.

### Phase 5+ — Editable envelope (deferred)

Не в рамках этого плана. Вынесено в отдельный design intake после стабилизации Phase 1–4.

---

## 5. Resolved Decisions (2026-05-01)

1. **Маркер отсутствия файла** — `[artifact not present in workspace]` принят как достаточный. Маркер живёт **только в `.md` capture-артефакте** как metadata-аннотация для пользователя; provider-visible prompt shape остаётся неизменным (`buildWorkflowPromptPack` и так не читает content входного файла, только печатает paths). Это означает, что Phase 1 НЕ трогает `buildWorkflowPromptPack` / `buildStageInputLines`. Маркер опционально добавляется в writer (`native-request-capture-markdown.ts`) как отдельная микрозадача — может попасть в Phase 1, может уйти в Phase 3.
2. **UX кнопок** — две независимые кнопки `Capture Managed` и `Capture Vanilla` для каждого провайдера. Без `Capture Both`. Семантика: Vanilla — редкий референс, Managed — частая итерация. Подробнее §3.4.
3. **Scope translation в Vanilla** — Translation использует **fixed translation sample** (`codex-native-translation-capture-profile.ts:16-21`) как user prompt для обоих режимов; workflow prompt pack для Translation не применяется (см. §3.6). Managed Translation сохраняет текущий путь через `codex-app-server-translation-service` (translator-only system, processProfile, sandbox/approval guards). Vanilla Translation использует тот же sample, но через bridge с дефолтами провайдера — отличается только provider initialization/envelope.
4. **Localization** — workbench использует ту же localization, что установлена в приложении (через `__CODEAI_LOCALIZATION_BOOTSTRAP__` injection в HTML detached окна). Английский fallback не делаем.
5. **Codex/Claude Vanilla auth** — оба провайдера в Vanilla работают через свой managed provider-home (`~/.codeai-hub/providers/<id>/home`), не через legacy `~/.<provider>/`. Среда идентична Managed по auth, отличается только инициализация bridge.

---

## 6. Risks

- **CEF popup support.** Detached diagram работает, поэтому popup в CEF поддерживается. Но при первом запуске detached capture надо проверить, что bridge transport (websocket к Core) корректно работает в popup-контексте — у diagram это HTTP fetch, а у capture — websocket commands `settings:native-request-capture`. **Mitigation:** в Phase 3 дымовой тест с одной кнопкой через bridge до начала остальной UI разработки.
- **Vanilla Codex subprocess auth.** `codex exec` запускается с `CODEX_HOME=~/.codeai-hub/providers/codex/home` (managed home). Если managed home не инициализирован (пользователь ещё не запускал Codex в managed режиме), subprocess упадёт на auth. **Mitigation:** в Phase 4 добавить preflight check, который подтверждает наличие `auth.json` в managed provider-home до старта capture, и явный error message с инструкцией «сначала залогинься в Codex через managed».
- **Vanilla Claude SDK discovery в нашем же repo.** Если Vanilla Claude запускается в активном workspace, который ОДНОВРЕМЕННО является CodeAI Hub repo (наш репозиторий), SDK может затащить наш собственный `~/.claude/CLAUDE.md` или `.claude/` файлы. Это не баг, но следует это явно увидеть в diff. **Mitigation:** не нужна — это и есть исследовательская ценность.
- **Detached settings precedent (1.2.53 → 1.2.54).** См. §3.3 — управляется через семантическое разграничение.
- **Production turn collision.** Если в момент capture у пользователя идёт активный workflow turn, capture-and-abort proxy может перехватить этот turn вместо capture turn. **Mitigation:** capture-runner уже сейчас использует уникальный TLS endpoint (proxy на 127.0.0.1:<random>), но нужно подтвердить, что в момент capture обычный turn идёт мимо этого proxy. Проверить в Phase 1.

---

## 7. References

### System invariants (SystemArchitecture.md)

- §5 Provider-home isolation (Claude `settingSources: []` контракт, который Vanilla намеренно нарушает).
- §33 Settings ownership invariant (precedent отозванного detached settings popup; Capture Workbench — отдельный contract).
- §35 Model invocation profile boundary (Vanilla — это capture без applied profile, а не новый purpose; `diagnostic` остаётся не-purpose).

### Code (current state — facts)

- `src/client/project-manager/services/native-request-capture-scenario-prompt.ts:84-99` — единственная точка bypass'а для capture.
- `src/client/project-manager/services/prompt-pack-builder.ts:254` — `buildWorkflowPromptPack` (вызывается и из capture, и из обычного turn — общий код).
- `src/client/project-manager/services/workflow-step-start-service.ts:99,135` — guards для обычного workflow turn (НЕ трогаем).
- `packages/core/src/provider-network-capture/native-request-capture-facade.ts` — Core entry, полностью read-only.
- `packages/core/src/provider-network-capture/native-request-capture-proxy.ts` — TLS tunnel для Claude/Codex endpoints.
- `packages/core/src/provider-network-capture/native-request-capture-writer.ts` — naming артефактов (расширяется в Phase 4 для парного naming).
- `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts` — Claude managed (Vanilla добавляется рядом).
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts` — Codex managed app-server (Vanilla — отдельный subprocess path).
- `src/client/ui/src/components/settings/native-request-capture-card.tsx` — текущая Settings карточка (сжимается в Phase 3 до launcher).
- `src/client/project-manager/components/diagram-editor/detached-diagram-view.tsx` — pattern для Phase 3.
- `src/client/project-manager/components/layout/detach-diagram-button.tsx` — `window.open` контракт.

### Related plans

- `Plans/Backlog/Claude_Agent_SDK_Capabilities_Analysis.md` — что доступно в Claude SDK для Vanilla опций.
- `Plans/Backlog/Codex_AppServer_Capabilities_Analysis.md` — managed Codex baseline для контраста с Vanilla `codex exec`.
- `Plans/Backlog/CrossProvider_Common_Capabilities.md` — общие инварианты, которые должны соблюсти все три провайдера в обоих режимах.
