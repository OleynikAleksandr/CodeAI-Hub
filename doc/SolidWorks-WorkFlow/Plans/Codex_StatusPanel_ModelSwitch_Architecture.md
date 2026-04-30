# Codex Status Panel Model Switch — Planning Doc

**Status:** Draft (awaiting user approval)
**Owner:** UI / Codex provider
**Related SSOT:**
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
- `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`
- открытый Codex CLI (исследовано в этой сессии): `codex-rs/core/src/{client.rs, session/handlers.rs, session/turn.rs, compact.rs, context/model_switch_instructions.rs}`, `codex-rs/protocol/src/openai_models.rs`

## 1. Problem

В Status Panel под `InputPanel` есть две интерактивные кнопки — model chip и reasoning chip — оставшиеся после rollback неудачной in-place mutation схемы (1.2.114). Сейчас они **не привязаны** к функциональной логике. Пользователю нужно вернуть переключение модели и reasoning effort, но под архитектурой, доказавшей жизнеспособность в продакшен-Codex-CLI, без compatibility matrix и без provider segments.

Конкретный регрессионный сценарий, который мы должны покрыть: пользователь переключает active Codex session с `gpt-5.2` (с reasoning summary) на `gpt-5.3-codex-spark` (без reasoning summary), отправляет следующий turn — и provider **не** rejecting его с `400 unsupported_parameter`.

## 2. Why Codex first

- Codex CLI open-source — рабочий механизм можно просто прочитать в коде.
- Spark/non-Spark — единственный реально подтверждённый случай несовместимости (`reasoning.summary` rejected by Spark на `1.2.114`).
- Mono-provider scope первой итерации убирает cross-provider history sanitization (она остаётся отдельным будущим scope'ом для Claude/Gemini integration).
- Гарантирует working pattern, прежде чем браться за Claude и Gemini.

## 3. Codex CLI findings (key takeaways)

- **No new thread on switch.** `Op::OverrideTurnContext` мутирует `Session` in-place; `conversation_id` сохраняется. История целая.
- **No compatibility matrix.** Каждая модель несёт свой набор capability flags в `ModelInfo` (server-furnished для них, в protocol/src/openai_models.rs:248-303).
- **No try-and-retry.** Payload каждый turn пересобирается from scratch с current `ModelInfo`. `build_reasoning()` (client.rs:643-660) возвращает `None` если `supports_reasoning_summaries === false` → весь блок `reasoning` исчезает из request body.
- **History остаётся целой.** Старые `ResponseItem::Reasoning` items НЕ filter'уются — server считает их valid input даже для модели без summary поддержки.
- **Inject `<model_switch>` developer message** на первый turn после switch (`context/model_switch_instructions.rs:21-26`):
  > "The user was previously using a different model. Please continue the conversation according to the following instructions: [base instructions новой модели]"
- **One ModelDownshift edge case** (`turn.rs:739-778`): если новая модель имеет меньший context window, и текущая история превышает её auto-compact limit — pre-emptively run compaction через **previous model's turn context** (потому что reasoning blocks ещё validate в её формате). **Defer в этом цикле**, реализуем follow-up'ом.
- **Capability-flag-driven, not slug-driven.** Никаких `match model_slug` в payload shaping.

## 4. Goals

1. Wire model + reasoning Status Panel buttons для **Codex sessions only** (Claude / Gemini chips остаются visually presented, но clicks no-op / disabled tooltip).
2. Switch — mutate-in-place: same `providerSessionId`, same `Session.dialogId`, новая `Session.modelBinding`, новый next-turn invocation profile.
3. Per-model capability flags на Codex side — payload builder gate'ит `reasoning.summary` / `summary` / `verbosity` etc. Никакого in-place transform старого payload — pure rebuild каждый turn.
4. `<model_switch>` developer message injected once на первый turn после switch.
5. Native request capture тест подтверждает чистый payload для Spark после switch'а.

## 5. Non-goals

- Cross-provider switch (Codex → Claude → Gemini) — отдельный future scope, требует history sanitization design.
- Claude / Gemini in-provider switch — следующие циклы, по образцу этого.
- Context-window rollover redesign / unification with switch — остаётся как отдельный механизм.
- Deterministic handoff packet (из `DocumentationTree_ProfileBoundary_ModelProviderSwitch_Planning.md`) — out of scope для этого цикла; планинг тот теперь **переосмысливается** в свете Codex CLI findings и не является execution input'ом для текущего цикла.
- ModelDownshift pre-emptive compaction — defer, реализуем follow-up'ом после verification основного path'а.

## 6. Architecture

### 6.1 Capability flags на Codex models

Расширяем `src/types/codex-model-registry.ts` (или эквивалент) per-model:

- `supportsReasoningSummary: boolean` — Spark = `false`; non-Spark = `true`.
- `supportsVerbosity: boolean` — пока что `true` для всех Codex models (refine при первом провайдер-rejection).
- `reasoningEffortOptions: readonly ReasoningEffort[]` — список разрешённых effort levels per model. Spark: TBD по результатам провайдер-experiment (open question 11.2); non-Spark: `["low", "medium", "high"]`.
- `contextWindow: number` — для будущего ModelDownshift.
- `autoCompactTokenLimit: number` (optional) — для будущего ModelDownshift.

Эти флаги — **self-contained per model**, никаких pairwise сравнений. Никаких `match model_slug` в payload builder'е.

**Stream B заменяет существующий slug-based hardcode** в `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.ts:3` (`CODEX_MODELS_WITHOUT_REASONING_SUMMARY = new Set(["gpt-5.3-codex-spark"])`) на capability registry lookup. Существующий unit-test для `buildCodexReasoningSummaryParams` сохраняется и расширяется (assert через registry, не через hardcoded Set).

### 6.2 Pure payload rebuild каждый turn (existing pattern, extending)

**Существующее состояние:** `codex-app-server-facade.ts:225` уже вызывает `buildCodexReasoningSummaryParams(modelId, mode)` на каждый `turn/start`, то есть payload пересобирается fresh per turn. Pattern уже соответствует Codex CLI.

**Stream C** меняет ТОЛЬКО внутренности `buildCodexReasoningSummaryParams`: вместо `CODEX_MODELS_WITHOUT_REASONING_SUMMARY.has(modelId)` — lookup `getCodexModelCapabilities(modelId).supportsReasoningSummary`. Никаких новых call sites не создаётся; existing turn/start dispatch не меняется.

Если в будущем потребуется gate'ить дополнительные поля (напр. `verbosity`) — добавляется analogous helper, gated на `supportsVerbosity`. В этом цикле — только `summary`.

### 6.3 Switch transport — НЕ reuse существующего switch path

**Критично:** существующий `handleSwitchRequest` в `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts:54` (mode `"retry_in_place" | "switch_model" | "switch_provider"`) **немедленно пересылает последний user message** в адаптер после binding mutation. Это **НЕ** то поведение, которое нам нужно.

Новый `session:codex:model-switch` — **отдельный путь**, config-only:
1. Validate target (model в Codex registry, reasoning ∈ `reasoningEffortOptions`).
2. Mutate `Session.modelBinding` через `SessionManager.setModelBinding` (`packages/core/src/session-manager/index.ts:225`) — provider stays `codexCli`, меняются model + reasoning.
3. Set `Session.pendingModelSwitchInjection = true` (in-memory, см. §6.4).
4. Broadcast `session:model:update` с новым effective identity (через существующий `session-request-handler-applied-turn-config.ts` contract).
5. **STOP.** Никакого `adapter.sendMessage`, никакого resend. Следующий user-initiated `dialog:send` / `session:message` подхватит новый binding и triggernet `<model_switch>` injection.

**Полный список transport touchpoints (Stream D разбивается на 3 микро-задачи ≤3 файлов):**

D1 (server-side transport):
- `packages/core/src/remote-bridge/session-stream-contracts.ts` — payload type + outbound update type
- `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` — register `session:codex:model-switch` validator (текущий registry на line 217-231 содержит `dialog:switch:*`, `session:create/delete/message/refreshUsageLimits/stop` — этот новый command нужно явно добавить)
- `packages/core/src/remote-bridge/remote-bridge-message-router.ts` — routing

D2 (handler + Session type):
- new file `packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.ts` (отдельный handler, чтобы не разрастать `session-actions.ts`)
- `src/types/session.ts` (line 130 area) + `packages/core/src/session-manager/index.ts:26` — добавить `pendingModelSwitchInjection?: boolean` field

D3 (client transport):
- `src/client/project-manager/core-stream-message-types.ts` — outbound type def
- `src/client/project-manager/api.ts` — `requestCodexModelSwitch(sessionId, targetModelId, targetReasoning)` method

### 6.4 `pendingModelSwitchInjection` storage — explicit decision

**Решение: in-memory only на Session объекте** в `SessionManager`. **НЕ persisted** в continuity chain или sidecar.

Trade-off (явный, не скрыт):

- **PM webview reload (Core стабилен):** flag сохраняется, injection срабатывает корректно на следующий user turn.
- **Core restart между switch'ом и user-turn'ом:** flag теряется. `Session.modelBinding` восстанавливается из continuity (она persisted), то есть **model всё равно переключён** на следующий turn, но `<model_switch>` developer message **не injected**. Capability gating обеспечивает payload validity. Единственная потеря — explicit explanatory hint для LLM (LLM видит slug change в payload + старая history с reasoning items, server принимает их).

Если по результатам user retest потребуется persistent injection — отдельный follow-up scope, расширяющий `ContinuityChainSnapshot`.

### 6.5 `<model_switch>` developer message injection

На первый dispatch после `Session.pendingModelSwitchInjection === true`:
- В `codex-app-server-facade.ts` (path `executeTurn` или upstream caller, который собирает `turn/start.input`) embed developer-style message в начало `input` массива. Точная форма embedding'а — open question 11.3 (Codex App Server JSON-RPC может потребовать specific role / type marker; вариант: extra item с `type: "text"` и meta-tag, или отдельный pre-turn `developer/message` если App Server поддерживает).
- Контент по образцу Codex CLI `context/model_switch_instructions.rs:21-26`:
  > "The user was previously using a different model. Please continue the conversation according to the following instructions: [base instructions новой модели]"
- После successful dispatch — `Session.pendingModelSwitchInjection = false` (через `SessionManager`).

### 6.6 UI behaviour

**Текущее состояние после rollback (verified):** только `src/client/ui/src/session/status-panel.tsx:87-104` имеет две визуальные кнопки model + reasoning, **БЕЗ** `onClick` handler'ов. Файлы `model-switcher/session-model-picker-card.tsx` и `model-switcher/session-model-switcher-facade.ts`, на которые ссылался изначальный план, **физически отсутствуют** в current tree (rolled back). UI слой нужно собрать заново.

**Stream F создаёт picker слой с нуля, разбивается на 3 микро-задачи ≤3 файлов:**

F1 (status panel + picker component):
- `src/client/ui/src/session/status-panel.tsx` — добавить `onClick` к двум кнопкам, состояние `openPicker: "model" | "reasoning" | null`, рендеринг picker popup'а
- new file `src/client/ui/src/session/status-panel-model-picker.tsx` — picker UI компонент (в этом цикле показывает только Codex models; non-Codex sessions — open question 11.1: hide vs disabled)
- new file `src/client/ui/src/session/status-panel-model-picker.test.tsx` — component test

F2 (callback bridge + symmetric PM views):
- `src/client/ui/src/session/session-view.tsx` — пробросить `onSelectModel` / `onSelectReasoning` из props в `StatusPanel`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` — wiring через PM controller
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` — symmetric wiring

F3 (controller dispatch):
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` — invoke `api.requestCodexModelSwitch(...)` с target из callback
- guard: для non-Codex sessions callback no-op (chip остаётся visually, но click ничего не делает)

**Default reasoning** при выборе нового model: previous reasoning level если он ∈ нового `reasoningEffortOptions`, иначе первое из options.

## 7. Files affected (verified existence; ≤3 per micro-task — enforced via todo-plan)

### B. Capability registry
- `src/types/codex-model-registry.ts` — capability flags expansion + extending existing tests

### C. Payload gating
- `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.ts` — replace slug Set с registry lookup
- `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.test.ts` (если существует — расширить; если нет — создать)

### D. Switch transport (3 микро-задачи)

D1: `packages/core/src/remote-bridge/session-stream-contracts.ts`, `incoming-message-validator.ts`, `remote-bridge-message-router.ts`
D2: new `packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.ts`, `src/types/session.ts` (pendingModelSwitchInjection field), `packages/core/src/session-manager/index.ts` (Session interface)
D3: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/api.ts` + handler unit-test

### E. Injection
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` (executeTurn / turn/start input building)
- snapshot test of post-switch первого turn

### F. UI (3 микро-задачи)

F1: `src/client/ui/src/session/status-panel.tsx`, new `src/client/ui/src/session/status-panel-model-picker.tsx`, new picker test file
F2: `src/client/ui/src/session/session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
F3: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` + controller-side тест

### G. Native request capture E2E
- new test file under `packages/Codex_AppServer_Module/src/diagnostics/` или `packages/core/src/__tests__/`
- existing `codex-native-request-capture-service.ts` — reused, не модифицируется

### H. SSOT updates
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
- (если требуется) new SystemArchitecture invariant для capability-gated payload contract

## 8. Test plan

- **Unit (registry):** assert `supportsReasoningSummary === false` для Spark, `=== true` для non-Spark; `reasoningEffortOptions` per model — non-empty array для non-Spark.
- **Unit (payload builder):** существующий test для `buildCodexReasoningSummaryParams` расширяется — assert через registry lookup, не через старый Set; Spark turn payload **не содержит** `summary` поля; non-Spark **содержит** его.
- **Unit (Core handler):** `Session.modelBinding` mutates корректно; `pendingModelSwitchInjection` flips от false к true; broadcast `session:model:update` emitted **синхронно** до возврата handler'а; **adapter.sendMessage НЕ вызван**.
- **Integration (transport):** new `session:codex:model-switch` command routes correctly через `incoming-message-validator` → `remote-bridge-message-router` → handler.
- **Component (UI):** click on model chip → picker open; selection → correct `session:codex:model-switch` payload dispatched; non-Codex session — chip click no-op / disabled.
- **Settings independence assertion:** после `session:codex:model-switch` (без последующего turn'а) — следующий `dialog:send` собирает applied turn config с `modelId === target.modelId` и `reasoning === target.reasoning`, **БЕЗ** чтения Settings defaults. Этот тест критичен — он защищает от регрессии типа 1.2.114, где Settings перетирали binding.
- **UI immediate update assertion:** UI получает `session:model:update` event с новым effective identity в **том же tick**, что и dispatch switch'а — без race с Settings save / reload.
- **Native request capture (end-to-end):** switch from `gpt-5.2` to `gpt-5.3-codex-spark` с reasoning low → следующий turn → captured raw payload **не содержит** `summary` поле, **содержит** `<model_switch>` developer message в начале `input` array.
- **User retest:** обязательный stream Phase 3 (см. todo-plan). Без явного approval цикл не закрывается.

## 9. Risks

1. **Spark reasoning effort options unknown.** Если Spark не поддерживает reasoning effort levels вовсе — пустой `reasoningEffortOptions` array signal'ит UI hide reasoning chip пока выбран Spark.
2. **Файл-size limit (500 lines).** `codex-app-server-facade.ts` уже non-trivial (turn/start dispatch + event subscribe + many helpers). Embedding `<model_switch>` injection может потребовать extract в отдельный helper file. Реальное решение — на этапе Stream E.
3. **Tooltip localization.** Любой новый user-facing text → approved dictionary (`messages_for_the_user.json` или `ui_helper_text.json` в зависимости от категории).
4. **`Session.pendingModelSwitchInjection` API contract.** Field добавляется в Session interface (`packages/core/src/session-manager/index.ts:26`) и в shared `src/types/session.ts:130`. Оба слоя должны быть в sync, иначе TypeScript drift между Core и client. Stream D2 закрывает оба в одном коммите.
5. **Existing `handleSwitchRequest` остаётся:** в этом цикле не трогаем. Он используется для cross-session manual `dialog:switch:*` flow (не путать с нашим in-session config switch). Stream H docs syncs explicit clarification: два разных contract'а сосуществуют.

## 10. Definition of done

1. Switch model на Codex session (`gpt-5.2` → `gpt-5.3-codex-spark` с reasoning low) и следующий user message успешно processes без provider rejection.
2. Native request capture показывает clean payload для Spark (no `reasoning.summary`) и `<model_switch>` developer message present.
3. Non-Codex session: model/reasoning chips no-op или disabled, UX не путает пользователя.
4. Session continuity preserved — switch не создаёт новый thread, история сохраняется, `usage_limits` widget продолжает работать.
5. SSOT обновлён: `Modules/Codex.md`, `Modules/Codex_ProviderInvocationFlags.md`, `Modules/Session_UI/SessionStatusPanel.md`. SystemArchitecture invariant добавлен / расширен по результатам review.
6. Релиз `1.2.111` собран — VSIX + 7 tarballs.
7. **User retest passed** — пользователь явно подтверждает что switch работает в реальном workspace; non-Codex disabled UX OK; SSOT contract аккуратен. Без этого approval Phase 3 (и весь scope) **не закрывается**.

## 11. Open questions

1. **Hide vs disabled** для chips на non-Codex sessions? Disabled с tooltip — мой default; решает user retest review.
2. **Spark reasoning effort levels** — поддерживает ли Spark `low/medium/high`? Если нет — `reasoningEffortOptions` пустой, reasoning chip hidden когда выбран Spark.
3. **`<model_switch>` developer message embedding format** — Codex App Server JSON-RPC `turn/start.input` принимает массив items с `type: "text" | ...`. Точная форма developer message: extra item с `type: "text"` и meta-tag в начале text? Или отдельный `developer/message` notification, если App Server поддерживает? Решается на этапе Stream E через эксперимент с native request capture.
4. **Default reasoning при выборе model** — first из options vs previous level если совместим? Solution в §6.6 — previous-if-supported, else first.
5. **`pendingModelSwitchInjection` lifecycle** — резолвлено в §6.4: in-memory only. PM webview reload — flag сохраняется. Core restart — flag теряется, model всё равно переключён через persisted modelBinding, injection skip'ается. Soft degradation acceptable.
