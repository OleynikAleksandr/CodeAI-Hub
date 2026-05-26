export const DEFAULT_LOCALIZATION_SOURCE_LANGUAGE = "en";
export const DEFAULT_LOCALIZATION_ENGINE_ID = "google-gtx";
export const LOCALIZATION_SOURCE_SELECTION = "source";

const APPROVED_USER_FACING_TEXT_CATEGORY_IDS = [
  "ui_labels",
  "ui_helper_text",
  "messages_for_the_user",
  "artifacts_for_the_user",
] as const;

const INTERNAL_AGENT_INSTRUCTIONS_MARKER =
  "internal_agent_instructions" as const;

const _APPROVED_TEXT_CATEGORY_IDS = [
  ...APPROVED_USER_FACING_TEXT_CATEGORY_IDS,
  INTERNAL_AGENT_INSTRUCTIONS_MARKER,
] as const;

// The runtime bridge still uses the legacy bundle taxonomy. The approved
// target-state taxonomy above is recorded here first and will be exported and
// adopted incrementally by the next stream.
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

export interface LocalizationTranslationFacadeContract {
  translate(request: {
    readonly category?: string;
    readonly chunkingMode?: "auto" | "disabled";
    readonly engineId?: string;
    readonly providerId?: string;
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
    readonly text: string;
    readonly timeoutMs?: number;
  }): Promise<{
    readonly engine: string;
    readonly errorCode?: string;
    readonly finalText: string;
    readonly originalText: string;
    readonly sourceLanguage: string;
    readonly status: "translated" | "fallback" | "skipped";
    readonly targetLanguage: string;
    readonly translatedText: string | null;
  }>;
}

export interface LocalizationFacadeOptions {
  readonly defaultSourceLanguage?: string;
  readonly engineCatalogs?: readonly LocalizationEngineLanguageCatalog[];
  readonly localizationRootDirectory?: string;
  readonly sourceDictionaries?: readonly LocalizationSourceDictionary[];
  readonly translationFacade?: LocalizationTranslationFacadeContract;
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
