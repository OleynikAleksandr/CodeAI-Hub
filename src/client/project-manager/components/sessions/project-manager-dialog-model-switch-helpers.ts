import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type { SessionRecord } from "../../../../types/session";

export type { ClaudeModelAliasId };
export type ClaudeThinkingSelection = ClaudeThinkingEffort | "off";

const EFFECTIVE_MODEL_SUFFIX_PATTERN = /\s+(reasoning|thinking):[^\s]+$/;

export const resolveDialogCodexBaseModelId = (
  session: SessionRecord | null
): string | null => {
  if (session?.providerIds[0] !== "codexCli") {
    return null;
  }
  const baseModelId =
    session.modelBinding?.baseModelId ??
    session.modelBinding?.modelId?.replace(EFFECTIVE_MODEL_SUFFIX_PATTERN, "");
  return baseModelId ?? null;
};
