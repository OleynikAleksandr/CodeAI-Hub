import {
  CODEX_ALL_MODELS,
  CODEX_REASONING_LEVELS,
  type CodexModelId,
  type CodexReasoningLevel,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
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

export type CodexSettings = {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: CodexModelId;
  readonly reasoningByModel: CodexReasoningByModel;
};

const CODEX_MODEL_IDS = new Set(CODEX_ALL_MODELS.map((model) => model.id));
const CODEX_REASONING_LEVEL_SET = new Set<string>(
  CODEX_REASONING_LEVELS.map((level) => level.name)
);

const createDefaultReasoningByModel = (): CodexReasoningByModel =>
  CODEX_ALL_MODELS.reduce<Record<string, CodexReasoningLevel>>(
    (accumulator, model) => {
      accumulator[model.id] = DEFAULT_CODEX_REASONING_LEVEL;
      return accumulator;
    },
    {}
  );

const DEFAULT_CODEX_REASONING_BY_MODEL = createDefaultReasoningByModel();

export const DEFAULT_CODEX_SETTINGS: CodexSettings = {
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_CODEX_MODEL_ID,
  reasoningByModel: DEFAULT_CODEX_REASONING_BY_MODEL,
};

const isCodexModelId = (value: string): value is CodexModelId =>
  CODEX_MODEL_IDS.has(value);

const isCodexReasoningLevel = (value: string): value is CodexReasoningLevel =>
  CODEX_REASONING_LEVEL_SET.has(value);

const normalizeCodexDefaultModel = (value: unknown): CodexModelId =>
  typeof value === "string" && isCodexModelId(value)
    ? value
    : DEFAULT_CODEX_MODEL_ID;

const normalizeCodexReasoningByModel = (
  value: unknown
): CodexReasoningByModel => {
  if (!isRecord(value)) {
    return DEFAULT_CODEX_REASONING_BY_MODEL;
  }

  const nextReasoningByModel = {
    ...DEFAULT_CODEX_REASONING_BY_MODEL,
  };

  for (const [modelId, reasoning] of Object.entries(value)) {
    if (typeof reasoning === "string" && isCodexReasoningLevel(reasoning)) {
      nextReasoningByModel[modelId] = reasoning;
    }
  }

  return nextReasoningByModel;
};

export const normalizeCodexSettings = (value: unknown): CodexSettings => {
  if (!isRecord(value)) {
    return DEFAULT_CODEX_SETTINGS;
  }

  return {
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
    defaultModel: normalizeCodexDefaultModel(value.defaultModel),
    reasoningByModel: normalizeCodexReasoningByModel(value.reasoningByModel),
  };
};
