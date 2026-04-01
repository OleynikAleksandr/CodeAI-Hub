import type { ActiveSession } from "../session/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface AppliedClaudeTurnConfig {
  readonly thinkingDisplaySyncEnabled?: boolean;
}

const readAppliedClaudeTurnConfig = (
  turnOptions?: Record<string, unknown>
): AppliedClaudeTurnConfig | null => {
  const candidate = turnOptions?.__codeaiAppliedTurnConfig;
  if (!isRecord(candidate) || candidate.providerId !== "claudeCodeCli") {
    return null;
  }

  return {
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

  options.owner.runtimeTurnConfig.thinkingDisplaySyncEnabled =
    appliedConfig.thinkingDisplaySyncEnabled;
};
