const KIMI_CLAUDE_CODE_SESSION_STALE_BINDING_ERROR_CODE =
  "KIMI_CLAUDE_CODE_SESSION_STALE_BINDING" as const;

export class KimiClaudeCodeSessionStaleBindingError extends Error {
  readonly code = KIMI_CLAUDE_CODE_SESSION_STALE_BINDING_ERROR_CODE;
  readonly providerSessionId: string;

  constructor(providerSessionId: string) {
    super(`Kimi-Claude-Code session binding is stale: ${providerSessionId}`);
    this.name = "KimiClaudeCodeSessionStaleBindingError";
    this.providerSessionId = providerSessionId;
  }
}
