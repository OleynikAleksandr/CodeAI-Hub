const GLM_CLAUDE_CODE_SESSION_STALE_BINDING_ERROR_CODE =
  "GLM_CLAUDE_CODE_SESSION_STALE_BINDING" as const;

export class GlmClaudeCodeSessionStaleBindingError extends Error {
  readonly code = GLM_CLAUDE_CODE_SESSION_STALE_BINDING_ERROR_CODE;
  readonly providerSessionId: string;

  constructor(providerSessionId: string) {
    super(`GLM-Claude-Code session binding is stale: ${providerSessionId}`);
    this.name = "GlmClaudeCodeSessionStaleBindingError";
    this.providerSessionId = providerSessionId;
  }
}
