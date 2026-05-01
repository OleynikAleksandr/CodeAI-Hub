export type ClaudeModelAliasId = "sonnet" | "opus" | "haiku";

export type ClaudeThinkingEffort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ClaudeModelCapabilities {
  readonly defaultThinkingEffort: ClaudeThinkingEffort;
  readonly displayName: string;
  readonly modelId: ClaudeModelAliasId;
  readonly supportsThinking: boolean;
  readonly supportsThinkingDisplaySummarized: boolean;
  readonly thinkingEffortOptions: readonly ClaudeThinkingEffort[];
}

const CLAUDE_THINKING_EFFORT_OPTIONS = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const satisfies readonly ClaudeThinkingEffort[];

export const CLAUDE_MODEL_CAPABILITIES = [
  {
    modelId: "sonnet",
    displayName: "Sonnet",
    supportsThinking: true,
    supportsThinkingDisplaySummarized: true,
    thinkingEffortOptions: CLAUDE_THINKING_EFFORT_OPTIONS,
    defaultThinkingEffort: "medium",
  },
  {
    modelId: "opus",
    displayName: "Opus",
    supportsThinking: true,
    supportsThinkingDisplaySummarized: true,
    thinkingEffortOptions: CLAUDE_THINKING_EFFORT_OPTIONS,
    defaultThinkingEffort: "medium",
  },
  {
    modelId: "haiku",
    displayName: "Haiku",
    supportsThinking: true,
    supportsThinkingDisplaySummarized: true,
    thinkingEffortOptions: CLAUDE_THINKING_EFFORT_OPTIONS,
    defaultThinkingEffort: "medium",
  },
] as const satisfies readonly ClaudeModelCapabilities[];

const CLAUDE_MODEL_CAPABILITY_BY_ID = new Map<
  ClaudeModelAliasId,
  ClaudeModelCapabilities
>(
  CLAUDE_MODEL_CAPABILITIES.map((capabilities) => [
    capabilities.modelId,
    capabilities,
  ])
);

export const isClaudeModelAliasId = (
  value: unknown
): value is ClaudeModelAliasId =>
  typeof value === "string" &&
  CLAUDE_MODEL_CAPABILITY_BY_ID.has(value as ClaudeModelAliasId);

export const findClaudeModelCapabilities = (
  modelId: string
): ClaudeModelCapabilities | null =>
  CLAUDE_MODEL_CAPABILITY_BY_ID.get(modelId as ClaudeModelAliasId) ?? null;
