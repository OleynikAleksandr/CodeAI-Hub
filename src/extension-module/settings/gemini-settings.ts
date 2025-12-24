import {
  GEMINI_MODEL_ID_SET,
  type GeminiModelId,
  DEFAULT_GEMINI_MODEL_ID,
} from "../../types/gemini-model-registry";
import {
  type AutoUpdateSettings,
  DEFAULT_AUTO_UPDATE_SETTINGS,
  normalizeAutoUpdateSettings,
} from "./auto-update-settings";
import { isRecord } from "./settings-utils";

export type GeminiSettings = {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: GeminiModelId;
};

export const DEFAULT_GEMINI_SETTINGS: GeminiSettings = {
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_GEMINI_MODEL_ID,
};

const resolveGeminiDefaultModel = (value: unknown): GeminiModelId => {
  if (typeof value !== "string") {
    return DEFAULT_GEMINI_MODEL_ID;
  }

  const alias = value as GeminiModelId;
  return GEMINI_MODEL_ID_SET.has(alias) ? alias : DEFAULT_GEMINI_MODEL_ID;
};

export const normalizeGeminiSettings = (value: unknown): GeminiSettings => {
  if (!isRecord(value)) {
    return DEFAULT_GEMINI_SETTINGS;
  }

  return {
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
    defaultModel: resolveGeminiDefaultModel(value.defaultModel),
  };
};
