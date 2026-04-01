import {
  createDefaultGeneralResponsePolicy,
  normalizeGeneralResponsePolicy,
} from "./general-response-mode/general-response-mode-facade";
import type { GeneralResponsePolicySettings } from "./general-response-mode/response-mode-settings";
import { isRecord, resolveBoolean } from "./settings-utils";

export type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";

export interface GeneralLocalizationCategorySettings {
  readonly interactiveTemplates: string;
  readonly systemFeedback: string;
  readonly uiInterface: string;
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

const DEFAULT_LOCALIZATION_LANGUAGE = "source";
const DEFAULT_LOCALIZATION_ENGINE_ID = "google-gtx";

const DEFAULT_GENERAL_LOCALIZATION_SETTINGS: GeneralLocalizationSettings = {
  defaultLanguage: DEFAULT_LOCALIZATION_LANGUAGE,
  categories: {
    userGuidance: DEFAULT_LOCALIZATION_LANGUAGE,
    uiInterface: DEFAULT_LOCALIZATION_LANGUAGE,
    workflowTerms: DEFAULT_LOCALIZATION_LANGUAGE,
    systemFeedback: DEFAULT_LOCALIZATION_LANGUAGE,
    interactiveTemplates: DEFAULT_LOCALIZATION_LANGUAGE,
  },
  workflowTermsPolicy: "keep_english",
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

const normalizeWorkflowTermsPolicy = (
  value: unknown
): LocalizationWorkflowTermsPolicy =>
  value === "translate"
    ? "translate"
    : DEFAULT_GENERAL_LOCALIZATION_SETTINGS.workflowTermsPolicy;

const normalizeLocalizationCategorySettings = (
  value: unknown,
  defaultLanguage: string
): GeneralLocalizationCategorySettings => {
  const categories = isRecord(value) ? value : {};

  return {
    userGuidance: resolveStringSetting(
      categories.userGuidance,
      defaultLanguage
    ),
    uiInterface: resolveStringSetting(categories.uiInterface, defaultLanguage),
    workflowTerms: resolveStringSetting(
      categories.workflowTerms,
      defaultLanguage
    ),
    systemFeedback: resolveStringSetting(
      categories.systemFeedback,
      defaultLanguage
    ),
    interactiveTemplates: resolveStringSetting(
      categories.interactiveTemplates,
      defaultLanguage
    ),
  };
};

const normalizeGeneralLocalizationSettings = (
  value: unknown
): GeneralLocalizationSettings => {
  if (!isRecord(value)) {
    return DEFAULT_GENERAL_LOCALIZATION_SETTINGS;
  }

  const defaultLanguage = resolveStringSetting(
    value.defaultLanguage,
    DEFAULT_GENERAL_LOCALIZATION_SETTINGS.defaultLanguage
  );

  return {
    defaultLanguage,
    categories: normalizeLocalizationCategorySettings(
      value.categories,
      defaultLanguage
    ),
    workflowTermsPolicy: normalizeWorkflowTermsPolicy(
      value.workflowTermsPolicy
    ),
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
