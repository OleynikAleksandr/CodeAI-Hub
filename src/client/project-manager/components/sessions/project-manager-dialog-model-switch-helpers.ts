import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type { SessionRecord } from "../../../../types/session";

export type { ClaudeModelAliasId };
export type ClaudeThinkingSelection = ClaudeThinkingEffort | "off";

export interface ClaudeDialogModelSwitchRequest {
  readonly modelId: ClaudeModelAliasId;
  readonly sessionId: string;
  readonly targetReasoningEffort?: ClaudeThinkingEffort;
  readonly thinkingEnabled: boolean;
}

type ClaudeModelSwitchSender = (
  sessionId: string,
  modelId: ClaudeModelAliasId,
  thinkingEnabled: boolean,
  targetReasoningEffort?: ClaudeThinkingEffort
) => void;

const EFFECTIVE_MODEL_SUFFIX_PATTERN = /\s+(reasoning|thinking):[^\s]+$/;

const isClaudeModelAliasId = (value: string): value is ClaudeModelAliasId =>
  value === "sonnet" || value === "opus" || value === "haiku";

const normalizeClaudeModelId = (
  modelId: string | undefined
): ClaudeModelAliasId | null => {
  const baseModelId = modelId?.replace(EFFECTIVE_MODEL_SUFFIX_PATTERN, "");
  if (baseModelId === "default") {
    return "sonnet";
  }
  return baseModelId && isClaudeModelAliasId(baseModelId) ? baseModelId : null;
};

const resolveVisibleModelId = (
  session: SessionRecord | null,
  visibleModelId?: string
): string | undefined =>
  session?.modelBinding?.baseModelId ??
  session?.modelBinding?.modelId ??
  visibleModelId;

export const resolveDialogCodexBaseModelId = (options: {
  readonly session: SessionRecord | null;
  readonly visibleModelId?: string;
}): string | null => {
  if (options.session?.providerIds[0] !== "codexCli") {
    return null;
  }
  return (
    resolveVisibleModelId(options.session, options.visibleModelId)?.replace(
      EFFECTIVE_MODEL_SUFFIX_PATTERN,
      ""
    ) ?? null
  );
};

export const resolveDialogClaudeSwitchRequest = (options: {
  readonly requestedModelId?: ClaudeModelAliasId;
  readonly session: SessionRecord | null;
  readonly thinking: ClaudeThinkingSelection;
  readonly visibleModelId?: string;
}): ClaudeDialogModelSwitchRequest | null => {
  const session = options.session;
  if (session?.providerIds[0] !== "claudeCodeCli") {
    return null;
  }
  const modelId =
    options.requestedModelId ??
    normalizeClaudeModelId(resolveVisibleModelId(session, options.visibleModelId));
  if (!modelId) {
    return null;
  }
  return {
    sessionId: session.id,
    modelId,
    thinkingEnabled: options.thinking !== "off",
    ...(options.thinking === "off"
      ? {}
      : { targetReasoningEffort: options.thinking }),
  };
};

export const sendDialogClaudeSwitchRequest = (
  send: ClaudeModelSwitchSender,
  request: ClaudeDialogModelSwitchRequest | null
): void => {
  if (!request) {
    return;
  }
  send(
    request.sessionId,
    request.modelId,
    request.thinkingEnabled,
    request.targetReasoningEffort
  );
};
