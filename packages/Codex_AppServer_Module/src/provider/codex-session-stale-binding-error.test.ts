import assert from "node:assert/strict";
import test from "node:test";
import { CodexSessionStaleBindingError } from "./codex-session-stale-binding-error";

test("CodexSessionStaleBindingError exposes the shared stale-binding code", () => {
  const err = new CodexSessionStaleBindingError("thread-abc");
  assert.equal(err.code, "CODEX_SESSION_STALE_BINDING");
  assert.equal(err.providerSessionId, "thread-abc");
  assert.equal(err.name, "CodexSessionStaleBindingError");
  assert.equal(
    err.message,
    "Codex thread thread-abc not resumed in app-server"
  );
  assert.ok(err instanceof Error);
});

test("CodexSessionStaleBindingError satisfies the dispatch-layer detector contract", () => {
  // The Core-side detector in session-request-handler-message-dispatch.ts
  // recognizes stale-binding errors by matching `error.code` against a
  // shared set of provider-scoped codes and reading
  // `error.providerSessionId`. The error must satisfy this contract
  // without coupling the module back to the Core package.
  const err = new CodexSessionStaleBindingError("dead-beef");
  const code = (err as { code?: string }).code;
  const providerSessionId = (err as { providerSessionId?: string })
    .providerSessionId;
  assert.equal(code, "CODEX_SESSION_STALE_BINDING");
  assert.equal(providerSessionId, "dead-beef");
});
