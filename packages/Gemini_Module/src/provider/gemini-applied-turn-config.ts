import type { ModuleReporter } from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface AppliedGeminiTurnConfig {
  readonly modelId?: string;
  readonly thinkingLevel?: string;
}

interface GeminiRuntimeOverrideOwner {
  pendingModelOverride?: string;
  pendingThinkingLevelOverride?: string;
}

const readOptionalTrimmedString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const readAppliedGeminiTurnConfig = (
  turnOptions?: Record<string, unknown>
): AppliedGeminiTurnConfig | null => {
  const candidate = turnOptions?.__codeaiAppliedTurnConfig;
  if (!isRecord(candidate) || candidate.providerId !== "geminiCli") {
    return null;
  }
  return {
    modelId: readOptionalTrimmedString(candidate.modelId),
    thinkingLevel: readOptionalTrimmedString(candidate.thinkingLevel),
  };
};

export const applyGeminiTurnRuntimeConfig = (options: {
  readonly owner: GeminiRuntimeOverrideOwner;
  readonly reporter?: ModuleReporter;
  readonly turnOptions?: Record<string, unknown>;
}): void => {
  const appliedConfig = readAppliedGeminiTurnConfig(options.turnOptions);
  if (!appliedConfig) {
    return;
  }

  if (appliedConfig.modelId) {
    options.owner.pendingModelOverride = appliedConfig.modelId;
  }
  if (appliedConfig.thinkingLevel) {
    options.owner.pendingThinkingLevelOverride = appliedConfig.thinkingLevel;
  }

  if (appliedConfig.modelId || appliedConfig.thinkingLevel) {
    options.reporter?.info?.("Gemini runtime override set", {
      modelId: appliedConfig.modelId,
      thinkingLevel: appliedConfig.thinkingLevel,
    });
  }
};
