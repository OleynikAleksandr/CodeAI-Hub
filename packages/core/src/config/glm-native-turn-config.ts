import { loadGlmNativeSettingsSnapshot } from "./provider-settings-snapshot";

export type GlmReasoningEffort = "max" | "high";

export interface ResolvedGlmNativeTurnConfig {
  readonly baseModelId: string;
  readonly defaultModel: string;
  readonly effectiveModelId: string;
  readonly reasoningEffort: GlmReasoningEffort;
  readonly thinkingDisplaySyncEnabled: boolean;
  readonly thinkingEnabled: boolean;
}

interface ResolveGlmNativeTurnConfigOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly settingsPath: string;
}

const DEFAULT_GLM_NATIVE_MODEL_ID = "glm-5.2";
const DEFAULT_GLM_NATIVE_REASONING_EFFORT: GlmReasoningEffort = "max";
const GLM_HIGH_REASONING_ALIASES = new Set(["high", "medium", "low"]);
const GLM_MAX_REASONING_ALIASES = new Set(["max", "xhigh"]);
const GLM_REASONING_OFF_ALIASES = new Set(["minimal", "none"]);

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const normalizeGlmReasoningEffort = (value: unknown): GlmReasoningEffort => {
  if (typeof value === "string" && GLM_HIGH_REASONING_ALIASES.has(value)) {
    return "high";
  }
  if (typeof value === "string" && GLM_MAX_REASONING_ALIASES.has(value)) {
    return "max";
  }
  return DEFAULT_GLM_NATIVE_REASONING_EFFORT;
};

const isGlmReasoningOff = (value: unknown): boolean =>
  typeof value === "string" && GLM_REASONING_OFF_ALIASES.has(value);

export const buildGlmNativeEffectiveModelId = (options: {
  readonly baseModelId: string;
  readonly reasoningEffort?: string;
  readonly thinkingEnabled?: boolean;
}): string =>
  options.thinkingEnabled === false
    ? `${options.baseModelId} thinking:off`
    : `${options.baseModelId} reasoning:${options.reasoningEffort ?? DEFAULT_GLM_NATIVE_REASONING_EFFORT}`;

export const resolveGlmNativeTurnConfig = (
  options: ResolveGlmNativeTurnConfigOptions
): ResolvedGlmNativeTurnConfig => {
  const snapshot = loadGlmNativeSettingsSnapshot(options.settingsPath);
  const defaultModel =
    normalizeOptionalString(snapshot?.defaultModel) ??
    normalizeOptionalString(options.env.GLM_DEFAULT_MODEL) ??
    DEFAULT_GLM_NATIVE_MODEL_ID;
  const rawReasoningEffort =
    options.env.GLM_REASONING_EFFORT ?? snapshot?.reasoningEffort;
  const thinkingEnabled =
    !isGlmReasoningOff(rawReasoningEffort) &&
    snapshot?.thinkingEnabled !== false;
  const reasoningEffort = normalizeGlmReasoningEffort(rawReasoningEffort);

  return {
    baseModelId: defaultModel,
    defaultModel,
    effectiveModelId: buildGlmNativeEffectiveModelId({
      baseModelId: defaultModel,
      reasoningEffort,
      thinkingEnabled,
    }),
    reasoningEffort,
    thinkingDisplaySyncEnabled: snapshot?.thinkingDisplaySyncEnabled !== false,
    thinkingEnabled,
  };
};
