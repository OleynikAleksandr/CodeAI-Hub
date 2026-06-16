# Kimi Provider Module — Module (SSOT)

## Назначение
Kimi provider module подключает Kimi K2.7 Code к Core как обычного workflow-провайдера CodeAI Hub: Core создаёт и резюмирует provider sessions, отправляет user turns через Wire transport, принимает нормализованные lifecycle/message/request events, управляет model identity через shared settings, а Project Manager остаётся только UI-проекцией provider state.

## Где живёт код
- Provider package: `packages/Kimi_Module/`
- Public Core-facing facade: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
- Public module export: `packages/Kimi_Module/src/index.ts`
- Wire process bridge: `packages/Kimi_Module/src/wire/kimi-wire-process.ts`
- Wire JSON-RPC router: `packages/Kimi_Module/src/wire/kimi-wire-router.ts`
- Session lifecycle: `packages/Kimi_Module/src/session/kimi-session-lifecycle.ts`
- Event/request normalization: `packages/Kimi_Module/src/messaging/`
- Model capability registry: `packages/Kimi_Module/src/types/kimi-model-capabilities.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `kimiCode`.
- User-facing provider label: `Kimi`.
- Default model id: `kimi-k2.7-code`.
- Status/settings label: `Kimi K2.7 Code`.
- Core registry creates the adapter through the provider descriptor/module loader path; external code must enter the module through `KimiProviderAdapter` and must not import Wire/process/session internals directly.
- Kimi model switch in the first release is display-only in Session UI: status-line picker can render the selected Kimi model, but Kimi does not receive a provider-native live switch command until a verified Wire/runtime switch contract exists.

## Provider-home и auth bootstrap
- CodeAI-managed runtime state always lives under `~/.codeai-hub/providers/kimi/home`.
- The runtime process must receive `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home`.
- The runtime process must receive `KIMI_CLI_NO_AUTO_UPDATE=1`; provider updates belong to CodeAI Hub settings/startup policy, not to hidden CLI self-update during workflow turns.
- Existing user auth/config is referenced through `--config-file ~/.kimi/config.toml` unless Core supplies an explicit `workspace.configPath`.
- `~/.kimi` is an auth/config source only. CodeAI runtime/session files must not be written there.
- Local proof from 2026-05-18: `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home kimi --wire --config-file ~/.kimi/config.toml --work-dir <repo>` completed `initialize`, streamed an answer for `2 + 2`, emitted `TurnBegin` / `StepBegin` / `ContentPart` / `StatusUpdate` / `TurnEnd`, and returned `prompt.result.status=finished`.

## Wire transport
- Runtime starts `kimi --wire --config-file <configPath>` with `cwd` resolved to the active workspace.
- `KimiWireProcessBridge` owns `child_process.spawn`, env/args, stdout line framing, stderr warnings, JSON writes, and shutdown cleanup.
- `KimiWireRouter` owns JSON-RPC request/response correlation, provider notifications, provider requests, malformed-frame handling, and dispatch back to the adapter.
- `KimiSessionLifecycle` owns `initialize`, `prompt`, `resume`, `cancel`, logical close, and provider session id capture/restore.
- Lifecycle normalization must surface `turn_started` before visible assistant/progress events and must terminate every send as `turn_completed` or `turn_failed`.

## Event normalization
- Wire `TurnBegin` / `TurnEnd` becomes Core provider lifecycle events.
- Wire content/progress notifications become normalized assistant/progress events on the same provider event surface used by the existing providers.
- Wire `ContentPart(type="think")` materializes as Core `thinking` messages tagged `thinking`; visibility is decided by Core at emission time from `providers.kimi.thinkingDisplaySyncEnabled`, the same user-facing dialog policy used by other providers.
- Reasoning/thinking messages render as expanded dialog bubbles when visible; the old collapsed disclosure UI is not part of the current provider UX contract.
- Stateful Kimi normalization buffers small `think` chunks, flushes them at tool/step boundaries, and also emits bounded intermediate thinking blocks once accumulated reasoning reaches a safe text boundary or size threshold. It must not forward token-level reasoning fragments as separate dialog messages.
- Wire provider `request` envelopes are normalized before they reach Core. First release policy is deny-by-default for provider requests until a provider-neutral approval/tool contract is explicitly implemented.
- Auth, quota, service, unsupported-model and stale-session failures must be classified before binding teardown so Core can retry/rebind once or show a provider recovery surface instead of silently dropping the user message.

## Continuity and stale binding
- Kimi participates in the same snapshot-first continuity contract as Claude, Codex and Gemini.
- Restored Core bindings may contain a provider session id that the fresh Kimi adapter process has not hydrated yet.
- In that case `KimiSessionLifecycle` throws `KIMI_SESSION_STALE_BINDING`; Core `SessionRequestHandlerMessageDispatch` treats it as a one-shot stale-binding recovery signal, invalidates the binding, rebinds, and retries the send once.
- Generic `Error` must not be used for this path because generic retryable classification does not preserve the provider session id required for deterministic recovery.

## Effective model identity and settings
- Kimi default model belongs to shared provider settings, not to Project Manager local state.
- Settings persist `providers.kimi.defaultModel`, `providers.kimi.autoUpdate`, and `providers.kimi.thinkingDisplaySyncEnabled`; UI cards and workflow start cards read/write through the shared settings contract.
- Core-applied turn config remains authoritative for outbound sends. Provider-local defaults are only bootstrap fallback.
- Kimi has no reasoning/thinking effort dimension in the current release. UI surfaces must not synthesize a hidden effort field.
- Prompt/system-instruction cadence can ask Kimi for visible progress updates, but it is not a reliable substitute for Wire event handling: during a long tool call the model may emit no new text, so the adapter must rely on Wire `think` chunks and progress events for live UX.

## Agent/system prompt and tool-control capabilities
- Kimi CLI supports full agent replacement through `--agent-file <path>`; this is the correct mechanism for CodeAI-owned managed workflow behavior when Core must replace the provider default system prompt instead of appending instructions to a user turn.
- A custom Kimi agent file is YAML with `version: 1`, `agent.name`, `agent.system_prompt_path`, `agent.tools`, optional `agent.exclude_tools`, optional `agent.system_prompt_args`, and optional `agent.subagents`.
- If the agent file does not use `extend: default`, the `tools` list is an explicit allowlist. This gives Core a provider-native way to restrict built-in tools for a specific managed workflow step.
- If the agent file uses `extend: default`, `system_prompt_path` overrides the inherited prompt and `exclude_tools` can remove tools from the built-in default agent. This is useful for incremental profiles but is weaker than a fully explicit CodeAI-owned allowlist.
- Built-in default tools include subagents, user questions, todo list, shell, file read/write/edit, glob/grep, web search/fetch, plan-mode tools, and background task controls. Managed workflow profiles must not assume that the built-in default agent is safe for every step.
- Kimi `--plan` starts or forces plan mode with read-only exploration semantics. It is suitable for provider-native planning profiles but should not replace Core-owned managed stage planning unless Core explicitly selects that mode.
- Kimi supports `--mcp-config-file` and `--mcp-config`; if CodeAI needs strict tool boundaries, managed Kimi sessions should receive a CodeAI-owned empty or curated MCP config instead of loading user-global `~/.kimi/mcp.json`.
- Kimi supports `--skills-dir`; skills are injected into the system prompt context. Managed sessions should either use a CodeAI-owned skills directory or avoid custom skills to keep prompt provenance deterministic.
- Kimi hooks can enforce a second safety layer through `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, session, subagent, compaction, and notification lifecycle events. `PreToolUse` can block sensitive tools or paths by returning a denial decision, but hooks are Beta and should complement, not replace, agent tool allowlists.
- Current CodeAI Hub Kimi runtime materializes a CodeAI-owned managed agent profile under `~/.codeai-hub/providers/kimi/home/codeai-managed-agent/` before Wire startup.
- Current Kimi Wire startup passes `--agent-file <providerHome>/codeai-managed-agent/agent.yaml`, `--mcp-config-file <providerHome>/codeai-managed-agent/mcp-empty.json`, `--skills-dir <providerHome>/codeai-managed-agent/skills-empty`, `--yolo`, and `--work-dir <workspace>`.
- The managed `agent.yaml` does not extend the Kimi default agent. Its tool allowlist is limited to `ReadFile`, `ReadMediaFile`, `Glob`, `Grep`, `WriteFile`, and `StrReplaceFile`.
- The managed Kimi system prompt intentionally omits `${KIMI_AGENTS_MD}` and `${KIMI_SKILLS}`. CodeAI Core and the first Core-built user prompt own workflow/project instructions; provider-global project instructions, AGENTS.md blocks, skills, MCP resources, and repository implementation source are not prompt truth for managed Kimi turns.
- The managed profile explicitly denies shell, web, subagents, background tasks, MCP tools, provider skills, and Git operations. Core remains responsible for commits, validation, workflow state transitions, and approval surfaces.
- The managed profile asks Kimi to use summarized reasoning as its default output style during long managed artifact work. It explicitly tells Kimi not to stream or write full detailed chain-of-thought / private scratchpad text, to keep any hidden reasoning minimal, and to compress detailed analysis into short ordinary assistant "reasoning summary" messages. Those summaries must be user-safe operational conclusions: sources inspected, artifact area being changed, boundary/assumption/risk found, and remaining validation. The profile still asks for early and repeated visible progress updates, but the main control is now summary-style reasoning output rather than a thinking-block counter. This is an instruction-level control, not a protocol guarantee: Core must still rely on Wire lifecycle, `think` chunks, and status events to avoid stuck-working UI.
- Kimi still has no confirmed provider-native reasoning effort or encrypted reasoning-summary control in this release; CodeAI controls only reasoning visibility/rendering and the prompt request for visible progress cadence.

## Project Manager surfaces
- Kimi must be visible anywhere users choose or inspect a provider: Settings provider card, Description submit provider picker, workflow start cards, Development Tree start/fix cards, Session UI status-line/model chip, provider labels, and provider color/theme mapping.
- PM must send raw provider/model intent to Core and render Core-owned snapshots. It must not create a Kimi-specific workflow truth or bypass Core managed stage transitions.
- Kimi provider theme id is `kimi`; CSS/design tokens define its accent/fill/border/soft states for Project Manager and Session UI.

## Usage limits
- Kimi usage limits are read from `GET https://api.kimi.com/coding/v1/usages` with the existing `~/.kimi/config.toml` `providers.kimi-for-coding.api_key`; this is the Kimi CLI auth section, not the CodeAI model id.
- The API key is read locally and sent only as an `Authorization: Bearer ...` header to the Kimi endpoint. It must not be logged, persisted into CodeAI settings, or copied into diagnostic artifacts.
- Live payload mapping:
  - `limits[0].detail.used/limit/resetTime` → `usageLimits.currentSession`, label `5h`;
  - `usage.used/limit/resetTime` → `usageLimits.currentWeekAllModels`, label `Weekly`;
  - `parallel.limit` is not rendered as a percent row because the current Session ID usage bar only supports percent windows.
- If config is missing, auth fails, the endpoint is unavailable, or the payload is malformed, `KimiProviderAdapter.refreshUsageLimits(...)` broadcasts a provider-scoped unavailable payload with `providerScopeKey = "kimi:global"`, `usageLimits = null`, source `kimi_unavailable`, and labels `5h` / `Weekly`.
- Session UI must render the fallback as unavailable, not as indefinite loading and not as fake percentages.

## Native diagnostic capture
- Kimi diagnostic capture is Wire-evidence based, not TLS MITM based.
- `KimiProviderAdapter.captureNativeRequest(...)` records a Core-owned applied input envelope with provider home, selected model, user config path, and `wire.jsonl` provenance.
- The Core native request capture writer includes Kimi provider diagnostic context in the same `.jsonl` / `.md` artifact family under `~/.codeai-hub/logs/native-request-capture/`.
- Kimi capture must not require OpenSSL/TLS proxy preflight because the useful evidence is the Wire prompt envelope and provider-home `wire.jsonl` provenance.

## Release packaging
- `packages/Kimi_Module` must be built and packaged as a self-contained provider module artifact during release packaging.
- The installed runtime must be able to import the public `src/index.ts` export surface and instantiate `KimiProviderAdapter` without depending on repo-local TypeScript sources.
- Release scripts must not edit provider versions manually; version bumping remains owned by `build-all.sh`.

## Инварианты
- `KIMI_SHARE_DIR` is mandatory on every runtime/probe/capture invocation.
- `~/.kimi/config.toml` may be referenced for already-authorized credentials/config, but CodeAI-managed runtime writes stay in `~/.codeai-hub/providers/kimi/home`.
- `KimiProviderAdapter` is the only public module facade for Core integration.
- Wire/process/router/session classes are module internals.
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
