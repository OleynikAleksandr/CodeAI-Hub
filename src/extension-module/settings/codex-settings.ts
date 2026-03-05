import {
  CODEX_REASONING_LEVELS,
  CODEX_SETTINGS_MODELS,
  type CodexModelId,
  type CodexReasoningLevel,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
  normalizeCodexSettingsModelId,
} from "../../types/codex-model-registry";
import {
  type AutoUpdateSettings,
  DEFAULT_AUTO_UPDATE_SETTINGS,
  normalizeAutoUpdateSettings,
} from "./auto-update-settings";
import { isRecord } from "./settings-utils";

export type CodexReasoningByModel = Readonly<
  Record<string, CodexReasoningLevel>
>;

export type CodexSessionContinuitySettings = {
  readonly remainingPercentThreshold: number;
};

export type CodexSettings = {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: CodexModelId;
  readonly reasoningByModel: CodexReasoningByModel;
  readonly sessionContinuity: CodexSessionContinuitySettings;
};

export const MIN_CODEX_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
export const MAX_CODEX_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;

const CODEX_MODEL_IDS = new Set<string>(
  CODEX_SETTINGS_MODELS.map((model) => model.id)
);
const CODEX_REASONING_LEVEL_SET = new Set<string>(
  CODEX_REASONING_LEVELS.map((level) => level.name)
);

const createDefaultReasoningByModel = (): CodexReasoningByModel =>
  CODEX_SETTINGS_MODELS.reduce<Record<string, CodexReasoningLevel>>(
    (accumulator, model) => {
      accumulator[model.id] = DEFAULT_CODEX_REASONING_LEVEL;
      return accumulator;
    },
    {}
  );

const DEFAULT_CODEX_REASONING_BY_MODEL = createDefaultReasoningByModel();

export const DEFAULT_CODEX_SESSION_CONTINUITY_SETTINGS: CodexSessionContinuitySettings =
  {
    remainingPercentThreshold: 30,
  };

export const DEFAULT_CODEX_SETTINGS: CodexSettings = {
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_CODEX_MODEL_ID,
  reasoningByModel: DEFAULT_CODEX_REASONING_BY_MODEL,
  sessionContinuity: DEFAULT_CODEX_SESSION_CONTINUITY_SETTINGS,
};

const isCodexModelId = (value: string): value is CodexModelId =>
  CODEX_MODEL_IDS.has(value);

const isCodexReasoningLevel = (value: string): value is CodexReasoningLevel =>
  CODEX_REASONING_LEVEL_SET.has(value);

const normalizeCodexDefaultModel = (value: unknown): CodexModelId =>
  normalizeCodexSettingsModelId(value) ?? DEFAULT_CODEX_MODEL_ID;

const resolveCodexReasoningLevel = (
  value: unknown
): CodexReasoningLevel | null =>
  typeof value === "string" && isCodexReasoningLevel(value) ? value : null;

const applyKnownCodexReasoning = (
  nextReasoningByModel: Record<string, CodexReasoningLevel>,
  assignedModelIds: Set<string>,
  modelId: string,
  reasoning: CodexReasoningLevel
): void => {
  if (!isCodexModelId(modelId)) {
    return;
  }

  nextReasoningByModel[modelId] = reasoning;
  assignedModelIds.add(modelId);
};

const applyLegacyCodexReasoning = (
  nextReasoningByModel: Record<string, CodexReasoningLevel>,
  assignedModelIds: Set<string>,
  modelId: string,
  reasoning: CodexReasoningLevel
): void => {
  if (isCodexModelId(modelId)) {
    return;
  }

  const normalizedModelId = normalizeCodexSettingsModelId(modelId);
  if (!normalizedModelId || assignedModelIds.has(normalizedModelId)) {
    return;
  }

  nextReasoningByModel[normalizedModelId] = reasoning;
  assignedModelIds.add(normalizedModelId);
};

const normalizeCodexReasoningByModel = (
  value: unknown
): CodexReasoningByModel => {
  if (!isRecord(value)) {
    return DEFAULT_CODEX_REASONING_BY_MODEL;
  }

  const nextReasoningByModel = {
    ...DEFAULT_CODEX_REASONING_BY_MODEL,
  };
  const assignedModelIds = new Set<string>();

  for (const [modelId, reasoning] of Object.entries(value)) {
    const normalizedReasoning = resolveCodexReasoningLevel(reasoning);
    if (!normalizedReasoning) {
      continue;
    }

    applyKnownCodexReasoning(
      nextReasoningByModel,
      assignedModelIds,
      modelId,
      normalizedReasoning
    );
  }

  for (const [modelId, reasoning] of Object.entries(value)) {
    const normalizedReasoning = resolveCodexReasoningLevel(reasoning);
    if (!normalizedReasoning) {
      continue;
    }

    applyLegacyCodexReasoning(
      nextReasoningByModel,
      assignedModelIds,
      modelId,
      normalizedReasoning
    );
  }

  return nextReasoningByModel;
};

const clampContinuityRemainingPercentThreshold = (value: number): number =>
  Math.min(
    MAX_CODEX_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    Math.max(MIN_CODEX_CONTINUITY_REMAINING_PERCENT_THRESHOLD, value)
  );

export const normalizeCodexSessionContinuitySettings = (
  value: unknown
): CodexSessionContinuitySettings => {
  if (!isRecord(value)) {
    return DEFAULT_CODEX_SESSION_CONTINUITY_SETTINGS;
  }

  const numericValue = Number(value.remainingPercentThreshold);
  const remainingPercentThreshold = Number.isFinite(numericValue)
    ? clampContinuityRemainingPercentThreshold(numericValue)
    : DEFAULT_CODEX_SESSION_CONTINUITY_SETTINGS.remainingPercentThreshold;

  return { remainingPercentThreshold };
};

export const normalizeCodexSettings = (value: unknown): CodexSettings => {
  if (!isRecord(value)) {
    return DEFAULT_CODEX_SETTINGS;
  }

  return {
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
    defaultModel: normalizeCodexDefaultModel(value.defaultModel),
    reasoningByModel: normalizeCodexReasoningByModel(value.reasoningByModel),
    sessionContinuity: normalizeCodexSessionContinuitySettings(
      value.sessionContinuity
    ),
  };
};
