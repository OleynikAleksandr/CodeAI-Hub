# Native Request Capture WebSocket And Trace Hotfix 1.2.64

**Status:** Active hotfix plan
**Date:** 2026-04-24
**Owner:** Codex

---

## 1. Problem

Fresh retest of `1.2.63` shows that the previous Core receiver bug is fixed, but capture artifacts still do not expose the native instruction payload that we need for debugging provider system prompts/tools.

Evidence from `~/.codeai-hub/logs/native-request-capture/`:

- Claude `2026-04-24T09-26-22-370Z-*`:
  - proxy connects to `api.anthropic.com:443`;
  - parsed requests are emitted only as `request_path_not_matched`;
  - Markdown does not show ignored request method/path/body;
  - capture ends on `tls_trust_failed`, likely too early for a later target request.
- Codex `2026-04-24T09-27-16-057Z-*`:
  - proxy reaches `chatgpt.com:443`;
  - final matched request is `GET /backend-api/codex/responses`;
  - this is a WebSocket upgrade request, so HTTP body is correctly `null`;
  - the actual Codex turn payload is expected in the first client WebSocket frame after `101 Switching Protocols`, but current proxy aborts at the upgrade request.

---

## 2. Root Cause

The current `provider-network-capture` proxy is an HTTP request capture-and-abort proxy. That is sufficient for ordinary JSON `POST` model requests, but not for Codex App Server's current `responses_websocket` transport.

The current ignored-request telemetry is also too sparse: it records only `target` and `reason`, so when Claude hits preliminary or alternate Anthropic paths, we cannot see which request was ignored and whether it already carried useful instruction payload.

---

## 3. Hotfix Scope

### Required changes

1. Add local WebSocket upgrade handling for matched provider targets:
   - respond with `101 Switching Protocols` locally;
   - do not open upstream connection;
   - parse masked client frames;
   - capture the first text/binary frame as the request body.
2. Preserve HTTP request metadata for `request_path_not_matched` ignored requests:
   - method;
   - path;
   - headers;
   - parsed/body text where available.
3. Stop treating any TLS socket error after an ignored parsed request as a terminal capture failure; emit diagnostic ignored events and keep waiting until a target request, provider runtime failure, or timeout.
4. Update Markdown writer so ignored request observations are visible without opening raw JSONL.
5. Add regression coverage for WebSocket frame decoding and richer ignored-request diagnostics.

### Out of scope

- No upstream forwarding of model requests.
- No credential leakage: existing header redaction stays active.
- No UI changes; Settings buttons remain the same.

---

## 4. Expected Result

After `1.2.64`, Codex capture should show a body from the first WebSocket frame instead of only upgrade headers. Claude capture should show at least the concrete ignored Anthropic method/path/body details; if the later target request arrives, it should be captured instead of being preempted by a non-terminal TLS socket error.

---

## 5. Verification

- `npm run build --workspace @codeai-hub/core`
- targeted Node tests for:
  - WebSocket frame parsing/capture;
  - ignored request diagnostics;
  - writer Markdown ignored request section.
- full release build:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`

