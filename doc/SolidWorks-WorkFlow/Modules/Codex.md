# Codex Provider Module — Module (SSOT)

## Назначение
Codex provider module для Core: long-lived app-server transport, threaded conversations (`threadId`), one-shot turns, reasoning summaries, token usage и usage limits при сохранении внешнего provider contract `codexCli`.

## Где живёт код
- Primary runtime package: `packages/Codex_AppServer_Module/`
- Public adapter surface for Core: `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`
- Internal transport façade: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`
- Internal notification normalization: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`
- Long-lived process bridge: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`
- Runtime model capability registry: `packages/Codex_AppServer_Module/src/types/codex-model-capabilities.ts`
- Provider-owned GPT translation path: `packages/Codex_AppServer_Module/src/translation/codex-app-server-translation-service.ts`
- Translation native-capture profile: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts`
- Current App Server startup/thread/turn invocation flags are canonical in `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`.
- Shared usage-limits façade for Codex lives in Core: `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-facade.ts`
- `packages/Codex_AppServer_Module/` — единственная активная реализация Codex provider line. Legacy SDK-based пакет `packages/Codex_Module/` удалён в релизе `1.2.38`; исторический контекст живёт только в `doc/TODO/Archive/` и `doc/SolidWorks-WorkFlow/Plans/Archive/`.

## Внешний контракт
- Provider id — `codexCli`.
- Provider slot — `~/.codeai-hub/providers/codex`; release artifact name — `codex-module-<version>.tar.bz2` (производится `packages/Codex_AppServer_Module/`, имя сохранено как стабильный installer contract).
- Core работает через `ProviderAdapter` / `CodexModuleOptions` seam и provider-loader path (`CODEX_MODULE_PATH`, bundled provider slot `providers/codex/latest`).
- `modelId` в Core/UI contract — полная effective model identity; applied turn config приходит из shared settings/Core resolver, а не из локального source-of-truth внутри провайдера.
- User-facing Codex model order in Settings is numeric/provider-family ascending: `gpt-5.2`, `gpt-5.3-codex-spark`, `gpt-5.4-mini`, `gpt-5.4`, `gpt-5.5`. The default is `gpt-5.4-mini`; unsupported persisted `gpt-5.3-codex` values are migrated to the supported default.
- Codex in-session switch is split into two independent transport commands as of release `1.2.120`: `session:codex:model-switch` carries only `{ sessionId, targetModelId }` and mutates `baseModelId` while preserving the previous `reasoningEffort`; `session:codex:reasoning-switch` carries only `{ sessionId, targetReasoningEffort }` and mutates `reasoningEffort` while preserving `baseModelId`. Both are config-only, both flip `pendingModelSwitchInjection = true` so the next outbound turn carries the new effective identity, neither resends the last user message, and neither lets the model and reasoning rebind each other by side-effect.
- The legacy `dialog:switch:*` / `handleSwitchRequest` path remains the manual retry/switch flow that can resend content. It is not the Status Panel chip path.

## In-session model switch

- Status Panel chips drive both Claude and Codex switches (Gemini chips remain visually present but their selection callbacks no-op until a provider-native strategy is verified). Each provider exposes two independent transport commands; see release `1.2.120` decoupling notes above and the Claude module SSOT for symmetry.
- Switch target validation is capability-driven through `findCodexModelCapabilities(modelId)`: target model on `session:codex:model-switch` must be a known model id; target effort on `session:codex:reasoning-switch` must be in the bound model's `reasoningEffortOptions`. Reasoning-switch never accepts a model id, model-switch never accepts an effort.
- Core mutates the live `Session.modelBinding` atomically. The model-switch handler swaps `baseModelId` and recomputes `effective modelId`, preserving the previous `reasoningEffort` whenever the new model still supports it (otherwise it falls back to the new model's first allowed effort). The reasoning-switch handler swaps `reasoningEffort` and recomputes `effective modelId`, preserving the previous `baseModelId` unconditionally. Both write `source="switch_request"`, set `pendingModelSwitchInjection = true`, and broadcast `session:model:update` immediately.
- Next outbound `session:message` or `dialog:send` attaches applied turn config from live session binding with `source="session_binding"`. Settings defaults are not consulted while the binding belongs to the session/provider.
- On the first successful turn after switch, Core passes `CODEX_MODEL_SWITCH_INJECTION_KEY` through `turnOptions`; the Codex facade prepends a `<model_switch>` text item to `turn/start.input` and Core clears the pending flag only after provider send resolves.
- If provider send fails, the pending injection flag is retained for retry.
- Dialog resume must not overwrite a newer live switch with an older continuity `modelBinding`; continuity hydration is applied to an existing runtime session only when the continuity binding timestamp is newer than the live binding.
- Persistence boundary: a switch made before the next outbound turn is in-memory only. PM/webview reload while Core is alive preserves it; a Core restart before the next user turn loses the unpersisted switch and the restored session falls back to the last continuity segment.

## Provider-home (канон)
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- Provider-owned `auth.json` и `config.toml` materialize-ятся в provider-home; при bootstrap разрешено copy-migrate отсутствующие файлы из legacy `~/.codex/`.
- `config.toml` в provider-home не должен оставаться symlink-ом на user config.
- Provider-home `config.toml` всегда держит нейтральный `model_reasoning_summary = "none"`. Extension-side settings save sync и runtime process layer оба переписывают эту строку в `none`, чтобы process-global fallback не мог подмешать native `reasoning.summary` при per-turn switch на модель, которая этот флаг не поддерживает.
- Для non-Spark моделей live app-server send-path резолвит turn-level summary policy из shared settings snapshot в `summary = "detailed" | "none"`; это единственный CodeAI Hub-owned live control для видимого Codex reasoning. Для `gpt-5.3-codex-spark` CodeAI Hub всегда отправляет explicit `turn/start.summary = "none"`: Spark не поддерживает видимый `reasoning.summary`, а omission небезопасен, потому что Codex app-server default может стать `detailed`.

## Transport cluster
- Workflow-agent runtime transport — это long-lived `codex app-server`, поднятый через `child_process.spawn(...)` с CodeAI Hub-owned documentation workflow startup profile.
- Provider-owned Codex GPT translation engines also use `codex app-server`, but through the separate translation process/thread/turn profile: isolated temporary workspace, `approvalPolicy=never`, `sandbox=read-only`, `persistExtendedHistory=false`, `effort=low`, translation-only base instructions, and no workflow step prompt. Core keeps the shared `codex exec` translation engine only as an internal fallback for the same public engine ids during migration.
- Exact process args, JSON-RPC `initialize`, `thread/start`, `thread/resume`, `turn/start`, model/reasoning resolution, provider-home env, and native-capture parity live in `Modules/Codex_ProviderInvocationFlags.md`. `Codex.md` keeps the architectural summary; the flags document is the update target when invocation parameters change.
- CodeAI Hub applies the documentation workflow startup profile to normal workflow runtime and workflow-agent diagnostic capture. Translation runtime and the `Translation` diagnostic capture scenario use the translation profile instead. Current workflow profile:
  - disables feature flags `multi_agent`, `browser_use`, `in_app_browser`, `computer_use`, `image_generation`, `plugins`, `apps`, and `tool_search`;
  - does not pass legacy `-c mcp_servers.<name>.enabled=false` overrides. With `codex-cli 0.128.0`, setting only `enabled=false` creates an invalid partial MCP server config (`invalid transport in mcp_servers.codex`) and prevents app-server startup. Future MCP-server suppression needs a fresh evidence-gated Codex CLI contract instead of reintroducing partial `mcp_servers.*` overrides.
- The `multi_agent` part is already confirmed by retest: `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, and `close_agent` disappeared from provider-native `body.tools` in release `1.2.81`.
- The wider documentation tool profile was validated in release `1.2.82`: provider-native `body.tools` dropped to `exec_command`, `write_stdin`, `update_plan`, `request_user_input`, `apply_patch`, `web_search`, and `view_image`. Removed surfaces include `mcp__playwright__`, `mcp__codex__`, MCP resource tools, `image_generation`, and plugin/app surfaces. `request_user_input` remains present and has no confirmed removal knob yet; any future removal must be evidence-gated by fresh provider-native JSONL.
- Handshake обязан идти через `initialize` с `capabilities.experimentalApi = true`; без этого нельзя использовать `persistExtendedHistory`.
- Session creation/resume идут через `thread/start` и `thread/resume`; app-server сразу возвращает реальный `threadId`, поэтому Codex теперь поддерживает immediate binding и не требует legacy temp-session flow.
- Normal `thread/start` теперь является CodeAI Hub-owned instruction profile boundary: запрос получает `baseInstructions = CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT` и `config.project_doc_max_bytes = 0` из `src/app-server/codex-workflow-instruction-profile.ts`. Это заменяет provider/model default base prompt узким early-architecture profile и отключает project `AGENTS.md` discovery для новых runtime threads; workflow step template по-прежнему остается в `turn/start.input[0].text`.
- Translation `thread/start` является отдельной profile boundary: запрос получает translation-only `baseInstructions`, не получает workflow step/user project instructions, не включает project-doc discovery, and sends only the strict translation prompt assembled by `codex-translation-prompt-profile`.
- Progress-update wording in this instruction profile must ask Codex for ordinary user-visible assistant chat messages, not hidden commentary/reasoning/tool-adjacent notes. The `1.2.85` prompt tuning fixed the visibility class; the `1.2.86` cadence tuning additionally requires a visible update about every 30 seconds or, when elapsed time is hard to estimate, after 3-5 substantial tool/file-reading/internal-analysis cycles without a visible update. The `1.2.95` guard makes those progress updates explicitly non-terminal: after one is sent, Codex must continue the same turn until the promised work or requested artifact is complete instead of treating the update as the final answer.
- Turn execution идёт через `turn/start` с `input`, `model`, `effort`, optional `outputSchema` и capability-gated turn-level `summary = "detailed" | "none"`. Normal user turns have one text input; the first turn after Status Panel switch has an additional first text item containing `<model_switch>` and the new model instruction profile, followed by the actual user prompt. `summary` читается из shared settings snapshot через provider-local path-scoped TTL cache (`500ms`, keyed by resolved settings path; not a second long-lived settings owner); `detailed` является live-capable baseline для reasoning stream, а `none` сохраняет user toggle `Reasoning in dialog`. For `gpt-5.3-codex-spark`, the capability registry marks `supportsReasoningSummary=false`, so the payload builder forces `summary = "none"` and never sends `detailed`; provider-home is also forced to `model_reasoning_summary = "none"` so no global fallback can reintroduce readable native `reasoning.summary`.
- Stop/cancel path идёт через `turn/interrupt(threadId, turnId)`; если последняя logical session закрыта, CodeAI Hub останавливает сам `codex app-server` process.
- Process layer no longer has a Codex SDK transport logger. Starting with release `1.2.94`, the app-server hot path has no `codex-app-server-session-logger.ts` shim, creates no `~/.codeai-hub/logs/codex/*` files, and performs no SDK-log serialization before `child.stdin.write(...)` or notification fan-out. Runtime behavior must come from the live app-server JSON-RPC stream, not from SDK transport logs.
- Usage limits читаются через `account/rateLimits/read` и live notifications `account/rateLimits/updated`; token usage приходит через `thread/tokenUsage/updated`.

## Event normalization
- `turn/started` → `turn_started`
- `turn/completed` → `turn_completed | turn_failed`
- `error` → `stream_error`
- `item/agentMessage/delta` + `item/completed` materialize-ят user-facing `dialog_message`; `phase: "commentary"` обязан сохраняться как non-terminal assistant progress message с `tag: "commentary"`, а `phase: "final_answer"` остаётся terminal assistant answer
- `item/reasoning/summaryPartAdded` / `item/reasoning/summaryTextDelta` feed `CodexReasoningSummaryStreamBuffer`, which emits a completed previous summary block when the next summary part starts; this is paragraph/block-level streaming, not token-level reasoning streaming
- `item/completed` for reasoning remains the cleanup/finalization point: provider emits only remaining, not-yet-emitted `thinking` blocks, prioritizing `item.summary[]`, then accumulated summary parts, then `item.content[]`, then accumulated raw `textDelta`
- `thread/tokenUsage/updated` и usage-limits snapshots materialize-ятся как `stream_event`
- Runtime model updates materialize-ятся как `system` event с фактическим model id

## Response mode / structured output
- `Settings -> General -> Response Mode` остаётся тем же внешним контрактом (`hybrid`, `strict`, `debug_raw`).
- Response-mode ownership остаётся split между settings/Core outbound applied-turn-config contract и Codex adapter send path.
- Если turn идёт под `outputSchema`, schema пробрасывается в `turn/start`; transport не имеет права терять structured-output passthrough только потому, что Codex transport сменился с rollout-tail на app-server.

## Reasoning, visibility и translation
- App-server line обязана сохранять commentary отдельно от reasoning/final answer: даже когда `Reasoning in dialog` отключён, пользователь всё равно должен видеть Codex progress commentary, если upstream реально прислал `phase: "commentary"`.
- Upstream truth для видимого Codex reasoning теперь — reasoning summary notifications app-server-а, а не legacy rollout tail и не SDK-local display gate.
- Видимый reasoning остаётся source-first: сначала persist/broadcast native text, затем Core-owned translation overlay может прислать `localizedContent`. С `1.2.87` Codex emits reasoning summary blocks sequentially as append-only `assistant` messages tagged `thinking`, each with stable id `<itemId>::summary-block::<index>`, so translation overlays process one visible paragraph/block at a time.
- User-facing toggle `Reasoning in dialog` управляет non-Spark turn-level `summary` (`detailed` или `none`) из shared settings snapshot. Provider-home `model_reasoning_summary` остается принудительно `none` для всех моделей; для Spark explicit turn-level `summary` всегда `none`, поэтому toggle не может включить readable reasoning summaries без риска native `reasoning.summary` error.
- Provider layer больше не имеет права прокидывать в UI token-level или sentence-level reasoning fragments как отдельные bubbles; user-facing reasoning materialize-ится только из completed paragraph/block-level summary emission, either when the next summary part begins or at final reasoning completion.
- Видимость reasoning по-прежнему решается в момент emission через `visibilityAtEmission`; скрытые reasoning bubbles не должны попадать в translation queue и не должны внезапно проявляться после обратного включения toggle.
- Codex GPT translation engine ids (`codex-gpt-5.4-mini`, `codex-gpt-5.3-codex-spark`) are Core-registered provider-owned wrappers over `CodexAppServerTranslationService`; the legacy shared `CodexCliTranslationEngine` remains a fallback inside the wrapper, not the primary Codex translation path.

## Diagnostics artifacts
- Codex SDK transport logs under `~/.codeai-hub/logs/codex/` are removed from the runtime path; no process-wide or per-thread app-server transport JSONL is expected.
- Session-local normalized transcript artifact по-прежнему живёт в `~/.codeai-hub/sessions/.../codexCli/*-description.jsonl`
- Provider-native artifacts (`CODEX_HOME` history / rollout JSONL и прочие provider-home traces) остаются отдельным диагностическим слоем и не заменяются transport log-ом
- Settings → General → `Capture Codex Native Request` calls `CodexProviderAdapter.captureNativeRequest(...)`, implemented by `src/diagnostics/codex-native-request-capture-service.ts`. The Settings card supplies the selected diagnostic model plus scenario. Workflow scenarios (`Description`, `Virtual Simulation`, `Diagram Modules`) get a Project Manager first-turn prompt built through the same `buildWorkflowPromptPack(...)` path used by normal workflow sends. `Translation` sends no workflow prompt: Core marks the capture as `invocationPurpose="translation"`, and Codex uses the translation profile with a fixed small translation sample. Capture never mutates the long-lived normal app-server child; instead it starts an isolated temporary `CodexAppServerProcess` with `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` and certificate env injected for the diagnostic run only.
- The temporary diagnostic process performs the normal app-server `initialize` handshake, sends `thread/start` with `persistExtendedHistory: false`, `baseInstructions = CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`, and `config.project_doc_max_bytes = 0`, then sends one `turn/start` with `input[0].text = workflowPrompt ?? probePrompt`. `thread/start.model` and `turn/start.model` use the selected capture model / Core-applied model, `turn/start.effort` uses the Core-applied reasoning effort, and `turn/start.summary` mirrors the shared settings policy (`detailed` when `Reasoning in dialog` is enabled, `none` when disabled) except `gpt-5.3-codex-spark`, where the field is explicit `none` and provider-home remains `model_reasoning_summary = "none"`. It records the exact `thread/start` request/response and `turn/start` request/response into the native capture artifact as `provider_diagnostic_context` records, then copies the provider-home rollout JSONL referenced by `thread.path` into `codex_provider_home_rollout_context`. The Markdown `Provider Diagnostic Context` section therefore shows the CodeAI Hub-owned base instructions, the full workflow first user prompt, and an empty/no-project Codex `turn_context.user_instructions` layer when the X8 project-doc flag is effective. It waits for `turn/completed` / `error` or its own timeout, then always stops the temporary process.
- Successful capture means the Core proxy saw `chatgpt.com` `/backend-api/codex/responses`, completed the WebSocket upgrade locally when needed, captured Codex client WebSocket frames until a useful full-turn payload appears, and then aborted locally. The writer prefers a frame with non-empty `input` / non-`generate:false` as Markdown primary request instead of the early empty service frame. If the no-upstream capture cannot reach such a frame, the native WebSocket body still shows the actual provider-network instructions/tools frame, while `Provider Diagnostic Context` shows the real app-server turn payload that CodeAI Hub sent into the Codex runtime. Artifacts are Core-owned under `~/.codeai-hub/logs/native-request-capture/` and complement provider-home Codex artifacts and session-local normalized history.

## Инварианты
- Lifecycle обязателен: `turn_started` → `turn_completed | turn_failed`.
- Internal transport notifications не должны напрямую протекать в UI; только нормализованный provider event surface является user-facing contract.
- Codex больше не имеет права держать второй локальный source-of-truth для next-turn model/reasoning identity поверх Core-applied config.
- Codex request payload shaping is capability-gated per model, not slug-branch-gated at call sites. Spark must never receive `summary = "detailed"` and must receive explicit `summary = "none"`; omitting the field lets Codex app-server fall back to its own default.
- In-session switch is same-thread/same-provider-session. It changes live binding and next-turn payload; it does not create a new provider thread and does not replay the previous user message.
- `turn/interrupt` — единственный корректный Stop path для active turn; legacy kill-path через `codex exec` subprocess больше не является каноническим runtime contract.
- Released Codex runtime обязан оставаться self-contained: installed provider bundle должен содержать всё, что нужно Core, включая `@codeai-hub/translation` и app-server module payload.
- Release packaging собирает `packages/Codex_AppServer_Module` в artifact `codex-module-<version>.tar.bz2`; artifact name — стабильный installer contract и не меняется.

## Связанные контракты
- Current invocation flags: `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Response modes + diagnostics: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
