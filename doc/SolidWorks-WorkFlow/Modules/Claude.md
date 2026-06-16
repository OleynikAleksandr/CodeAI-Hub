# Claude Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Claude для Core: создание/резюм сессий, one-shot turns, чтение token usage/limits, provider-home auth bootstrap.

## Где живёт код
- `packages/Claude_Module/`

## Model capability registry and switching
- Provider-owned Claude capability SSOT lives in `src/types/claude-model-capabilities.ts` and is exported through the module public surface. The active aliases are `sonnet`, `opus`, and `haiku`; UI labels intentionally stay versionless because the Claude SDK resolves aliases to current concrete models at query time.
- The registry exposes `supportsThinking`, `supportsThinkingDisplaySummarized`, `thinkingEffortOptions`, and `defaultThinkingEffort`. The supported effort set is `low | medium | high | xhigh | max`; `xhigh` remains offered end-to-end and must not be dropped from the Status Panel while Core/provider validation accepts it.
- Status Panel Claude switching is a next-turn `Session.modelBinding` mutation only and is split into two independent transport commands as of release `1.2.120`. `session:claude:model-switch` carries only `{ sessionId, targetModelId }` and mutates `baseModelId` while preserving `thinkingEnabled` and `reasoningEffort` from the previous binding (capability-normalizing effort against the new model's `thinkingEffortOptions`). `session:claude:thinking-switch` carries only `{ sessionId, thinkingEnabled, targetReasoningEffort? }` and mutates `thinkingEnabled`/`reasoningEffort` while preserving `baseModelId`. Both handlers update the binding with `source = "switch_request"`, broadcast `session:model:update`, and do not resend the current turn or call a provider-side `Query.setModel(...)` equivalent. Coupled payloads are no longer accepted; the model card and the reasoning card in the Status Panel never trigger the other dimension's switch by side-effect.
- On the next outbound turn, `src/provider/claude-applied-turn-config.ts` reads the Core-applied turn config and `src/sdk/claude-sdk-manager.ts` maps it into SDK `query(...)` options: `model`, `thinking: { type: "adaptive", display: "summarized" }` plus `effort` when thinking is enabled, or `thinking: { type: "disabled" }` with no `effort` when thinking is off.
- Native proof for this contract is provider-owned: `src/diagnostics/claude-native-request-capture-service.test.ts` covers post-switch SDK-isolation options and asserts the selected model/thinking/effort are present while `settingSources: []` stays empty.

## Messaging cluster
- `src/messaging/message-processor.ts` — thin façade для queue/processResponses orchestration; shutdown-aware so late processor/dispatch/processing errors after `session.turnQueue.shutdownRequested` are suppressed instead of being emitted into a torn-down session error channel.
- `src/messaging/claude-stream-event-router.ts` — routing assistant/result events, source-first thinking emission, live text emission, `tool_use` preamble classification, provider-local thinking translation, and structured output emission. Delegates the live content ingestion path to `ClaudeContentStreamHandler` and reconciles the final assembled thinking AND text blocks against materialized live segments before emitting into the dialog.
- `src/messaging/claude-content-stream-handler.ts` — micro-class that watches stream events for the thinking and text content block lifecycle (`content_block_start` thinking|text → `content_block_delta` thinking_delta|text_delta → `content_block_stop`), feeds the per-session buffers, tracks the active block kind, holds localized pre-tool text off the assistant/live path until message classification is known, and exposes `consumeFinalThinking` / `consumeFinalText` / `consumeSuppressedText` / `hasMaterializedText` for finalization dedupe.
- `src/messaging/claude-thinking-live-buffer.ts` — per-session accumulator that materializes readable thinking segments from raw `thinking_delta` fragments at sentence/paragraph boundaries (default flush threshold 240 chars) and reconciles the final assembled block against the materialized prefix.
- `src/messaging/claude-text-live-buffer.ts` — per-session accumulator for visible assistant `text_delta` fragments (flush threshold ~96 chars) that eliminates the multi-minute pending silence between pre-tool assistant text and `stop_reason="tool_use"` while Claude streams large `input_json_delta` payloads. The buffer keeps canonical finalized ownership (`finalizedText`) so a late `content_block_stop` cannot emit an orphan tail after the assembled assistant message already resolved the block, avoids treating URL/domain periods inside markdown links as safe flush boundaries, and reconciles final suffix/window snapshots against already materialized live text.
- `src/messaging/claude-structured-output-helpers.ts` — structured-output normalization / variant-B partitioning / question appending helpers split out of the router to keep it under the 500-line architecture limit.
- `src/messaging/claude-thinking-dialog-emitter.ts` — emits thinking dialog bubbles (`emitClaudeThinkingDialog`) and live assistant text bubbles (`emitClaudeAssistantLiveText`) as append-only messages with unique uuid suffixes so Core-owned translation overlays can attach `localizedContent` per bubble. Live text emits carry `tag: "live"`; Core `appendProviderMessage` forwards the tag into `SessionMessage.tag` and the UI layer collapses consecutive live bubbles into one growing dialog card via `mergeLiveAssistantMessages`, symmetric to how `mergeThinkingMessages` collapses consecutive thinking bubbles. Per-segment persistence and per-segment translation overlay attachment are unchanged.
- `src/messaging/claude-thought-translation-adapter.ts` — Claude-local adapter over the shared translation facade for provider-local thinking translation, including final assembled thinking and `tool_use` preamble text that is now rendered under the thinking contract.
- `src/messaging/claude-readable-text-chunker.ts` — Claude-specific chunking helper used by the local pre-tool translation adapter.
- `src/messaging/claude-message-finish-handler.ts` — lifecycle completion façade (`turn_started` / `turn_completed` / `turn_failed`).
- `src/messaging/claude-usage-sync.ts`, `src/messaging/claude-token-usage-sync.ts` — usage limits + `/context` token usage synchronization, including explicit `postTurnTokenUsageUnavailable` completion signal when trailing `/context` usage cannot be produced after a finished turn.
- `src/messaging/claude-stream-event-router.ts` emits Claude thinking into session history as tagged thinking messages; `thinkingDisplaySyncEnabled` only decides whether the shared Session UI renders them as visible Thinking bubbles or filters them out.
- Visible Claude thinking and visible assistant text are now source-first AND incremental: the provider emits live readable segments while reasoning/text is still streaming via the `ClaudeThinkingLiveBuffer` / `ClaudeTextLiveBuffer`, and Core owns the asynchronous translation overlay that later patches `localizedContent` for each emitted bubble. The final assembled block is deduplicated against the materialized prefix and suffix/window overlaps so the user never sees the same reasoning/text twice; if the live path already covered the full text, the assembled message's pending emission is skipped entirely.
- Claude live buffers are markdown-list-aware: `ClaudeThinkingLiveBuffer` and `ClaudeTextLiveBuffer` must reject a candidate flush boundary if the resulting visible fragment would end with a marker-only list line (`1.`, `2.`, `-`, `*`, `+`) without the item body. In that case they backtrack to the previous safe boundary or keep buffering until more text / terminal flush arrives. This prevents PM dialog markdown from degrading into `2.` on one line and the item text on the next.
- Claude final assistant text finalization is order-safe: `claude-stream-event-router.ts` captures whether live `text_delta` content was already materialized before calling `consumeFinalText()`, clears the legacy pending buffer for that session when live text already surfaced, and emits only the unseen tail (or divergent canonical block) through the live-text path. Core `SessionRequestHandlerEventMessages` additionally guards persisted history by suppressing a later ordinary assistant event that is already covered by immediately preceding `tag: "live"` chunks, or by trimming a suffix-prefix overlap down to the unseen continuation. This prevents duplicate-tail/orphan-suffix regressions both when the assembled `assistant` payload arrives before a trailing `content_block_stop` and when the provider's final snapshot boundary restarts inside already displayed live text.
- Persisted localized thinking for Claude lives in the Core-owned per-session sidecar `*.translations.jsonl`; the canonical Claude/session transcript remains native-only.
- Localized Claude pre-tool progress text no longer persists as an ordinary assistant bubble when the message later resolves to `stop_reason = "tool_use"`. For the confirmed Cyrillic-target leak, source-language live text is held off the assistant/live path until `message_delta.stop_reason` is known; `tool_use` preambles are emitted and localized as thinking, while ordinary final assistant replies ending in `end_turn` remain untouched.
- Claude thinking settings are now `thinking.enabled/effort`, not `maxTokens`. Legacy snapshots with `maxTokens` are migrated to the nearest effort tier during normalization.
- Core threads explicit Claude `thinkingEnabled` + `reasoningEffort` + `thinkingDisplaySyncEnabled` through applied turn config; the Claude SDK path now uses `thinking: { type: "adaptive" | "disabled", display?: "summarized" | "omitted" }` plus `effort`, instead of deprecated `maxThinkingTokens`. If applied turn config is absent, the fallback shared settings snapshot read is cached per manager/settings path for `500ms` before building SDK query options; this is a short read-through cache, not a second long-lived settings owner.
- `thinking.display` selection is bound to `thinkingDisplaySyncEnabled`: when reasoning is enabled AND the toggle is `true` (or absent), Claude requests `display: "summarized"` and emits plain-text `thinking_delta` so the live thinking pipeline can render visible reasoning. When reasoning is enabled AND the toggle is `false`, Claude requests `display: "omitted"`: the model still spends `effort`, but no plain-text `thinking_delta` is streamed (Opus 4.7 falls back to encrypted `signature_delta` only; Sonnet/Haiku/older Opus simply stop emitting summary deltas). The live thinking buffer / thought translation adapter must remain no-op under `display: "omitted"`, which is already correct because hidden Claude thinking bypasses the Core overlay translation queue at emission time. The settings-snapshot fallback path keeps `display: "summarized"` because it has no per-turn signal.
- Effort levels accepted by the SDK are `low | medium | high | xhigh | max`. `xhigh` is documented as "Deeper than high (Opus 4.7 only; falls back to high elsewhere)". Claude model aliases in UI (`Sonnet` / `Opus` / `Haiku`) carry no version numbers — the SDK auto-resolves the alias to the latest concrete model at query time.
- Effective runtime model identity for Claude is now `thinking:off` when reasoning is disabled and `reasoning:<effort>` when it is enabled, so the client can see Claude effort changes through the normal `session:model:update` path.
- A Status Panel switch replaces this effective identity through `Session.modelBinding`; persisted Settings remain defaults only and must not be overwritten by the switch.
- Release packaging must vendor `@codeai-hub/translation` into the Claude installed bundle because the provider-local pre-tool translation adapter still depends on it at runtime.

## Usage-limits cluster (lives in Core, not in Claude_Module)
- `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts` — facade for header/runtime usage-limit normalization and stream payload shaping.
- `packages/core/src/provider-usage-limits/providers/claude/claude-usage-token-resolver.ts` — platform/env/credential OAuth token resolution helper for the usage-limits facade.
- All three providers (Claude, Codex, Gemini) share this Core cluster — see `packages/core/src/provider-usage-limits/` for the shared facade and per-provider adapters.

## Provider-home (канон)
- `HOME=~/.codeai-hub/providers/claude/home`
- Claude sessions (provider-home): `~/.codeai-hub/providers/claude/home/.claude/projects/<workspaceSlug>/<sessionId>.jsonl`
- Auth state: `~/.codeai-hub/providers/claude/home/.claude.json` (на macOS/Linux — symlink на `~/.claude.json`; Windows — best-effort copy)
- Provider-driven Claude turns run in SDK isolation mode: filesystem setting sources stay empty, so Claude does not auto-load user/project/local settings or any `CLAUDE.md` memory files from the active workspace, its parent directories, or the real user home.
- Tool/file access may still point at the active workspace through `cwd` and `additionalDirectories`, but that must not re-enable filesystem `CLAUDE.md` discovery; global user settings and global `~/.claude/CLAUDE.md` must never leak into provider-home sessions.
- Normal SDK turns and diagnostic capture both pass `systemPrompt = CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT` from `src/sdk/claude-workflow-system-prompt.ts`. This keeps the provider/system layer CodeAI Hub-owned while leaving the current workflow step template in the first user message.
- Normal SDK turns and diagnostic capture also pass the explicit CodeAI Hub-owned tool profile `CODEAI_CLAUDE_WORKFLOW_TOOLS = ["Read", "Write", "Edit"]`. This is a test flag for early documentation workflow steps: `Agent`, subagents, `Skill`, `ScheduleWakeup`, `ToolSearch`, and broad codebase exploration tools are not intended workflow dependencies for these steps.

## Native request capture diagnostics
- Settings → General → `Capture Claude Native Request` calls `ClaudeProviderAdapter.captureNativeRequest(...)`, implemented by `src/diagnostics/claude-native-request-capture-service.ts`. The Settings card supplies the selected diagnostic model plus workflow scenario, while Project Manager supplies the scenario first-turn prompt built through the same `buildWorkflowPromptPack(...)` path used by normal workflow sends.
- The diagnostic path reuses `SDKInstaller` + `SDKAuthManager`, performs provider-home subscription/auth bootstrap, then runs one SDK `query(...)` with the Core-provided proxy/certificate environment and `workflowPrompt ?? probePrompt`.
- Current diagnostic capture sends the same custom-only SDK `systemPrompt` string as normal runtime turns, not the Claude Code preset. The shared constant is `CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT` in `src/sdk/claude-workflow-system-prompt.ts`. Stage-specific workflow templates remain the first user message (`prompt`) and are not moved into `systemPrompt`.
- Capture query options intentionally keep `settingSources: []`, `persistSession: false`, `permissionMode: "bypassPermissions"`, `allowDangerouslySkipPermissions: true`, `cwd` / `additionalDirectories` = selected workspace, and `projectPath` under the provider project slug. The selected capture model and Core-applied `thinkingEnabled` / `reasoningEffort` / `thinkingDisplaySyncEnabled` are mirrored into the SDK `query(...)` options, including `thinking: { type: "adaptive", display: "summarized" | "omitted" }` plus `effort` when thinking is enabled (display follows `thinkingDisplaySyncEnabled`) and `thinking: { type: "disabled" }` when disabled. This preserves normal SDK isolation while forcing the outbound provider request through the local capture proxy.
- Successful capture means the Core proxy saw `api.anthropic.com` `/v1/messages` and locally aborted that request; the diagnostic service may observe the resulting synthetic network failure, but upstream delivery is intentionally blocked.
- Artifacts are Core-owned and written to `~/.codeai-hub/logs/native-request-capture/` as `.jsonl` plus readable `.md`; ignored Anthropic requests preserve reason/target/method/path/redacted headers/body for debugging path mismatches, while provider-home Claude JSONL remains the canonical provider-owned audit layer for normal turns.
- Runtime evidence from `1.2.79` showed the old default Claude Code tool profile: `body.tools` contained `10` tools (`Agent`, `Bash`, `Edit`, `Glob`, `Grep`, `Read`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Write`) and was about `35.9K` JSON characters / `61%` of the request body. Release `1.2.80` tests whether the explicit `tools: ["Read", "Write", "Edit"]` SDK option replaces that default set in the native provider request.

### Diagnostic SDK query contract

The current diagnostic call shape is:

```ts
sdk.query({
  prompt: workflowPrompt ?? probePrompt,
  options: {
    additionalDirectories: [workspacePath],
    allowDangerouslySkipPermissions: true,
    cwd: workspacePath,
    env: {
      ...authEnvironment,
      ...certificateEnv,
      ALL_PROXY: proxyUrl,
      HTTP_PROXY: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      NODE_EXTRA_CA_CERTS: certificateEnv.NODE_EXTRA_CA_CERTS ?? certificatePath,
      REQUESTS_CA_BUNDLE: certificateEnv.REQUESTS_CA_BUNDLE ?? certificatePath,
      SSL_CERT_FILE: certificateEnv.SSL_CERT_FILE ?? certificatePath,
    },
    includePartialMessages: false,
    model: appliedTurnConfig.modelId ?? selectedModelId ?? defaultModel,
    pathToClaudeCodeExecutable: claudeExecutablePath,
    permissionMode: "bypassPermissions",
    persistSession: false,
    projectPath: resolveClaudeProviderProjectDir(claudeProjectSlug),
    settingSources: [],
    systemPrompt: CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT,
    thinking: thinkingEnabled
      ? {
          type: "adaptive",
          display: thinkingDisplaySyncEnabled === false ? "omitted" : "summarized",
        }
      : { type: "disabled" },
    tools: ["Read", "Write", "Edit"],
    ...(thinkingEnabled ? { effort: reasoningEffort ?? "medium" } : {}),
  },
});
```

Important transport mapping:

- `prompt` becomes the workflow first user message in Anthropic `body.messages`.
- `systemPrompt` becomes Anthropic `body.system`.
- SDK tool declarations remain Anthropic `body.tools`; they are not part of `body.system`.
- The current test target is a compact `body.tools` containing only `Read`, `Write`, and `Edit`. If retest shows the SDK treats `tools` as additive instead of restrictive, that result becomes evidence for the next flag choice.
- `settingSources: []` must remain present so filesystem/user/project/local Claude settings and `CLAUDE.md` memory files are not auto-loaded into the diagnostic request.

### Current shared workflow system prompt

- Runtime source: `packages/Claude_Module/src/sdk/claude-workflow-system-prompt.ts`
- Experiment/reference copy: `doc/SolidWorks-WorkFlow/Plans/Archive/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md`
- The prompt includes CodeAI Hub workflow framing, instruction priority/source-boundary rules, artifact-first behavior, scope control, short communication, and explicit progress-update rules.
- The prompt also owns visible reasoning-summary language policy: if Claude SDK/runtime emits visible thinking/thought/reasoning summary text, it must be concise, user-safe, and written in the runtime reasoning/chat language from the current step language directive. For Russian (`ru`) sessions, Claude must not fall back to English summary headings or short progress labels.

## Auth cluster
- `src/auth/sdk-auth-manager.ts` — façade/coordinator for Claude auth bootstrap, provider-home preflight и auth runtime checks.
- `src/auth/claude-auth-home-bridge.ts` — provider-home/macOS Keychain bridge, legacy `.claude.json` link/copy flow и migration of legacy `~/.claude/.credentials.json`.
- `src/auth/claude-auth-runtime.ts` — OAuth bootstrap/cache refresh, auth environment assembly, installed `claude` executable preflight probe и final auth check. Fallback `npx @anthropic-ai/claude-code` invocation remains only for callers that do not provide an executable path; normal SDK runtime, diagnostic capture and Haiku translation must pass `SDKInstaller.getExecutablePath()`.

## Auth bootstrap (критично)
- Core/модуль пытаются резолвить OAuth токен (env/credentials/platform store) и инжектить `CLAUDE_CODE_OAUTH_TOKEN` в runtime env.
- `SDKInstaller.ensureInstalled()` отвечает за missing first-run install и executable/module path verification, но не делает скрытый latest-check на каждом старте. Обновление уже установленного Claude SDK/CLI принадлежит Core startup/manual settings policy (`SettingsProviderAutoUpdateService` / `settings:update-provider`).
- Если токен истёк/401 — система должна завершить turn как failure и предоставить recovery hint (см. Phase 211).

## Инварианты
- Один user/internal turn = один `query(...)` запуск (one-shot), FIFO.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Rate-limit и `/context` token usage остаются post-message synchronization concern и не должны смешиваться с assistant/result routing в одном giant file.
- Unix `/context` probe runner обязан различать native Claude bundle и JS entrypoint: native executable запускается напрямую, `process.execPath` разрешён только для реального `.js/.cjs/.mjs` entrypoint. Запуск `node <native Claude bundle>` считается контрактным нарушением.
- Если Claude turn уже завершён, но post-turn `/context` usage read больше не сможет дать snapshot, completion path обязан эмитить `postTurnTokenUsageUnavailable: true` в `turn_completed`. Этот сигнал означает только "trailing snapshot не придёт" и не заменяет сам threshold decision.
- Provider-owned SDK JSONL under `~/.codeai-hub/logs/claude/` is removed from the runtime path. Exact provider-applied model/thinking при аудите нужно подтверждать по provider-home Claude JSONL, session-local normalized history, or explicit native request capture, not by an always-on SDK mirror.
- **Thinking effort whitelist parity (see SystemArchitecture Invariant 27).** `settings.json` is re-normalized by TWO independent layers: the extension-side `parseSettingsSnapshot` on save, and the Core-side `SettingsRequestHandler.handleLoad` on PM / websocket load. Core has its OWN hardcoded thinking-effort whitelist in `packages/core/src/remote-bridge/handlers/settings-request-handler-claude-thinking.ts` plus a legacy `maxTokens` → effort anchor table — these are independent duplicates of the extension-side `claude-settings.ts` normalizer and the shared `provider-defaults-resolver.ts` set. When introducing a new `ClaudeThinkingEffort` level, update ALL of: `src/types/claude-model-registry.ts`, `src/extension-module/settings/claude-settings.ts`, `packages/core/src/config/provider-defaults-resolver.ts`, and `packages/core/src/remote-bridge/handlers/settings-request-handler-claude-thinking.ts` in the same change. A missing value in the Core handler silently reverts the user's save to the Core default on the very next PM boot (regression introduced in 1.1.998 `xhigh`, fixed in 1.2.2).
- Claude thinking display toggle has two effects since release `1.2.252`: at the Session UI it filters visible thinking bubbles (presentation-only), and at the provider SDK it selects `thinking.display: "summarized" | "omitted"`. When disabled, no plain-text `thinking_delta` is streamed at all, so the hidden reasoning is not paid for in tokens; the model still spends the configured `effort`.
- Visibility is decided at emission time and persisted on the `SessionMessage` as `visibilityAtEmission`. Hidden Claude thinking never enters the Core overlay translation queue, and re-enabling `Thinking in dialog` inside a long-running session is forward-only: only newly emitted thought summaries become visible and eligible for translation; messages that were hidden at emission stay hidden.
- Claude visible thinking localization is eventually consistent: source text must appear immediately, while translation may arrive later as a Core `message_translation` overlay for the same stable `messageId`.
- Claude visible thinking must follow the canonical `Reasoning` category language after the UI/Reasoning translation split (`reasoningLanguage`); the Claude provider adapter still reads the legacy alias `messagesForTheUserLanguage` (`runtimeTurnConfig.messagesForTheUserLanguage`) which Core threads with the same resolved value as `reasoningLanguage` until the adapter migration completes. Current thought-summary verbosity is still ultimately owned by the upstream Claude SDK / model even after CodeAI Hub starts sending explicit `effort`.
- The provider-local thinking translation adapter treats Cyrillic Claude thinking as already localized when the resolved target language is Russian (`ru` / `ru-RU`) and returns no translated overlay for that text. This preserves source-first Russian summaries and prevents a second translation pass from rewriting already Russian reasoning, while English thinking in Russian-target sessions still goes through the translation facade.
- Claude pre-tool assistant text can be identified safely by the provider-native boundary `message_delta.delta.stop_reason = "tool_use"`; this path is distinct from final assistant output (`end_turn`) and must not be filtered by text heuristics.
- The currently confirmed leak fix is intentionally narrow: in localized Cyrillic-target sessions the content handler may suppress source-language pre-tool `text_delta` until `stop_reason` is known. If the turn resolves to `tool_use`, the text is emitted as thinking; if it resolves to `end_turn`, it falls back to the ordinary assistant path.
- `ClaudeContentStreamHandler` must tolerate sessions whose `runtimeTurnConfig` is temporarily absent or not yet hydrated: localized pre-tool suppression treats missing `messagesForTheUserLanguage` as "do not suppress" instead of crashing the live text path.
- `Stop` from `Project Manager` is shutdown-safe at the provider level: the SDK interrupt yields `terminal_reason = "aborted_streaming"` (an expected outcome), and any late processor/dispatch/processing error after `session.turnQueue.shutdownRequested` MUST be suppressed instead of being emitted into a torn-down session error channel. The error channel must never produce `ERR_UNHANDLED_ERROR` for the post-shutdown window. The Claude SDK's own abort path actually aborts the active query, so no extra subprocess kill hook is needed here; Codex requires an equivalent hook because its SDK-patch owns a `child_process.spawn` handle (see SystemArchitecture Invariant 24 and Modules/Codex.md).
- `ClaudeProviderAdapter` bridges `session.eventEmitter.on("error", ...)` symmetrically to the Codex adapter. Active provider stream failures still reach Core through the standard provider error envelope (`{ type: "error", provider: "claude", payload }`), keeping `Stop -> Continue` viable on the same workflow continuity chain.
- Claude visible thinking is incremental: live readable chunks are emitted while reasoning is still streaming, and the final assembled `thinking` block in the assistant message is reconciled against the materialized prefix (superset → emit only the unseen tail; divergent → emit the full canonical block; no live path → emit the full block as legacy fallback). PM-side `mergeThinkingMessages` additionally repairs an already-split marker boundary (`2.` + next fragment text) for persisted history / residual edge cases, while normal source-of-truth prevention remains provider-side. Buffer state for a session is consumed on the final assembled block and reset on terminal `message_stop` / shutdown.

## Translation-only query profile (Claude Haiku 4.5)
- `engineId: "anthropic-claude-haiku-4-5"` is exposed as a localization translation engine, and the runtime adapter lives next to the Claude provider: `packages/Claude_Module/src/translation/claude-haiku-translation-service.ts` and `claude-haiku-translator-instruction.ts`.
- The service reuses the same `SDKInstaller` + `SDKAuthManager` path as regular Claude turns, running `ensureInstalled()` → `ensureSubscriptionAuth()` → `ensureProviderHomeSessionBootstrap(...)` before each translation query.
- Translation-only query profile: `model: "claude-haiku-4-5-20251001"`, `tools: []`, `maxTurns: 1`, `persistSession: true`, `thinking: { type: "disabled" }`, `permissionMode: "bypassPermissions"`, `allowDangerouslySkipPermissions: true`, `includePartialMessages: false`, `settingSources: []`.
- Translation-only queries must also pass SDK flag settings `alwaysThinkingEnabled: false`. This is required because source text may legitimately contain literals such as `Ultrathink`; the translation runtime must not let prompt-triggered Claude reasoning heuristics re-enable thinking or add hidden effort attachments on that content.
- The SDK flag alone is not sufficient for the current Claude SDK/runtime path: translation prompts must mask trigger literals such as `Ultrathink` to an internal placeholder before dispatch and restore the literal in the translated output afterward. Otherwise the first large localization bundle can still receive provider-native `ultrathink_effort` attachments and regress startup latency.
- Translation turns must use an explicit translate-only wrapper prompt (`Translate the source text into ...`, `Return only the translation.`, `Source text:`). For `localization_bundle`, the prompt must also repeat the `__CODEAI_HUB_LOCALIZATION_ENTRY__` marker-preservation rule so whole-bundle materialization cannot degrade into an unconstrained free-form answer.
- Dedicated translation project slug is `translation-runtime-haiku`. The query `cwd` / project path resolves to that dedicated project directory, so native Claude session JSONL for translation turns persist under `~/.codeai-hub/providers/claude/home/.claude/projects/translation-runtime-haiku/`; auth/bootstrap state still comes from the shared provider-home.
- Core wires the provider-owned service into the shared `TranslationFacade` via `packages/core/src/translation/core-translation-facade-factory.ts` and `packages/core/src/translation/claude-haiku-translation-engine.ts`, which adapts `ClaudeHaikuTranslationService` to the engine-neutral `TranslationEngine` contract.
- Both Core-owned live thinking translation and Core-owned localization materialization must reuse that provider-owned service. Extension-host code must not create a local Claude runtime for Haiku; it reads authoritative Core localization bootstrap instead.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
