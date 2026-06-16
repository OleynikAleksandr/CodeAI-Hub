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
  areClaudeThinkingSettingsEqual,
  type ClaudeThinkingSettingsState,
  mapClaudeThinkingSettings,
} from "./claude-thinking-state";
import {
  areGeminiThinkingLevelByModelEqual,
  type GeminiSettings,
  mapGeminiSettings,
} from "./gemini-mapping";
import {
  areGeneralResponsePolicyEqual,
  type GeneralResponsePolicySettings,
  mapGeneralResponsePolicy,
} from "./general-response-mode/response-mode-state";
import {
  areKimiProviderSettingsEqual,
  type GlmOpenCodeSettings,
  type KimiSettings,
  mapGlmOpenCodeSettings,
  mapKimiSettings,
} from "./kimi-settings-state";
import {
  areLocalModelsSettingsEqual,
  type LocalModelsSettings,
  mapLocalModelsSettings,
} from "./local-models-settings-state";
import type {
  RawAutoUpdateSettings,
  RawClaudeSettings,
  RawCodexSettings,
  RawGeminiSettings,
  RawGeneralLocalizationSettings,
  RawGeneralSettings,
  RawLocalizationCategorySettings,
  RawSettingsSnapshot,
} from "./settings-state-raw";
import {
  areTextToSpeechSettingsEqual,
  mapTextToSpeechSettings,
  type TextToSpeechSettings,
} from "./text-to-speech-settings";

export type ProviderId = "claude" | "codex" | "gemini" | "kimi";

export type { ProviderVersions, VersionEntry } from "./provider-versions-model";
export type { RawSettingsSnapshot } from "./settings-state-raw";

interface AutoUpdateSettings {
  readonly enabled: boolean;
}
type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";
interface LocalizationCategorySettings {
  readonly artifactsForTheUser?: string;
  readonly interactiveTemplates: string;
  readonly messagesForTheUser?: string;
  readonly reasoning: string;
  readonly systemFeedback: string;
  readonly uiHelperText?: string;
  readonly uiInterface: string;
  readonly uiLabels?: string;
  readonly userGuidance: string;
  readonly workflowTerms: string;
}
interface LocalizationSettings {
  readonly categories: LocalizationCategorySettings;
  readonly defaultLanguage: string;
  readonly engineId: string;
  readonly glossaryEnabled: boolean;
  readonly reasoningEngineId: string;
  readonly workflowTermsPolicy: LocalizationWorkflowTermsPolicy;
}
interface GeneralSettings {
  readonly coreControls: { readonly allowRestart: boolean };
  readonly localization: LocalizationSettings;
  readonly responsePolicy: GeneralResponsePolicySettings;
  readonly textToSpeech: TextToSpeechSettings;
}
interface ContinuitySettings {
  readonly remainingPercentThreshold: number;
}
interface ClaudeSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: ClaudeModelAliasId;
  readonly sessionContinuity: ContinuitySettings;
  readonly thinking: ClaudeThinkingSettingsState;
  readonly thinkingDisplaySyncEnabled: boolean;
}
export type CodexReasoningByModel = Readonly<
  Record<string, CodexReasoningLevel>
>;
interface CodexSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: CodexModelId;
  readonly reasoningByModel: CodexReasoningByModel;
  readonly reasoningSummaryEnabled: boolean;
  readonly sessionContinuity: ContinuitySettings;
  readonly thinkingDisplaySyncEnabled: boolean;
}
interface GeminiSettingsWithDisplaySync extends GeminiSettings {
  readonly thinkingDisplaySyncEnabled: boolean;
}
export interface Settings {
  readonly general: GeneralSettings;
  readonly providers: {
    readonly claude: ClaudeSettings;
    readonly codex: CodexSettings;
    readonly gemini: GeminiSettingsWithDisplaySync;
    readonly kimi?: KimiSettings;
    readonly glmOpenCode?: GlmOpenCodeSettings;
    readonly localModels?: LocalModelsSettings;
  };
}

const DEFAULT_THINKING_DISPLAY_SYNC_ENABLED = true;
const DEFAULT_AUTO_UPDATE_ENABLED = false;
const DEFAULT_CORE_RESTART_ENABLED = true;
const DEFAULT_LOCALIZATION_LANGUAGE = "en";
const DEFAULT_LOCALIZATION_ENGINE_ID = "google-gtx";
const LEGACY_SOURCE_LANGUAGE = "source";
const DEFAULT_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;
const CODEX_MODEL_IDS = new Set<string>(
  CODEX_SETTINGS_MODELS.map(({ id }) => id)
);
const CODEX_REASONING_LEVEL_SET = new Set<string>(
  CODEX_REASONING_LEVELS.map(({ name }) => name)
);
const DEFAULT_CODEX_REASONING_BY_MODEL = CODEX_SETTINGS_MODELS.reduce<
  Record<string, CodexReasoningLevel>
>((accumulator, model) => {
  accumulator[model.id] = DEFAULT_CODEX_REASONING_LEVEL;
  return accumulator;
}, {});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const mapBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;
const mapLocalizationString = (value: unknown, fallback: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length === 0) {
    return fallback;
  }
  return normalized.toLowerCase() === LEGACY_SOURCE_LANGUAGE
    ? DEFAULT_LOCALIZATION_LANGUAGE
    : normalized;
};
const resolveLocalizationCategory = (
  value: RawLocalizationCategorySettings | undefined,
  candidateKeys: readonly (keyof RawLocalizationCategorySettings)[],
  fallback: string
): string => {
  for (const key of candidateKeys) {
    const resolved = mapLocalizationString(value?.[key], "");
    if (resolved.length > 0) {
      return resolved;
    }
  }
  return fallback;
};
const deriveWorkflowTermsPolicy = (
  uiLabelsLanguage: string
): LocalizationWorkflowTermsPolicy =>
  uiLabelsLanguage.toLowerCase() === DEFAULT_LOCALIZATION_LANGUAGE
    ? "keep_english"
    : "translate";

const mapThinkingDisplaySyncEnabled = (value: unknown): boolean =>
  mapBoolean(value, DEFAULT_THINKING_DISPLAY_SYNC_ENABLED);
const mapCodexReasoningSummaryEnabled = (
  value: unknown,
  legacyValue: unknown
): boolean => mapBoolean(value, mapThinkingDisplaySyncEnabled(legacyValue));
const mapAutoUpdateSettings = (
  value: RawAutoUpdateSettings | undefined
): AutoUpdateSettings => ({
  enabled: mapBoolean(value?.enabled, DEFAULT_AUTO_UPDATE_ENABLED),
});

const mapLocalizationCategories = (
  value: RawLocalizationCategorySettings | undefined,
  defaultLanguage: string
): LocalizationCategorySettings => {
  const resolve = (
    keys: readonly (keyof RawLocalizationCategorySettings)[],
    fallback: string
  ): string => resolveLocalizationCategory(value, keys, fallback);
  const artifactsForTheUser = resolve(
    ["artifactsForTheUser", "interactiveTemplates"],
    defaultLanguage
  );
  const messagesForTheUser = resolve(
    ["messagesForTheUser", "systemFeedback"],
    defaultLanguage
  );
  const uiHelperText = resolve(
    ["uiHelperText", "userGuidance"],
    defaultLanguage
  );
  const uiLabels = resolve(
    ["uiLabels", "uiInterface", "workflowTerms"],
    defaultLanguage
  );

  return {
    artifactsForTheUser,
    interactiveTemplates: artifactsForTheUser,
    messagesForTheUser,
    reasoning: resolve(["reasoning"], messagesForTheUser),
    systemFeedback: messagesForTheUser,
    uiHelperText,
    uiInterface: uiLabels,
    uiLabels,
    userGuidance: uiHelperText,
    workflowTerms: uiLabels,
  };
};

const mapLocalizationSettings = (
  value: RawGeneralLocalizationSettings | undefined
): LocalizationSettings => {
  const legacyDefaultLanguage = mapLocalizationString(
    value?.defaultLanguage,
    DEFAULT_LOCALIZATION_LANGUAGE
  );
  const categories = mapLocalizationCategories(
    value?.categories,
    legacyDefaultLanguage
  );
  const uiEngineId =
    mapLocalizationString(value?.uiEngineId, "") ||
    mapLocalizationString(value?.engineId, DEFAULT_LOCALIZATION_ENGINE_ID);
  const reasoningEngineId = mapLocalizationString(
    value?.reasoningEngineId,
    DEFAULT_LOCALIZATION_ENGINE_ID
  );

  return {
    defaultLanguage: DEFAULT_LOCALIZATION_LANGUAGE,
    categories,
    workflowTermsPolicy: deriveWorkflowTermsPolicy(
      categories.uiLabels ?? categories.uiInterface
    ),
    engineId: uiEngineId,
    reasoningEngineId,
    glossaryEnabled: mapBoolean(value?.glossaryEnabled, true),
  };
};

const mapGeneralSettings = (
  value: RawGeneralSettings | undefined
): GeneralSettings => ({
  coreControls: {
    allowRestart: mapBoolean(
      value?.coreControls?.allowRestart,
      DEFAULT_CORE_RESTART_ENABLED
    ),
  },
  localization: mapLocalizationSettings(value?.localization),
  responsePolicy: mapGeneralResponsePolicy(value?.responsePolicy),
  textToSpeech: mapTextToSpeechSettings(value?.textToSpeech),
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
  thinking: mapClaudeThinkingSettings(value?.thinking),
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
    kimi: mapKimiSettings(
      value?.providers?.kimi,
      mapAutoUpdateSettings,
      mapThinkingDisplaySyncEnabled
    ),
    glmOpenCode: mapGlmOpenCodeSettings(
      value?.providers?.glmOpenCode,
      mapThinkingDisplaySyncEnabled
    ),
    localModels: mapLocalModelsSettings(value?.providers?.localModels),
  },
});

export const createDefaultSettings = (): Settings =>
  mapSettingsSnapshot(undefined);
const areAutoUpdateSettingsEqual = (
  left: AutoUpdateSettings,
  right: AutoUpdateSettings
): boolean => left.enabled === right.enabled;

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
  areGeneralResponsePolicyEqual(left.responsePolicy, right.responsePolicy) &&
  areTextToSpeechSettingsEqual(left.textToSpeech, right.textToSpeech);

const areLocalizationCategoriesEqual = (
  left: LocalizationCategorySettings,
  right: LocalizationCategorySettings
): boolean =>
  left.artifactsForTheUser === right.artifactsForTheUser &&
  left.messagesForTheUser === right.messagesForTheUser &&
  left.reasoning === right.reasoning &&
  left.uiHelperText === right.uiHelperText &&
  left.uiLabels === right.uiLabels;
const areLocalizationSettingsEqual = (
  left: LocalizationSettings,
  right: LocalizationSettings
): boolean =>
  left.defaultLanguage === right.defaultLanguage &&
  areLocalizationCategoriesEqual(left.categories, right.categories) &&
  left.workflowTermsPolicy === right.workflowTermsPolicy &&
  left.engineId === right.engineId &&
  left.reasoningEngineId === right.reasoningEngineId &&
  left.glossaryEnabled === right.glossaryEnabled;

const areClaudeSettingsEqual = (
  left: ClaudeSettings,
  right: ClaudeSettings
): boolean =>
  areClaudeThinkingSettingsEqual(left.thinking, right.thinking) &&
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
  left.defaultModel === right.defaultModel &&
  areReasoningByModelEqual(left.reasoningByModel, right.reasoningByModel) &&
  left.reasoningSummaryEnabled === right.reasoningSummaryEnabled &&
  left.thinkingDisplaySyncEnabled === right.thinkingDisplaySyncEnabled &&
  left.sessionContinuity.remainingPercentThreshold ===
    right.sessionContinuity.remainingPercentThreshold;

const areGeminiSettingsEqual = (
  left: GeminiSettingsWithDisplaySync,
  right: GeminiSettingsWithDisplaySync
): boolean =>
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate) &&
  left.defaultModel === right.defaultModel &&
  areGeminiThinkingLevelByModelEqual(
    left.thinkingLevelByModel,
    right.thinkingLevelByModel
  ) &&
  left.thinkingDisplaySyncEnabled === right.thinkingDisplaySyncEnabled &&
  left.sessionContinuity.contextWindowTokenLimit ===
    right.sessionContinuity.contextWindowTokenLimit &&
  left.sessionContinuity.remainingPercentThreshold ===
    right.sessionContinuity.remainingPercentThreshold;

export const areSettingsEqual = (left: Settings, right: Settings): boolean =>
  areGeneralSettingsEqual(left.general, right.general) &&
  areClaudeSettingsEqual(left.providers.claude, right.providers.claude) &&
  areCodexSettingsEqual(left.providers.codex, right.providers.codex) &&
  areGeminiSettingsEqual(left.providers.gemini, right.providers.gemini) &&
  areKimiProviderSettingsEqual(left.providers.kimi, right.providers.kimi) &&
  areKimiProviderSettingsEqual(
    left.providers.glmOpenCode,
    right.providers.glmOpenCode
  ) &&
  areLocalModelsSettingsEqual(
    left.providers.localModels,
    right.providers.localModels
  );
