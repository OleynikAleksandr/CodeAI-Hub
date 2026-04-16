// NOTE: keep this set aligned with `CLAUDE_THINKING_EFFORTS` in
// `packages/core/src/config/provider-defaults-resolver.ts` and the UI-side
// `CLAUDE_THINKING_EFFORT_SET` in `src/types/claude-model-registry.ts`. Any
// value missing here causes Core `handleLoad` to treat the value as legacy
// numeric and rewrite settings.json back to the default effort on every
// PM boot — that is exactly how the 1.1.998 `xhigh` save was silently
// reverted to `medium`.
const CLAUDE_THINKING_EFFORTS = new Set([
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
const DEFAULT_CLAUDE_THINKING_EFFORT = "medium";

const LEGACY_CLAUDE_THINKING_TOKEN_ANCHORS: readonly {
  readonly effort: string;
  readonly maxTokens: number;
}[] = [
  { effort: "low", maxTokens: 2000 },
  { effort: "medium", maxTokens: 4000 },
  { effort: "high", maxTokens: 10_000 },
  { effort: "xhigh", maxTokens: 20_000 },
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
