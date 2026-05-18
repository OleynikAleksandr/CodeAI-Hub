export type KimiModelId = "kimi-for-coding";

export interface KimiModelCapabilities {
  readonly displayName: string;
  readonly modelId: KimiModelId;
  readonly supportsReasoningControl: boolean;
  readonly supportsThinkingDisplaySummarized: boolean;
}

export const KIMI_MODEL_CAPABILITIES = [
  {
    modelId: "kimi-for-coding",
    displayName: "Kimi 2.6 / Kimi Code",
    supportsReasoningControl: false,
    supportsThinkingDisplaySummarized: false,
  },
] as const satisfies readonly KimiModelCapabilities[];

const CAPABILITIES_BY_MODEL_ID = new Map<KimiModelId, KimiModelCapabilities>(
  KIMI_MODEL_CAPABILITIES.map((capabilities) => [
    capabilities.modelId,
    capabilities,
  ])
);

export const DEFAULT_KIMI_MODEL_ID: KimiModelId = "kimi-for-coding";

export const listKimiModelCapabilities = (): readonly KimiModelCapabilities[] =>
  KIMI_MODEL_CAPABILITIES;

export const findKimiModelCapabilities = (
  modelId: string | null | undefined
): KimiModelCapabilities | null => {
  const normalizedModelId = modelId?.trim();
  if (!normalizedModelId) {
    return null;
  }
  return CAPABILITIES_BY_MODEL_ID.get(normalizedModelId as KimiModelId) ?? null;
};

export const isKnownKimiModelId = (
  modelId: string | null | undefined
): boolean => findKimiModelCapabilities(modelId) !== null;
