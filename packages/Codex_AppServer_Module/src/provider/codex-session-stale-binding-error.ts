// Paper-binding resolved by the 1.2.39 continuity materializer carries a
// providerSessionId (Codex thread id) that the long-lived app-server child
// process does not know yet — typical on the first send after a Core
// process restart, because the app-server child dies with Core and the
// fresh app-server has no threads. The Core dispatch layer recognizes
// this via the shared `code` field and runs a one-shot invalidate +
// ensureSessionReadyForSend + resend recovery.
export class CodexSessionStaleBindingError extends Error {
  readonly code = "CODEX_SESSION_STALE_BINDING";
  readonly providerSessionId: string;

  constructor(providerSessionId: string) {
    super(`Codex thread ${providerSessionId} not resumed in app-server`);
    this.name = "CodexSessionStaleBindingError";
    this.providerSessionId = providerSessionId;
  }
}
