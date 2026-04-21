import assert from "node:assert/strict";
import test from "node:test";
import { ClaudeSessionStaleBindingError } from "./claude-session-stale-binding-error";

test("ClaudeSessionStaleBindingError exposes the shared stale-binding code", () => {
  const err = new ClaudeSessionStaleBindingError("abc-123");
  assert.equal(err.code, "CLAUDE_SESSION_STALE_BINDING");
  assert.equal(err.providerSessionId, "abc-123");
  assert.equal(err.name, "ClaudeSessionStaleBindingError");
  assert.equal(err.message, "Session abc-123 not found");
  assert.ok(err instanceof Error);
});

test("ClaudeSessionStaleBindingError satisfies the dispatch-layer detector contract", () => {
  // The Core-side detector in session-request-handler-message-dispatch.ts
  // recognizes stale-binding errors by matching `error.code` against a shared
  // set of provider-scoped codes and reading `error.providerSessionId`. The
  // error must satisfy this contract even without importing symbols from the
  // Core package, because the dispatch layer compares strings.
  const err = new ClaudeSessionStaleBindingError("dead-beef");
  const code = (err as { code?: string }).code;
  const providerSessionId = (err as { providerSessionId?: string })
    .providerSessionId;
  assert.equal(code, "CLAUDE_SESSION_STALE_BINDING");
  assert.equal(providerSessionId, "dead-beef");
});
