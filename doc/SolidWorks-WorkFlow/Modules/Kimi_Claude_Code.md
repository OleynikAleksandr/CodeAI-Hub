# Kimi-Claude-Code Provider Module — Module (SSOT)

## Назначение
Kimi-Claude-Code provider module подключает Kimi Code / Kimi 2.6 к Core через Claude Code-compatible runtime. Это отдельный runtime-вариант для сравнения поведения Kimi в двух условиях: native Kimi Wire provider (`kimiCode`) и Kimi model через Claude Code SDK/protocol (`kimiClaudeCode`).

Модуль не заменяет Claude provider и не заменяет native Kimi provider. Его задача — дать пользователю проверяемый третий вариант поведения с тем же CodeAI-owned workflow prompt/system profile, который используется в Claude-managed turns.

## Где живёт код
- Runtime package: `packages/Claude_Module/`
- Public Core-facing facade: `packages/Claude_Module/src/kimi-claude-code/kimi-claude-code-provider-adapter.ts`
- Runtime/auth profile: `packages/Claude_Module/src/kimi-claude-code/kimi-claude-code-runtime-profile.ts`
- Auth manager: `packages/Claude_Module/src/kimi-claude-code/kimi-claude-code-sdk-auth-manager.ts`
- Model capabilities: `packages/Claude_Module/src/kimi-claude-code/kimi-claude-code-model-capabilities.ts`
- Stale binding classifier: `packages/Claude_Module/src/session/kimi-claude-code-session-lifecycle.ts`
- Live feasibility runner: `packages/Claude_Module/src/diagnostics/kimi-claude-code-runtime-probe-runner.ts`
- Public module export: `packages/Claude_Module/src/index.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `kimiClaudeCode`.
- User-facing provider label: `Kimi Claude Code` / `Kimi-Claude-Code`.
- Default model id: `kimi-for-coding`.
- Status/session model label: `Kimi 2.6 / Claude Code`.
- Runtime client family: Claude Code SDK/protocol.
- Model/account family: Kimi Code Anthropic-compatible endpoint.
- Core registry loads the adapter from the Claude module export; external code must enter the runtime through `KimiClaudeCodeProviderAdapter` and must not import runtime/auth/session internals directly.

## Runtime profile and provider-home
- CodeAI-managed runtime state lives under `~/.codeai-hub/providers/kimi-claude-code/home`.
- Claude project path for this provider is isolated below that home and uses the `kimi-claude-code` project slug.
- Runtime env maps the Kimi Code Anthropic-compatible endpoint into Claude SDK variables:
  - `ANTHROPIC_BASE_URL=https://api.kimi.com/coding`
  - `ANTHROPIC_API_KEY=<resolved Kimi Code API key>`
- API key resolution order:
  1. `CODEAI_KIMI_CLAUDE_CODE_API_KEY`
  2. `KIMI_API_KEY`
  3. `~/.kimi/config.toml` `providers.kimi-for-coding.api_key`
- The key is never persisted into CodeAI settings, provider home, logs, capture artifacts, or docs. It is only passed to the Claude SDK process environment as `ANTHROPIC_API_KEY` for this provider profile.

## Claude provider boundary
- The real Claude provider remains subscription/OAuth-oriented and continues to use `~/.codeai-hub/providers/claude/home`.
- Kimi-Claude-Code must not mutate Claude auth behavior, Claude subscription env, Claude provider home, Claude settings, or Claude usage-limit readers.
- Shared Claude SDK helpers may be reused only through explicit runtime profile options.
- `KimiClaudeCodeProviderAdapter` is a separate facade; provider-specific behavior must not be hidden as broad `if kimi` branches in the normal Claude provider path.

## Instruction and tool profile
- Normal Kimi-Claude-Code workflow turns reuse the CodeAI-owned Claude workflow system prompt, not provider-global project instructions.
- Workflow templates remain in the first Core-built user prompt.
- `settingSources: []` remains mandatory so Claude Code does not auto-load user/project/local settings or memory files.
- Tool profile follows the Claude workflow tool target: `Read`, `Write`, `Edit`.
- Live probe evidence showed the SDK init event still advertises broader Claude Code runtime surfaces such as slash commands, agents, and skills, but the executable provider tool list for turns was restricted to `Edit`, `Read`, `Write`.
- Core-managed workflow prompts must continue to provide absolute artifact target paths. Probe evidence showed that vague "current directory" instructions can cause Kimi to choose a path outside the SDK `cwd`.

## Model identity and settings
- Settings persist under `providers.kimiClaudeCode`, separate from `providers.claude` and `providers.kimi`.
- First release exposes a single default model: `kimi-for-coding`.
- Reasoning effort is not a supported Kimi-Claude-Code setting in this release.
- The Session UI thinking display toggle can hide/show emitted thinking/progress messages, but it is not a proven provider-native reasoning-cost control for this runtime.
- Core-applied turn config remains authoritative for outbound sends. Settings are defaults only and must not become Project Manager-local truth.
- Provider inheritance between managed workflow steps must preserve `kimiClaudeCode` and must not fall back to `claudeCode` or `kimiCode`.

## Session lifecycle and continuity
- One Core send maps to one Claude SDK `query(...)` turn under the Kimi-Claude-Code runtime profile.
- Lifecycle must terminate every send as `turn_completed` or `turn_failed`.
- Restored Core bindings may contain a provider session id that a fresh runtime process has not hydrated. In that case the module throws `KIMI_CLAUDE_CODE_SESSION_STALE_BINDING`; Core treats it as a one-shot stale-binding recovery signal, invalidates the binding, rebinds, and retries once.
- Stop/shutdown behavior follows the Claude SDK interrupt path and must not leave Session UI in a permanent working/resuming lock.

## Diagnostics and capture
- `KimiClaudeCodeRuntimeProbeRunner` is the live compatibility probe for this runtime. The accepted 2026-05-19 evidence showed:
  - short-answer probe passed through `ANTHROPIC_BASE_URL=https://api.kimi.com/coding`;
  - SDK stream reported model `kimi-for-coding`;
  - isolated home was `~/.codeai-hub/providers/kimi-claude-code/home`;
  - short final answer returned `KIMI_CLAUDE_CODE_PROBE_OK`;
  - tool-loop probe passed when prompts used explicit absolute target paths;
  - explicit SDK `title` prevents unwanted auto-title usage entries.
- Native request capture for this provider uses the Claude capture machinery with Kimi target rules: `api.kimi.com` and `/coding`.
- Capture artifacts must show provider-visible system prompt, first user prompt, selected model, base URL class, and tool list without leaking the Kimi API key.

## Usage limits and context telemetry
- Claude usage-limit and `/context` readers do not apply to Kimi-Claude-Code.
- Native Kimi usage endpoint data must not be reused unless the same account/API-key source is proven applicable for this runtime.
- First release surfaces usage/context telemetry as explicitly unavailable rather than fake or indefinitely loading data.
- Session ID usage bar maps this provider to the Kimi label family for unavailable-state rendering.

## Packaging
- Kimi-Claude-Code does not produce a separate provider tarball while it reuses the Claude module runtime artifact.
- `@codeai-hub/claude-module` must export `KimiClaudeCodeProviderAdapter` and its public runtime/model helpers.
- Release packaging continues to build/package the Claude module artifact; Core treats Kimi-Claude-Code as an additional provider descriptor loaded from that artifact.

## Инварианты
- `kimiClaudeCode` is a distinct provider id, not an alias of `claudeCode` or `kimiCode`.
- Provider home is always `~/.codeai-hub/providers/kimi-claude-code/home` unless an explicit diagnostic override is supplied.
- Kimi API keys are secret runtime inputs and must not be logged or persisted.
- Existing Claude and native Kimi behavior must remain unchanged by this module.
- Every user-facing provider surface that offers Kimi-Claude-Code must send raw provider/model intent to Core; Project Manager must not own separate workflow truth.
- Unproven telemetry must render as unavailable.

## Связанные контракты
- Claude provider module: `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- Native Kimi provider module: `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Provider failure/recovery: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Session UI behavior: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
