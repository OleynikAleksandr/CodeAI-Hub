export type KimiModelId = "kimi-for-coding";
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
    id: "kimi-for-coding",
    displayName: "Kimi 2.6 / Kimi Code",
    description: "Kimi CLI coding model exposed through Wire mode.",
    status: "active",
    supportsReasoningControl: false,
    supportsThinkingDisplaySummarized: false,
    tier: "coding",
  },
] as const satisfies readonly KimiModelDescriptor[];

export const DEFAULT_KIMI_MODEL_ID: KimiModelId = "kimi-for-coding";

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
