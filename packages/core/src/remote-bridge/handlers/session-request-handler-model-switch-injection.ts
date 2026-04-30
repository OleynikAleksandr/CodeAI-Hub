import {
  CODEX_MODEL_SWITCH_INJECTION_KEY,
  type CodexModelSwitchInjectionPayload,
  resolveCodexWorkflowInvocationProfile,
} from "@codeai-hub/codex-app-server-module";
import type { Session, SessionManager } from "../../session-manager";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const attachPendingCodexModelSwitchInjection = (options: {
  readonly providerId: string;
  readonly session: Session | undefined;
  readonly turnOptions: Record<string, unknown> | undefined;
}): Record<string, unknown> | undefined => {
  const { providerId, session, turnOptions } = options;
  if (
    providerId !== "codexCli" ||
    session?.pendingModelSwitchInjection !== true ||
    !session.modelBinding
  ) {
    return turnOptions;
  }
  const modelBinding = session.modelBinding;
  const injection: CodexModelSwitchInjectionPayload = {
    kind: "model_switch",
    baseInstructions: resolveCodexWorkflowInvocationProfile().baseInstructions,
    targetModelId: modelBinding.baseModelId ?? modelBinding.modelId,
    targetReasoningEffort: modelBinding.reasoningEffort,
  };
  return {
    ...(turnOptions ?? {}),
    [CODEX_MODEL_SWITCH_INJECTION_KEY]: injection,
  };
};

export const clearPendingCodexModelSwitchInjectionAfterDispatch = (
  sessionManager: SessionManager,
  sessionId: string,
  turnOptions: Record<string, unknown> | undefined
): void => {
  if (!isRecord(turnOptions?.[CODEX_MODEL_SWITCH_INJECTION_KEY])) {
    return;
  }
  sessionManager.clearPendingModelSwitchInjection(sessionId);
};
