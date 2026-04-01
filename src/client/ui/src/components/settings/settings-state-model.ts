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
import {
  areGeneralResponsePolicyEqual,
  mapGeneralResponsePolicy,
} from "./general-response-mode/response-mode-state";
import type {
  RawAutoUpdateSettings,
  RawClaudeSettings,
  RawCodexSettings,
  RawGeminiSettings,
  RawGeneralLocalizationSettings,
  RawGeneralSettings,
  RawLocalizationCategorySettings,
  RawSettingsSnapshot,
  RawThinkingSettings,
} from "./settings-state-raw";

export type {
  CodexModelId,
  CodexReasoningLevel,
} from "../../../../../types/codex-model-registry";
export type {
  GeneralResponseMode,
  GeneralResponsePolicySettings,
} from "./general-response-mode/response-mode-state";

export type ProviderId = "claude" | "codex" | "gemini";

export type { ProviderVersions, VersionEntry } from "./provider-versions-model";
export type { RawSettingsSnapshot } from "./settings-state-raw";

interface ThinkingSettings {
  readonly enabled: boolean;
  readonly maxTokens: number;
}
interface ThinkingDisplaySyncSettings {
  readonly thinkingDisplaySyncEnabled: boolean;
}
interface CodexReasoningSummarySettings {
  readonly reasoningSummaryEnabled: boolean;
}
interface AutoUpdateSettings {
  readonly enabled: boolean;
}
interface CoreControlsSettings {
  readonly allowRestart: boolean;
}
type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";
interface LocalizationCategorySettings {
  readonly interactiveTemplates: string;
  readonly systemFeedback: string;
  readonly uiInterface: string;
  readonly userGuidance: string;
  readonly workflowTerms: string;
}
interface LocalizationSettings {
  readonly categories: LocalizationCategorySettings;
  readonly defaultLanguage: string;
  readonly engineId: string;
  readonly glossaryEnabled: boolean;
  readonly workflowTermsPolicy: LocalizationWorkflowTermsPolicy;
}
interface GeneralSettings {
  readonly coreControls: CoreControlsSettings;
  readonly localization: LocalizationSettings;
  readonly responsePolicy: import("./general-response-mode/response-mode-state").GeneralResponsePolicySettings;
}
interface ContinuitySettings {
  readonly remainingPercentThreshold: number;
}
interface ClaudeSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: ClaudeModelAliasId;
  readonly sessionContinuity: ContinuitySettings;
  readonly thinking: ThinkingSettings;
  readonly thinkingDisplaySyncEnabled: boolean;
}
export type CodexReasoningByModel = Readonly<
  Record<string, CodexReasoningLevel>
>;
interface CodexSettings extends ThinkingDisplaySyncSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: CodexModelId;
  readonly reasoningByModel: CodexReasoningByModel;
  readonly reasoningSummaryEnabled: boolean;
  readonly sessionContinuity: ContinuitySettings;
}
interface GeminiSettingsWithDisplaySync
  extends GeminiSettings,
    ThinkingDisplaySyncSettings {}
export interface Settings {
  readonly general: GeneralSettings;
  readonly providers: {
    readonly claude: ClaudeSettings;
    readonly codex: CodexSettings;
    readonly gemini: GeminiSettingsWithDisplaySync;
  };
}

const DEFAULT_THINKING_MAX_TOKENS = 4000;
const DEFAULT_THINKING_DISPLAY_SYNC_ENABLED = true;
const DEFAULT_AUTO_UPDATE_ENABLED = true;
const DEFAULT_CORE_RESTART_ENABLED = true;
const DEFAULT_LOCALIZATION_LANGUAGE = "source";
const DEFAULT_LOCALIZATION_ENGINE_ID = "google-gtx";
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

const mapLocalizationString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

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

const mapThinkingDisplaySyncEnabled = (value: unknown): boolean =>
  typeof value === "boolean" ? value : DEFAULT_THINKING_DISPLAY_SYNC_ENABLED;

const mapCodexReasoningSummaryEnabled = (
  value: unknown,
  legacyValue: unknown
): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  return mapThinkingDisplaySyncEnabled(legacyValue);
};

const mapAutoUpdateSettings = (
  value: RawAutoUpdateSettings | undefined
): AutoUpdateSettings => ({
  enabled:
    typeof value?.enabled === "boolean"
      ? value.enabled
      : DEFAULT_AUTO_UPDATE_ENABLED,
});

const mapLocalizationCategories = (
  value: RawLocalizationCategorySettings | undefined,
  defaultLanguage: string
): LocalizationCategorySettings => ({
  userGuidance: mapLocalizationString(value?.userGuidance, defaultLanguage),
  uiInterface: mapLocalizationString(value?.uiInterface, defaultLanguage),
  workflowTerms: mapLocalizationString(value?.workflowTerms, defaultLanguage),
  systemFeedback: mapLocalizationString(value?.systemFeedback, defaultLanguage),
  interactiveTemplates: mapLocalizationString(
    value?.interactiveTemplates,
    defaultLanguage
  ),
});

const mapLocalizationWorkflowTermsPolicy = (
  value: unknown
): LocalizationWorkflowTermsPolicy =>
  value === "translate" ? "translate" : "keep_english";

const mapLocalizationSettings = (
  value: RawGeneralLocalizationSettings | undefined
): LocalizationSettings => {
  const defaultLanguage = mapLocalizationString(
    value?.defaultLanguage,
    DEFAULT_LOCALIZATION_LANGUAGE
  );

  return {
    defaultLanguage,
    categories: mapLocalizationCategories(value?.categories, defaultLanguage),
    workflowTermsPolicy: mapLocalizationWorkflowTermsPolicy(
      value?.workflowTermsPolicy
    ),
    engineId: mapLocalizationString(
      value?.engineId,
      DEFAULT_LOCALIZATION_ENGINE_ID
    ),
    glossaryEnabled:
      typeof value?.glossaryEnabled === "boolean"
        ? value.glossaryEnabled
        : true,
  };
};

const mapGeneralSettings = (
  value: RawGeneralSettings | undefined
): GeneralSettings => ({
  coreControls: {
    allowRestart:
      typeof value?.coreControls?.allowRestart === "boolean"
        ? value.coreControls.allowRestart
        : DEFAULT_CORE_RESTART_ENABLED,
  },
  localization: mapLocalizationSettings(value?.localization),
  responsePolicy: mapGeneralResponsePolicy(value?.responsePolicy),
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
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

const mapGeminiSettingsWithDisplaySync = (
  value: RawGeminiSettings | undefined
): GeminiSettingsWithDisplaySync => ({
  ...mapGeminiSettings(value, mapAutoUpdateSettings),
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
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
  reasoningSummaryEnabled: mapCodexReasoningSummaryEnabled(
    value?.reasoningSummaryEnabled,
    value?.thinkingDisplaySyncEnabled
  ),
  sessionContinuity: mapContinuity(value?.sessionContinuity),
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

export const mapSettingsSnapshot = (
  value: RawSettingsSnapshot | undefined
): Settings => ({
  general: mapGeneralSettings(value?.general),
  providers: {
    claude: mapClaudeSettings(value?.providers?.claude),
    codex: mapCodexSettings(value?.providers?.codex),
    gemini: mapGeminiSettingsWithDisplaySync(value?.providers?.gemini),
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

const areThinkingDisplaySyncSettingsEqual = (
  left: ThinkingDisplaySyncSettings,
  right: ThinkingDisplaySyncSettings
): boolean =>
  left.thinkingDisplaySyncEnabled === right.thinkingDisplaySyncEnabled;

const areCodexReasoningSummarySettingsEqual = (
  left: CodexReasoningSummarySettings,
  right: CodexReasoningSummarySettings
): boolean => left.reasoningSummaryEnabled === right.reasoningSummaryEnabled;

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
  left.coreControls.allowRestart === right.coreControls.allowRestart &&
  areLocalizationSettingsEqual(left.localization, right.localization) &&
  areGeneralResponsePolicyEqual(left.responsePolicy, right.responsePolicy);

const areLocalizationCategoriesEqual = (
  left: LocalizationCategorySettings,
  right: LocalizationCategorySettings
): boolean =>
  left.userGuidance === right.userGuidance &&
  left.uiInterface === right.uiInterface &&
  left.workflowTerms === right.workflowTerms &&
  left.systemFeedback === right.systemFeedback &&
  left.interactiveTemplates === right.interactiveTemplates;

const areLocalizationSettingsEqual = (
  left: LocalizationSettings,
  right: LocalizationSettings
): boolean =>
  left.defaultLanguage === right.defaultLanguage &&
  areLocalizationCategoriesEqual(left.categories, right.categories) &&
  left.workflowTermsPolicy === right.workflowTermsPolicy &&
  left.engineId === right.engineId &&
  left.glossaryEnabled === right.glossaryEnabled;

const areClaudeSettingsEqual = (
  left: ClaudeSettings,
  right: ClaudeSettings
): boolean =>
  areThinkingSettingsEqual(left.thinking, right.thinking) &&
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  left.defaultModel === right.defaultModel &&
  left.thinkingDisplaySyncEnabled === right.thinkingDisplaySyncEnabled &&
  left.sessionContinuity.remainingPercentThreshold ===
    right.sessionContinuity.remainingPercentThreshold;

const areCodexSettingsEqual = (
  left: CodexSettings,
  right: CodexSettings
): boolean =>
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  areCodexReasoningSummarySettingsEqual(left, right) &&
  left.defaultModel === right.defaultModel &&
  areReasoningByModelEqual(left.reasoningByModel, right.reasoningByModel) &&
  left.sessionContinuity.remainingPercentThreshold ===
    right.sessionContinuity.remainingPercentThreshold;

const areGeminiSettingsEqual = (
  left: GeminiSettingsWithDisplaySync,
  right: GeminiSettingsWithDisplaySync
): boolean =>
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  areThinkingDisplaySyncSettingsEqual(left, right) &&
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
