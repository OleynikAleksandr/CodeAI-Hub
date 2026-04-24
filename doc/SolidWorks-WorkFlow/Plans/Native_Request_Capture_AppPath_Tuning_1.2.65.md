# Native Request Capture App-Path Tuning 1.2.65

**Status:** Active
**Date:** 2026-04-24
**Owner:** Codex

---

## 1. Problem

Release `1.2.64` finally captures full native provider payloads, including Codex WebSocket frame bodies and Claude Anthropic message requests. Retest confirmed that this is now useful for provider prompt tuning.

The remaining gap is product-critical for debugging:

- Settings -> General capture buttons do not let the user choose the model before capture.
- Core calls provider diagnostics with only `providerId/workspacePath`.
- Claude diagnostics still use `workspace.defaultModel` and force `thinking: { type: "disabled" }`.
- Codex diagnostics still use `workspace.defaultModel`, default effort, and hardcoded `summary: "none"`.
- Markdown extraction does not treat Codex `instructions` as the system prompt and overwrites multi-request captures in the human-readable report.

This means capture can show a real native request, but not always the exact request shape that CodeAI Hub would send after changing model/reasoning/instruction flags.

---

## 2. Goal

Native request capture must become an app-path diagnostic switch:

1. User chooses provider and model in Settings -> General.
2. The capture command travels through the same UI/PM/Core message route as the current buttons.
3. Core resolves the same effective turn config used by normal session sends.
4. Provider diagnostic services use the selected model and effective reasoning/thinking/summary settings.
5. The proxy still aborts locally and never forwards the request upstream.
6. JSONL/Markdown clearly show selected model, effective config, captured requests, Codex `instructions`, tools, and messages/input.

---

## 3. Architecture

### UI and transport

- `NativeRequestCaptureCard` becomes a small provider/model capture panel.
- Claude model choices come from `CLAUDE_MODEL_ALIASES`.
- Codex model choices come from `CODEX_SETTINGS_MODELS`.
- Initial selections come from current settings defaults.
- Selecting a model for capture does not persist settings by itself.
- `handleNativeRequestCapture(providerId, modelId)` is threaded through browser settings state and Project Manager WebSocket API.

### Core resolver

- `settings:native-request-capture` payload gains `modelId`.
- `RemoteBridgeMessageRouter` resolves the workspace as before, then passes `providerId`, `workspacePath`, and selected `modelId` to `NativeRequestCaptureFacade`.
- `NativeRequestCaptureFacade` gets a resolver callback that reuses `SessionRequestHandlerAppliedTurnConfig` with the provider runtime id:
  - Claude UI id `claude` -> runtime id `claudeCodeCli`.
  - Codex UI id `codex` -> runtime id `codexCli`.
- The facade passes both `selectedModelId` and `appliedTurnConfig` to the provider adapter.

### Provider diagnostics

- Claude diagnostics keep the same SDK query isolation (`settingSources: []`, `persistSession: false`, projectPath/cwd/additionalDirectories), but model/thinking/effort come from applied turn config, mirroring `ClaudeSDKManager.buildQueryOptions`.
- Codex diagnostics keep isolated `thread/start`/`turn/start` and `persistExtendedHistory: false`, but model/effort/summary mirror `CodexAppServerFacade.sendMessage` policy:
  - selected/applied model;
  - applied reasoning effort;
  - summary mode from settings (`detailed` or `none`), not hardcoded `none`.

### Writer

- JSONL `capture_start` records selected model and applied config metadata.
- Markdown treats the latest matching request as the primary request, while listing all matching requests.
- Codex `body.instructions` is extracted as system prompt.
- Codex `body.input` is extracted as messages when `messages` is absent.

---

## 4. Out of Scope

- No upstream forwarding.
- No provider-side server prompt visibility beyond what the native client actually sends.
- No session creation, persistence, or real workflow execution for capture.
- No settings persistence from the capture model selector.

---

## 5. Verification

- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/core`
- `npm run build --workspace @codeai-hub/claude-module`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- Targeted Node tests for native capture facade/writer and provider diagnostics.
- Full release:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`

