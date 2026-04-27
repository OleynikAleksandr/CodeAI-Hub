import type { CodexReasoningSummaryMode } from "../types";

const CODEX_MODELS_WITHOUT_REASONING_SUMMARY = new Set(["gpt-5.3-codex-spark"]);

export const buildCodexReasoningSummaryParams = (
  modelId: string | null | undefined,
  summary: CodexReasoningSummaryMode
): { readonly summary: CodexReasoningSummaryMode } | Record<string, never> => {
  const normalizedModelId = modelId?.trim();
  if (
    normalizedModelId &&
    CODEX_MODELS_WITHOUT_REASONING_SUMMARY.has(normalizedModelId)
  ) {
    return {};
  }

  return { summary };
};
