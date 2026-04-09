# Codex Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Codex для Core: threaded conversations (resume), one-shot turns, provider-home rollouts, usage limits.

## Где живёт код
- `packages/Codex_Module/`
- Usage-limits facade for Codex lives in Core: `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-facade.ts` (shared cluster, see `packages/core/src/provider-usage-limits/`).

## Provider-home (канон)
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- Rollouts/sessions: `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`
- `auth.json` в provider-home может оставаться linked/copy-migrated из `~/.codex/auth.json`.
- `config.toml` в provider-home является provider-owned materialized file: он строится из `~/.codex/config.toml`, но не должен оставаться symlink-ом на user config.

## Messaging cluster
- `packages/Codex_Module/src/messaging/message-processor.ts` — thin façade: queue, prompt preparation, `runStreamed()` orchestration.
- `packages/Codex_Module/src/messaging/codex-event-stream-consumer.ts` — startup lock, idle-pulse waiting, terminal event cancellation of SDK generators.
- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts` — SDK lifecycle/router layer; `thread.started`, stream-error normalization, and legacy fallback handling, but not the semantic source of truth for Codex assistant phase classification.
- `packages/Codex_Module/src/messaging/codex-message-finish-handler.ts` — user-turn lifecycle signals плюс cleanup structured-output/reasoning state.
- `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts` — Codex-local adapter поверх shared translation facade для reasoning deltas.
- `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts` — focused façade над structured-output prompt/schema preparation и finalize path.
- `packages/Codex_Module/src/messaging/structured-output-parser.ts`, `structured-output-state.ts` — JSON/parsing rules, passthrough delta/output hash, extractor/session state storage.
- `packages/Codex_Module/src/messaging/codex-usage-sync.ts`, `codex-token-usage-sync.ts` — usage-limits/token usage refresh; runtime `token_count` signals мержатся в shared usage-limits stream payload.
- `packages/Codex_Module/src/rollout/codex-rollout-reader.ts`, `codex-rollout-event-parser.ts`, `codex-rollout-dedupe.ts`, `codex-rollout-tail-state.ts`, `codex-rollout-live-sync.ts` — rollout-backed dialog ingestion cluster; live tailing, replay, segment normalization, stable dedupe, and terminal fallback now live here.

## Reasoning translation and thinking display
- `packages/Codex_Module/src/messaging/codex-reasoning-streams.ts` аккумулирует SDK reasoning deltas по `item.id` и остаётся source-of-truth для промежуточного reasoning state.
- `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts` строит provider-neutral request к `@codeai-hub/translation`; target language приходит из Core-threaded `messagesForTheUserLanguage`, translation failure non-blocking и не должен ломать turn.
- Новый user-facing contract для Codex reasoning: `role: "assistant"` + `tag: "thinking"`. Это повторно использует стандартную assistant bubble path и выравнивает UX Codex с Gemini.
- Legacy `role: "thinking"` сохраняется только как compatibility fallback для старых transcript-ов и archived raw history; это больше не основной visible path.
- User-facing Codex settings expose `Reasoning in dialog` as a provider-level toggle backed by `reasoningSummaryEnabled` in `settings.json`.
- Codex reasoning-summary policy must be controlled via `model_reasoning_summary` in `CODEX_HOME/config.toml`. Legacy `default_reasoning_summary` is not a stable config key and may be dropped by upstream Codex config persistence.
- Provider-owned `CODEX_HOME/config.toml` inherits the user Codex config as a base and then applies CodeAI overrides; current override scope is `model_reasoning_summary`.
- `reasoningSummaryEnabled=true` maps to `model_reasoning_summary = "auto"`, while `false` maps to `"none"`.
- When Codex does not send reasoning summaries, CodeAI Hub does not have any reasoning payload to translate or render.
- Установленный Codex provider bundle обязан вендорить `@codeai-hub/translation` в собственный `node_modules/@codeai-hub/translation`; Core startup не должен зависеть от workspace-level `node_modules`.

## Инварианты
- UI история диалога ведётся отдельно (unified-session JSONL по `dialogId`), не смешивать с provider rollouts.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Internal turns не должны эмитить user-facing `assistant` / `stream_event` / lifecycle events; suppression централизован в messaging emitter helper.
- Provider-native raw rollout JSONL в `CODEX_HOME/sessions/**/rollout-*.jsonl` является единственным semantic source of truth для Codex user-visible output: `agent_reasoning` -> `thinking`, `agent_message.phase=commentary` -> assistant progress/commentary, `agent_message.phase=final_answer` -> terminal assistant answer.
- Commentary-phase `agent_message` для structured output остаётся скрытым, чтобы финальный ответ не дублировался в UI.
- Structured-output passthrough (`hybrid` / `debug_raw`) обязан переживать `sessionId` promotion без потери accumulated state.
- User-facing Codex settings в baseline line экспонируют три модели: `gpt-5.3-codex`, `gpt-5.4`, `gpt-5.4-mini`.
- Persisted `settings.json` для Codex не должен разрастаться устаревшими model ids; `reasoningByModel` хранит только active user-facing keys этой линии.
- Для Codex `modelId` в Core/bridge/UI contract означает полную effective model identity; `gpt-5.3-codex reasoning:xhigh` и `gpt-5.3-codex reasoning:high` считаются разными runtime identities.
- `reasoning` не является вторичным локальным decoration-полем внутри Codex runtime: следующий turn обязан получать effective identity из Core-applied turn config, выведенного из `~/.codeai-hub/settings/settings.json`.
- Codex provider path не имеет права держать второй независимый source of truth для next-turn identity поверх shared settings snapshot и Core resolver.
- Codex reasoning translation now flows through the shared runtime translation module and is emitted as visible assistant content with `tag: "thinking"`; the old collapsible thinking bootstrap remains only as legacy compatibility for archived raw history.
- Видимый Codex reasoning обязан следовать языку `Messages for the User`, который Core каждый turn протягивает через applied turn config; если выбран `en`, provider text остаётся без translation hop.
- Codex no longer keeps a second display-only gate for reasoning bubbles; upstream `model_reasoning_summary` is the only truth for whether reasoning can reach the client.
- Settings UI must sync the provider-owned `config.toml` immediately on toggle change and again on save/reset so provider-home stays consistent with persisted settings.
- `models_cache.json` is an upstream remote-model catalog cache, not the stable source of truth for reasoning summaries; it may be refreshed independently of CodeAI Hub releases.
- Released Codex runtimes must stay self-contained: if `@codeai-hub/translation` is absent from the installed provider bundle, Core health is considered broken.
- `Settings -> General -> Response Mode` управляет turn shaping policy:
  - `hybrid` — baseline default для workflow;
  - `strict` — включает editable schema/instruction contract;
  - `debug_raw` — убирает baseline default schema pressure с обычных turn-ов ради диагностики новых моделей.
- Rollout live sync обязан обслуживать и live-turn ingestion, и replay/cold-start reconstruction; повторные reread одного и того же rollout файла в активной сессии не должны дублировать уже показанные сегменты.
- SDK diagnostics пишутся в `~/.codeai-hub/logs/codex/sdk-codex-*.jsonl` и больше не должны затираться при `resume` на том же `thread_id`.
- `sdk-codex-*.jsonl` остаётся только диагностическим SDK логом; semantic dialog routing, replay и точные provider phases подтверждаются по raw provider rollout JSONL (`event_msg`, `task_complete`, `turn_context`) в `CODEX_HOME`, а не по отдельным normalized `provider_feedback` записям.

## Связанные контракты
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Response modes + diagnostics: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
