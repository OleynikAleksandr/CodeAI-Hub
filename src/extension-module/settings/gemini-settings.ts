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

export type GeminiSessionContinuitySettings = {
  readonly contextWindowTokenLimit: number;
  readonly remainingPercentThreshold: number;
};

export type GeminiSettings = {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: GeminiModelId;
  readonly thinkingLevelByModel: Record<string, GeminiThinkingLevel>;
  readonly sessionContinuity: GeminiSessionContinuitySettings;
};

export const MIN_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
export const MAX_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;
export const MIN_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 10_000;
export const MAX_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 1_000_000;

export const DEFAULT_GEMINI_SETTINGS: GeminiSettings = {
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_GEMINI_MODEL_ID,
  thinkingLevelByModel: {},
  sessionContinuity: {
    contextWindowTokenLimit: 300_000,
    remainingPercentThreshold: 30,
  },
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

const clampContinuityRemainingPercentThreshold = (value: number): number =>
  Math.min(
    MAX_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    Math.max(MIN_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD, value)
  );

const clampContextWindowTokenLimit = (value: number): number =>
  Math.min(
    MAX_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT,
    Math.max(MIN_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT, value)
  );

export const normalizeGeminiSessionContinuitySettings = (
  value: unknown
): GeminiSessionContinuitySettings => {
  if (!isRecord(value)) {
    return DEFAULT_GEMINI_SETTINGS.sessionContinuity;
  }

  const numericLimit = Number(value.contextWindowTokenLimit);
  const contextWindowTokenLimit = Number.isFinite(numericLimit)
    ? clampContextWindowTokenLimit(numericLimit)
    : DEFAULT_GEMINI_SETTINGS.sessionContinuity.contextWindowTokenLimit;

  const numericThreshold = Number(value.remainingPercentThreshold);
  const remainingPercentThreshold = Number.isFinite(numericThreshold)
    ? clampContinuityRemainingPercentThreshold(numericThreshold)
    : DEFAULT_GEMINI_SETTINGS.sessionContinuity.remainingPercentThreshold;

  return { contextWindowTokenLimit, remainingPercentThreshold };
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
    sessionContinuity: normalizeGeminiSessionContinuitySettings(
      value.sessionContinuity
    ),
  };
};
