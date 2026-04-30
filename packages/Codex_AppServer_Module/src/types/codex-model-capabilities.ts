export const CODEX_REASONING_EFFORT_OPTIONS = [
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

export type CodexCapabilityReasoningEffort =
  (typeof CODEX_REASONING_EFFORT_OPTIONS)[number];

export interface CodexModelCapabilities {
  readonly autoCompactTokenLimit: number;
  readonly contextWindow: number;
  readonly modelId: string;
  readonly reasoningEffortOptions: readonly CodexCapabilityReasoningEffort[];
  readonly supportsReasoningSummary: boolean;
  readonly supportsVerbosity: boolean;
}

const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;
const DEFAULT_AUTO_COMPACT_TOKEN_LIMIT = 180_000;
const SPARK_MODEL_ID = "gpt-5.3-codex-spark";

const createCodexModelCapabilities = (
  modelId: string,
  overrides?: Partial<
    Pick<
      CodexModelCapabilities,
      | "autoCompactTokenLimit"
      | "contextWindow"
      | "reasoningEffortOptions"
      | "supportsReasoningSummary"
      | "supportsVerbosity"
    >
  >
): CodexModelCapabilities => ({
  autoCompactTokenLimit:
    overrides?.autoCompactTokenLimit ?? DEFAULT_AUTO_COMPACT_TOKEN_LIMIT,
  contextWindow: overrides?.contextWindow ?? DEFAULT_CONTEXT_WINDOW_TOKENS,
  modelId,
  reasoningEffortOptions:
    overrides?.reasoningEffortOptions ?? CODEX_REASONING_EFFORT_OPTIONS,
  supportsReasoningSummary: overrides?.supportsReasoningSummary ?? true,
  supportsVerbosity: overrides?.supportsVerbosity ?? true,
});

export const CODEX_MODEL_CAPABILITIES = [
  createCodexModelCapabilities("gpt-5.2"),
  createCodexModelCapabilities(SPARK_MODEL_ID, {
    supportsReasoningSummary: false,
  }),
  createCodexModelCapabilities("gpt-5.3-codex"),
  createCodexModelCapabilities("gpt-5.4-mini"),
  createCodexModelCapabilities("gpt-5.4"),
  createCodexModelCapabilities("gpt-5.5"),
] as const satisfies readonly CodexModelCapabilities[];

const CAPABILITIES_BY_MODEL_ID = new Map(
  CODEX_MODEL_CAPABILITIES.map((capabilities) => [
    capabilities.modelId,
    capabilities,
  ])
);

const normalizeModelId = (
  modelId: string | null | undefined
): string | null => {
  const normalized = modelId?.trim();
  return normalized ? normalized : null;
};

export const listCodexModelCapabilities =
  (): readonly CodexModelCapabilities[] => CODEX_MODEL_CAPABILITIES;

export const findCodexModelCapabilities = (
  modelId: string | null | undefined
): CodexModelCapabilities | null => {
  const normalizedModelId = normalizeModelId(modelId);
  if (!normalizedModelId) {
    return null;
  }
  return CAPABILITIES_BY_MODEL_ID.get(normalizedModelId) ?? null;
};

export const isKnownCodexModelId = (
  modelId: string | null | undefined
): boolean => findCodexModelCapabilities(modelId) !== null;

export const getCodexModelCapabilities = (
  modelId: string | null | undefined
): CodexModelCapabilities =>
  findCodexModelCapabilities(modelId) ??
  createCodexModelCapabilities(normalizeModelId(modelId) ?? "unknown");
