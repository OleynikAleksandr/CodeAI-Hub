# Codex Provider Invocation Flags - Module SSOT

**Status:** implemented SSOT  
**Last verified:** 2026-04-28, release `1.2.98`
**Owner module:** `packages/Codex_AppServer_Module/`

This document records the actual CodeAI Hub Codex invocation surface that shapes model behavior for all current Codex models. It is a runtime contract, not a proposal.

## Source Files

- `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts` - `codex app-server` startup args, provider-home env, JSON-RPC initialize handshake.
- `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.ts` - runtime provider-home `config.toml` summary materialization before App Server startup.
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` - normal `thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, reasoning-summary policy.
- `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts` - CodeAI Hub-owned early-architecture `baseInstructions` and thread config.
- `packages/Codex_AppServer_Module/src/translation/codex-app-server-translation-service.ts` and `src/translation/codex-translation-prompt-profile.ts` - provider-owned Codex App Server translation runtime and prompt profile.
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts` - isolated native request capture path and parity with normal runtime payloads.
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts` - native request capture translation sample and app-server translation thread/turn payload builders.
- `packages/core/src/config/provider-turn-config-resolver.ts` and `packages/core/src/config/provider-defaults-resolver.ts` - effective model/reasoning settings resolution.
- `src/extension-module/settings/codex-provider-config-sync.ts` - extension-side provider-home `config.toml` compatibility sync after settings saves.

## Process Startup

Normal runtime, provider-owned Codex translation, and Codex native request capture all start the same App Server executable through named process profiles:

Current process profile keys: `codex:workflow-documentation` for normal workflow sessions and `codex:translation` for provider-owned app-server translation. The old `CODEAI_CODEX_APP_SERVER_ARGS` export is a compatibility alias for the workflow profile's `appServerArgs`; the translation profile currently uses the same disabled-tool startup args under a separate key so future translation-specific startup controls do not mutate workflow sessions.
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
  -c mcp_servers.codex.enabled=false
  -c mcp_servers.playwright.enabled=false
```

Runtime facts:

- `CODEX_EXECUTABLE` is `codex` on POSIX and `codex.cmd` on Windows.
- `CODEX_HOME` is set to `~/.codeai-hub/providers/codex/home` by default.
- If `process.env.CODEX_HOME` is already set before provider startup, that value is used as the provider home.
- Missing `auth.json` and `config.toml` are copy-migrated from legacy `~/.codex/` into provider home.
- Before spawning App Server, CodeAI Hub normalizes provider-home `config.toml`: removes legacy `default_reasoning_summary` and writes `model_reasoning_summary = "auto" | "none"` from shared Codex reasoning settings.
- `PATH` is inherited and augmented with common user-level install locations:
  - POSIX: `~/.npm-global/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`
  - Windows: `%APPDATA%\npm`
- Provider-owned SDK transport JSONL logs are not created. Since `1.2.94`, the Codex app-server hot path has no file-backed SDK transport logger.

Known boundary:

- There is no confirmed App Server startup knob for removing `request_user_input`. That tool is tracked as evidence-gated follow-up work, not as an implemented flag.

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
        "text": "<workflow/user prompt>",
        "text_elements": []
      }
    ],
    "cwd": "<workspace path>",
    "model": "<applied base model id>",
    "effort": "<applied Codex reasoning effort or null>",
    "summary": "detailed | none (omitted for gpt-5.3-codex-spark)",
    "outputSchema": "<optional structured output schema>"
  }
}
```

Behavioral meaning:

- `model` is the base model id, not the UI effective label. Example: `gpt-5.2`, not `gpt-5.2 reasoning:medium`.
- `effort` is the applied Codex reasoning effort: `low`, `medium`, `high`, `xhigh`, or `null`.
- `summary` is live-resolved from shared settings for models that support provider-native reasoning summaries:
  - `detailed` when Codex reasoning/thinking display is enabled;
  - `none` when Codex reasoning/thinking display is disabled.
- `gpt-5.3-codex-spark` rejects explicit turn-level `reasoning.summary`; for this model the `summary` field is omitted entirely, not sent as `none`. Its readable reasoning summaries are controlled by provider-home `model_reasoning_summary = "auto" | "none"` instead.
- `outputSchema` is passed through only when the workflow/core turn supplied one.
- `approvalPolicy`, `sandbox`, `baseInstructions`, and `config.project_doc_max_bytes` are not turn-level fields; they belong to thread startup/resume.

## Model And Reasoning Resolution

Current supported Codex model ids:

- `gpt-5.2`
- `gpt-5.3-codex-spark`
- `gpt-5.3-codex`
- `gpt-5.4-mini`
- `gpt-5.4`
- `gpt-5.5`

Default resolution order:

1. `settings.json -> providers.codex.defaultModel`
2. `CODEX_DEFAULT_MODEL`
3. fallback `gpt-5.3-codex`

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

## Progress-Update Behavior

The current shared Codex `baseInstructions` require progress updates to be:

- ordinary user-visible assistant messages;
- not hidden reasoning, tool-call notes, metadata, or non-user-visible commentary;
- non-terminal: after a progress update, Codex must continue the same turn until the promised work or requested artifact is complete.

The exact prompt snapshot is stored in:

```text
doc/SolidWorks-WorkFlow/Plans/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md
```

That file is intentionally kept as raw prompt text so it can be compared byte-for-byte with `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`.

## Provider-Home `config.toml`

Provider-home `config.toml` carries restart-safe compatibility state:

- `model = "<selected Codex default model>"`
- `model_reasoning_summary = "auto" | "none"`

Two paths keep this state current:

- Extension-side settings save sync writes `model` and `model_reasoning_summary`.
- Runtime App Server startup materializes `model_reasoning_summary` again from shared settings immediately before `codex app-server` starts.

For non-Spark models, this persisted provider-home state is not the only live runtime source of truth: normal `turn/start.summary` is still sent explicitly from the shared settings snapshot as `detailed` or `none`. For `gpt-5.3-codex-spark`, the explicit turn field is omitted and provider-home `model_reasoning_summary` is the readable-summary control.

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
- `summary = "none"` for non-Spark translation models;
- no explicit `summary` field for `gpt-5.3-codex-spark`.

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
- `summary`: same shared settings policy, `detailed` or `none`, omitted entirely for `gpt-5.3-codex-spark`

The diagnostic path records app-server `thread/start` and `turn/start` request/response payloads into the native capture artifact and copies provider-home rollout JSONL context when available.

## Stop And Usage Calls

- Stop/cancel uses `turn/interrupt` with `{ threadId, turnId }`.
- Usage limits are read through `account/rateLimits/read`.
- Live usage notifications arrive through `account/rateLimits/updated`.
- Token usage notifications arrive through `thread/tokenUsage/updated`.

## Maintenance Rules

- If `CODEAI_CODEX_APP_SERVER_ARGS` changes, update this document and `Modules/Codex.md`.
- If `thread/start`, `thread/resume`, or `turn/start` params change, update this document in the same commit as the code.
- If the shared prompt changes, keep `Codex_My_System_Prompt.md` byte-for-byte synchronized with `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`.
- Do not describe provider-owned SDK transport logs as runtime evidence; they are intentionally removed from the Codex runtime path.
