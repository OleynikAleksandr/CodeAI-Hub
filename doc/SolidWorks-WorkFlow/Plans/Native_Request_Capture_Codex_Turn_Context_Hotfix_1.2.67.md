# Native Request Capture Codex Turn Context Hotfix 1.2.67

**Status:** approved for implementation
**Date:** 2026-04-24
**Owner:** Codex

## Problem

Release `1.2.66` added workflow scenario capture for Claude and Codex. The user retest shows the Claude artifact contains a complete provider request, but Codex captures only the first WebSocket `response.create` frame:

- `generate: false`
- `input: []`
- native system instructions and tools are present
- the workflow first user prompt is missing from the native request body

The Codex app-server transport log proves CodeAI Hub does send the full workflow prompt through the real diagnostic path:

- `thread/start` uses the selected model and resolved app-server settings
- `turn/start.input[0].text` contains the full `Description` scenario prompt
- the missing data is between the isolated Codex App Server process and the provider-native WebSocket capture

Because the capture proxy is capture-and-abort and does not forward upstream, the Codex WebSocket protocol may not emit later prompt-bearing frames without provider-side responses. A useful diagnostic artifact must therefore show both layers clearly instead of presenting the early empty frame as the whole picture.

## Solution

Add provider diagnostic context records to native request capture artifacts:

1. Core capture options expose an optional `recordDiagnosticContext(...)` callback to provider adapters.
2. `NativeRequestCaptureWriter` persists these records to JSONL and Markdown.
3. Codex diagnostic capture records the exact app-server `thread/start` request/response and `turn/start` request/response payloads.
4. The native WebSocket request remains the primary provider-network request. The app-server context is labeled separately as provider diagnostic context.

This keeps the no-upstream-sending guarantee while giving the user the complete debugging picture:

- provider-native system instructions/tools from `chatgpt.com/backend-api/codex/responses`;
- selected/effective model config from Core;
- exact Codex app-server turn payload with the workflow first user prompt.

## Files And Boundaries

Core capture contract and writer:

- `packages/core/src/provider-registry/provider-module-loader.types.ts`
- `packages/core/src/provider-network-capture/native-request-capture-writer.ts`
- `packages/core/src/provider-network-capture/native-request-capture-writer.test.ts`

Core facade wiring:

- `packages/core/src/provider-network-capture/native-request-capture-facade.ts`
- `packages/core/src/provider-network-capture/native-request-capture-facade.test.ts`

Codex provider diagnostics:

- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`

SSOT sync:

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Acceptance Criteria

- Codex native capture Markdown includes a separate `Provider Diagnostic Context` section.
- The section includes `codex_app_server_turn_start_request` with non-empty `input[0].text`.
- Existing native request sections still show the provider WebSocket body, headers, tools and instructions.
- Claude behavior is unchanged.
- Targeted tests cover writer persistence, facade callback wiring, and Codex diagnostic emission.
