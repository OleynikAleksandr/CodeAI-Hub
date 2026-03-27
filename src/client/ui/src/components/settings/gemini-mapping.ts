import {
  DEFAULT_GEMINI_MODEL_ID,
  DEFAULT_GEMINI_THINKING_LEVEL,
  GEMINI_MODEL_ID_SET,
  GEMINI_RECOMMENDED_MODELS,
  GEMINI_THINKING_LEVELS,
  type GeminiModelId,
  type GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import type {
  RawAutoUpdateSettings,
  RawGeminiSettings,
} from "./settings-state-raw";

export type GeminiThinkingByModel = Readonly<
  Record<string, GeminiThinkingLevel>
>;

export interface GeminiSessionContinuitySettings {
  readonly contextWindowTokenLimit: number;
  readonly remainingPercentThreshold: number;
}

export interface GeminiSettings {
  readonly autoUpdate: { readonly enabled: boolean };
  readonly defaultModel: GeminiModelId;
  readonly sessionContinuity: GeminiSessionContinuitySettings;
  readonly thinkingLevelByModel: GeminiThinkingByModel;
}

const GEMINI_THINKING_LEVEL_SET = new Set<string>(
  GEMINI_THINKING_LEVELS.map((level) => level.name)
);

const DEFAULT_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 300_000;
const MIN_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 10_000;
const MAX_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 1_000_000;
const DEFAULT_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;

const DEFAULT_GEMINI_THINKING_BY_MODEL = GEMINI_RECOMMENDED_MODELS.reduce<
  Record<string, GeminiThinkingLevel>
>((accumulator, model) => {
  accumulator[model.id] = DEFAULT_GEMINI_THINKING_LEVEL;
  return accumulator;
}, {});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveGeminiModelId = (value: unknown): GeminiModelId =>
  typeof value === "string" && GEMINI_MODEL_ID_SET.has(value as GeminiModelId)
    ? (value as GeminiModelId)
    : DEFAULT_GEMINI_MODEL_ID;

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

const mapGeminiSessionContinuitySettings = (
  value: unknown
): GeminiSessionContinuitySettings => {
  if (!isRecord(value)) {
    return {
      contextWindowTokenLimit: DEFAULT_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT,
      remainingPercentThreshold:
        DEFAULT_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    };
  }

  const numericLimit = Number(value.contextWindowTokenLimit);
  const contextWindowTokenLimit = Number.isFinite(numericLimit)
    ? clampContextWindowTokenLimit(numericLimit)
    : DEFAULT_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT;

  const numericThreshold = Number(value.remainingPercentThreshold);
  const remainingPercentThreshold = Number.isFinite(numericThreshold)
    ? clampContinuityRemainingPercentThreshold(numericThreshold)
    : DEFAULT_GEMINI_CONTINUITY_REMAINING_PERCENT_THRESHOLD;

  return { contextWindowTokenLimit, remainingPercentThreshold };
};

export const mapGeminiThinkingLevelByModel = (
  value: unknown
): GeminiThinkingByModel => {
  const nextThinkingLevelByModel = {
    ...DEFAULT_GEMINI_THINKING_BY_MODEL,
  };

  if (!isRecord(value)) {
    return nextThinkingLevelByModel;
  }

  for (const [modelId, level] of Object.entries(value)) {
    if (typeof level === "string" && GEMINI_THINKING_LEVEL_SET.has(level)) {
      nextThinkingLevelByModel[modelId] = level as GeminiThinkingLevel;
    }
  }

  return nextThinkingLevelByModel;
};

export const mapGeminiSettings = (
  value: RawGeminiSettings | undefined,
  mapAutoUpdate: (v: RawAutoUpdateSettings | undefined) => {
    readonly enabled: boolean;
  }
): GeminiSettings => ({
  autoUpdate: mapAutoUpdate(value?.autoUpdate),
  defaultModel: resolveGeminiModelId(value?.defaultModel),
  thinkingLevelByModel: mapGeminiThinkingLevelByModel(
    value?.thinkingLevelByModel
  ),
  sessionContinuity: mapGeminiSessionContinuitySettings(
    value?.sessionContinuity
  ),
});

export const areGeminiThinkingLevelByModelEqual = (
  left: GeminiThinkingByModel,
  right: GeminiThinkingByModel
): boolean => {
  const leftEntries = Object.entries(left);
  if (leftEntries.length !== Object.keys(right).length) {
    return false;
  }
  return leftEntries.every(([modelId, level]) => right[modelId] === level);
};
