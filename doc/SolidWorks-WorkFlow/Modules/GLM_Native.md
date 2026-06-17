# GLM Native Provider Module — Module (SSOT)

## Назначение
GLM Native provider module подключает `glm-5.2` напрямую через Z.AI Coding Chat Completions API без Claude Code, OpenCode или другого agent-клиента-посредника.

Core остаётся владельцем workflow state, prompt/artifact contracts, model identity, reasoning visibility, token usage display и lifecycle. Модуль владеет только HTTP/SSE transport, нормализацией событий и provider-home/runtime profile.

## Где живёт код
- Provider package: `packages/GLM_Module/`
- Public Core-facing facade: `packages/GLM_Module/src/provider/glm-native-provider-adapter.ts`
- Runtime profile: `packages/GLM_Module/src/provider/glm-native-runtime-profile.ts`
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
- The API key must not be logged, committed, copied into artifacts, or written into repository-tracked files.

## Session lifecycle
- One Core send maps to one streaming Chat Completions request.
- The adapter keeps an in-memory session message list for the active Core provider session.
- Assistant turns keep both user-visible `content` and provider `reasoning_content`; later requests replay `reasoning_content` unchanged in assistant messages for Z.AI/OpenAI-compatible preserved-thinking continuity.
- `closeSession` aborts in-flight requests and removes local session state so Stop can unblock the dialog.
- Every send must finish with `turn_completed` or `turn_failed`.

## Request and reasoning contract
- Native GLM uses the same Z.AI Coding Plan endpoint shape as OpenCode: `stream: true`, `thinking.type: "enabled"` and `thinking.clear_thinking: false` when reasoning is enabled.
- When reasoning is disabled, the request sends `thinking.type: "disabled"` and omits `reasoning_effort`.
- User-facing reasoning effort choices are only `max` and `high`. Legacy saved values are normalized: `xhigh` maps to `max`, `medium`/`low` map to `high`, and `minimal`/`none` disable thinking.
- The provider may retry transient transport/opening failures, retryable HTTP statuses, and interrupted SSE streams that fail before the first useful reasoning/content/usage event. It must not silently downgrade the model, disable reasoning, or switch to non-streaming mode.
- Failure messages must preserve useful transport details such as `ECONNRESET` or HTTP status so the dialog does not collapse different provider failures into generic `fetch failed`.

## Event normalization
- SSE `choices[].delta.reasoning_content` is buffered into readable `thinking` events tagged `thinking`; raw provider micro-chunks must not become one visible line per SSE frame.
- SSE `choices[].delta.content` becomes normalized assistant live text with `tag: "live"` so the existing dialog merge path renders one growing assistant bubble instead of one card per SSE frame.
- SSE `usage.prompt_tokens`, `usage.completion_tokens`, and `usage.total_tokens` become provider token usage events with limit `1_000_000`.
- Usage detail fields such as cached/reasoning tokens are provider diagnostics only unless Core promotes them through a shared token telemetry contract.

## Settings and selection surfaces
- Settings exposes a dedicated `GLM` tab, not the OpenCode tab.
- Workflow provider pickers and start cards expose `glmNative` with model `glm-5.2`.
- Session status displays `GLM 5.2 / GLM` and uses `providers.glmNative.thinkingDisplaySyncEnabled` for reasoning visibility.
- Settings must present `thinkingEnabled` as the on/off control and `max`/`high` as the effort control; do not reintroduce cross-provider compatibility labels as selectable GLM values.
- Project Manager must send raw provider/model intent to Core; it must not own separate workflow truth or rewrite `glmNative` to OpenCode/Kimi.

## Packaging
- GLM Native produces `glm-module-<version>.tar.bz2` and `assets/providers/glm-native/manifest.json`.
- Release packaging installs the provider under `~/.codeai-hub/providers/glm-native/<version>`.
- Core runtime bundle must include `@codeai-hub/glm-module` so installed releases can load the native provider without repo-local TypeScript sources.

## Инварианты
- `glmNative` is a distinct provider id, not an alias of `glmOpenCode`, `kimiCode`, or `claudeCodeCli`.
- Native GLM does not use Claude Code/Claude Agent SDK.
- Native GLM does not use OpenCode runtime/session storage.
- Reasoning translation/display policy is Core-owned and follows the same `thinking` event contract as other providers.
- Unverified account quota/5-hour/weekly limit telemetry must not be faked.

## Связанные контракты
- OpenCode wrapper provider: `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md`
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Provider failure/recovery: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Session UI behavior: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
