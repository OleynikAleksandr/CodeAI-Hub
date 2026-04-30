import {
  type CodexReasoningSummaryMode,
  getCodexModelCapabilities,
} from "../types";

export const buildCodexReasoningSummaryParams = (
  modelId: string | null | undefined,
  summary: CodexReasoningSummaryMode
): { readonly summary: CodexReasoningSummaryMode } | Record<string, never> => {
  if (!getCodexModelCapabilities(modelId).supportsReasoningSummary) {
    return {};
  }

  return { summary };
};
