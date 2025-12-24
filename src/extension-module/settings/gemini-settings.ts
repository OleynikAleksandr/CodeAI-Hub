import {
  DEFAULT_GEMINI_MODEL_ID,
  GEMINI_MODEL_ID_SET,
  type GeminiModelId,
  type GeminiThinkingLevel,
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
  readonly thinkingLevelByModel: Record<string, GeminiThinkingLevel>;
};

export const DEFAULT_GEMINI_SETTINGS: GeminiSettings = {
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_GEMINI_MODEL_ID,
  thinkingLevelByModel: {},
};

const resolveGeminiDefaultModel = (value: unknown): GeminiModelId => {
  if (typeof value !== "string") {
    return DEFAULT_GEMINI_MODEL_ID;
  }

  const alias = value as GeminiModelId;
  return GEMINI_MODEL_ID_SET.has(alias) ? alias : DEFAULT_GEMINI_MODEL_ID;
};

const resolveGeminiThinkingLevelByModel = (
  value: unknown
): Record<string, GeminiThinkingLevel> => {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, GeminiThinkingLevel> = {};
  for (const [modelId, level] of Object.entries(value)) {
    if (typeof level === "string") {
      result[modelId] = level as GeminiThinkingLevel;
    }
  }
  return result;
};

export const normalizeGeminiSettings = (value: unknown): GeminiSettings => {
  if (!isRecord(value)) {
    return DEFAULT_GEMINI_SETTINGS;
  }

  return {
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
    defaultModel: resolveGeminiDefaultModel(value.defaultModel),
    thinkingLevelByModel: resolveGeminiThinkingLevelByModel(
      value.thinkingLevelByModel
    ),
  };
};
