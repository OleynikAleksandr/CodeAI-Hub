import type { ActiveSession } from "../session/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface AppliedClaudeTurnConfig {
  readonly messagesForTheUserLanguage?: string;
  readonly reasoningEffort?: "low" | "medium" | "high" | "max";
  readonly thinkingDisplaySyncEnabled?: boolean;
  readonly thinkingEnabled?: boolean;
}

const readOptionalTrimmedString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const readClaudeReasoningEffort = (
  value: unknown
): AppliedClaudeTurnConfig["reasoningEffort"] =>
  value === "low" || value === "medium" || value === "high" || value === "max"
    ? value
    : undefined;

const readAppliedClaudeTurnConfig = (
  turnOptions?: Record<string, unknown>
): AppliedClaudeTurnConfig | null => {
  const candidate = turnOptions?.__codeaiAppliedTurnConfig;
  if (!isRecord(candidate) || candidate.providerId !== "claudeCodeCli") {
    return null;
  }

  return {
    messagesForTheUserLanguage: readOptionalTrimmedString(
      candidate.messagesForTheUserLanguage
    ),
    reasoningEffort: readClaudeReasoningEffort(candidate.reasoningEffort),
    thinkingEnabled:
      typeof candidate.thinkingEnabled === "boolean"
        ? candidate.thinkingEnabled
        : undefined,
    thinkingDisplaySyncEnabled:
      typeof candidate.thinkingDisplaySyncEnabled === "boolean"
        ? candidate.thinkingDisplaySyncEnabled
        : true,
  };
};

export const applyClaudeTurnRuntimeConfig = (options: {
  readonly owner: ActiveSession;
  readonly turnOptions?: Record<string, unknown>;
}): void => {
  const appliedConfig = readAppliedClaudeTurnConfig(options.turnOptions);
  if (!appliedConfig) {
    return;
  }

  if (appliedConfig.messagesForTheUserLanguage) {
    options.owner.runtimeTurnConfig.messagesForTheUserLanguage =
      appliedConfig.messagesForTheUserLanguage;
  }
  options.owner.runtimeTurnConfig.reasoningEffort =
    appliedConfig.reasoningEffort;
  if (appliedConfig.thinkingEnabled !== undefined) {
    options.owner.runtimeTurnConfig.thinkingEnabled =
      appliedConfig.thinkingEnabled;
  }
  options.owner.runtimeTurnConfig.thinkingDisplaySyncEnabled =
    appliedConfig.thinkingDisplaySyncEnabled;
};
