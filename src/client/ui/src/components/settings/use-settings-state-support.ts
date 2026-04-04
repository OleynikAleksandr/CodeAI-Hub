import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../../types/claude-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import type { BrowserLocalizationRuntimePayload } from "../../app-host/localization-runtime-contract";
import type {
  CodexModelId,
  CodexReasoningLevel,
  GeneralResponseMode,
  ProviderId,
  ProviderVersions,
  RawSettingsSnapshot,
  Settings,
} from "./settings-state-model";

export interface VersionsState {
  readonly data: ProviderVersions | null;
  readonly error?: string | null;
  readonly loading: boolean;
  readonly updatingTargets: readonly string[];
}

export interface CoreControlState {
  readonly busy: boolean;
  readonly message: string | null;
  readonly phase:
    | "idle"
    | "stopping"
    | "waiting"
    | "starting"
    | "ready"
    | "error";
}

export type LocalizationCategoryKey =
  | "interactiveTemplates"
  | "systemFeedback"
  | "uiInterface"
  | "userGuidance"
  | "workflowTerms";
export type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";

type LocalizationSettingsState = Settings["general"]["localization"];
type LocalizationCategorySettings = LocalizationSettingsState["categories"];
type ApprovedLocalizationCategoryKey =
  | "artifactsForTheUser"
  | "messagesForTheUser"
  | "uiHelperText"
  | "uiLabels";
type ApprovedLocalizationCategoryState = Record<
  ApprovedLocalizationCategoryKey,
  string
>;

type IncomingMessage =
  | {
      readonly type: "settings:loaded";
      readonly localizationRuntime?: BrowserLocalizationRuntimePayload;
      readonly settings: RawSettingsSnapshot;
    }
  | {
      readonly type: "settings:saved";
      readonly localizationRuntime?: BrowserLocalizationRuntimePayload;
      readonly settings?: RawSettingsSnapshot;
    }
  | {
      readonly type: "settings:versions";
      readonly versions?: ProviderVersions;
      readonly error?: string;
    }
  | {
      readonly busy: boolean;
      readonly message?: string;
      readonly phase: "stopping" | "waiting" | "starting" | "ready" | "error";
      readonly type: "settings:core-control-status";
    };

export const isIncomingMessage = (
  message: unknown
): message is IncomingMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as { type?: unknown };
  return (
    candidate.type === "settings:loaded" ||
    candidate.type === "settings:saved" ||
    candidate.type === "settings:versions" ||
    candidate.type === "settings:core-control-status"
  );
};

export const clampRemainingPercentThreshold = (value: number): number =>
  Math.min(80, Math.max(5, Math.round(value)));

export const clampGeminiContextWindowTokenLimit = (value: number): number =>
  Math.min(1_000_000, Math.max(10_000, Math.round(value)));

const LEGACY_SOURCE_LANGUAGE = "source";
const DEFAULT_LOCALIZATION_LANGUAGE = "en";
const DEFAULT_LOCALIZATION_ENGINE_ID = "google-gtx";

const normalizeLocalizationSelection = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_LOCALIZATION_LANGUAGE;
  }
  return trimmed.toLowerCase() === LEGACY_SOURCE_LANGUAGE
    ? DEFAULT_LOCALIZATION_LANGUAGE
    : trimmed;
};

export const normalizeLocalizationEngineId = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_LOCALIZATION_ENGINE_ID;
};

const deriveWorkflowTermsPolicy = (
  uiLabelsLanguage: string
): LocalizationWorkflowTermsPolicy =>
  uiLabelsLanguage.toLowerCase() === DEFAULT_LOCALIZATION_LANGUAGE
    ? "keep_english"
    : "translate";

const resolveLocalizationCategory = (
  categories: LocalizationCategorySettings,
  candidateKeys: readonly (
    | LocalizationCategoryKey
    | ApprovedLocalizationCategoryKey
  )[],
  fallback: string
): string => {
  for (const key of candidateKeys) {
    const resolved = normalizeLocalizationSelection(
      categories[key as keyof LocalizationCategorySettings] ?? ""
    );
    if (resolved.length > 0) {
      return resolved;
    }
  }

  return fallback;
};

const resolveApprovedLocalizationCategories = (
  categories: LocalizationCategorySettings
): ApprovedLocalizationCategoryState => {
  const fallback = DEFAULT_LOCALIZATION_LANGUAGE;

  return {
    artifactsForTheUser: resolveLocalizationCategory(
      categories,
      ["artifactsForTheUser", "interactiveTemplates"],
      fallback
    ),
    messagesForTheUser: resolveLocalizationCategory(
      categories,
      ["messagesForTheUser", "systemFeedback"],
      fallback
    ),
    uiHelperText: resolveLocalizationCategory(
      categories,
      ["uiHelperText", "userGuidance"],
      fallback
    ),
    uiLabels: resolveLocalizationCategory(
      categories,
      ["uiLabels", "uiInterface", "workflowTerms"],
      fallback
    ),
  };
};

const createMirroredLocalizationCategories = (
  approved: ApprovedLocalizationCategoryState
): LocalizationCategorySettings => ({
  artifactsForTheUser: approved.artifactsForTheUser,
  interactiveTemplates: approved.artifactsForTheUser,
  messagesForTheUser: approved.messagesForTheUser,
  systemFeedback: approved.messagesForTheUser,
  uiHelperText: approved.uiHelperText,
  uiInterface: approved.uiLabels,
  uiLabels: approved.uiLabels,
  userGuidance: approved.uiHelperText,
  workflowTerms: approved.uiLabels,
});

const normalizeLocalizationState = (
  localization: LocalizationSettingsState
): LocalizationSettingsState => {
  const approvedCategories = resolveApprovedLocalizationCategories(
    localization.categories
  );

  return {
    ...localization,
    defaultLanguage: DEFAULT_LOCALIZATION_LANGUAGE,
    categories: createMirroredLocalizationCategories(approvedCategories),
    workflowTermsPolicy: deriveWorkflowTermsPolicy(approvedCategories.uiLabels),
  };
};

export const normalizeLoadedLocalizationSettings = (
  settings: Settings
): Settings => ({
  ...settings,
  general: {
    ...settings.general,
    localization: normalizeLocalizationState(settings.general.localization),
  },
});

export const updateLocalizationCategorySelection = (
  settings: Settings,
  category: LocalizationCategoryKey,
  language: string
): Settings => {
  const approvedCategories = resolveApprovedLocalizationCategories(
    settings.general.localization.categories
  );
  const normalizedLanguage = normalizeLocalizationSelection(language);

  if (category === "interactiveTemplates") {
    approvedCategories.artifactsForTheUser = normalizedLanguage;
  }
  if (category === "systemFeedback") {
    approvedCategories.messagesForTheUser = normalizedLanguage;
  }
  if (category === "userGuidance") {
    approvedCategories.uiHelperText = normalizedLanguage;
  }
  if (category === "uiInterface" || category === "workflowTerms") {
    approvedCategories.uiLabels = normalizedLanguage;
  }

  return {
    ...settings,
    general: {
      ...settings.general,
      localization: normalizeLocalizationState({
        ...settings.general.localization,
        categories: createMirroredLocalizationCategories(approvedCategories),
      }),
    },
  };
};

export const updateLocalizationDefaultLanguageSelection = (
  settings: Settings,
  language: string
): Settings => {
  const normalizedLanguage = normalizeLocalizationSelection(language);

  return {
    ...settings,
    general: {
      ...settings.general,
      localization: normalizeLocalizationState({
        ...settings.general.localization,
        categories: createMirroredLocalizationCategories({
          artifactsForTheUser: normalizedLanguage,
          messagesForTheUser: normalizedLanguage,
          uiHelperText: normalizedLanguage,
          uiLabels: normalizedLanguage,
        }),
      }),
    },
  };
};

export interface UseSettingsStateResult {
  readonly coreControl: CoreControlState;
  readonly handleClaudeContinuityRemainingPercentThresholdChange: (
    remainingPercentThreshold: number
  ) => void;
  readonly handleClaudeDefaultModelChange: (
    modelId: ClaudeModelAliasId
  ) => void;
  readonly handleClaudeThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly handleCodexContinuityRemainingPercentThresholdChange: (
    remainingPercentThreshold: number
  ) => void;
  readonly handleCodexDefaultModelChange: (modelId: CodexModelId) => void;
  readonly handleCodexReasoningChange: (
    modelId: CodexModelId,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly handleCodexThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly handleGeminiContextWindowTokenLimitChange: (
    contextWindowTokenLimit: number
  ) => void;
  readonly handleGeminiContinuityRemainingPercentThresholdChange: (
    remainingPercentThreshold: number
  ) => void;
  readonly handleGeminiDefaultModelChange: (modelId: GeminiModelId) => void;
  readonly handleGeminiThinkingChange: (
    modelId: GeminiModelId,
    level: GeminiThinkingLevel
  ) => void;
  readonly handleGeminiThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly handleLocalizationCategoryLanguageChange: (
    category: LocalizationCategoryKey,
    language: string
  ) => void;
  readonly handleLocalizationDefaultLanguageChange: (
    defaultLanguage: string
  ) => void;
  readonly handleLocalizationEngineIdChange: (engineId: string) => void;
  readonly handleLocalizationGlossaryEnabledChange: (enabled: boolean) => void;
  readonly handleLocalizationWorkflowTermsPolicyChange: (
    workflowTermsPolicy: LocalizationWorkflowTermsPolicy
  ) => void;
  readonly handleProviderAutoUpdateChange: (
    provider: ProviderId,
    enabled: boolean
  ) => void;
  readonly handleReset: () => void;
  readonly handleResponsePolicyModeChange: (mode: GeneralResponseMode) => void;
  readonly handleRestartCore: () => void;
  readonly handleSave: () => void;
  readonly handleStrictInstructionTextChange: (value: string) => void;
  readonly handleStrictSchemaTextChange: (value: string) => void;
  readonly handleThinkingSettingsChange: (
    enabled: boolean,
    effort: ClaudeThinkingEffort
  ) => void;
  readonly handleUpdateProvider: (
    provider: ProviderId,
    target: "cli" | "sdk" | "core"
  ) => void;
  readonly hasChanges: boolean;
  readonly localizationRuntime: BrowserLocalizationRuntimePayload;
  readonly resetting: boolean;
  readonly saving: boolean;
  readonly settings: Settings;
  readonly versions: VersionsState;
}
