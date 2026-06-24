# Codex Provider Invocation Flags - Module SSOT

**Status:** implemented SSOT  
**Last verified:** 2026-05-03, release `1.2.131`
**Owner module:** `packages/Codex_AppServer_Module/`

This document records the actual CodeAI Hub Codex invocation surface that shapes model behavior for all current Codex models. It is a runtime contract, not a proposal.

## Source Files

- `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts` - `codex app-server` startup args, provider-home env, JSON-RPC initialize handshake.
- `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.ts` - runtime provider-home `config.toml` summary materialization before App Server startup.
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` - normal `thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, reasoning-summary policy.
- `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts` - CodeAI Hub-owned early-architecture `baseInstructions` and thread config.
- `packages/Codex_AppServer_Module/src/types/codex-model-capabilities.ts` - runtime capability registry for Codex models, including `supportsReasoningSummary` and reasoning effort options.
- `packages/Codex_AppServer_Module/src/translation/codex-app-server-translation-service.ts` and `src/translation/codex-translation-prompt-profile.ts` - provider-owned Codex App Server translation runtime and prompt profile.
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts` - isolated native request capture path and parity with normal runtime payloads.
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts` - native request capture translation sample and app-server translation thread/turn payload builders.
- `packages/core/src/config/provider-turn-config-resolver.ts` and `packages/core/src/config/provider-defaults-resolver.ts` - effective model/reasoning settings resolution.
- `src/extension-module/settings/codex-provider-config-sync.ts` - extension-side provider-home `config.toml` compatibility sync after settings saves.

## Process Startup

Normal runtime, provider-owned Codex translation, and Codex native request capture all start the same App Server executable through named process profiles:

Current process profile keys: `codex:workflow-documentation` for normal workflow sessions and `codex:translation` for provider-owned app-server translation. The old `CODEAI_CODEX_APP_SERVER_ARGS` export is a compatibility alias for the workflow profile's `appServerArgs`; the translation profile owns an independent startup args array with the same currently verified disabled-tool flags, so future translation-specific startup controls cannot mutate workflow sessions by aliasing the same array.
The workflow invocation profile resolves to the same process profile key plus `baseInstructions = CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT` and `threadConfig = { project_doc_max_bytes: 0 }`.

```text
codex app-server
  --disable multi_agent
  --disable browser_use
  --disable in_app_browser
  --disable computer_use
  --disable image_generation
  --disable plugins
  --disable apps
  --disable tool_search
```

Runtime facts:

- `CODEX_EXECUTABLE` is `codex` on POSIX and `codex.cmd` on Windows.
- `CODEX_HOME` is set to `~/.codeai-hub/providers/codex/home` by default.
- If `process.env.CODEX_HOME` is already set before provider startup, that value is used as the provider home.
- Missing `auth.json` and `config.toml` are copy-migrated from legacy `~/.codex/` into provider home.
- Before spawning App Server, CodeAI Hub normalizes provider-home `config.toml`: removes legacy `default_reasoning_summary` and writes neutral `model_reasoning_summary = "none"` regardless of the shared Codex reasoning setting. Per-turn `summary` is the only live reasoning-summary control for models that support it.
- `PATH` is inherited and augmented with common user-level install locations:
  - POSIX: `~/.npm-global/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`
  - Windows: `%APPDATA%\npm`
- Provider-owned SDK transport JSONL logs are not created. Since `1.2.94`, the Codex app-server hot path has no file-backed SDK transport logger.
- `codex-cli 0.128.0` rejects partial MCP server overrides such as `-c mcp_servers.codex.enabled=false` with `invalid transport in mcp_servers.codex`. CodeAI Hub no longer passes those overrides in the app-server startup profile; any future attempt to suppress configured MCP servers must first establish a valid current Codex CLI config contract.

Known boundary:

- There is no confirmed App Server startup knob for removing `request_user_input`. That tool is tracked as evidence-gated follow-up work, not as an implemented flag.
- There is no current verified startup knob for disabling named `mcp_servers.*` entries without also providing their full current schema. Do not reintroduce `mcp_servers.<name>.enabled=false` as a standalone override.

## Initialize Handshake

Every App Server process is initialized through JSON-RPC before any thread call:

```json
{
  "method": "initialize",
  "params": {
    "clientInfo": {
      "name": "CodeAI Hub",
      "version": "1.2.21"
    },
    "capabilities": {
      "experimentalApi": true
    }
  }
}
```

`capabilities.experimentalApi = true` is mandatory for the current `thread/start` and `persistExtendedHistory` contract.

## Normal `thread/start`

New runtime Codex sessions are created with:

```json
{
  "method": "thread/start",
  "params": {
    "cwd": "<workspace path>",
    "approvalPolicy": "<CODEX_APPROVAL_MODE or undefined>",
    "sandbox": "<CODEX_SANDBOX_MODE or undefined>",
    "model": "<resolved Codex default model>",
    "persistExtendedHistory": true,
    "baseInstructions": "CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT",
    "config": {
      "project_doc_max_bytes": 0
    }
  }
}
```

Behavioral meaning:

- `baseInstructions` replaces the provider/model default base prompt for CodeAI Hub early workflow threads.
- `config.project_doc_max_bytes = 0` disables automatic project instruction discovery for new runtime threads.
- The workflow step prompt remains the first user prompt sent later through `turn/start.input[0].text`.
- `persistExtendedHistory = true` preserves extended provider history for normal user sessions.
- `approvalPolicy` is resolved from `CODEX_APPROVAL_MODE`; valid normalized values are `never`, `on-request`, `on-failure`, `untrusted`.
- `sandbox` is resolved from `CODEX_SANDBOX_MODE`; valid normalized values are `read-only`, `workspace-write`, `danger-full-access`.
- `CODEX_SKIP_GIT_REPO_CHECK` is currently parsed into Core config but is not sent by the Codex App Server adapter.

## Normal `thread/resume`

Existing provider threads are resumed with:

```json
{
  "method": "thread/resume",
  "params": {
    "threadId": "<provider thread id>",
    "cwd": "<workspace path>",
    "approvalPolicy": "<CODEX_APPROVAL_MODE or undefined>",
    "sandbox": "<CODEX_SANDBOX_MODE or undefined>",
    "model": "<resolved Codex default model>",
    "persistExtendedHistory": true
  }
}
```

`thread/resume` does not resend `baseInstructions` or `config.project_doc_max_bytes`; it relies on the existing provider thread state.

## Normal `turn/start`

Every user turn is sent with:

```json
{
  "method": "turn/start",
  "params": {
    "threadId": "<provider thread id>",
    "input": [
      {
        "type": "text",
        "text": "<optional <model_switch> instructions; first turn after switch only>",
        "text_elements": []
      },
      {
        "type": "text",
        "text": "<workflow/user prompt>",
        "text_elements": []
      }
    ],
    "cwd": "<workspace path>",
    "model": "<applied base model id>",
    "effort": "<applied Codex reasoning effort or null>",
    "summary": "detailed | none (gpt-5.3-codex-spark always none)",
    "outputSchema": "<optional structured output schema>"
  }
}
```

Behavioral meaning:

- `model` is the base model id, not the UI effective label. Example: `gpt-5.2`, not `gpt-5.2 reasoning:medium`.
- `effort` is the applied Codex reasoning effort: `low`, `medium`, `high`, `xhigh`, or `null`.
- `input` normally contains one user/workflow text item. On the first successful turn after either `session:codex:model-switch` or `session:codex:reasoning-switch`, Core passes `CODEX_MODEL_SWITCH_INJECTION_KEY` and the Codex facade prepends a `<model_switch>` text item before the user prompt. The marker follows Codex CLI's same-thread switch pattern and tells the model to continue under the new instruction profile (whether the swap was a model change, an effort change, or both across consecutive switches).
- `summary` is live-resolved from shared settings for models that support provider-native reasoning summaries:
  - `detailed` when Codex reasoning/thinking display is enabled;
  - `none` when Codex reasoning/thinking display is disabled.
- The live summary toggle read is cached inside the Codex App Server facade by normalized settings path with a `500ms` TTL. Settings changes can therefore affect the next non-Spark turn immediately after cache expiry, while avoiding one synchronous `settings.json` read per turn-start call under rapid sends.
- `summary` is gated by `getCodexModelCapabilities(modelId).supportsReasoningSummary`; `gpt-5.3-codex-spark` has `supportsReasoningSummary=false`, so the payload builder forces explicit `summary = "none"` and never sends `detailed`. Omission is forbidden because Codex app-server can default omitted summary to `detailed`. Provider-home is also forced to `model_reasoning_summary = "none"` so Spark cannot inherit a process-global native `reasoning.summary` fallback.
- `outputSchema` is passed through only when the workflow/core turn supplied one.
- `approvalPolicy`, `sandbox`, `baseInstructions`, and `config.project_doc_max_bytes` are not turn-level fields; they belong to thread startup/resume.

## Model And Reasoning Resolution

Current supported Codex model ids:

| Model id | Supports visible turn-level summary | Reasoning efforts |
| --- | --- | --- |
| `gpt-5.2` | yes | `low`, `medium`, `high`, `xhigh` |
| `gpt-5.3-codex-spark` | no | `low`, `medium`, `high`, `xhigh` |
| `gpt-5.4-mini` | yes | `low`, `medium`, `high`, `xhigh` |
| `gpt-5.4` | yes | `low`, `medium`, `high`, `xhigh` |
| `gpt-5.5` | yes | `low`, `medium`, `high`, `xhigh` |

Default resolution order:

1. `settings.json -> providers.codex.defaultModel`
2. `CODEX_DEFAULT_MODEL`
3. fallback `gpt-5.4-mini`

Reasoning effort resolution:

1. Applied turn config from Core switch/settings snapshot.
2. `CODEX_DEFAULT_REASONING_EFFORT`.
3. `settings.json -> providers.codex.reasoningByModel[modelId]`.
4. fallback `medium`.

Effective model identity shown in Core/UI is derived as:

```text
<baseModelId> reasoning:<effort>
```

The provider call still receives the base model id and `effort` as separate fields.

## Status Panel Model Switch Runtime

The Status Panel exposes two independent transport commands for Codex sessions (release `1.2.120`): `session:codex:model-switch` (`{ sessionId, targetModelId }`, model-only) and `session:codex:reasoning-switch` (`{ sessionId, targetReasoningEffort }`, reasoning-only). Neither is the older `dialog:switch:*` resend path.

Runtime sequence:

1. Core validates the payload against the Codex runtime capability registry. Model-switch checks the target model id is known; reasoning-switch checks the target effort is in the bound model's `reasoningEffortOptions`.
2. Core mutates live `Session.modelBinding` atomically: model-switch swaps `baseModelId` and preserves the previous `reasoningEffort` whenever still supported (otherwise falls back to the new model's first allowed effort); reasoning-switch swaps `reasoningEffort` and preserves the previous `baseModelId` unconditionally. Both broadcast `session:model:update` immediately.
3. Both handlers set `pendingModelSwitchInjection = true`.
4. The next `session:message` or `dialog:send` attaches applied config from live binding with `source = "session_binding"` and injects `CODEX_MODEL_SWITCH_INJECTION_KEY` into `turnOptions`.
5. Codex facade prepends `<model_switch>` to `turn/start.input`, rebuilds the rest of the payload from current model capabilities, and forces `summary = "none"` when the selected model does not support visible reasoning summaries.
6. Core clears `pendingModelSwitchInjection` only after provider send resolves successfully.

If dialog continuity has an older stored `modelBinding`, it must not overwrite a newer live switch binding when resuming an already registered runtime session.
On the next outbound turn after a same-session Codex model/reasoning switch, Core refreshes the latest matching continuity segment with the current `session.modelBinding`. If a remaining-context rollover happens later, the new Codex session receives `source = "continuity_inherited"` binding cloned from that current segment/session binding, while the resume `turn/start` still carries provider-native `model` and `effort` from applied config (`source = "session_binding"`).

## Progress-Update Behavior

The current shared Codex `baseInstructions` require progress updates to be:

- ordinary user-visible assistant messages;
- not hidden reasoning, tool-call notes, metadata, or non-user-visible commentary;
- non-terminal: after a progress update, Codex must continue the same turn until the promised work or requested artifact is complete.

The exact prompt snapshot is stored in:

```text
doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md
```

That file is intentionally kept as raw prompt text so it can be compared byte-for-byte with `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`.

## Provider-Home `config.toml`

Provider-home `config.toml` carries restart-safe compatibility state:

- `model = "<selected Codex default model>"`
- `model_reasoning_summary = "none"`

Two paths keep this state current:

- Extension-side settings save sync writes `model` and neutral `model_reasoning_summary`.
- Runtime App Server startup materializes neutral `model_reasoning_summary` immediately before `codex app-server` starts.

For non-Spark models, normal `turn/start.summary` is sent explicitly from the shared settings snapshot as `detailed` or `none`; provider-home remains neutral and must not be used as the live visibility source. For `gpt-5.3-codex-spark`, CodeAI Hub sends explicit `turn/start.summary = "none"` and provider-home also stays `none`, so the native request cannot contain a readable CodeAI Hub-owned `reasoning.summary`.

## Translation App Server Runtime

Core registers provider-owned Codex GPT translation engines with the same public ids as the old shared engines:

- `codex-gpt-5.4-mini` -> `gpt-5.4-mini`
- `codex-gpt-5.3-codex-spark` -> `gpt-5.3-codex-spark`

The active Core path is `packages/core/src/translation/codex-app-server-translation-engine.ts` -> `packages/Codex_AppServer_Module/src/translation/codex-app-server-translation-service.ts`. The shared `packages/translation/src/codex-cli-translation-engine.ts` remains available as an internal `codex exec` fallback during migration; Core removes the shared Codex entries from the registry and replaces them with provider-owned wrappers that call the fallback only when the App Server translation path returns fallback or throws.

Translation `thread/start` uses:

- `processProfileKey = "codex:translation"`
- `approvalPolicy = "never"`
- `sandbox = "read-only"`
- `persistExtendedHistory = false`
- `baseInstructions` from `buildCodexAppServerTranslationInstructions(...)`
- `config.project_doc_max_bytes = 0`

Translation `turn/start` uses:

- one text input from `buildCodexAppServerTranslationPrompt(...)`;
- `effort = "low"`;
- `summary = "none"` for all current Codex translation models, including `gpt-5.3-codex-spark`.

TL-001 pre-hardening baseline (2026-04-28): translation native capture is now covered by a dedicated builder test before changing behavior. The current translation capture envelope is `processProfileKey = "codex:translation"`, `approvalPolicy = "never"`, `sandbox = "read-only"`, `persistExtendedHistory = false`, `config.project_doc_max_bytes = 0`, fixed small translation sample, `effort = "low"`, and `summary = "none"` for all current Codex translation models. This baseline does not claim zero provider-visible tools; the last confirmed residual App Server tool surface from the documentation profile experiment was `exec_command`, `write_stdin`, `update_plan`, `request_user_input`, `apply_patch`, `web_search`, and `view_image`. Translation-specific tool removal must be proven by fresh native capture before this SSOT describes any tool as removed.

## Native Request Capture Parity

Settings -> General -> `Capture Codex Native Request` starts an isolated temporary App Server process with the same startup args as normal runtime, plus proxy/certificate env:

Workflow capture scenarios use the same resolved workflow invocation profile as normal runtime thread creation; native capture only overrides `persistExtendedHistory` to `false` and uses the selected capture prompt/model.
The `Translation` scenario is not a synthetic diagnostic profile: Core sends `invocationPurpose = "translation"` and Codex uses the translation process/thread/turn profile with a fixed small translation sample. Core deliberately sets `workflowPrompt = null` for that scenario, and the native capture artifact records scenario metadata with `purpose = "translation"`.

- `ALL_PROXY`
- `HTTP_PROXY`
- `HTTPS_PROXY`
- `NODE_EXTRA_CA_CERTS`
- `REQUESTS_CA_BUNDLE`
- `SSL_CERT_FILE`

Diagnostic `thread/start` differs from normal runtime only where capture requires it:

- `persistExtendedHistory: false`
- `model`: selected capture model or applied Core model
- `baseInstructions`: same `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`
- `config.project_doc_max_bytes: 0`

Diagnostic `turn/start` mirrors normal runtime fields:

- `input[0].text`: workflow prompt when available, otherwise probe prompt
- `model`: selected/applied model
- `effort`: applied/default Codex reasoning effort
- `summary`: same shared settings policy, `detailed` or `none`; for `gpt-5.3-codex-spark`, always explicit `none`

The diagnostic path records app-server `thread/start` and `turn/start` request/response payloads into the native capture artifact and copies provider-home rollout JSONL context when available.

## Stop And Usage Calls

- Stop/cancel uses `turn/interrupt` with `{ threadId, turnId }`.
- Usage limits are read through `account/rateLimits/read`.
- Live usage notifications arrive through `account/rateLimits/updated`.
- Token usage notifications arrive through `thread/tokenUsage/updated`.

## Maintenance Rules

- If `CODEAI_CODEX_APP_SERVER_ARGS` changes, update this document and `Modules/Codex.md`.
- If `thread/start`, `thread/resume`, or `turn/start` params change, update this document in the same commit as the code.
- If Codex model capability metadata changes, update `codex-model-capabilities.ts`, the UI mirror registry, and this table in the same execution cycle.
- If the shared prompt changes, keep `Codex_My_System_Prompt.md` byte-for-byte synchronized with `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`.
- Do not describe provider-owned SDK transport logs as runtime evidence; they are intentionally removed from the Codex runtime path.
