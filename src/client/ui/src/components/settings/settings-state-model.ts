import {
  CLAUDE_MODEL_ALIAS_SET,
  type ClaudeModelAliasId,
  DEFAULT_CLAUDE_MODEL_ALIAS,
} from "../../../../../types/claude-model-registry";
import {
  CODEX_REASONING_LEVELS,
  CODEX_SETTINGS_MODELS,
  type CodexModelId,
  type CodexReasoningLevel,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
} from "../../../../../types/codex-model-registry";
import {
  areGeminiThinkingLevelByModelEqual,
  type GeminiSettings,
  mapGeminiSettings,
} from "./gemini-mapping";
import type {
  RawAutoUpdateSettings,
  RawClaudeSettings,
  RawCodexSettings,
  RawGeneralSettings,
  RawSettingsSnapshot,
  RawThinkingSettings,
} from "./settings-state-raw";

export type {
  CodexModelId,
  CodexReasoningLevel,
} from "../../../../../types/codex-model-registry";

export type ProviderId = "claude" | "codex" | "gemini";

export type { ProviderVersions, VersionEntry } from "./provider-versions-model";
export type { RawSettingsSnapshot } from "./settings-state-raw";

type ThinkingSettings = {
  readonly enabled: boolean;
  readonly maxTokens: number;
};
type AutoUpdateSettings = {
  readonly enabled: boolean;
};
type CoreControlsSettings = {
  readonly allowRestart: boolean;
};
type GeneralSettings = {
  readonly coreControls: CoreControlsSettings;
};
type ContinuitySettings = {
  readonly remainingPercentThreshold: number;
};
type ClaudeSettings = {
  readonly thinking: ThinkingSettings;
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: ClaudeModelAliasId;
  readonly sessionContinuity: ContinuitySettings;
};
export type CodexReasoningByModel = Readonly<
  Record<string, CodexReasoningLevel>
>;
type CodexSettings = {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: CodexModelId;
  readonly reasoningByModel: CodexReasoningByModel;
  readonly sessionContinuity: ContinuitySettings;
};
export type Settings = {
  readonly general: GeneralSettings;
  readonly providers: {
    readonly claude: ClaudeSettings;
    readonly codex: CodexSettings;
    readonly gemini: GeminiSettings;
  };
};

const DEFAULT_THINKING_MAX_TOKENS = 4000;
const DEFAULT_AUTO_UPDATE_ENABLED = true;
const DEFAULT_CORE_RESTART_ENABLED = true;
const DEFAULT_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;
const CODEX_MODEL_IDS = new Set<string>(
  CODEX_SETTINGS_MODELS.map((model) => model.id)
);
const CODEX_REASONING_LEVEL_SET = new Set<string>(
  CODEX_REASONING_LEVELS.map((level) => level.name)
);
const DEFAULT_CODEX_REASONING_BY_MODEL = CODEX_SETTINGS_MODELS.reduce<
  Record<string, CodexReasoningLevel>
>((accumulator, model) => {
  accumulator[model.id] = DEFAULT_CODEX_REASONING_LEVEL;
  return accumulator;
}, {});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mapThinkingSettings = (
  value: RawThinkingSettings | undefined
): ThinkingSettings => {
  const numericValue = Number(value?.maxTokens);
  return {
    enabled: Boolean(value?.enabled),
    maxTokens: Number.isFinite(numericValue)
      ? numericValue
      : DEFAULT_THINKING_MAX_TOKENS,
  };
};

const mapAutoUpdateSettings = (
  value: RawAutoUpdateSettings | undefined
): AutoUpdateSettings => ({
  enabled:
    typeof value?.enabled === "boolean"
      ? value.enabled
      : DEFAULT_AUTO_UPDATE_ENABLED,
});

const mapGeneralSettings = (
  value: RawGeneralSettings | undefined
): GeneralSettings => ({
  coreControls: {
    allowRestart:
      typeof value?.coreControls?.allowRestart === "boolean"
        ? value.coreControls.allowRestart
        : DEFAULT_CORE_RESTART_ENABLED,
  },
});

const mapContinuity = (value: unknown): ContinuitySettings => {
  const numericValue = Number(
    isRecord(value) ? value.remainingPercentThreshold : undefined
  );
  const remainingPercentThreshold = Number.isFinite(numericValue)
    ? Math.min(
        MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
        Math.max(
          MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
          numericValue
        )
      )
    : DEFAULT_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD;
  return { remainingPercentThreshold };
};

const mapClaudeSettings = (
  value: RawClaudeSettings | undefined
): ClaudeSettings => ({
  thinking: mapThinkingSettings(value?.thinking),
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
  defaultModel: resolveClaudeDefaultModel(value?.defaultModel),
  sessionContinuity: mapContinuity(value?.sessionContinuity),
});

const resolveCodexModelId = (value: unknown): CodexModelId =>
  typeof value === "string" && CODEX_MODEL_IDS.has(value)
    ? (value as CodexModelId)
    : DEFAULT_CODEX_MODEL_ID;

const resolveClaudeDefaultModel = (value: unknown): ClaudeModelAliasId => {
  if (typeof value !== "string") {
    return DEFAULT_CLAUDE_MODEL_ALIAS;
  }

  const alias = value as ClaudeModelAliasId;
  return CLAUDE_MODEL_ALIAS_SET.has(alias) ? alias : DEFAULT_CLAUDE_MODEL_ALIAS;
};

const mapCodexReasoningByModel = (value: unknown): CodexReasoningByModel => {
  const nextReasoningByModel = { ...DEFAULT_CODEX_REASONING_BY_MODEL };

  if (!isRecord(value)) {
    return nextReasoningByModel;
  }

  for (const [modelId, reasoning] of Object.entries(value)) {
    if (
      typeof reasoning === "string" &&
      CODEX_MODEL_IDS.has(modelId) &&
      CODEX_REASONING_LEVEL_SET.has(reasoning)
    ) {
      nextReasoningByModel[modelId] = reasoning as CodexReasoningLevel;
    }
  }

  return nextReasoningByModel;
};

const mapCodexSettings = (
  value: RawCodexSettings | undefined
): CodexSettings => ({
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
  defaultModel: resolveCodexModelId(value?.defaultModel),
  reasoningByModel: mapCodexReasoningByModel(value?.reasoningByModel),
  sessionContinuity: mapContinuity(value?.sessionContinuity),
});

export const mapSettingsSnapshot = (
  value: RawSettingsSnapshot | undefined
): Settings => ({
  general: mapGeneralSettings(value?.general),
  providers: {
    claude: mapClaudeSettings(value?.providers?.claude),
    codex: mapCodexSettings(value?.providers?.codex),
    gemini: mapGeminiSettings(value?.providers?.gemini, mapAutoUpdateSettings),
  },
});

export const createDefaultSettings = (): Settings =>
  mapSettingsSnapshot(undefined);

const areAutoUpdateSettingsEqual = (
  left: AutoUpdateSettings,
  right: AutoUpdateSettings
): boolean => left.enabled === right.enabled;

const areThinkingSettingsEqual = (
  left: ThinkingSettings,
  right: ThinkingSettings
): boolean =>
  left.enabled === right.enabled && left.maxTokens === right.maxTokens;

const areReasoningByModelEqual = (
  left: CodexReasoningByModel,
  right: CodexReasoningByModel
): boolean => {
  const leftEntries = Object.entries(left);
  if (leftEntries.length !== Object.keys(right).length) {
    return false;
  }

  return leftEntries.every(
    ([modelId, reasoning]) => right[modelId] === reasoning
  );
};

const areGeneralSettingsEqual = (
  left: GeneralSettings,
  right: GeneralSettings
): boolean =>
  left.coreControls.allowRestart === right.coreControls.allowRestart;

const areClaudeSettingsEqual = (
  left: ClaudeSettings,
  right: ClaudeSettings
): boolean =>
  areThinkingSettingsEqual(left.thinking, right.thinking) &&
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  left.defaultModel === right.defaultModel &&
  left.sessionContinuity.remainingPercentThreshold ===
    right.sessionContinuity.remainingPercentThreshold;

const areCodexSettingsEqual = (
  left: CodexSettings,
  right: CodexSettings
): boolean =>
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  left.defaultModel === right.defaultModel &&
  areReasoningByModelEqual(left.reasoningByModel, right.reasoningByModel) &&
  left.sessionContinuity.remainingPercentThreshold ===
    right.sessionContinuity.remainingPercentThreshold;

const areGeminiSettingsEqual = (
  left: GeminiSettings,
  right: GeminiSettings
): boolean =>
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  left.defaultModel === right.defaultModel &&
  areGeminiThinkingLevelByModelEqual(
    left.thinkingLevelByModel,
    right.thinkingLevelByModel
  ) &&
  left.sessionContinuity.contextWindowTokenLimit ===
    right.sessionContinuity.contextWindowTokenLimit &&
  left.sessionContinuity.remainingPercentThreshold ===
    right.sessionContinuity.remainingPercentThreshold;

export const areSettingsEqual = (left: Settings, right: Settings): boolean =>
  areGeneralSettingsEqual(left.general, right.general) &&
  areClaudeSettingsEqual(left.providers.claude, right.providers.claude) &&
  areCodexSettingsEqual(left.providers.codex, right.providers.codex) &&
  areGeminiSettingsEqual(left.providers.gemini, right.providers.gemini);
