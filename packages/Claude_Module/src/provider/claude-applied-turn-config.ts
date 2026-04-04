import type { ActiveSession } from "../session/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface AppliedClaudeTurnConfig {
  readonly messagesForTheUserLanguage?: string;
  readonly thinkingDisplaySyncEnabled?: boolean;
}

const readOptionalTrimmedString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
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
  options.owner.runtimeTurnConfig.thinkingDisplaySyncEnabled =
    appliedConfig.thinkingDisplaySyncEnabled;
};
