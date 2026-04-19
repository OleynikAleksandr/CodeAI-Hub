# Codex Provider Module — Module (SSOT)

## Назначение
Codex provider module для Core: long-lived app-server transport, threaded conversations (`threadId`), one-shot turns, reasoning summaries, token usage и usage limits при сохранении внешнего provider contract `codexCli`.

## Где живёт код
- Primary runtime package: `packages/Codex_AppServer_Module/`
- Public adapter surface for Core: `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`
- Internal transport façade: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`
- Internal notification normalization: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`
- Long-lived process bridge: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`
- Shared usage-limits façade for Codex lives in Core: `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-facade.ts`
- Legacy package `packages/Codex_Module/` больше не является active bundled/runtime path для Core и release packaging; он допустим только как временный fallback/override path до полного closeout legacy линии.

## Внешний контракт, который НЕ меняется
- Provider id остаётся `codexCli`.
- Provider slot и release artifact contract остаются прежними: `~/.codeai-hub/providers/codex` и `codex-module-<version>.tar.bz2`.
- Core по-прежнему работает через `ProviderAdapter` / `CodexModuleOptions` seam и existing provider-loader path (`CODEX_MODULE_PATH`, bundled provider slot `providers/codex/latest`).
- `modelId` в Core/UI contract остаётся полной effective model identity; applied turn config по-прежнему приходит из shared settings/Core resolver, а не из локального source-of-truth внутри провайдера.

## Provider-home (канон)
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- Provider-owned `auth.json` и `config.toml` materialize-ятся в provider-home; при bootstrap разрешено copy-migrate отсутствующие файлы из legacy `~/.codex/`.
- `config.toml` в provider-home не должен оставаться symlink-ом на user config.
- `reasoningSummaryEnabled` из `settings.json` синхронизируется в provider-home как persisted compatibility state `model_reasoning_summary = "auto" | "none"`, но live app-server send-path дополнительно резолвит turn-level summary policy из того же shared settings snapshot в `summary = "detailed" | "none"`; это нужно потому, что `turn/start.summary = "detailed"` может переехать поверх provider-home `model_reasoning_summary = "none"`.

## Transport cluster
- Runtime transport — это long-lived `codex app-server`, поднятый через `child_process.spawn(..., ["app-server"])`.
- Handshake обязан идти через `initialize` с `capabilities.experimentalApi = true`; без этого нельзя использовать `persistExtendedHistory`.
- Session creation/resume идут через `thread/start` и `thread/resume`; app-server сразу возвращает реальный `threadId`, поэтому Codex теперь поддерживает immediate binding и не требует legacy temp-session flow.
- Turn execution идёт через `turn/start` с `input[{ type: "text", text, text_elements: [] }]`, `model`, `effort`, optional `outputSchema` и turn-level `summary = "detailed" | "none"`, который читается из shared settings snapshot; `detailed` является live-capable baseline для reasoning stream, а `none` сохраняет user toggle `Reasoning in dialog`.
- Stop/cancel path идёт через `turn/interrupt(threadId, turnId)`; если последняя logical session закрыта, CodeAI Hub останавливает сам `codex app-server` process.
- Usage limits читаются через `account/rateLimits/read` и live notifications `account/rateLimits/updated`; token usage приходит через `thread/tokenUsage/updated`.

## Event normalization
- `turn/started` → `turn_started`
- `turn/completed` → `turn_completed | turn_failed`
- `error` → `stream_error`
- `item/agentMessage/delta` + `item/completed` materialize-ят user-facing `dialog_message`
- `item/reasoning/summaryPartAdded` / `item/reasoning/summaryTextDelta` materialize-ят reasoning bubble как `role: "assistant"` + `tag: "thinking"`
- `thread/tokenUsage/updated` и usage-limits snapshots materialize-ятся как `stream_event`
- Runtime model updates materialize-ятся как `system` event с фактическим model id

## Response mode / structured output
- `Settings -> General -> Response Mode` остаётся тем же внешним контрактом (`hybrid`, `strict`, `debug_raw`).
- Response-mode ownership остаётся split между settings/Core outbound applied-turn-config contract и Codex adapter send path.
- Если turn идёт под `outputSchema`, schema пробрасывается в `turn/start`; transport не имеет права терять structured-output passthrough только потому, что Codex transport сменился с rollout-tail на app-server.

## Reasoning, visibility и translation
- Upstream truth для видимого Codex reasoning теперь — reasoning summary notifications app-server-а, а не legacy rollout tail и не SDK-local display gate.
- Видимый reasoning остаётся source-first: сначала persist/broadcast native text, затем Core-owned translation overlay может прислать `localizedContent`.
- User-facing toggle `Reasoning in dialog` управляет тем, уходит ли turn-level `summary` как `detailed` или как `none`; provider-home `model_reasoning_summary` остаётся persisted companion state, но не является единственным runtime source-of-truth для live app-server turns.
- Видимость reasoning по-прежнему решается в момент emission через `visibilityAtEmission`; скрытые reasoning bubbles не должны попадать в translation queue и не должны внезапно проявляться после обратного включения toggle.

## Инварианты
- Lifecycle обязателен: `turn_started` → `turn_completed | turn_failed`.
- Internal transport notifications не должны напрямую протекать в UI; только нормализованный provider event surface является user-facing contract.
- Codex больше не имеет права держать второй локальный source-of-truth для next-turn model/reasoning identity поверх Core-applied config.
- `turn/interrupt` — единственный корректный Stop path для active turn; legacy kill-path через `codex exec` subprocess больше не является каноническим runtime contract.
- Released Codex runtime обязан оставаться self-contained: installed provider bundle должен содержать всё, что нужно Core, включая `@codeai-hub/translation` и app-server module payload.
- Release packaging обязано собирать `packages/Codex_AppServer_Module`, но сохранять внешний artifact name `codex-module-<version>.tar.bz2` ради installer/backward-compatible manifest contract.

## Связанные контракты
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Response modes + diagnostics: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
