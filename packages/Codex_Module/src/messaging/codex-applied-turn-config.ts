import type { ActiveSession } from "../session/types";
import type {
  CodexReasoningEffort,
  CodexThreadOptions,
  CodexTurnOptions,
} from "../types";

const APPLIED_PROVIDER_TURN_CONFIG_KEY = "__codeaiAppliedTurnConfig";
const CODEX_REASONING_EFFORTS = new Set<CodexReasoningEffort>([
  "low",
  "medium",
  "high",
  "xhigh",
]);

interface AppliedCodexTurnConfig {
  readonly modelId?: string;
  readonly reasoningEffort?: CodexReasoningEffort;
}

interface ThreadRuntimeState {
  _threadOptions?: CodexThreadOptions;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readAppliedCodexTurnConfig = (
  turnOptions?: CodexTurnOptions
): AppliedCodexTurnConfig | null => {
  const candidate =
    turnOptions?.[APPLIED_PROVIDER_TURN_CONFIG_KEY as keyof CodexTurnOptions];
  if (!isRecord(candidate) || candidate.providerId !== "codexCli") {
    return null;
  }

  return {
    modelId:
      typeof candidate.modelId === "string" ? candidate.modelId : undefined,
    reasoningEffort:
      typeof candidate.reasoningEffort === "string" &&
      CODEX_REASONING_EFFORTS.has(
        candidate.reasoningEffort as CodexReasoningEffort
      )
        ? (candidate.reasoningEffort as CodexReasoningEffort)
        : undefined,
  };
};

export const applyCodexTurnRuntimeConfig = (
  session: ActiveSession,
  turnOptions?: CodexTurnOptions
): CodexTurnOptions | undefined => {
  const appliedConfig = readAppliedCodexTurnConfig(turnOptions);
  if (appliedConfig && session.thread) {
    const thread = session.thread as unknown as ThreadRuntimeState;
    thread._threadOptions = {
      ...(thread._threadOptions ?? {}),
      model: appliedConfig.modelId ?? thread._threadOptions?.model,
      modelReasoningEffort:
        appliedConfig.reasoningEffort ??
        thread._threadOptions?.modelReasoningEffort,
    };
  }

  if (!(turnOptions && APPLIED_PROVIDER_TURN_CONFIG_KEY in turnOptions)) {
    return turnOptions;
  }

  const {
    [APPLIED_PROVIDER_TURN_CONFIG_KEY]: _ignoredAppliedConfig,
    ...strippedOptions
  } = turnOptions as CodexTurnOptions & Record<string, unknown>;
  return Object.keys(strippedOptions).length > 0
    ? (strippedOptions as CodexTurnOptions)
    : undefined;
};
