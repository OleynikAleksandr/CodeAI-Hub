import {
  type CodexReasoningSummaryMode,
  getCodexModelCapabilities,
} from "../types";

export const buildCodexReasoningSummaryParams = (
  modelId: string | null | undefined,
  summary: CodexReasoningSummaryMode
): { readonly summary: CodexReasoningSummaryMode } => {
  if (!getCodexModelCapabilities(modelId).supportsReasoningSummary) {
    return { summary: "none" };
  }

  return { summary };
};
