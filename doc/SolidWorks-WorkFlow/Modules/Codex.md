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
- `packages/Codex_AppServer_Module/` — единственная активная реализация Codex provider line. Legacy SDK-based пакет `packages/Codex_Module/` удалён в релизе `1.2.38`; исторический контекст живёт только в `doc/TODO/Archive/` и `doc/SolidWorks-WorkFlow/Plans/Archive/`.

## Внешний контракт
- Provider id — `codexCli`.
- Provider slot — `~/.codeai-hub/providers/codex`; release artifact name — `codex-module-<version>.tar.bz2` (производится `packages/Codex_AppServer_Module/`, имя сохранено как стабильный installer contract).
- Core работает через `ProviderAdapter` / `CodexModuleOptions` seam и provider-loader path (`CODEX_MODULE_PATH`, bundled provider slot `providers/codex/latest`).
- `modelId` в Core/UI contract — полная effective model identity; applied turn config приходит из shared settings/Core resolver, а не из локального source-of-truth внутри провайдера.
- User-facing Codex model order in Settings is numeric/provider-family ascending: `gpt-5.2`, `gpt-5.3-codex-spark`, `gpt-5.3-codex`, `gpt-5.4-mini`, `gpt-5.4`, `gpt-5.5`. The default remains `gpt-5.3-codex`.

## Provider-home (канон)
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- Provider-owned `auth.json` и `config.toml` materialize-ятся в provider-home; при bootstrap разрешено copy-migrate отсутствующие файлы из legacy `~/.codex/`.
- `config.toml` в provider-home не должен оставаться symlink-ом на user config.
- `reasoningSummaryEnabled` из `settings.json` синхронизируется в provider-home как persisted compatibility state `model_reasoning_summary = "auto" | "none"`, но live app-server send-path дополнительно резолвит turn-level summary policy из того же shared settings snapshot в `summary = "detailed" | "none"`; это нужно потому, что `turn/start.summary = "detailed"` может переехать поверх provider-home `model_reasoning_summary = "none"`.

## Transport cluster
- Runtime transport — это long-lived `codex app-server`, поднятый через `child_process.spawn(...)` с CodeAI Hub-owned documentation workflow startup profile.
- CodeAI Hub applies the same Codex startup profile to normal runtime and diagnostic capture. Current profile:
  - disables feature flags `multi_agent`, `browser_use`, `in_app_browser`, `computer_use`, `image_generation`, `plugins`, `apps`, and `tool_search`;
  - disables configured provider-home MCP servers with `-c mcp_servers.codex.enabled=false` and `-c mcp_servers.playwright.enabled=false`.
- The `multi_agent` part is already confirmed by retest: `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, and `close_agent` disappeared from provider-native `body.tools` in release `1.2.81`.
- The wider documentation tool profile is under release `1.2.82` retest. Target keep-list is `exec_command`, `write_stdin`, `apply_patch`, `update_plan`, `web_search`, and `view_image`. Target removal is `mcp__playwright__`, `mcp__codex__`, MCP resource tools, `image_generation`, and plugin/app surfaces. `request_user_input` has no confirmed removal knob yet and must be judged by provider-native JSONL retest evidence.
- Handshake обязан идти через `initialize` с `capabilities.experimentalApi = true`; без этого нельзя использовать `persistExtendedHistory`.
- Session creation/resume идут через `thread/start` и `thread/resume`; app-server сразу возвращает реальный `threadId`, поэтому Codex теперь поддерживает immediate binding и не требует legacy temp-session flow.
- Normal `thread/start` теперь является CodeAI Hub-owned instruction profile boundary: запрос получает `baseInstructions = CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT` и `config.project_doc_max_bytes = 0` из `src/app-server/codex-workflow-instruction-profile.ts`. Это заменяет provider/model default base prompt узким early-architecture profile и отключает project `AGENTS.md` discovery для новых runtime threads; workflow step template по-прежнему остается в `turn/start.input[0].text`.
- Progress-update wording in this instruction profile must ask Codex for ordinary user-visible assistant chat messages, not hidden commentary/reasoning/tool-adjacent notes. The `1.2.85` prompt tuning fixed the visibility class; the `1.2.86` cadence tuning additionally requires a visible update about every 30 seconds or, when elapsed time is hard to estimate, after 3-5 substantial tool/file-reading/internal-analysis cycles without a visible update.
- Turn execution идёт через `turn/start` с `input[{ type: "text", text, text_elements: [] }]`, `model`, `effort`, optional `outputSchema` и turn-level `summary = "detailed" | "none"`, который читается из shared settings snapshot; `detailed` является live-capable baseline для reasoning stream, а `none` сохраняет user toggle `Reasoning in dialog`.
- Stop/cancel path идёт через `turn/interrupt(threadId, turnId)`; если последняя logical session закрыта, CodeAI Hub останавливает сам `codex app-server` process.
- Process layer no longer has a Codex SDK transport logger. Starting with release `1.2.94`, the app-server hot path has no `codex-app-server-session-logger.ts` shim, creates no `~/.codeai-hub/logs/codex/*` files, and performs no SDK-log serialization before `child.stdin.write(...)` or notification fan-out. Runtime behavior must come from the live app-server JSON-RPC stream, not from SDK transport logs.
- Usage limits читаются через `account/rateLimits/read` и live notifications `account/rateLimits/updated`; token usage приходит через `thread/tokenUsage/updated`.

## Event normalization
- `turn/started` → `turn_started`
- `turn/completed` → `turn_completed | turn_failed`
- `error` → `stream_error`
- `item/agentMessage/delta` + `item/completed` materialize-ят user-facing `dialog_message`; `phase: "commentary"` обязан сохраняться как non-terminal assistant progress message с `tag: "commentary"`, а `phase: "final_answer"` остаётся terminal assistant answer
- `item/reasoning/summaryPartAdded` / `item/reasoning/summaryTextDelta` / optional `item/reasoning/textDelta` feed provider-local accumulation only; these notifications are no longer materialized directly as user-facing live `thinking` bubbles
- `item/completed` for reasoning is the canonical user-facing emission point: provider emits one `thinking` message per completed reasoning block, prioritizing `item.summary[]`, then accumulated summary parts, then `item.content[]`, then accumulated raw `textDelta`
- `thread/tokenUsage/updated` и usage-limits snapshots materialize-ятся как `stream_event`
- Runtime model updates materialize-ятся как `system` event с фактическим model id

## Response mode / structured output
- `Settings -> General -> Response Mode` остаётся тем же внешним контрактом (`hybrid`, `strict`, `debug_raw`).
- Response-mode ownership остаётся split между settings/Core outbound applied-turn-config contract и Codex adapter send path.
- Если turn идёт под `outputSchema`, schema пробрасывается в `turn/start`; transport не имеет права терять structured-output passthrough только потому, что Codex transport сменился с rollout-tail на app-server.

## Reasoning, visibility и translation
- App-server line обязана сохранять commentary отдельно от reasoning/final answer: даже когда `Reasoning in dialog` отключён, пользователь всё равно должен видеть Codex progress commentary, если upstream реально прислал `phase: "commentary"`.
- Upstream truth для видимого Codex reasoning теперь — reasoning summary notifications app-server-а, а не legacy rollout tail и не SDK-local display gate.
- Видимый reasoning остаётся source-first: сначала persist/broadcast native text, затем Core-owned translation overlay может прислать `localizedContent`.
- User-facing toggle `Reasoning in dialog` управляет тем, уходит ли turn-level `summary` как `detailed` или как `none`; provider-home `model_reasoning_summary` остаётся persisted companion state, но не является единственным runtime source-of-truth для live app-server turns.
- Provider layer больше не имеет права прокидывать в UI token-level или sentence-level reasoning fragments как отдельные bubbles; user-facing reasoning materialize-ится только из completed block-level summary emission.
- Видимость reasoning по-прежнему решается в момент emission через `visibilityAtEmission`; скрытые reasoning bubbles не должны попадать в translation queue и не должны внезапно проявляться после обратного включения toggle.

## Diagnostics artifacts
- Codex SDK transport logs under `~/.codeai-hub/logs/codex/` are removed from the runtime path; no process-wide or per-thread app-server transport JSONL is expected.
- Session-local normalized transcript artifact по-прежнему живёт в `~/.codeai-hub/sessions/.../codexCli/*-description.jsonl`
- Provider-native artifacts (`CODEX_HOME` history / rollout JSONL и прочие provider-home traces) остаются отдельным диагностическим слоем и не заменяются transport log-ом
- Settings → General → `Capture Codex Native Request` calls `CodexProviderAdapter.captureNativeRequest(...)`, implemented by `src/diagnostics/codex-native-request-capture-service.ts`. The Settings card supplies the selected diagnostic model plus workflow scenario, while Project Manager supplies the scenario first-turn prompt built through the same `buildWorkflowPromptPack(...)` path used by normal workflow sends. It never mutates the long-lived normal app-server child; instead it starts an isolated temporary `CodexAppServerProcess` with `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` and certificate env injected for the diagnostic run only.
- The temporary diagnostic process performs the normal app-server `initialize` handshake, sends `thread/start` with `persistExtendedHistory: false`, `baseInstructions = CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`, and `config.project_doc_max_bytes = 0`, then sends one `turn/start` with `input[0].text = workflowPrompt ?? probePrompt`. `thread/start.model` and `turn/start.model` use the selected capture model / Core-applied model, `turn/start.effort` uses the Core-applied reasoning effort, and `turn/start.summary` mirrors the shared settings policy (`detailed` when `Reasoning in dialog` is enabled, `none` when disabled). It records the exact `thread/start` request/response and `turn/start` request/response into the native capture artifact as `provider_diagnostic_context` records, then copies the provider-home rollout JSONL referenced by `thread.path` into `codex_provider_home_rollout_context`. The Markdown `Provider Diagnostic Context` section therefore shows the CodeAI Hub-owned base instructions, the full workflow first user prompt, and an empty/no-project Codex `turn_context.user_instructions` layer when the X8 project-doc flag is effective. It waits for `turn/completed` / `error` or its own timeout, then always stops the temporary process.
- Successful capture means the Core proxy saw `chatgpt.com` `/backend-api/codex/responses`, completed the WebSocket upgrade locally when needed, captured Codex client WebSocket frames until a useful full-turn payload appears, and then aborted locally. The writer prefers a frame with non-empty `input` / non-`generate:false` as Markdown primary request instead of the early empty service frame. If the no-upstream capture cannot reach such a frame, the native WebSocket body still shows the actual provider-network instructions/tools frame, while `Provider Diagnostic Context` shows the real app-server turn payload that CodeAI Hub sent into the Codex runtime. Artifacts are Core-owned under `~/.codeai-hub/logs/native-request-capture/` and complement provider-home Codex artifacts and session-local normalized history.

## Инварианты
- Lifecycle обязателен: `turn_started` → `turn_completed | turn_failed`.
- Internal transport notifications не должны напрямую протекать в UI; только нормализованный provider event surface является user-facing contract.
- Codex больше не имеет права держать второй локальный source-of-truth для next-turn model/reasoning identity поверх Core-applied config.
- `turn/interrupt` — единственный корректный Stop path для active turn; legacy kill-path через `codex exec` subprocess больше не является каноническим runtime contract.
- Released Codex runtime обязан оставаться self-contained: installed provider bundle должен содержать всё, что нужно Core, включая `@codeai-hub/translation` и app-server module payload.
- Release packaging собирает `packages/Codex_AppServer_Module` в artifact `codex-module-<version>.tar.bz2`; artifact name — стабильный installer contract и не меняется.

## Связанные контракты
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Response modes + diagnostics: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
