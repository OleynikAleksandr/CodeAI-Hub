import type { ProviderNativeRequestCaptureAppliedTurnConfig } from "../provider-registry/provider-module-loader.types";

type ReasoningOverrideProviderId = "claudeCodeCli" | "codexCli";

const CLAUDE_REASONING_EFFORTS = new Set([
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
const CODEX_REASONING_EFFORTS = new Set(["low", "medium", "high", "xhigh"]);
const REASONING_PREFIX_PATTERN = /^reasoning[-_\s]+/u;
const THINKING_PREFIX_PATTERN = /^thinking[-_\s]+/u;

export const applyNativeRequestCaptureReasoningOverride = (options: {
  readonly appliedTurnConfig: ProviderNativeRequestCaptureAppliedTurnConfig | null;
  readonly providerId: string;
  readonly reasoning?: string | null;
}): ProviderNativeRequestCaptureAppliedTurnConfig | null => {
  const normalized = normalizeReasoningOverride(options.reasoning);
  const providerId = readReasoningOverrideProviderId(options.providerId);
  if (!(normalized && providerId)) {
    return options.appliedTurnConfig;
  }
  const base = options.appliedTurnConfig ?? {
    providerId: options.providerId,
    source: "switch_request" as const,
  };
  if (providerId === "claudeCodeCli") {
    return applyClaudeReasoningOverride(base, normalized);
  }
  return CODEX_REASONING_EFFORTS.has(normalized)
    ? { ...base, reasoningEffort: normalized, source: "switch_request" }
    : base;
};

const applyClaudeReasoningOverride = (
  config: ProviderNativeRequestCaptureAppliedTurnConfig,
  reasoning: string
): ProviderNativeRequestCaptureAppliedTurnConfig => {
  if (reasoning === "off") {
    return {
      ...config,
      reasoningEffort: undefined,
      source: "switch_request",
      thinkingEnabled: false,
    };
  }
  return CLAUDE_REASONING_EFFORTS.has(reasoning)
    ? {
        ...config,
        reasoningEffort: reasoning,
        source: "switch_request",
        thinkingEnabled: true,
      }
    : config;
};

const normalizeReasoningOverride = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return normalized
    .replace(THINKING_PREFIX_PATTERN, "")
    .replace(REASONING_PREFIX_PATTERN, "");
};

const readReasoningOverrideProviderId = (
  value: string
): ReasoningOverrideProviderId | null =>
  value === "claudeCodeCli" || value === "codexCli" ? value : null;
