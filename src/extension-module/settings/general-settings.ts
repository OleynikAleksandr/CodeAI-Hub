import {
  createDefaultGeneralResponsePolicy,
  normalizeGeneralResponsePolicy,
} from "./general-response-mode/general-response-mode-facade";
import type { GeneralResponsePolicySettings } from "./general-response-mode/response-mode-settings";
import { isRecord, resolveBoolean } from "./settings-utils";

export type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";

interface ApprovedLocalizationCategorySettings {
  readonly artifactsForTheUser: string;
  readonly messagesForTheUser: string;
  readonly uiHelperText: string;
  readonly uiLabels: string;
}

export interface GeneralLocalizationCategorySettings {
  readonly artifactsForTheUser: string;
  readonly interactiveTemplates: string;
  readonly messagesForTheUser: string;
  readonly systemFeedback: string;
  readonly uiHelperText: string;
  readonly uiInterface: string;
  readonly uiLabels: string;
  readonly userGuidance: string;
  readonly workflowTerms: string;
}

export interface GeneralLocalizationSettings {
  readonly categories: GeneralLocalizationCategorySettings;
  readonly defaultLanguage: string;
  readonly engineId: string;
  readonly glossaryEnabled: boolean;
  readonly workflowTermsPolicy: LocalizationWorkflowTermsPolicy;
}

const DEFAULT_LOCALIZATION_LANGUAGE = "en";
const DEFAULT_LOCALIZATION_ENGINE_ID = "google-gtx";
const LEGACY_SOURCE_LANGUAGE = "source";

const normalizeLocalizationSelection = (
  value: unknown,
  fallback: string
): string => {
  const normalized = resolveStringSetting(value, fallback);
  return normalized.toLowerCase() === LEGACY_SOURCE_LANGUAGE
    ? DEFAULT_LOCALIZATION_LANGUAGE
    : normalized;
};

const createLegacyCategoryMirror = (
  approved: ApprovedLocalizationCategorySettings
): Pick<
  GeneralLocalizationCategorySettings,
  | "interactiveTemplates"
  | "systemFeedback"
  | "uiInterface"
  | "userGuidance"
  | "workflowTerms"
> => ({
  interactiveTemplates: approved.artifactsForTheUser,
  systemFeedback: approved.messagesForTheUser,
  uiInterface: approved.uiLabels,
  userGuidance: approved.uiHelperText,
  workflowTerms: approved.uiLabels,
});

const createLocalizationCategorySettings = (
  approved: ApprovedLocalizationCategorySettings
): GeneralLocalizationCategorySettings => ({
  ...approved,
  ...createLegacyCategoryMirror(approved),
});

const resolveLocalizationCategory = (
  categories: Record<string, unknown>,
  candidateKeys: readonly string[],
  fallback: string
): string => {
  for (const key of candidateKeys) {
    const value = categories[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }
    return normalizeLocalizationSelection(value, fallback);
  }

  return fallback;
};

const deriveWorkflowTermsPolicy = (
  uiLabelsLanguage: string
): LocalizationWorkflowTermsPolicy =>
  uiLabelsLanguage.toLowerCase() === DEFAULT_LOCALIZATION_LANGUAGE
    ? "keep_english"
    : "translate";

const DEFAULT_GENERAL_LOCALIZATION_SETTINGS: GeneralLocalizationSettings = {
  defaultLanguage: DEFAULT_LOCALIZATION_LANGUAGE,
  categories: createLocalizationCategorySettings({
    uiLabels: DEFAULT_LOCALIZATION_LANGUAGE,
    uiHelperText: DEFAULT_LOCALIZATION_LANGUAGE,
    messagesForTheUser: DEFAULT_LOCALIZATION_LANGUAGE,
    artifactsForTheUser: DEFAULT_LOCALIZATION_LANGUAGE,
  }),
  workflowTermsPolicy: deriveWorkflowTermsPolicy(DEFAULT_LOCALIZATION_LANGUAGE),
  engineId: DEFAULT_LOCALIZATION_ENGINE_ID,
  glossaryEnabled: true,
};

export interface GeneralSettings {
  readonly coreControls: {
    readonly allowRestart: boolean;
  };
  readonly localization: GeneralLocalizationSettings;
  readonly responsePolicy: GeneralResponsePolicySettings;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  coreControls: {
    allowRestart: true,
  },
  localization: DEFAULT_GENERAL_LOCALIZATION_SETTINGS,
  responsePolicy: createDefaultGeneralResponsePolicy(),
};

const resolveStringSetting = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

const normalizeLocalizationCategorySettings = (
  value: unknown,
  defaultLanguage: string
): GeneralLocalizationCategorySettings => {
  const categories = isRecord(value) ? value : {};

  return createLocalizationCategorySettings({
    uiLabels: resolveLocalizationCategory(
      categories,
      ["uiLabels", "uiInterface", "workflowTerms"],
      defaultLanguage
    ),
    uiHelperText: resolveLocalizationCategory(
      categories,
      ["uiHelperText", "userGuidance"],
      defaultLanguage
    ),
    messagesForTheUser: resolveLocalizationCategory(
      categories,
      ["messagesForTheUser", "systemFeedback"],
      defaultLanguage
    ),
    artifactsForTheUser: resolveLocalizationCategory(
      categories,
      ["artifactsForTheUser", "interactiveTemplates"],
      defaultLanguage
    ),
  });
};

const normalizeGeneralLocalizationSettings = (
  value: unknown
): GeneralLocalizationSettings => {
  if (!isRecord(value)) {
    return DEFAULT_GENERAL_LOCALIZATION_SETTINGS;
  }

  const legacyDefaultLanguage = normalizeLocalizationSelection(
    value.defaultLanguage,
    DEFAULT_GENERAL_LOCALIZATION_SETTINGS.defaultLanguage
  );
  const categories = normalizeLocalizationCategorySettings(
    value.categories,
    legacyDefaultLanguage
  );

  return {
    defaultLanguage: DEFAULT_GENERAL_LOCALIZATION_SETTINGS.defaultLanguage,
    categories,
    workflowTermsPolicy: deriveWorkflowTermsPolicy(categories.uiLabels),
    engineId: resolveStringSetting(
      value.engineId,
      DEFAULT_GENERAL_LOCALIZATION_SETTINGS.engineId
    ),
    glossaryEnabled: resolveBoolean(
      value.glossaryEnabled,
      DEFAULT_GENERAL_LOCALIZATION_SETTINGS.glossaryEnabled
    ),
  };
};

export const normalizeGeneralSettings = (value: unknown): GeneralSettings => {
  if (!isRecord(value)) {
    return DEFAULT_GENERAL_SETTINGS;
  }

  const coreControls = isRecord(value.coreControls) ? value.coreControls : {};

  return {
    coreControls: {
      allowRestart: resolveBoolean(
        coreControls.allowRestart,
        DEFAULT_GENERAL_SETTINGS.coreControls.allowRestart
      ),
    },
    localization: normalizeGeneralLocalizationSettings(value.localization),
    responsePolicy: normalizeGeneralResponsePolicy(value.responsePolicy),
  };
};
