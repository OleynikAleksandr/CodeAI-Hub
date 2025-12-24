import {
  CLAUDE_MODEL_ALIAS_SET,
  type ClaudeModelAliasId,
  DEFAULT_CLAUDE_MODEL_ALIAS,
} from "../../../../../types/claude-model-registry";
import type {
  CodexModelId,
  CodexReasoningLevel,
} from "../../../../../types/codex-model-registry";
import {
  CODEX_ALL_MODELS,
  CODEX_REASONING_LEVELS,
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
type ClaudeSettings = {
  readonly thinking: ThinkingSettings;
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: ClaudeModelAliasId;
};

export type CodexReasoningByModel = Readonly<
  Record<string, CodexReasoningLevel>
>;
type CodexSettings = {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: CodexModelId;
  readonly reasoningByModel: CodexReasoningByModel;
};

export type Settings = {
  readonly general: GeneralSettings;
  readonly providers: {
    readonly claude: ClaudeSettings;
    readonly codex: CodexSettings;
    readonly gemini: GeminiSettings;
  };
};

export type VersionEntry = {
  readonly packageName: string;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly source: "global";
  readonly error?: string | null;
};

export type ProviderVersions = {
  readonly claude: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly codex: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly gemini: {
    readonly cli: VersionEntry;
    readonly core: VersionEntry;
  };
  readonly checkedAt?: string;
};

const DEFAULT_THINKING_MAX_TOKENS = 4000;
const DEFAULT_AUTO_UPDATE_ENABLED = true;
const DEFAULT_CORE_RESTART_ENABLED = true;
const CODEX_MODEL_IDS = new Set<string>(
  CODEX_ALL_MODELS.map((model) => model.id)
);
const CODEX_REASONING_LEVEL_SET = new Set<string>(
  CODEX_REASONING_LEVELS.map((level) => level.name)
);
const DEFAULT_CODEX_REASONING_BY_MODEL = CODEX_ALL_MODELS.reduce<
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

const mapClaudeSettings = (
  value: RawClaudeSettings | undefined
): ClaudeSettings => ({
  thinking: mapThinkingSettings(value?.thinking),
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
  defaultModel: resolveClaudeDefaultModel(value?.defaultModel),
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
  const nextReasoningByModel = {
    ...DEFAULT_CODEX_REASONING_BY_MODEL,
  };

  if (!isRecord(value)) {
    return nextReasoningByModel;
  }

  for (const [modelId, reasoning] of Object.entries(value)) {
    if (
      typeof reasoning === "string" &&
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
  left.defaultModel === right.defaultModel;

const areCodexSettingsEqual = (
  left: CodexSettings,
  right: CodexSettings
): boolean =>
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  left.defaultModel === right.defaultModel &&
  areReasoningByModelEqual(left.reasoningByModel, right.reasoningByModel);

const areGeminiSettingsEqual = (
  left: GeminiSettings,
  right: GeminiSettings
): boolean =>
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  left.defaultModel === right.defaultModel &&
  areGeminiThinkingLevelByModelEqual(
    left.thinkingLevelByModel,
    right.thinkingLevelByModel
  );

export const areSettingsEqual = (left: Settings, right: Settings): boolean =>
  areGeneralSettingsEqual(left.general, right.general) &&
  areClaudeSettingsEqual(left.providers.claude, right.providers.claude) &&
  areCodexSettingsEqual(left.providers.codex, right.providers.codex) &&
  areGeminiSettingsEqual(left.providers.gemini, right.providers.gemini);
