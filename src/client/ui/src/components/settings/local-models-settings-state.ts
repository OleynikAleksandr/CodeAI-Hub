export interface LocalModelsSettings {
  readonly defaultModel: string;
}

export interface RawLocalModelsSettings {
  readonly defaultModel?: unknown;
}

const DEFAULT_LOCAL_MODELS_MODEL_ID = "local-model";

const normalizeLocalModelsModelId = (
  value: unknown,
  fallback = DEFAULT_LOCAL_MODELS_MODEL_ID
): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

export const mapLocalModelsSettings = (
  value: RawLocalModelsSettings | undefined
): LocalModelsSettings => ({
  defaultModel: normalizeLocalModelsModelId(value?.defaultModel),
});

export const areLocalModelsSettingsEqual = (
  left: LocalModelsSettings | undefined,
  right: LocalModelsSettings | undefined
): boolean =>
  (left?.defaultModel ?? DEFAULT_LOCAL_MODELS_MODEL_ID) ===
  (right?.defaultModel ?? DEFAULT_LOCAL_MODELS_MODEL_ID);
