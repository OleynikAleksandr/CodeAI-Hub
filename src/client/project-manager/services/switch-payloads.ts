export type CodexModelSwitchReasoningEffort =
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type ClaudeThinkingEffort =
  | CodexModelSwitchReasoningEffort
  | "max";

export type CodexModelSwitchRequestPayload = {
  readonly sessionId: string;
  readonly targetModelId: string;
};

export type CodexReasoningSwitchRequestPayload = {
  readonly sessionId: string;
  readonly targetReasoningEffort: CodexModelSwitchReasoningEffort;
};

export type ClaudeModelSwitchRequestPayload = {
  readonly sessionId: string;
  readonly targetModelId: "sonnet" | "opus" | "haiku";
};

export type ClaudeThinkingSwitchRequestPayload = {
  readonly sessionId: string;
  readonly thinkingEnabled: boolean;
  readonly targetReasoningEffort?: ClaudeThinkingEffort;
};
