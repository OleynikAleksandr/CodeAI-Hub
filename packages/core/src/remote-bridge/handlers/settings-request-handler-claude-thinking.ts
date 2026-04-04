const CLAUDE_THINKING_EFFORTS = new Set(["low", "medium", "high", "max"]);
const DEFAULT_CLAUDE_THINKING_EFFORT = "medium";

const LEGACY_CLAUDE_THINKING_TOKEN_ANCHORS: readonly {
  readonly effort: string;
  readonly maxTokens: number;
}[] = [
  { effort: "low", maxTokens: 2000 },
  { effort: "medium", maxTokens: 4000 },
  { effort: "high", maxTokens: 10_000 },
  { effort: "max", maxTokens: 32_000 },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveLegacyClaudeThinkingEffort = (value: unknown): string => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_CLAUDE_THINKING_EFFORT;
  }

  return LEGACY_CLAUDE_THINKING_TOKEN_ANCHORS.reduce(
    (closest, candidate) =>
      Math.abs(candidate.maxTokens - numericValue) <
      Math.abs(closest.maxTokens - numericValue)
        ? candidate
        : closest,
    LEGACY_CLAUDE_THINKING_TOKEN_ANCHORS[0]
  ).effort;
};

const normalizeClaudeThinkingEffort = (value: unknown): string =>
  typeof value === "string" && CLAUDE_THINKING_EFFORTS.has(value)
    ? value
    : resolveLegacyClaudeThinkingEffort(value);

export const normalizeClaudeThinkingSettings = (options: {
  readonly defaultThinkingSettings: {
    readonly enabled: boolean;
    readonly effort: string;
  };
  readonly value: unknown;
}): { readonly enabled: boolean; readonly effort: string } => {
  if (!isRecord(options.value)) {
    return options.defaultThinkingSettings;
  }

  return {
    enabled:
      typeof options.value.enabled === "boolean"
        ? options.value.enabled
        : options.defaultThinkingSettings.enabled,
    effort: normalizeClaudeThinkingEffort(
      options.value.effort ?? options.value.maxTokens
    ),
  };
};
