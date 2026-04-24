# Provider Native Request Capture — Architecture Plan

**Date:** 2026-04-24
**Status:** Planning / Approved for TODO slicing
**Target release:** next release after `1.2.61`

---

## 1. Problem

Current provider diagnostics show several useful layers, but not the most important one for instruction debugging.

Today we can inspect:

- CodeAI Hub intent before dispatch (`turnOptions`, selected model, reasoning settings, response mode).
- Provider runtime logs (`sdk-claude-*.jsonl`, `sdk-codex-app-server-*.jsonl`).
- Provider-native session artifacts (`~/.codeai-hub/providers/...`).
- Final response stream from Claude/Codex.

What we cannot conveniently inspect:

- the **actual HTTPS request body assembled by the native provider client** immediately before it would go to Anthropic/OpenAI;
- native/default system instructions inserted by Claude Code or Codex client;
- native tool declarations and service metadata;
- whether CodeAI Hub-supplied `systemPrompt`, `baseInstructions`, `developerInstructions`, `settingSources`, `project_doc_max_bytes`, skills flags, apps/env blocks and similar controls actually change the final native request.

This makes workflow-instruction debugging too indirect. We need a local diagnostic mode that captures the full provider-client request without sending it upstream.

---

## 2. Goal

Add two buttons at the bottom of **Settings -> General**:

1. **Capture Claude Native Request**
2. **Capture Codex Native Request**

Each button must start a one-shot diagnostic capture for the selected provider and write readable artifacts under:

```text
~/.codeai-hub/logs/native-request-capture/
```

The capture must:

- run locally;
- let the native provider runtime assemble its normal HTTPS request;
- decrypt that request through a local diagnostic TLS MITM proxy;
- write `.jsonl` and `.md` artifacts;
- abort before any captured request is forwarded to the real provider;
- redact credential-bearing headers by default;
- return the resulting file paths to the UI.

The output must be useful for answering:

- which system/developer/user layers were present;
- which native tools were declared;
- which service/system metadata was present;
- whether CodeAI Hub-injected instruction layers survived into the native provider request;
- whether provider flags that are supposed to remove context actually did remove it.

---

## 3. Non-goals

- Do not implement a general network debugging product.
- Do not proxy normal user turns.
- Do not send captured diagnostic requests upstream.
- Do not persist unredacted auth headers.
- Do not add Gemini in this scope.
- Do not solve dynamic workflow instructions in this scope; this feature is the diagnostic tool that will verify them.
- Do not expose raw network capture as a normal user-facing workflow artifact. It is a Settings/Diagnostics output.

---

## 4. Capture Model

The feature uses **capture-and-abort**.

Flow:

1. User clicks a provider capture button in General Settings.
2. Core starts a local diagnostic proxy bound to `127.0.0.1`.
3. Core starts an isolated one-shot provider capture run:
   - Claude through Claude Agent SDK / Claude Code runtime;
   - Codex through a temporary Codex App Server or equivalent Codex runtime path.
4. The provider runtime receives `HTTPS_PROXY` / `HTTP_PROXY` pointing to the local proxy.
5. The provider runtime connects to what it believes is the provider host:
   - Claude subscription path: `api.anthropic.com:443`;
   - Codex subscription path: primarily `chatgpt.com:443`.
6. The proxy terminates TLS locally using a diagnostic CA trusted only for this capture run.
7. The proxy reads the full HTTP request head/body.
8. The proxy writes sanitized artifacts.
9. The proxy returns a synthetic local error and closes the connection.
10. Core reports success if at least one matching provider request was captured.

No request body captured by this feature is forwarded to Anthropic/OpenAI.

---

## 5. Prior Spike Result

A local spike has already confirmed the core assumptions:

- A local CONNECT MITM proxy can decrypt an HTTPS JSON request when the client trusts the local CA.
- The decrypted body includes fields such as `system`, `tools`, `messages`.
- Claude runtime respects `HTTPS_PROXY` and attempts `CONNECT api.anthropic.com:443` in subscription mode.
- Codex runtime respects `HTTPS_PROXY` and attempts `CONNECT chatgpt.com:443` in subscription mode, including `https://chatgpt.com/backend-api/codex/responses`.

The remaining implementation risk is trust-root handling for the real native clients during decryption, especially Codex. The first implementation stream must include a preflight that detects whether a client accepts the diagnostic CA through environment variables or needs a one-time trust-store setup.

---

## 6. Output Contract

Each capture writes two files with the same stem:

```text
~/.codeai-hub/logs/native-request-capture/
  YYYY-MM-DDTHH-mm-ss-sssZ-claude-native-request.md
  YYYY-MM-DDTHH-mm-ss-sssZ-claude-native-request.jsonl
  YYYY-MM-DDTHH-mm-ss-sssZ-codex-native-request.md
  YYYY-MM-DDTHH-mm-ss-sssZ-codex-native-request.jsonl
```

### JSONL records

Minimum record types:

```jsonl
{"type":"capture_start","providerId":"claude","captureId":"...","sentUpstream":false}
{"type":"proxy_connect","target":"api.anthropic.com:443"}
{"type":"request_captured","target":"api.anthropic.com:443","method":"POST","path":"/v1/messages","headers":{...},"body":{...}}
{"type":"section_extract","section":"system","content":"..."}
{"type":"section_extract","section":"tools","payload":[...]}
{"type":"section_extract","section":"messages","payload":[...]}
{"type":"capture_end","status":"captured","sentUpstream":false}
```

Failure records:

```jsonl
{"type":"capture_end","status":"failed","reason":"tls_trust_failed","sentUpstream":false}
```

### Markdown output

Minimum sections:

```markdown
# Claude Native Request Capture

Provider: claude
Sent upstream: false
Capture mode: MITM capture-and-abort
Generated at: ...

## Summary

## Captured Requests

## Request Headers

## Request Body

## Extracted System Prompt

## Extracted Tool Declarations

## Extracted Messages

## Notes
```

For Codex, the title and targets change accordingly.

---

## 7. Redaction Contract

Headers are redacted by default.

Always redact these header names case-insensitively:

- `authorization`
- `cookie`
- `set-cookie`
- `x-api-key`
- `anthropic-api-key`
- `openai-api-key`
- `x-stainless-*` only if it contains credential material
- any header containing `token`, `secret`, `session`, `credential`, `oauth`

Request body is not generally redacted because it is the primary diagnostic payload. The markdown output must label the artifact as sensitive local diagnostic data.

The feature must not upload, share, or send these artifacts anywhere.

---

## 8. UI Contract

Location:

- Settings -> General
- bottom of the General tab
- separate card after existing General cards

Card title:

- `Native Request Capture`

Card copy:

- Explain that the buttons capture one native provider request locally and abort before upstream.
- Explain that files may contain prompts, tool descriptors, and sensitive project context.
- Show the output directory.

Buttons:

- `Capture Claude Native Request`
- `Capture Codex Native Request`

Button behavior:

- disabled while its provider capture is running;
- show `Capturing...` while active;
- after success show the `.md` and `.jsonl` paths in the card status;
- after failure show concise error text and the partial log path if available.

No Settings persistence is required for the buttons. They are commands, not saved settings.

---

## 9. Capture Source Contract

The first implementation uses a deterministic diagnostic probe, not a normal user turn.

Probe user prompt:

```text
CodeAI Hub native request capture probe. This request must not be sent upstream.
```

The probe must use the same runtime configuration path as normal provider sessions:

- current workspace path;
- current saved provider model settings;
- current reasoning/effort settings;
- current provider-home and auth bootstrap;
- current CodeAI Hub provider adapter options;
- future workflow instruction profile fields once they exist.

If a Project Manager active dialog/session context is available through the UI host in a later stream, the command can include it and capture that exact next-turn context. This is not required for the first release because the primary target is native system/tool/request assembly, which is visible with a probe request.

---

## 10. Core Architecture

New Core module:

```text
packages/core/src/provider-network-capture/
```

Proposed classes:

- `NativeRequestCaptureFacade`
  - command-level entry point from `RemoteBridgeMessageRouter`;
  - validates provider id;
  - creates capture id;
  - calls provider adapter capture method;
  - returns bridge event payload.

- `NativeRequestCaptureProxy`
  - local CONNECT proxy;
  - TLS termination with diagnostic cert;
  - request parsing;
  - capture-and-abort behavior;
  - target filtering.

- `NativeRequestCaptureCertificateStore`
  - creates/reuses local diagnostic CA and host certs;
  - stores under `~/.codeai-hub/diagnostics/native-request-capture/certs/`;
  - exposes env hints such as `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`.

- `NativeRequestCaptureWriter`
  - writes JSONL and Markdown;
  - owns redaction and extracted sections.

Bridge messages:

```typescript
type Incoming =
  | {
      type: "settings:native-request-capture";
      payload: { providerId: "claude" | "codex" };
    };

type Event =
  | {
      type: "settings:native-request-capture:result";
      payload: {
        providerId: "claude" | "codex";
        ok: boolean;
        markdownPath: string | null;
        jsonlPath: string | null;
        error: string | null;
      };
    };
```

---

## 11. Provider Adapter Contract

Extend `ProviderAdapter` with an optional method:

```typescript
captureNativeRequest?(options: {
  readonly captureId: string;
  readonly proxyUrl: string;
  readonly certificatePath: string;
  readonly workspacePath: string;
}): Promise<void>;
```

Core must fail gracefully if a provider does not implement the method.

### Claude implementation

Claude capture path should:

- reuse `SDKInstaller` and `SDKAuthManager`;
- use the same SDK/runtime options as normal CodeAI Hub Claude turns where possible;
- run with `settingSources: []`;
- run with `persistSession: false` if the SDK supports it cleanly;
- inject `HTTPS_PROXY`, `HTTP_PROXY`, `NODE_EXTRA_CA_CERTS`, and related env fields into the SDK query environment;
- call `query()` with the diagnostic probe;
- treat the expected synthetic network failure as success if the proxy captured the target request.

Primary target:

- `api.anthropic.com:443`, request path expected around `/v1/messages`.

### Codex implementation

Codex capture path should:

- not mutate the long-lived normal App Server child env;
- start an isolated temporary Codex runtime for the capture;
- prefer temporary App Server so the path stays closest to production integration;
- send `initialize`, `thread/start`, and `turn/start` with diagnostic probe;
- inject `HTTPS_PROXY`, `HTTP_PROXY`, `SSL_CERT_FILE`, and related env fields into the temporary child;
- stop the temporary process after capture or timeout.

Primary target:

- `chatgpt.com:443`, request path expected around `/backend-api/codex/responses`.

---

## 12. Timeout and Target Rules

Default timeout:

- 30 seconds per capture.

The proxy may see background requests:

- Claude: Datadog, downloads, GitHub, auth checks.
- Codex: models, plugins, GitHub, ChatGPT support endpoints.

Only provider model-request targets should count as capture success:

- Claude: `api.anthropic.com` with POST body containing messages/system/tools shape.
- Codex: `chatgpt.com/backend-api/codex/responses` or equivalent Codex response endpoint.

Other requests can be logged as `proxy_connect` / `request_ignored` and locally aborted.

---

## 13. Verification Plan

Required tests:

1. Proxy unit test captures a fake HTTPS POST body and writes both JSONL and Markdown.
2. Redaction unit test removes credential headers.
3. Core bridge test returns a `settings:native-request-capture:result` event.
4. Claude provider test verifies capture env injection and expected synthetic failure handling.
5. Codex provider test verifies temporary app-server/process env injection and shutdown.
6. UI test verifies General Settings renders both buttons and handles success/failure state.

Manual verification:

1. Click `Capture Claude Native Request`.
2. Confirm no upstream provider request is forwarded.
3. Confirm `.md` contains captured request body and extracted system/tools/messages.
4. Click `Capture Codex Native Request`.
5. Confirm `.md` contains Codex native request body from the subscription path.

Build verification:

- `npm run build --workspace @codeai-hub/claude-module`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`

Final release stream:

- update `README.md` and `CHANGELOG.md` for the future version;
- run `./scripts/build-all.sh`;
- run `./scripts/build-release.sh --use-current-version`;
- archive the completed TODO and planning document;
- create session report.

---

## 14. Risks

### TLS trust may differ by provider runtime

Claude likely accepts `NODE_EXTRA_CA_CERTS` because the runtime path is Node-based. Codex may use Rust TLS and may require `SSL_CERT_FILE` or OS trust store. The first implementation stream must build explicit preflight/error handling instead of silently failing.

### Background requests may obscure the target request

The proxy must filter target endpoints and keep waiting until the model request is captured or timeout expires.

### Sensitive local artifacts

The feature writes prompts and tool declarations to disk. Artifacts must stay local, be clearly labeled sensitive, and redact auth headers.

### Capture can create provider-native session artifacts

Claude/Codex runtime may still create local session/cache files before the synthetic network error. The capture path must use non-persistent or diagnostic session settings where supported, and must avoid binding the capture run to normal workflow continuity.

---

## 15. Acceptance Criteria

- General Settings has two bottom buttons for Claude and Codex native request capture.
- Clicking either button does not send the captured request upstream.
- A successful capture writes `.jsonl` and `.md` files under `~/.codeai-hub/logs/native-request-capture/`.
- Markdown includes request metadata, redacted headers, full request body, and extracted system/tools/messages where present.
- Capture result path is visible in Settings after completion.
- Failure modes are explicit (`tls_trust_failed`, `target_not_seen`, `provider_not_supported`, `timeout`, `runtime_failed`).
- Existing normal provider turns are unaffected when capture is not running.
