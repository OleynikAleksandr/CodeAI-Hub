export const DEFAULT_LOCALIZATION_SOURCE_LANGUAGE = "en";
export const DEFAULT_LOCALIZATION_ENGINE_ID = "google-gtx";
export const LOCALIZATION_SOURCE_SELECTION = "source";

export const LOCALIZATION_CATEGORY_IDS = [
  "interactive_templates",
  "system_feedback",
  "ui_interface",
  "user_guidance",
  "workflow_terms",
] as const;

export type LocalizationCategoryId = (typeof LOCALIZATION_CATEGORY_IDS)[number];
export type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";

export type LocalizationSourceDictionaryEntries = Readonly<
  Record<string, string>
>;
export type LocalizationCategoryLanguageSelectionMap = Readonly<
  Record<LocalizationCategoryId, string>
>;

export interface LocalizationSourceDictionary {
  readonly category: LocalizationCategoryId;
  readonly entries: LocalizationSourceDictionaryEntries;
  readonly language: string;
}

export interface LocalizationSourceLookupRequest {
  readonly category: LocalizationCategoryId;
  readonly language?: string;
  readonly messageId: string;
}

export interface LocalizationLanguageCatalogEntry {
  readonly code: string;
  readonly label: string;
}

export interface LocalizationEngineLanguageCatalog {
  readonly engineId: string;
  readonly languages: readonly LocalizationLanguageCatalogEntry[];
}

export interface LocalizationFacadeOptions {
  readonly defaultSourceLanguage?: string;
  readonly engineCatalogs?: readonly LocalizationEngineLanguageCatalog[];
  readonly sourceDictionaries?: readonly LocalizationSourceDictionary[];
}

export interface LocalizationLanguageCatalogServiceOptions {
  readonly defaultEngineId?: string;
  readonly engineCatalogs?: readonly LocalizationEngineLanguageCatalog[];
}

export interface LocalizationRuntimeSettingsSnapshot {
  readonly categories: LocalizationCategoryLanguageSelectionMap;
  readonly defaultLanguage: string;
  readonly engineId: string;
  readonly workflowTermsPolicy: LocalizationWorkflowTermsPolicy;
}

export interface LocalizationResolvedRuntimeBundle {
  readonly entries: LocalizationSourceDictionaryEntries;
  readonly error?: string | null;
  readonly language: string;
  readonly source: "materialized" | "source_fallback";
}

export interface LocalizationRuntimePayload {
  readonly activeEngineId: string;
  readonly availableEngines: readonly LocalizationEngineLanguageCatalog[];
  readonly resolvedBundlesByCategory: Readonly<
    Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle>
  >;
}
