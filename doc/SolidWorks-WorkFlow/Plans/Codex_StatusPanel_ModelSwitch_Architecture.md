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

### 6.2 Pure payload rebuild каждый turn

В Codex App Server payload builder (точное местоположение TBD на этапе implementation) каждый `turn/start` пересобирается from scratch через `currentInvocationProfile.capabilities`:

- `supportsReasoningSummary === false` → блок `reasoning` (полный, включая `summary` поле) **не добавляется** в payload.
- `supportsVerbosity === false` → `verbosity` поле не добавляется.
- Никакой in-place transform старого payload. Каждый turn — fresh build.

### 6.3 Switch transport + Core handler

UI кликает по chip → picker (model или reasoning) → user выбирает → клиент отправляет `session:codex:model-switch` (новый command, scoped per-provider, чтобы оставить место для будущего `session:claude:model-switch` / `session:gemini:model-switch`).

Core handler:
1. Validate target — model existing в Codex registry, reasoning ∈ supported levels.
2. Mutate `Session.modelBinding` (provider stays `codexCli`, model + reasoning меняются).
3. Set `Session.pendingModelSwitchInjection = true`.
4. Broadcast `session:model:update` с новым effective identity.
5. **НЕ** trigger'ить provider call. Switch только меняет config; следующий user message покажет эффект.

### 6.4 `<model_switch>` developer message injection

На первый dispatch после `pendingModelSwitchInjection === true`:
- Codex App Server module embeds developer message в начало `turn/start.input` массива (точная форма TBD на этапе implementation, по образцу Codex CLI `context/model_switch_instructions.rs`):
  > "The user was previously using a different model. Please continue the conversation according to the following instructions: [base instructions новой модели]"
- После dispatch: `pendingModelSwitchInjection = false`.

### 6.5 UI behaviour

- **Codex session:** model chip clickable → picker открывается → показывает Codex models (provider grouping out-of-scope для этого цикла); reasoning chip clickable → options derived из `selectedModel.reasoningEffortOptions`.
- **Claude / Gemini session:** chips render visually (для consistency), но clicks no-op. Tooltip "Model switch is currently available for Codex sessions only" (localizable) — open question 11.1: hide vs disabled.
- **Default reasoning** при выборе нового model: previous reasoning level если он ∈ нового `reasoningEffortOptions`, иначе первое из options.

## 7. Files affected (≤3 per micro-task — enforced via todo-plan)

Anchors (точные пути уточняются на этапе implementation):
- `src/types/codex-model-registry.ts` — capability flags expansion + tests
- Codex App Server payload builder (внутри `packages/Codex_AppServer_Module/`)
- Codex App Server dispatch path для `<model_switch>` injection
- `packages/core/src/remote-bridge/session-stream-contracts.ts` — `session:codex:model-switch` transport
- `packages/core/src/remote-bridge/remote-bridge-message-router.ts` — routing
- `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts` (или новый sibling handler) — Core handler
- `src/client/project-manager/api.ts` — client-side API call
- `src/client/ui/src/session/status-panel.tsx` — wire buttons
- `src/client/ui/src/session/model-switcher/session-model-picker-card.tsx` — Codex-only options filter
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` (and / or runtime view equivalent) — switch dispatch from UI to Core
- Tests for each layer
- SSOT updates: `Modules/Codex.md`, `Modules/Codex_ProviderInvocationFlags.md`, `Modules/Session_UI/SessionStatusPanel.md`

## 8. Test plan

- **Unit (registry):** assert `supportsReasoningSummary === false` для Spark, `=== true` для non-Spark.
- **Unit (payload builder):** Spark turn payload **не содержит** `reasoning.summary`; non-Spark **содержит** его.
- **Unit (Core handler):** `Session.modelBinding` mutates корректно; `pendingModelSwitchInjection` flips; broadcast emitted.
- **Integration (transport):** new `session:codex:model-switch` command routes correctly через message-router.
- **Component (UI):** click on model chip opens picker; selection triggers correct `session:codex:model-switch` payload; non-Codex session no-op / disabled.
- **Native request capture (end-to-end):** switch from `gpt-5.2` to `gpt-5.3-codex-spark` с reasoning low → следующий turn → captured raw payload **не содержит** `reasoning.summary`, **содержит** `<model_switch>` developer message в начале `input`.
- **User retest:** обязательный stream Phase 3 (см. todo-plan). Без явного approval цикл не закрывается.

## 9. Risks

1. **Spark reasoning effort options unknown.** Если Spark не поддерживает reasoning effort levels вовсе — пустой `reasoningEffortOptions` array signal'ит UI hide reasoning chip пока выбран Spark.
2. **Файл-size limit (500 lines).** Codex App Server payload builder может уже быть близко к лимиту. Возможно потребуется split во время implementation.
3. **Switch без последующего user message.** Если user переключает model и закрывает сессию без отправки turn — `pendingModelSwitchInjection` остаётся `true` на диске. Next session open / restart должен либо сбросить флаг, либо honor его. TBD на этапе implementation (закрываем session → инжект NOT happens).
4. **Tooltip localization.** Любой новый user-facing text → approved dictionary (`messages_for_the_user.json` или `ui_helper_text.json` в зависимости от категории).

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
3. **`<model_switch>` developer message** — точный текст и format embedding в Codex App Server `turn/start.input`. По образцу Codex CLI, но финальный wording — открытый.
4. **Default reasoning при выборе model** — first из options vs previous level если совместим? Solution в §6.5 — previous-if-supported, else first.
5. **`pendingModelSwitchInjection` lifecycle** — что если user закроет session без user-turn после switch'а? Default: state persists; на next session open injection happens на первый turn.
