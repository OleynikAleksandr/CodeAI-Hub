export { GlossaryBundleLoader } from "./glossary-bundle-loader";
export type {
  GlossaryBundle,
  GlossaryPreferredTranslationRule,
  GlossaryPreserveRule,
  GlossaryRule,
  GlossaryRuleKind,
  ProtectedGlossaryText,
  ProtectedGlossaryToken,
  ResolvedGlossary,
} from "./glossary-contract";
export { GlossaryMergeService } from "./glossary-merge-service";
export { GlossaryProtector } from "./glossary-protector";
export {
  type GlossaryValidationIssue,
  type GlossaryValidationIssueCode,
  type GlossaryValidationResult,
  GlossaryValidator,
} from "./glossary-validator";
export { DEFAULT_ENGINE_LANGUAGE_CATALOGS } from "./language-catalog";
export { LanguageCatalogService } from "./language-catalog-service";
export {
  type LocalizationBundleRecord,
  LocalizationBundleStore,
} from "./localization-bundle-store";
export {
  DEFAULT_LOCALIZATION_ENGINE_ID,
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
  LOCALIZATION_SOURCE_SELECTION,
  type LocalizationCategoryId,
  type LocalizationCategoryLanguageSelectionMap,
  type LocalizationEngineLanguageCatalog,
  type LocalizationFacadeOptions,
  type LocalizationLanguageCatalogEntry,
  type LocalizationLanguageCatalogServiceOptions,
  type LocalizationResolvedRuntimeBundle,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
  type LocalizationSourceDictionary,
  type LocalizationSourceDictionaryEntries,
  type LocalizationSourceLookupRequest,
  type LocalizationWorkflowTermsPolicy,
} from "./localization-contract";
export { LocalizationFacade } from "./localization-facade";
export {
  type LocalizationMaterializationRequest,
  type LocalizationMaterializationResult,
  LocalizationMaterializer,
} from "./localization-materializer";
export {
  type LocalizationBundleMetadataRecord,
  type LocalizationMetadataRecord,
  LocalizationMetadataStore,
} from "./localization-metadata-store";
export {
  type LocalizationPaths,
  resolveLocalizationBundlePath,
  resolveLocalizationCatalogDirectory,
  resolveLocalizationPaths,
  resolveLocalizationRootDirectory,
} from "./localization-paths";
export {
  type LocalizationRuntimeBootstrapSnapshot,
  LocalizationRuntimeBootstrapStore,
} from "./localization-runtime-bootstrap-store";
export {
  BUNDLED_SOURCE_DICTIONARIES,
  SourceDictionaryRegistry,
} from "./source-dictionary-registry";
export {
  type UserGlossaryOverrides,
  UserGlossaryStore,
} from "./user-glossary-store";
