# GLM-OpenCode Provider Module — Module (SSOT)

## Назначение
GLM-OpenCode provider module подключает GLM 5.2 как workflow-провайдера через OpenCode CLI и Z.AI Coding Plan endpoint. Это отдельный runtime-вариант рядом с `GLM-Claude-Code`; существующий Claude-compatible GLM provider не меняется.

Главная цель модуля — не владеть собственным GLM API-клиентом. CodeAI Hub отдает agent runtime OpenCode, а Core остается владельцем workflow state, prompt/artifact contracts, settings snapshot, model identity и user-facing lifecycle.

## Где живёт код
- Provider package: `packages/GLM_OpenCode_Module/`
- Public Core-facing facade: `packages/GLM_OpenCode_Module/src/provider/glm-opencode-provider-adapter.ts`
- OpenCode process runner: `packages/GLM_OpenCode_Module/src/provider/glm-opencode-runner.ts`
- Runtime/auth profile: `packages/GLM_OpenCode_Module/src/provider/glm-opencode-runtime-profile.ts`
- Output normalization: `packages/GLM_OpenCode_Module/src/provider/glm-opencode-output-normalizer.ts`
- Public module export: `packages/GLM_OpenCode_Module/src/index.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `glmOpenCode`.
- User-facing provider label: `GLM-OpenCode`.
- Default model id: `glm-5.2`.
- OpenCode model selector: `zai-coding-plan/glm-5.2`.
- Runtime client family: OpenCode CLI.
- Model/account family: Z.AI / GLM Coding Plan.
- Core registry resolves the standalone installed provider runtime `~/.codeai-hub/providers/glm-opencode/<version>` before any bundled fallback; external code must enter through `GlmOpenCodeProviderAdapter` and must not import runtime/process internals directly.

## Runtime profile and provider-home
- In managed workspace runs, CodeAI-managed runtime state lives under the workspace capsule at `.codeai-hub/<workspace-slug>/runtime/providers/glm-opencode/home`.
- The global fallback/diagnostic provider home remains `~/.codeai-hub/providers/glm-opencode/home`.
- Local provider config lives at `~/.codeai-hub/providers/glm-opencode/config.json`.
- OpenCode process command defaults to `opencode` and may be overridden only by local config fields `openCodeCommand`, `opencodeCommand` or `opencodePath`.
- CodeAI Hub materializes isolated OpenCode runtime files before each profile is used:
  - `<providerHome>/config/opencode/opencode.json` declares provider id `zai-coding-plan`, model `glm-5.2`, adapter `@ai-sdk/openai-compatible`, `options.baseURL=https://api.z.ai/api/coding/paas/v4`, `timeout=120000`, and `chunkTimeout=60000`;
  - `<providerHome>/data/opencode/auth.json` stores the runtime-only Z.AI API credential for `zai-coding-plan`.
- The module must not rely on the user's global `~/.config/opencode/opencode.json` or `~/.local/share/opencode/auth.json`; those may not contain Z.AI.
- Runtime launches one turn as:
  - `opencode --print-logs --log-level INFO run --dangerously-skip-permissions --format json --model zai-coding-plan/glm-5.2 <prompt>`
- API key resolution order:
  1. `ZAI_API_KEY`
  2. `providers.glmOpenCode.apiKey` from the active workspace settings snapshot
  3. `~/.codeai-hub/providers/glm-opencode/config.json` fields `apiKey`, `zaiApiKey`, `zAiApiKey`, `glmApiKey`, or `api_key`
- The key must not be logged, copied into captured artifacts, or written into repository-tracked files. It is passed only as `ZAI_API_KEY` in the OpenCode process environment.

## Model identity and settings
- Settings persist under `providers.glmOpenCode`, separate from `providers.glmClaudeCode`, `providers.kimi`, and all native provider settings.
- Settings expose API-key guidance, config path, default model and reasoning display toggle.
- Core-applied turn config remains authoritative for outbound sends. Provider-local defaults are only bootstrap fallback.
- Provider inheritance between managed workflow steps must preserve `glmOpenCode` and must not fall back to `glmClaudeCode`, `kimiCode`, `claudeCode`, or another default provider.

## Session lifecycle
- One Core send maps to one `opencode run ... --format json` process.
- The adapter emits `turn_started`, normalized visible assistant text events, and then `turn_completed` or `turn_failed`.
- Stop/shutdown kills the active OpenCode child process and must not leave Session UI in a permanent working/input-locked state.
- GLM-OpenCode does not currently rely on provider-native resume. Core continuity remains snapshot-first and can create a fresh OpenCode process for the next turn.

## Output normalization
- OpenCode JSON events with `type: "text"` become normalized assistant dialog events.
- OpenCode JSON events with `type: "error"` become normalized `turn_failed` events.
- Malformed JSON, logs and non-user-visible OpenCode events stay provider diagnostics and are not promoted into user-facing dialog content.

## Diagnostics and capture
- Native request capture is diagnostic-only for this provider. The adapter records the applied OpenCode model selector and config path; request matching targets `api.z.ai` with `/api/coding/paas/v4`.
- Usage-limit telemetry is explicitly unavailable until Z.AI exposes and we verify a stable account/quota endpoint for this runtime.
- Settings version diagnostics read the installed OpenCode CLI through `opencode --version`; CodeAI Hub must not try to update it through `npm install -g opencode`.
- OpenCode provider/model diagnostics must be tested against the isolated provider home because global OpenCode credentials are not runtime truth for GLM-OpenCode.

## Packaging
- GLM-OpenCode produces a standalone `glm-opencode-module-<version>.tar.bz2` provider tarball and `assets/providers/glm-opencode/manifest.json`.
- Release packaging installs GLM-OpenCode under its own provider id/home so runtime surfaces can show and manage it independently from GLM-Claude-Code.

## Инварианты
- `glmOpenCode` is a distinct provider id, not an alias of `glmClaudeCode`, `kimiCode`, or `claudeCode`.
- CodeAI Hub does not own a native GLM API client in this module.
- OpenCode CLI must be present and authenticated through Z.AI API key configuration before workflow sends.
- Existing GLM-Claude-Code behavior must remain unchanged by this module.
- Every user-facing provider surface that offers GLM-OpenCode must send raw provider/model intent to Core; Project Manager must not own separate workflow truth.
- Unproven telemetry must render as unavailable.

## Связанные контракты
- GLM-Claude-Code provider module: `doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md`
- Native Kimi provider module: `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Provider failure/recovery: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Session UI behavior: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
