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
- `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts` — focused façade над structured-output prompt/schema preparation и finalize path.
- `packages/Codex_Module/src/messaging/structured-output-parser.ts`, `structured-output-state.ts` — JSON/parsing rules, passthrough delta/output hash, extractor/session state storage.
- `packages/Codex_Module/src/messaging/codex-usage-sync.ts`, `codex-token-usage-sync.ts` — usage-limits/token usage refresh; runtime `token_count` signals мержатся в shared usage-limits stream payload.
- `packages/Codex_Module/src/rollout/codex-rollout-reader.ts`, `codex-rollout-event-parser.ts`, `codex-rollout-dedupe.ts`, `codex-rollout-tail-state.ts`, `codex-rollout-live-sync.ts` — rollout-backed dialog ingestion cluster; live tailing, replay, segment normalization, stable dedupe, and terminal fallback now live here. Terminal assistant dedupe between `agent_message.phase=final_answer` and `task_complete` is owned by `codex-rollout-live-sync.ts`, while `codex-rollout-event-parser.ts` exposes payload-stable terminal ids so matching terminal payloads can still be suppressed when one side is missing `turn_id`.

## Reasoning translation and thinking display
- `packages/Codex_Module/src/messaging/codex-reasoning-streams.ts` аккумулирует SDK reasoning deltas по `item.id` и остаётся source-of-truth для промежуточного reasoning state.
- Visible Codex reasoning теперь emit-ится source-first из provider pipeline, а translation выполняется Core-owned overlay path-ом после persist/broadcast исходного сообщения.
- `codex-rollout-live-sync.ts` больше не выполняет provider-local translation для rollout reasoning; rollout replay/live sync обязаны emit-ить source text only, чтобы не запускать nested Codex translation calls внутри активного Codex turn-а.
- Новый user-facing contract для Codex reasoning остаётся `role: "assistant"` + `tag: "thinking"`. Это повторно использует стандартную assistant bubble path и выравнивает UX Codex с Gemini.
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
- Codex rollout terminal emission must be single-owner: if the same final assistant payload is observed first as `agent_message.phase=final_answer` and then repeated by `task_complete`, the UI emits exactly one terminal assistant bubble. `task_complete` remains only a fallback path for turns where a matching `final_answer` was not already emitted or cannot be matched by payload hash / timestamp window / `turn_id`.
- Если rollout `final_answer` приходит plain text under `outputSchema`, `codex-rollout-live-sync.ts` обязан emit-ить safe raw-text assistant fallback, когда structured parser не смог извлечь `assistantText`; otherwise valid provider final answers silently disappear from UI.
- Commentary-phase `agent_message` для structured output остаётся скрытым, чтобы финальный ответ не дублировался в UI.
- Structured-output passthrough (`hybrid` / `debug_raw`) обязан переживать `sessionId` promotion без потери accumulated state.
- User-facing Codex settings в baseline line экспонируют три модели: `gpt-5.3-codex`, `gpt-5.4`, `gpt-5.4-mini`.
- Persisted `settings.json` для Codex не должен разрастаться устаревшими model ids; `reasoningByModel` хранит только active user-facing keys этой линии.
- Для Codex `modelId` в Core/bridge/UI contract означает полную effective model identity; `gpt-5.3-codex reasoning:xhigh` и `gpt-5.3-codex reasoning:high` считаются разными runtime identities.
- `reasoning` не является вторичным локальным decoration-полем внутри Codex runtime: следующий turn обязан получать effective identity из Core-applied turn config, выведенного из `~/.codeai-hub/settings/settings.json`.
- Codex provider path не имеет права держать второй независимый source of truth для next-turn identity поверх shared settings snapshot и Core resolver.
- Codex reasoning translation now flows through the shared runtime translation module as an async overlay over already-persisted native reasoning text; the old collapsible thinking bootstrap remains only as legacy compatibility for archived raw history.
- Видимый Codex reasoning обязан следовать языку `Messages for the User`, который Core каждый turn протягивает через applied turn config; если выбран `en`, source provider text остаётся без translation hop.
- Codex no longer keeps a second display-only gate for reasoning bubbles; upstream `model_reasoning_summary` is the only truth for whether reasoning can reach the client.
- Codex visibility is decided at emission time together with Claude/Gemini: Core stamps `visibilityAtEmission` on persisted `SessionMessage` records by reading `reasoningSummaryEnabled`, so toggling `Reasoning in dialog` off never leaves hidden reasoning bubbles translatable, and toggling it back on inside a long-running session only exposes newly emitted reasoning — previously hidden bubbles stay hidden.
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
- **Stop aborts the underlying `codex exec` subprocess (see SystemArchitecture Invariant 24).** The SDK-patched `streamCodexExec` in `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` spawns `codex exec` via `child_process.spawn` and blocks inside `for await (const line of rl)` on that child's stdout. The patch registers the spawned `ChildProcess` in a module-scoped Map keyed by `threadId` and exposes `killActiveCodexProcess(threadId)`. `CodexSessionManager.closeSession` MUST call that hook BEFORE awaiting `lifecycle.closeSession` and the `processingLoop` — otherwise Stop is a no-op until Codex naturally emits `turn_completed` (regression seen for 2+ minutes in 1.2.3 diagnostic trace, fixed in 1.2.6). The readline `for await` unblocks as soon as the child's stdout closes after `SIGTERM`, the existing `finally` in `streamCodexExec` cleans up, and `processingLoop` resolves. Exit code `null` (SIGTERM-driven shutdown) is accepted as a clean exit alongside code `0`.
- **Reasoning-effort whitelist parity (see SystemArchitecture Invariant 27).** `settings.json` is re-normalized by two independent layers: the extension-side `parseSettingsSnapshot` on save, and the Core-side `SettingsRequestHandler.handleLoad` on PM / websocket load. Today Core's `handleLoad` spreads Codex `reasoningByModel` unfiltered (no per-level whitelist), but the Claude branch next to it DOES carry a hardcoded whitelist + legacy anchor table in `packages/core/src/remote-bridge/handlers/settings-request-handler-claude-thinking.ts` — and that duplicate was the exact cause of the 1.1.998 `xhigh` regression (Core silently rewrote `xhigh` back to `medium` on PM boot). If we ever add a Codex-side `settings-request-handler-codex-reasoning.ts` sibling with its own hardcoded `CODEX_REASONING_EFFORTS`, it MUST be kept in lockstep with: `src/types/claude-model-registry.ts` + `packages/core/src/config/provider-defaults-resolver.ts` (`CODEX_REASONING_EFFORTS`) + `src/extension-module/settings/codex-settings.ts`. Otherwise a new reasoning level accepted by the Settings UI will be silently reverted to the Core default on the next PM boot.

## Связанные контракты
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Response modes + diagnostics: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
