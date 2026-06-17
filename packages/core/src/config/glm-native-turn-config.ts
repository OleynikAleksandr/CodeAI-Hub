import { loadGlmNativeSettingsSnapshot } from "./provider-settings-snapshot";

export type GlmReasoningEffort =
  | "max"
  | "xhigh"
  | "high"
  | "medium"
  | "low"
  | "minimal"
  | "none";

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
const GLM_REASONING_EFFORTS = new Set<string>([
  "max",
  "xhigh",
  "high",
  "medium",
  "low",
  "minimal",
  "none",
]);

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const normalizeGlmReasoningEffort = (value: unknown): GlmReasoningEffort =>
  typeof value === "string" && GLM_REASONING_EFFORTS.has(value)
    ? (value as GlmReasoningEffort)
    : DEFAULT_GLM_NATIVE_REASONING_EFFORT;

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
  const thinkingEnabled = snapshot?.thinkingEnabled !== false;
  const reasoningEffort = normalizeGlmReasoningEffort(
    options.env.GLM_REASONING_EFFORT ?? snapshot?.reasoningEffort
  );

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
