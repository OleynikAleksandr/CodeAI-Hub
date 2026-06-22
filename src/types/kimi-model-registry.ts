export type KimiModelId = "kimi-k2.7-code" | "kimi-k2.7-code-highspeed";
export type KimiModelStatus = "active";
export type KimiModelTier = "coding";

export interface KimiModelDescriptor {
  readonly description: string;
  readonly displayName: string;
  readonly id: KimiModelId;
  readonly status: KimiModelStatus;
  readonly supportsReasoningControl: boolean;
  readonly supportsThinkingDisplaySummarized: boolean;
  readonly tier: KimiModelTier;
}

export const KIMI_RECOMMENDED_MODELS = [
  {
    id: "kimi-k2.7-code",
    displayName: "Kimi K2.7 Code",
    description: "Kimi K2.7 Code model exposed through Kimi Code ACP.",
    status: "active",
    supportsReasoningControl: false,
    supportsThinkingDisplaySummarized: false,
    tier: "coding",
  },
  {
    id: "kimi-k2.7-code-highspeed",
    displayName: "Kimi K2.7 Code High Speed",
    description: "Lower-latency Kimi K2.7 coding model exposed through ACP.",
    status: "active",
    supportsReasoningControl: false,
    supportsThinkingDisplaySummarized: false,
    tier: "coding",
  },
] as const satisfies readonly KimiModelDescriptor[];

export const DEFAULT_KIMI_MODEL_ID: KimiModelId = "kimi-k2.7-code";

export const KIMI_MODEL_ID_SET = new Set<KimiModelId>(
  KIMI_RECOMMENDED_MODELS.map((model) => model.id)
);

export const findKimiModelDescriptor = (
  modelId: string | null | undefined
): KimiModelDescriptor | null => {
  const normalizedModelId = modelId?.trim();
  if (!normalizedModelId) {
    return null;
  }
  return (
    KIMI_RECOMMENDED_MODELS.find((model) => model.id === normalizedModelId) ??
    null
  );
};
