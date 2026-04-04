import type { ActiveSession } from "../session/types";
import type {
  CodexReasoningEffort,
  CodexThreadOptions,
  CodexTurnOptions,
} from "../types";
import { CODEX_APPLIED_TURN_CONFIG_KEY } from "../types";

const CODEX_REASONING_EFFORTS = new Set<CodexReasoningEffort>([
  "low",
  "medium",
  "high",
  "xhigh",
]);

interface ThreadRuntimeState {
  _threadOptions?: CodexThreadOptions & {
    readonly effectiveModelId?: string;
  };
}

interface ResolvedAppliedCodexTurnConfig {
  readonly effectiveModelId?: string;
  readonly messagesForTheUserLanguage?: string;
  readonly modelId?: string;
  readonly reasoningEffort?: CodexReasoningEffort;
  readonly runtimeModelId?: string;
  readonly thinkingDisplaySyncEnabled?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readAppliedCodexTurnConfig = (
  turnOptions?: CodexTurnOptions
): ResolvedAppliedCodexTurnConfig | null => {
  const candidate = turnOptions?.[CODEX_APPLIED_TURN_CONFIG_KEY];
  if (!isRecord(candidate) || candidate.providerId !== "codexCli") {
    return null;
  }

  const modelId =
    typeof candidate.modelId === "string" ? candidate.modelId : undefined;
  const baseModelId =
    typeof candidate.baseModelId === "string"
      ? candidate.baseModelId
      : undefined;
  const effectiveModelId =
    typeof candidate.effectiveModelId === "string"
      ? candidate.effectiveModelId
      : modelId;

  return {
    effectiveModelId,
    messagesForTheUserLanguage:
      typeof candidate.messagesForTheUserLanguage === "string"
        ? candidate.messagesForTheUserLanguage
        : undefined,
    modelId,
    reasoningEffort:
      typeof candidate.reasoningEffort === "string" &&
      CODEX_REASONING_EFFORTS.has(
        candidate.reasoningEffort as CodexReasoningEffort
      )
        ? (candidate.reasoningEffort as CodexReasoningEffort)
        : undefined,
    runtimeModelId: baseModelId ?? modelId,
    thinkingDisplaySyncEnabled:
      typeof candidate.thinkingDisplaySyncEnabled === "boolean"
        ? candidate.thinkingDisplaySyncEnabled
        : undefined,
  };
};

export const applyCodexTurnRuntimeConfig = (
  session: ActiveSession,
  turnOptions?: CodexTurnOptions
): CodexTurnOptions | undefined => {
  const appliedConfig = readAppliedCodexTurnConfig(turnOptions);
  session.runtimeTurnConfig ??= {};
  if (appliedConfig?.messagesForTheUserLanguage) {
    session.messagesForTheUserLanguage =
      appliedConfig.messagesForTheUserLanguage;
    session.runtimeTurnConfig.messagesForTheUserLanguage =
      appliedConfig.messagesForTheUserLanguage;
  }
  if (appliedConfig?.thinkingDisplaySyncEnabled !== undefined) {
    session.runtimeTurnConfig.thinkingDisplaySyncEnabled =
      appliedConfig.thinkingDisplaySyncEnabled;
  }
  if (appliedConfig && session.thread) {
    const thread = session.thread as unknown as ThreadRuntimeState;
    thread._threadOptions = {
      ...(thread._threadOptions ?? {}),
      effectiveModelId:
        appliedConfig.effectiveModelId ??
        thread._threadOptions?.effectiveModelId,
      model: appliedConfig.runtimeModelId ?? thread._threadOptions?.model,
      modelReasoningEffort:
        appliedConfig.reasoningEffort ??
        thread._threadOptions?.modelReasoningEffort,
    };
  }

  if (!(turnOptions && CODEX_APPLIED_TURN_CONFIG_KEY in turnOptions)) {
    return turnOptions;
  }

  const {
    [CODEX_APPLIED_TURN_CONFIG_KEY]: _ignoredAppliedConfig,
    ...strippedOptions
  } = turnOptions as CodexTurnOptions & Record<string, unknown>;
  return Object.keys(strippedOptions).length > 0
    ? (strippedOptions as CodexTurnOptions)
    : undefined;
};
