# Native Request Capture Workflow Scenarios 1.2.66

**Status:** Active
**Date:** 2026-04-24
**Owner:** Codex
**Target release:** 1.2.66

---

## 1. Problem

Release `1.2.65` made native request capture useful for provider request tuning: the user can select provider/model and see provider-native system instructions, tools, and request body before upstream send.

Retest showed the remaining gap:

- capture still sends a diagnostic probe, not a real workflow first-turn prompt;
- the user wants to compare what changes when we tune workflow instructions, templates, provider flags, and system prompt suppression;
- different workflow steps build different first user requests;
- Codex App Server can emit an early WebSocket frame with `input: []` and `generate: false`, while the useful turn payload comes later.

The current output is therefore technically correct, but not yet representative of the first turn sent by CodeAI Hub for `Description`, `Virtual Simulation`, and `Diagram Modules`.

---

## 2. Goal

Settings -> General native request capture must support workflow scenarios:

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`

For each provider capture button:

- user selects provider model as in `1.2.65`;
- user selects one workflow scenario;
- Project Manager builds the same first user request that the normal workflow path would send for that scenario;
- Core/provider diagnostics send that prompt through the same native provider client capture-and-abort path;
- Markdown/JSONL show the scenario metadata, selected model, applied turn config, native system instructions, native tools, and the workflow prompt inside messages/input.

This is a diagnostic capture only: the request must still be aborted locally and never forwarded upstream.

---

## 3. Architecture

### Scenario prompt source

The canonical prompt source is the Project Manager workflow send path:

- `DescriptionSubmitService.submitQuestionnaire()` creates sessions and sends `buildWorkflowPromptPack(...).content`.
- `WorkflowStepStartService` routes `Virtual Simulation` and `Diagram Modules` into the same submit service.
- `buildWorkflowPromptPack()` already owns the first user request structure for all three stages.

Scenario capture should reuse this same prompt-pack builder instead of duplicating workflow prompt assembly in Core.

Expected inputs:

- `Description`: questionnaire path from current workflow state or default `.codeai-hub/<workspaceSlug>/description/questionnaire.md`.
- `Virtual Simulation`: `Final_Description.md` path from current workflow state.
- `Diagram Modules`: first-step path should mirror current workflow logic:
  - if no diagram substep exists, use `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`;
  - otherwise use `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`.

If the selected scenario is blocked by missing artifacts, capture should fail before provider launch with a readable error. It should not invent synthetic product content.

### UI and transport

- `NativeRequestCaptureCard` gains a compact scenario selector above the provider rows.
- Shared settings state extends `handleNativeRequestCapture(providerId, modelId, scenarioId)`.
- VS Code webview path forwards `scenarioId`; Project Manager path additionally resolves and forwards the PM-generated `scenarioPrompt`.
- Result state records the active scenario for better running/status feedback.

### Core command contract

`settings:native-request-capture` payload gains:

- `scenarioId?: "description" | "virtual_simulation" | "diagram_modules" | "diagnostic_probe"`;
- `scenarioLabel?: string`;
- `scenarioPrompt?: string`;

Core remains the owner of:

- provider id validation;
- workspace resolution;
- applied turn config resolution;
- diagnostic proxy/cert setup;
- provider adapter dispatch.

Core does not rebuild workflow prompts. It passes the provided `scenarioPrompt` to provider diagnostics. If no prompt is provided, it preserves the existing diagnostic probe fallback.

### Provider diagnostics

- Claude diagnostics use `workflowPrompt ?? probePrompt` as the SDK `query({ prompt })`.
- Codex diagnostics use `workflowPrompt ?? probePrompt` as the `turn/start.input[0].text`.
- Existing model/reasoning/thinking mirroring from `1.2.65` remains unchanged.

### Codex WebSocket capture

The proxy must no longer complete a WebSocket capture after the first client frame unconditionally. It should:

- record each matching client frame as a captured request;
- continue reading frames until a primary candidate is observed;
- for Codex, prefer a frame whose body has non-empty `input`, or a non-`generate:false` turn payload;
- complete with the best captured request after the useful turn frame is seen or when the provider run ends.

Markdown should continue to list all captured requests and choose the useful turn frame as primary.

---

## 4. Non-goals

- No upstream forwarding.
- No live arming of the next normal workflow turn in this release.
- No session creation or workflow artifact writes during capture.
- No Gemini support in this scope.
- No fake workflow artifact generation when prerequisites are missing.

---

## 5. Implementation Streams

1. Planning/todo bootstrap.
2. Project Manager scenario prompt resolver and transport payload.
3. Shared Settings UI scenario selector.
4. Core/provider prompt threading and metadata writing.
5. Codex WebSocket multi-frame capture and primary request selection.
6. SSOT/docs and release build.

---

## 6. Verification

Targeted checks:

- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/core`
- `npm run build --workspace @codeai-hub/claude-module`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- targeted node tests for:
  - Project Manager scenario prompt resolver;
  - provider diagnostics prompt override;
  - Codex WebSocket multi-frame selection;
  - writer primary-request selection.

Release checks:

- update README/CHANGELOG to future release `1.2.66`;
- `./scripts/build-all.sh`;
- `./scripts/build-release.sh --use-current-version`.
