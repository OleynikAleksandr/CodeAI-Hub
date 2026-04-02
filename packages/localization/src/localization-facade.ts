import { DEFAULT_ENGINE_LANGUAGE_CATALOGS } from "./language-catalog";
import { LanguageCatalogService } from "./language-catalog-service";
import {
  type LocalizationBundleRecord,
  LocalizationBundleStore,
} from "./localization-bundle-store";
import {
  DEFAULT_LOCALIZATION_ENGINE_ID,
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
  LOCALIZATION_SOURCE_SELECTION,
  type LocalizationCategoryId,
  type LocalizationEngineLanguageCatalog,
  type LocalizationFacadeOptions,
  type LocalizationResolvedRuntimeBundle,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
  type LocalizationSourceDictionary,
  type LocalizationSourceLookupRequest,
} from "./localization-contract";
import {
  type LocalizationMaterializationRequest,
  type LocalizationMaterializationResult,
  LocalizationMaterializer,
} from "./localization-materializer";
import { SourceDictionaryRegistry } from "./source-dictionary-registry";

const cloneLanguageCatalog = (
  catalog: LocalizationEngineLanguageCatalog
): LocalizationEngineLanguageCatalog => ({
  ...catalog,
  languages: [...catalog.languages],
});

const normalizeLanguage = (
  value: string | undefined,
  fallback = DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
): string => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeLanguageSelection = (value: string | undefined): string => {
  const normalizedValue = normalizeLanguage(
    value,
    LOCALIZATION_SOURCE_SELECTION
  );
  return normalizedValue.toLowerCase() === LOCALIZATION_SOURCE_SELECTION
    ? LOCALIZATION_SOURCE_SELECTION
    : normalizedValue;
};

const createSourceFallbackBundle = (
  language: string,
  sourceDictionary: LocalizationSourceDictionary | null,
  error?: string
): LocalizationResolvedRuntimeBundle => ({
  entries: sourceDictionary?.entries ?? {},
  ...(error ? { error } : {}),
  language,
  source: "source_fallback",
});

export class LocalizationFacade {
  private readonly availableEngines: readonly LocalizationEngineLanguageCatalog[];
  private readonly bundleStore: LocalizationBundleStore;
  private readonly defaultSourceLanguage: string;
  private readonly languageCatalogService: LanguageCatalogService;
  private readonly localizationMaterializer: LocalizationMaterializer;
  private readonly sourceDictionaryRegistry: SourceDictionaryRegistry;

  constructor(options: LocalizationFacadeOptions = {}) {
    this.defaultSourceLanguage = normalizeLanguage(
      options.defaultSourceLanguage
    );
    this.availableEngines = (
      options.engineCatalogs ?? DEFAULT_ENGINE_LANGUAGE_CATALOGS
    ).map(cloneLanguageCatalog);
    this.sourceDictionaryRegistry = new SourceDictionaryRegistry(
      options.sourceDictionaries
    );
    this.bundleStore = new LocalizationBundleStore();
    this.languageCatalogService = new LanguageCatalogService({
      defaultEngineId: DEFAULT_LOCALIZATION_ENGINE_ID,
      engineCatalogs: this.availableEngines,
    });
    this.localizationMaterializer = new LocalizationMaterializer({
      bundleStore: this.bundleStore,
      defaultEngineId: DEFAULT_LOCALIZATION_ENGINE_ID,
      defaultSourceLanguage: this.defaultSourceLanguage,
      languageCatalogService: this.languageCatalogService,
      sourceDictionaryRegistry: this.sourceDictionaryRegistry,
    });
  }

  registerSourceDictionary(dictionary: LocalizationSourceDictionary): void {
    this.sourceDictionaryRegistry.register(dictionary);
  }

  registerSourceDictionaries(
    sourceDictionaries: readonly LocalizationSourceDictionary[]
  ): void {
    this.sourceDictionaryRegistry.registerAll(sourceDictionaries);
  }

  resolveSourceDictionary(
    category: LocalizationCategoryId,
    language = this.defaultSourceLanguage
  ): LocalizationSourceDictionary | null {
    return this.sourceDictionaryRegistry.resolve(category, language);
  }

  listSourceDictionaries(
    language?: string
  ): readonly LocalizationSourceDictionary[] {
    return this.sourceDictionaryRegistry.list(
      language ? normalizeLanguage(language) : undefined
    );
  }

  getSourceMessage(request: LocalizationSourceLookupRequest): string | null {
    return this.sourceDictionaryRegistry.getMessage(
      request.category,
      request.messageId,
      normalizeLanguage(request.language ?? this.defaultSourceLanguage)
    );
  }

  listAvailableEngines(): readonly LocalizationEngineLanguageCatalog[] {
    return this.availableEngines.map(cloneLanguageCatalog);
  }

  async resolveRuntimePayload(
    settings: LocalizationRuntimeSettingsSnapshot
  ): Promise<LocalizationRuntimePayload> {
    const normalizedSettings = this.normalizeRuntimeSettings(settings);
    const resolvedBundlesByCategory = Object.fromEntries(
      await Promise.all(
        LOCALIZATION_CATEGORY_IDS.map(async (category) => [
          category,
          await this.resolveRuntimeBundleForCategory(
            category,
            normalizedSettings
          ),
        ])
      )
    ) as Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle>;

    return {
      activeEngineId: normalizedSettings.engineId,
      availableEngines: this.listAvailableEngines(),
      resolvedBundlesByCategory,
    };
  }

  loadMaterializedBundle(
    category: LocalizationCategoryId,
    language: string
  ): Promise<LocalizationBundleRecord | null> {
    return this.bundleStore.load(category, language);
  }

  materializeBundle(
    request: LocalizationMaterializationRequest
  ): Promise<LocalizationMaterializationResult | null> {
    return this.localizationMaterializer.materialize(request);
  }

  private normalizeRuntimeSettings(
    settings: LocalizationRuntimeSettingsSnapshot
  ): LocalizationRuntimeSettingsSnapshot {
    const defaultLanguage = normalizeLanguageSelection(
      settings.defaultLanguage
    );
    const categories = Object.fromEntries(
      LOCALIZATION_CATEGORY_IDS.map((category) => [
        category,
        normalizeLanguageSelection(
          settings.categories[category] ?? defaultLanguage
        ),
      ])
    ) as Record<LocalizationCategoryId, string>;

    return {
      categories,
      defaultLanguage,
      engineId: normalizeLanguage(
        settings.engineId,
        DEFAULT_LOCALIZATION_ENGINE_ID
      ),
      workflowTermsPolicy: settings.workflowTermsPolicy,
    };
  }

  private async resolveRuntimeBundleForCategory(
    category: LocalizationCategoryId,
    settings: LocalizationRuntimeSettingsSnapshot
  ): Promise<LocalizationResolvedRuntimeBundle> {
    const requestedLanguage =
      settings.categories[category] ?? settings.defaultLanguage;
    const sourceDictionary = this.resolveSourceDictionary(
      category,
      this.defaultSourceLanguage
    );

    if (
      requestedLanguage === LOCALIZATION_SOURCE_SELECTION ||
      requestedLanguage.toLowerCase() ===
        this.defaultSourceLanguage.toLowerCase()
    ) {
      return createSourceFallbackBundle(requestedLanguage, sourceDictionary);
    }

    try {
      const materializedBundle = await this.materializeBundle({
        category,
        engineId: settings.engineId,
        targetLanguage: requestedLanguage,
        workflowTermsPolicy: settings.workflowTermsPolicy,
      });

      if (!materializedBundle) {
        return createSourceFallbackBundle(
          requestedLanguage,
          sourceDictionary,
          `No localization source dictionary is registered for '${category}'.`
        );
      }

      return {
        entries: materializedBundle.bundle.entries,
        language: materializedBundle.bundle.language,
        source: "materialized",
      };
    } catch (error) {
      return createSourceFallbackBundle(
        requestedLanguage,
        sourceDictionary,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
