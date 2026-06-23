# Kimi Provider Module — Module (SSOT)

## Назначение
Kimi provider module подключает Kimi K2.7 Code к Core как обычного workflow-провайдера CodeAI Hub: Core создаёт и резюмирует provider sessions, отправляет user turns через ACP transport (`kimi acp`), принимает нормализованные lifecycle/message/request events, управляет model identity через shared settings, а Project Manager остаётся только UI-проекцией provider state.

## Где живёт код
- Provider package: `packages/Kimi_Module/`
- Public Core-facing facade: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
- Public module export: `packages/Kimi_Module/src/index.ts`
- ACP process bridge (legacy filename): `packages/Kimi_Module/src/wire/kimi-wire-process.ts`
- ACP JSON-RPC router (legacy filename): `packages/Kimi_Module/src/wire/kimi-wire-router.ts`
- Session lifecycle: `packages/Kimi_Module/src/session/kimi-session-lifecycle.ts`
- Event/request normalization: `packages/Kimi_Module/src/messaging/`
- Model capability registry: `packages/Kimi_Module/src/types/kimi-model-capabilities.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `kimiCode`.
- User-facing provider label: `Kimi`.
- Default model id: `kimi-k2.7-code`.
- Supported native Kimi model ids: `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`.
- Status/settings labels: `Kimi K2.7 Code`, `Kimi K2.7 Code High Speed`.
- Core registry creates the adapter through the provider descriptor/module loader path; external code must enter the module through `KimiProviderAdapter` and must not import ACP/process/session internals directly.
- Kimi model selection is model-only. Settings, workflow start cards, Development Tree start/fix cards, and Session Status Panel model picker persist/select `providers.kimi.defaultModel`; they do not expose a reasoning on/off selector.
- CodeAI-owned Kimi model ids (`kimi-k2.7-code`, `kimi-k2.7-code-highspeed`) are injected before startup through the Kimi CLI `KIMI_MODEL_*` environment contract. The ACP session then sees the selected model as the CLI temporary model option and CodeAI must not send the raw CodeAI model id through `session/set_config_option`.
- `session/set_config_option` with `configId = "model"` is only valid for model aliases already advertised by the live ACP `configOptions`.

## Provider-home и auth bootstrap
- CodeAI-managed runtime state lives under workspace runtime provider home (`.codeai-hub/<workspaceSlug>/runtime/providers/kimi/home`) or the global fallback `~/.codeai-hub/providers/kimi/home`.
- Runtime command discovery checks `KIMI_CLI_PATH`, then `~/.kimi-code/bin/kimi`, `~/.local/bin/kimi`, Homebrew/common bin dirs, then `kimi` from `PATH`.
- Default user config/auth path is `~/.kimi-code/config.toml` unless Core supplies an explicit `workspace.configPath`.
- The runtime process receives `KIMI_CLI_NO_AUTO_UPDATE=1` and a PATH prefix for known Kimi binary locations. `KIMI_SHARE_DIR` is not part of the ACP runtime contract.
- When `providers.kimi.defaultModel` is one of the CodeAI Kimi model ids, the runtime reads the active Kimi user config, extracts the configured Kimi provider `api_key` and `base_url`, and sets `KIMI_MODEL_NAME`, `KIMI_MODEL_API_KEY`, `KIMI_MODEL_BASE_URL`, `KIMI_MODEL_PROVIDER_TYPE`, `KIMI_MODEL_MAX_CONTEXT_SIZE`, and `KIMI_MODEL_DISPLAY_NAME` for the `kimi acp` child process only.
- `~/.kimi-code` is an auth/config/binary source only. CodeAI runtime/session files must not be written there.
- Local ACP proof from 2026-06-21: `~/.kimi-code/bin/kimi acp` completed ACP `initialize` and advertised Kimi Code CLI capabilities; unauthenticated `session/new` failed with an ACP auth-required error instead of process spawn/ENOENT.
- Local ACP proof from 2026-06-21 after the env-model fix: `kimi acp` with `KIMI_MODEL_NAME=kimi-k2.7-code-highspeed` created a session and answered `OK` to `session/prompt` without requiring Kimi Code OAuth membership.

## ACP transport
- Runtime starts `kimi acp` with `cwd` resolved to the active workspace.
- Runtime-selected CodeAI model ids are resolved before spawn, because the Kimi CLI validates model aliases during startup/session creation. Sending raw CodeAI ids after `session/new` is invalid unless the CLI config already defines matching aliases.
- `KimiWireProcessBridge` owns `child_process.spawn`, env/args, stdout line framing, stderr warnings, JSON writes, and shutdown cleanup.
- `KimiWireRouter` owns JSON-RPC request/response correlation, ACP notifications, ACP client requests, malformed-frame handling, and dispatch back to the adapter.
- `KimiSessionLifecycle` owns ACP `initialize`, `session/new`, `session/resume`, `session/prompt`, `session/cancel`, logical close, and provider session id capture/restore.
- `session/cancel` is sent as a JSON-RPC notification, not a request.
- Lifecycle normalization must surface `turn_started` before visible assistant/progress events and must terminate every send as `turn_completed` or `turn_failed`.

## Event normalization
- ACP `session/update` `agent_message_chunk` is buffered into Core `assistant` messages tagged `live`; the adapter flushes buffered text on stream boundaries and before adapter-level `turn_completed` so token-sized ACP chunks do not render as separate dialog cards.
- ACP `session/update` `agent_thought_chunk` is buffered into Core `thinking` messages tagged `thinking`; buffered thought text flushes before visible assistant text, on stream boundaries, and before adapter-level `turn_completed`. Visibility is decided by Core at emission time from `providers.kimi.thinkingDisplaySyncEnabled`, the same user-facing dialog policy used by other providers.
- ACP frames carrying a provider `sessionId` route only to the matching runtime listener `kimi:<sessionId>` and use a session-scoped normalizer buffer. Broadcast is retained only for legacy/sessionless frames. This prevents two open Kimi chats from receiving each other's assistant/thinking chunks.
- ACP `tool_call` / `tool_call_update` and `usage_update` become normalized progress/token events on the same provider event surface used by the existing providers.
- Reasoning/thinking messages render as expanded dialog bubbles when visible; the old collapsed disclosure UI is not part of the current provider UX contract.
- Legacy Wire `TurnBegin` / `TurnEnd` / `ContentPart` / `StatusUpdate` normalization remains as compatibility code, but the current CLI path is ACP.
- ACP `session/request_permission` requests are normalized before they reach Core diagnostics and answered by selecting the provider-offered `allow_always` option when present, otherwise `allow_once`, otherwise the first option id. This mirrors the previous managed CLI auto-approval behavior without inventing CodeAI-specific ACP options.
- Auth, quota, service, unsupported-model and stale-session failures must be classified before binding teardown so Core can retry/rebind once or show a provider recovery surface instead of silently dropping the user message.

## Continuity and stale binding
- Kimi participates in the same snapshot-first continuity contract as Claude, Codex and Gemini.
- Restored Core bindings may contain a provider session id that the fresh Kimi adapter process has not hydrated yet.
- In that case `KimiSessionLifecycle` throws `KIMI_SESSION_STALE_BINDING`; Core `SessionRequestHandlerMessageDispatch` treats it as a one-shot stale-binding recovery signal, invalidates the binding, rebinds, and retries the send once.
- Generic `Error` must not be used for this path because generic retryable classification does not preserve the provider session id required for deterministic recovery.

## Effective model identity and settings
- Kimi default model belongs to shared provider settings, not to Project Manager local state.
- Settings persist `providers.kimi.defaultModel`, `providers.kimi.autoUpdate`, and `providers.kimi.thinkingDisplaySyncEnabled`; Settings cards, workflow start cards, Development Tree start/fix cards, and Session Status Panel model picker read/write model choice through the shared settings/model-switch contract.
- `providers.kimi.thinkingEnabled` may remain in old settings snapshots as a backward-compatible field, but it is normalized to enabled and no longer drives a CLI flag, Settings control, launch-card control, or active runtime restart.
- `thinkingDisplaySyncEnabled` is presentation-only and controls whether thought messages render in the Session UI; it never reaches the Kimi CLI.
- Core-applied turn config remains authoritative for outbound sends. Provider-local defaults are only bootstrap fallback.
- Kimi has no CodeAI-supported reasoning/thinking effort dimension (no `low|medium|high` levels like Claude/Codex/Gemini), and the current ACP path has no supported reasoning on/off switch in CodeAI UI.
- Prompt/system-instruction cadence can ask Kimi for visible progress updates, but it is not a reliable substitute for ACP event handling: during a long tool call the model may emit no new text, so the adapter must rely on ACP thought chunks and progress events for live UX.

## Reasoning / thinking control (ACP)
- There is no CodeAI-supported Kimi reasoning effort dimension. Kimi UI surfaces must not synthesize `low|medium|high` or binary reasoning controls.
- The current ACP launch path is `kimi acp`. CodeAI no longer passes `--thinking` / `--no-thinking`, and `KimiProviderAdapter.reconfigureThinking(...)` is a backward-compatible no-op that returns `false`.
- After `session/new` or `session/resume`, `KimiSessionLifecycle` applies ACP `session/set_config_option` with `configId = "thinking"` and `value = "on"` so CodeAI-managed Kimi turns can emit `agent_thought_chunk` even when the migrated user CLI config has `default_thinking = false`.
- ACP `agent_thought_chunk` is an output channel, not a user-facing CodeAI control surface. `thinkingDisplaySyncEnabled` controls whether those thought chunks render in the Session UI.

## Agent/system prompt and tool-control capabilities
- The current runtime starts only `kimi acp`; ACP session setup uses `cwd` and an empty `mcpServers` list.
- The module still materializes the CodeAI-owned managed profile files under provider home as local runtime metadata, but the ACP subcommand is the active provider contract and does not receive the old `--agent-file`, `--mcp-config-file`, `--skills-dir`, `--yolo`, or `--work-dir` flags.
- For the `1.2.582` comparison release, the materialized managed `system.md` starts with the captured Codex-native system instructions and includes the full captured Codex-native tool definition list, then appends a Kimi runtime addendum with the actual ACP/provider-home boundary.
- The executable Kimi tool surface remains the ACP tool list declared in the managed profile (`ReadFile`, `ReadMediaFile`, `Glob`, `Grep`, `WriteFile`, `StrReplaceFile`, `Shell`). The Codex-native tool list in `system.md` is a comparison/test baseline, not a claim that Kimi ACP can execute every Codex runtime tool.
- CodeAI-owned expanded tools such as `read_file_anchored`, `edit_file_by_anchor`, rendered browser fetch, structured Git/test wrappers, and best-effort symbol navigation cannot be added to Kimi by only editing `system.md`: ACP will still execute only the Kimi CLI tool list above. Kimi needs an ACP/MCP bridge or a Kimi CLI-supported extension point before CodeAI can expose these as real executable tools.
- LSP-style code navigation (`find references`, `go to definition`, call hierarchy) and semantic code search are not part of the current Kimi ACP executable surface. They must be delivered through the future bridge/MCP route, not added as provider-specific prompt text that the runtime cannot execute.
- Core prompt and managed workflow state remain authority for target artifact paths, language contract, validation rules, and commit lifecycle. Project Manager must not bypass Core-owned managed stage transitions.
- ACP permission requests are answered through the protocol `session/request_permission` response shape. The adapter selects an allow option supplied by Kimi rather than inventing provider-specific request ids or legacy Wire request envelopes.

## Project Manager surfaces
- Kimi must be visible anywhere users choose or inspect a provider: Settings provider card, Description submit provider picker, workflow start cards, Development Tree start/fix cards, Session UI status-line/model chip, provider labels, and provider color/theme mapping.
- PM must send raw provider/model intent to Core and render Core-owned snapshots. It must not create a Kimi-specific workflow truth or bypass Core managed stage transitions.
- Provider/model selections made in Settings, workflow start cards, Development Tree start/fix cards, and Session Status Panel model picker are settings/model-switch writes, not one-shot launch payload truth. The cards must persist `providers.kimi.defaultModel` through the scoped settings path first; session creation then consumes the same settings snapshot path as Settings.
- Kimi model pickers must include `kimi-k2.7-code-highspeed` alongside `kimi-k2.7-code`.
- Kimi reasoning selectors are hidden because Kimi has no CodeAI-supported reasoning control in the ACP path.
- Kimi provider theme id is `kimi`; CSS/design tokens define its accent/fill/border/soft states for Project Manager and Session UI.

## Usage limits
- The Session Status Panel `Токены` chip is not a Kimi usage-limit/quota display. It consumes `status.tokenUsage` as a context-window snapshot, while the rows below/around usage limits consume `usageLimits.currentSession` (`5h`) and `usageLimits.currentWeekAllModels` (`Weekly`).
- Kimi token usage for the status panel is provider-runtime evidence. The adapter still normalizes ACP `usage_update` / legacy `StatusUpdate` context fields when Kimi emits them, but current Kimi CLI builds may omit those events.
- To keep the lower status panel populated for those builds, `KimiNativeTokenUsageReader` reads the native Kimi session log `~/.kimi-code/sessions/.../<providerSessionId>/agents/main/wire.jsonl` after a turn and dispatches a provider-neutral `stream_event.data.tokenUsage` payload. The best-effort `used` value is the latest native step usage sum: `inputOther + inputCacheRead + inputCacheCreation + output`; `limit` is the CodeAI-owned Kimi context limit `262144`.
- This native usage fallback must not be treated as account billing, OCR output, or 5h/Weekly quota state. It exists only to feed the context-window status chip through the existing token-usage stream path.
- Kimi usage limits are read from `GET https://api.kimi.com/coding/v1/usages` with the configured Kimi config path (default `~/.kimi-code/config.toml`) `providers.kimi-for-coding.api_key`; this is the Kimi CLI auth section, not the CodeAI model id.
- The API key is read locally and sent only as an `Authorization: Bearer ...` header to the Kimi endpoint. It must not be logged, persisted into CodeAI settings, or copied into diagnostic artifacts.
- Live payload mapping:
  - `limits[0].detail.remaining/limit/resetTime` → `usageLimits.currentSession`, label `5h`. The 5h window reports `remaining` (not `used`), so the reader derives `used = limit − remaining` (fixed in `1.2.547`; previously the reader looked only for `used` and the 5h bucket was always null);
  - `usage.used/limit/resetTime` → `usageLimits.currentWeekAllModels`, label `Weekly`;
  - `parallel.limit` is not rendered as a percent row because the current Session ID usage bar only supports percent windows.
- If config is missing, auth fails, the endpoint is unavailable, or the payload is malformed, `KimiProviderAdapter.refreshUsageLimits(...)` broadcasts a provider-scoped unavailable payload with `providerScopeKey = "kimi:global"`, `usageLimits = null`, source `kimi_unavailable`, and labels `5h` / `Weekly`.
- Session UI must render the fallback as unavailable, not as indefinite loading and not as fake percentages.
- Core dispatches `refreshUsageLimits` on `turn_completed`, not only on `binding_ready` (fixed in `1.2.547`). `binding_ready` can race ACP startup and is deduped by the warmup tracker after the first `unavailable` broadcast, so a fresh Kimi session stayed `unavailable`; `turn_completed` is never suppressed by warmup and fires once the runtime is ready, so 5h/Weekly appear after the first turn. The hook is provider-neutral: `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-turn-refresh.ts`.

## Native diagnostic capture
- Kimi diagnostic capture is ACP JSON-RPC evidence based, not TLS MITM based.
- `KimiProviderAdapter.captureNativeRequest(...)` records a Core-owned applied input envelope with provider home, selected model, user config path, and `wire.jsonl` provenance. The filename is legacy; the active transport is ACP.
- The Core native request capture writer includes Kimi provider diagnostic context in the same `.jsonl` / `.md` artifact family under `~/.codeai-hub/logs/native-request-capture/`.
- Kimi capture must not require OpenSSL/TLS proxy preflight because the useful evidence is the ACP prompt envelope and provider-home JSON-RPC provenance.

## Release packaging
- `packages/Kimi_Module` must be built and packaged as a self-contained provider module artifact during release packaging.
- The installed runtime must be able to import the public `src/index.ts` export surface and instantiate `KimiProviderAdapter` without depending on repo-local TypeScript sources.
- Release scripts must not edit provider versions manually; version bumping remains owned by `build-all.sh`.

## Инварианты
- `KIMI_SHARE_DIR` is not required for the current ACP runtime.
- `~/.kimi-code/config.toml` may be referenced for already-authorized credentials/config, but CodeAI-managed runtime writes stay in provider home.
- `KimiProviderAdapter` is the only public module facade for Core integration.
- ACP process/router/session classes are module internals, even where filenames still include `wire`.
- Every send must finish with `turn_completed` or `turn_failed`; stuck-working UI is a provider contract violation.
- Kimi usage limits must degrade to explicit unavailable state when the Kimi console usage endpoint cannot be read.
- Kimi native capture is diagnostic-only and must not mutate workflow state or settings defaults.

## Связанные контракты
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Provider failure/recovery: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
