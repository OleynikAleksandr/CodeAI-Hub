// Paper-binding resolved by the 1.2.39 continuity materializer carries a
// providerSessionId the SDK Manager's in-memory session Map does not know
// yet — typical on the first send after a Core process restart. The Core
// dispatch layer recognizes this via the shared `code` field and runs a
// one-shot invalidate + ensureSessionReadyForSend + resend recovery.
export class ClaudeSessionStaleBindingError extends Error {
  readonly code = "CLAUDE_SESSION_STALE_BINDING";
  readonly providerSessionId: string;

  constructor(providerSessionId: string) {
    super(`Session ${providerSessionId} not found`);
    this.name = "ClaudeSessionStaleBindingError";
    this.providerSessionId = providerSessionId;
  }
}
