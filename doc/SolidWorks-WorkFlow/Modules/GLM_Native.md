# GLM Native Provider Module — Module (SSOT)

## Назначение
GLM Native provider module подключает `glm-5.2` напрямую через Z.AI Coding Chat Completions API без Claude Code, OpenCode или другого agent-клиента-посредника.

Core остаётся владельцем workflow state, prompt/artifact contracts, model identity, reasoning visibility, token usage display и lifecycle. Модуль владеет только HTTP/SSE transport, нормализацией событий и provider-home/runtime profile.

Release `1.2.542` accepted this provider path as the primary GLM 5.2 workflow runtime: managed artifacts are written through the Core-owned workflow tool, reasoning and assistant text stream through normalized dialog bubbles, token usage is surfaced in the status panel, and already-Russian visible reasoning is no longer sent through the localization translator.

## Где живёт код
- Provider package: `packages/GLM_Module/`
- Public Core-facing facade: `packages/GLM_Module/src/provider/glm-native-provider-adapter.ts`
- Runtime profile: `packages/GLM_Module/src/provider/glm-native-runtime-profile.ts`
- Agent runtime helpers: `packages/GLM_Module/src/provider/glm-native-agent-runtime.ts`
- SSE parser: `packages/GLM_Module/src/provider/glm-native-sse-parser.ts`
- Public module export: `packages/GLM_Module/src/index.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `glmNative`.
- User-facing provider label: `GLM`.
- Default model id: `glm-5.2`.
- Endpoint family: `https://api.z.ai/api/coding/paas/v4/chat/completions`.
- Context window used by CodeAI Hub status panel: `1_000_000` tokens.
- Core registry creates the adapter through the provider descriptor/module loader path; external code must enter through `GlmProviderAdapter` and must not import runtime/parser internals directly.

## Runtime profile and provider-home
- Managed workspace runtime state lives under `.codeai-hub/<workspace-slug>/runtime/providers/glm-native/home`.
- Global fallback provider home remains `~/.codeai-hub/providers/glm-native/home`.
- GLM Native connection settings (`apiKey`, `baseUrl`) are global under `~/.codeai-hub/settings/settings.json` at `providers.glmNative`, so new workspaces reuse the same Z.AI credentials.
- Workspace settings still own workflow-local GLM choices such as `defaultModel`, `reasoningEffort`, `thinkingEnabled`, and `thinkingDisplaySyncEnabled`.
- API key resolution order: explicit Core options, global `providers.glmNative.apiKey`, workspace `providers.glmNative.apiKey` for legacy migration, `ZAI_API_KEY`, `ZHIPU_API_KEY`, then `Z_AI_API_KEY`.
- Full native GLM diagnostic logs are written under `runtime/providers/glm-native/home/sessions/YYYY/MM/DD/<provider-session-id>.jsonl`.
- These provider-home logs intentionally record full local debug data for each turn: resolved runtime profile, request headers/body, streamed raw SSE frames, parsed deltas, tool calls/results, usage, retries and errors. Because this is a provider-home diagnostic surface, request headers include the actual `Authorization` value used for the call.
- Provider-home logs are runtime artifacts only; they must not be copied into user-facing workflow artifacts or repository-tracked files.

## Session lifecycle
- One Core send maps to one or more streaming Chat Completions requests when the model calls workflow tools.
- The adapter keeps an in-memory session message list for the active Core provider session.
- The adapter prepends a provider-owned system message to every request. After the `1.2.584` tool retest follow-up, this system context identifies the runtime as a native GLM CodeAI Hub agent and describes only the GLM-owned executable tool surface. Tool definitions are not duplicated inside the system text; they are sent through the GLM `tools` request field.
- The system message includes an explicit language contract from Core applied turn config: chat replies, progress messages and reasoning/thinking summaries follow the selected messages/reasoning language, while user-facing artifact prose follows Settings → General → Artifacts for the User.
- Assistant turns keep both user-visible `content` and provider `reasoning_content`; later requests replay `reasoning_content` unchanged in assistant messages for Z.AI/OpenAI-compatible preserved-thinking continuity.
- Tool-call turns persist assistant `tool_calls` and matching `role: "tool"` results in the session history so later requests preserve the actual agent loop.
- `closeSession` aborts in-flight requests and removes local session state so Stop can unblock the dialog.
- Every send must finish with `turn_completed` or `turn_failed`.

## Request and reasoning contract
- Native GLM uses the same Z.AI Coding Plan endpoint shape as OpenCode: `stream: true`, `thinking.type: "enabled"` and `thinking.clear_thinking: false` when reasoning is enabled.
- Native GLM also mirrors OpenCode's Z.AI request identity headers for transport stability: `x-session-affinity`, `X-Session-Id` and a stable `User-Agent`.
- Native GLM sends OpenAI-compatible `messages` with a dedicated `system` role, `tools`, `tool_choice: "auto"` and `tool_stream: true`.
- The GLM request exposes GLM-owned executable tools in Z.AI/OpenAI-compatible `{ type: "function", function: { name, description, parameters } }` format. The current standalone/workflow tool surface is `exec_command`, `grep_files`, `glob_files`, `read_file`, `read_file_anchored`, `write_file`, `edit_file`, `edit_file_by_anchor`, `apply_patch`, `web_search`, `web_fetch`, `browser_fetch`, `workspace_symbols`, `go_to_definition`, `find_references`, `git_status`, `git_diff`, `git_log`, `git_blame`, `run_tests`, and `write_workflow_artifact`.
- Declared GLM tools must have local executors. The `1.2.584` retest showed that copied Codex-native declarations such as `web_search` and MCP/Playwright names caused wasted turns because they were visible in `tools` but not wired locally. Native GLM now keeps provider-specific tool names and executor coverage aligned instead of exposing copied-but-unavailable Codex runtime surfaces.
- Codebase search should use `grep_files` / `glob_files`, which run ripgrep through streaming `spawn` with workspace scoping, Homebrew PATH fallback, output limits, directory search, file-path grep, and exact-file glob support. `exec_command` also uses streaming process execution instead of Node `child_process.exec`, avoiding the observed `rg` hang under the old executor.
- Anchored editing is available through `read_file_anchored` and `edit_file_by_anchor`: reads return short per-line anchors, edits must reference those anchors, and stale anchors are rejected before writing. `edit_file` is also available for exact single-occurrence `old_string` -> `new_string` replacements.
- `apply_patch` is executed in-process by GLM Native for the Codex patch grammar subset used by provider agents: add file, delete file, update file, move file, and context-line replacements. It must not spawn an external `apply_patch` binary.
- Web lookup uses `web_search` and `web_fetch` local executors. They are provider tools, not Codex web tool aliases, and failures are returned as tool results with source/status details. `web_fetch` also marks sparse JavaScript-rendered HTML shells as `partial: true` with a warning instead of presenting navigation-only text as a complete source.
- `browser_fetch` uses an installed Chrome/Chromium/Edge executable when present to fetch rendered DOM text. If no supported browser binary exists, it returns an explicit tool error instead of pretending JS-rendered content was fetched.
- `workspace_symbols`, `go_to_definition`, and `find_references` are GLM-owned best-effort code navigation tools backed by ripgrep over TypeScript/JavaScript files. They are useful for quick navigation, but they are not full tsserver/LSP semantic navigation and they return `semantic: false` where relevant. Full LSP/call hierarchy remains a future shared provider capability.
- `git_status`, `git_diff`, `git_log`, `git_blame`, and `run_tests` wrap common shell workflows and return structured fields so GLM does not need to parse ad-hoc command output for routine status, history and test checks.
- When reasoning is disabled, the request sends `thinking.type: "disabled"` and omits `reasoning_effort`.
- User-facing reasoning effort choices are only `max` and `high`. Legacy saved values are normalized: `xhigh` maps to `max`, `medium`/`low` map to `high`, and `minimal`/`none` disable thinking.
- The provider may retry transient transport/opening failures, including `EPIPE`, retryable HTTP statuses, and interrupted SSE streams that fail before the first useful reasoning/content/usage event. Retry attempts are one non-nested request loop with a short fixed 500 ms delay; `retry-after-ms` / `retry-after` from Z.AI is honored but capped at 1500 ms. It must not silently downgrade the model, disable reasoning, or switch to non-streaming mode.
- Failure messages must preserve useful transport details such as `ECONNRESET` or HTTP status so the dialog does not collapse different provider failures into generic `fetch failed`.

## Event normalization
- SSE `choices[].delta.reasoning_content` is buffered into readable `thinking` events tagged `thinking`; raw provider micro-chunks must not become one visible line per SSE frame.
- Core may skip localization dispatch for already-Russian `thinking` blocks, but mixed English/Russian reasoning stays eligible for reasoning translation. This is display policy, not native transcript mutation.
- SSE `choices[].delta.content` becomes normalized assistant live text with `tag: "live"` so the existing dialog merge path renders one growing assistant bubble instead of one card per SSE frame.
- SSE `choices[].delta.tool_calls` is accumulated by streamed tool-call index into complete function call ids, names and JSON arguments before execution.
- SSE `usage.prompt_tokens`, `usage.completion_tokens`, and `usage.total_tokens` become provider token usage events with limit `1_000_000`.
- Plan usage limits (5h / Weekly) are SEPARATE from the per-turn context token usage above. `GlmProviderAdapter.refreshUsageLimits()` (Core dispatches it by duck-typing on session lifecycle) fetches the Z.AI account quota from the monitor endpoint `{origin}/api/monitor/usage/quota/limit` (origin derived from `baseUrl`, bare `Authorization` header — no `Bearer`) and broadcasts a `kind: "usage_limits"` stream payload with `providerScopeKey: "glmNative:global"` and labels `5h` / `Weekly`, which the session top bar renders. Parsing/classification lives in `packages/GLM_Module/src/provider/glm-usage-limits-reader.ts`: 5h = `TOKENS_LIMIT` unit `3`, Weekly = `TOKENS_LIMIT` unit `6`, `TIME_LIMIT` dropped; classification is by `(type, unit)`, never by array position. Released in `1.2.546`. Core and UI were unchanged; Kimi/GLM OpenCode are unaffected.
- As of `1.2.547`, Core also refreshes usage limits on `turn_completed` (provider-neutral hook `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-turn-refresh.ts`), in addition to `binding_ready`. GLM already worked on `binding_ready`; this only makes delivery more reliable across providers.
- Usage detail fields such as cached/reasoning tokens are provider diagnostics only unless Core promotes them through a shared token telemetry contract.

## Settings and selection surfaces
- Settings exposes a dedicated `GLM` tab, not the OpenCode tab.
- Workflow provider pickers and start cards expose `glmNative` with model `glm-5.2`.
- Session status displays `GLM 5.2 / GLM` and uses `providers.glmNative.thinkingDisplaySyncEnabled` for reasoning visibility.
- Settings must present `thinkingEnabled` as the on/off control and `max`/`high` as the effort control; do not reintroduce cross-provider compatibility labels as selectable GLM values.
- Workflow start cards and Development Tree start/fix cards expose the real GLM choices only: model `glm-5.2`, reasoning `max` / `high` / `off`. Their selections are persisted through scoped settings before session creation; the launch payload must not become a second model/reasoning source of truth.
- Project Manager must send raw provider/model intent to Core and persist provider-local choices through Settings; it must not own separate workflow truth or rewrite `glmNative` to OpenCode/Kimi.

## Packaging
- GLM Native produces `glm-module-<version>.tar.bz2` and `assets/providers/glm-native/manifest.json`.
- Release packaging installs the provider under `~/.codeai-hub/providers/glm-native/<version>`.
- Core runtime bundle must include `@codeai-hub/glm-module` so installed releases can load the native provider without repo-local TypeScript sources.

## Инварианты
- `glmNative` is a distinct provider id, not an alias of `glmOpenCode`, `kimiCode`, or `claudeCodeCli`.
- Native GLM does not use Claude Code/Claude Agent SDK.
- Native GLM does not use OpenCode runtime/session storage.
- Reasoning translation/display policy is Core-owned and follows the same `thinking` event contract as other providers.
- Native GLM provider-home logs are the diagnostic source for request shape, reasoning effort and transport retries; UI-visible translated reasoning is not proof of the raw provider language.
- Unverified account quota/5-hour/weekly limit telemetry must not be faked.

## Связанные контракты
- OpenCode wrapper provider: `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md`
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Provider failure/recovery: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Session UI behavior: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
