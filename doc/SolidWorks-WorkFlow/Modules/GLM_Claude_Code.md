# GLM-Claude-Code Provider Module — Module (SSOT)

## Назначение
GLM-Claude-Code provider module подключает GLM 5.2 к Core через Claude Code-compatible runtime. Это отдельный runtime-вариант для проверки моделей Z.AI/GLM в тех же workflow-условиях, где уже работает Claude Agent SDK path.

Модуль заменяет закрытый эксперимент `Kimi-Claude-Code`. Native Kimi Wire provider (`kimiCode`) остается единственным Kimi-вариантом в продуктовых поверхностях, а GLM-Claude-Code получает собственный provider id, home, settings/config и user-facing label.

## Где живёт код
- Runtime package: `packages/Claude_Module/`
- Public Core-facing facade: `packages/Claude_Module/src/glm-claude-code/glm-claude-code-provider-adapter.ts`
- Runtime/auth profile: `packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.ts`
- Auth manager: `packages/Claude_Module/src/glm-claude-code/glm-claude-code-sdk-auth-manager.ts`
- Model capabilities: `packages/Claude_Module/src/glm-claude-code/glm-claude-code-model-capabilities.ts`
- Stale binding classifier: `packages/Claude_Module/src/session/glm-claude-code-session-lifecycle.ts`
- Live feasibility runner: `packages/Claude_Module/src/diagnostics/glm-claude-code-runtime-probe-runner.ts`
- Public module export: `packages/Claude_Module/src/index.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `glmClaudeCode`.
- User-facing provider label: `GLM-Claude-Code`.
- Default model id: `glm-5.2`.
- Claude-compatible opus/sonnet/haiku alias defaults: `glm-5.2`.
- Status/session model label: `GLM 5.2 / Claude-Code`.
- Runtime client family: Claude Code SDK/protocol.
- Model/account family: Z.AI / GLM Anthropic-compatible endpoint.
- Core registry resolves the standalone installed provider runtime `~/.codeai-hub/providers/glm-claude-code/<version>` before any bundled fallback; external code must enter through `GlmClaudeCodeProviderAdapter` and must not import runtime/auth/session internals directly.

## Runtime profile and provider-home
- In managed workspace runs, CodeAI-managed runtime state lives under the workspace capsule at `.codeai-hub/<workspace-slug>/runtime/providers/glm-claude-code/home`.
- The global fallback/diagnostic provider home remains `~/.codeai-hub/providers/glm-claude-code/home` when no workspace capsule home is supplied.
- Local provider config lives at `~/.codeai-hub/providers/glm-claude-code/config.json`.
- Claude project path for this provider is isolated below that home and uses the `glm-claude-code` project slug.
- Runtime env maps the Z.AI Anthropic-compatible endpoint into Claude SDK variables:
  - `ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic`
  - `ANTHROPIC_API_KEY=<resolved Z.AI API key>`
- API key resolution order:
  1. `CODEAI_GLM_CLAUDE_CODE_API_KEY`
  2. `GLM_CLAUDE_CODE_API_KEY`
  3. `ZAI_API_KEY`
  4. `~/.codeai-hub/providers/glm-claude-code/config.json` field `apiKey`
- The key must not be logged, copied into captured artifacts, or written into repository-tracked files. It is passed only to the Claude SDK process environment as `ANTHROPIC_API_KEY` for this provider profile.

## Claude provider boundary
- The real Claude provider remains subscription/OAuth-oriented and continues to use `~/.codeai-hub/providers/claude/home`.
- GLM-Claude-Code must not mutate Claude auth behavior, Claude subscription env, Claude provider home, Claude settings, or Claude usage-limit readers.
- Shared Claude SDK helpers may be reused only through explicit runtime profile options.
- `GlmClaudeCodeProviderAdapter` is a separate facade; provider-specific behavior must not be hidden as broad branches in the normal Claude provider path.

## Instruction and tool profile
- Normal GLM-Claude-Code workflow turns reuse the CodeAI-owned Claude workflow system prompt.
- Workflow templates remain in the first Core-built user prompt.
- `settingSources: []` remains mandatory so Claude Code does not auto-load user/project/local settings or memory files.
- Tool profile follows the Claude workflow tool target: `Read`, `Write`, `Edit`.
- Core-managed workflow prompts must continue to provide absolute artifact target paths.

## Model identity and settings
- Settings persist under `providers.glmClaudeCode`, separate from `providers.claude`, `providers.kimi`, and all native provider settings.
- Settings expose config path, API-key guidance, base URL and model defaults for `glm-5.2`.
- Reasoning effort is not a proven GLM-Claude-Code setting until live provider behavior confirms support.
- Core-applied turn config remains authoritative for outbound sends. Settings are defaults only and must not become Project Manager-local truth.
- Provider inheritance between managed workflow steps must preserve `glmClaudeCode` and must not fall back to `claudeCode`, `kimiCode`, or another default provider.

## Session lifecycle and continuity
- One Core send maps to one Claude SDK `query(...)` turn under the GLM-Claude-Code runtime profile.
- Lifecycle must terminate every send as `turn_completed` or `turn_failed`.
- Restored Core bindings may contain a provider session id that a fresh runtime process has not hydrated. In that case the module throws `GLM_CLAUDE_CODE_SESSION_STALE_BINDING`; Core treats it as a one-shot stale-binding recovery signal, invalidates the binding, rebinds, and retries once.
- Stop/shutdown behavior follows the Claude SDK interrupt path and must not leave Session UI in a permanent working/resuming lock.

## Diagnostics and capture
- `GlmClaudeCodeRuntimeProbeRunner` is the live compatibility probe for this runtime.
- Native request capture for this provider uses the Claude capture machinery with GLM target rules: `api.z.ai` and `/api/anthropic`.
- Capture artifacts must show provider-visible system prompt, first user prompt, selected model, base URL class, and tool list without leaking the Z.AI API key.

## Usage limits and context telemetry
- Claude usage-limit and `/context` readers do not apply to GLM-Claude-Code.
- GLM/Z.AI account quota telemetry is not treated as available until a dedicated, proven endpoint and auth source are wired.
- First release surfaces usage/context telemetry as explicitly unavailable rather than fake or indefinitely loading data.

## Packaging
- GLM-Claude-Code produces a standalone `glm-claude-code-module-<version>.tar.bz2` provider tarball and manifest entry while reusing the Claude module runtime implementation internally.
- `@codeai-hub/claude-module` must export `GlmClaudeCodeProviderAdapter` and its public runtime/model helpers.
- Release packaging installs GLM under its own provider id/home so runtime surfaces can show and manage it independently from the original Claude provider.

## Инварианты
- `glmClaudeCode` is a distinct provider id, not an alias of `claudeCode`, `kimiCode`, or the archived `kimiClaudeCode` experiment.
- Provider home is always the workspace capsule GLM home for managed workspace runs, or `~/.codeai-hub/providers/glm-claude-code/home` for global fallback/diagnostic runs, unless an explicit diagnostic override is supplied.
- Z.AI API keys are secret runtime inputs and must not be logged or persisted into tracked files.
- Existing Claude and native Kimi behavior must remain unchanged by this module.
- Every user-facing provider surface that offers GLM-Claude-Code must send raw provider/model intent to Core; Project Manager must not own separate workflow truth.
- Unproven telemetry must render as unavailable.

## Связанные контракты
- Claude provider module: `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- Native Kimi provider module: `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Provider failure/recovery: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Session UI behavior: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
