import { createHash } from "node:crypto";
import { GlossaryBundleLoader } from "./glossary-bundle-loader";
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
import {
  type LocalizationRuntimeBootstrapSnapshot,
  LocalizationRuntimeBootstrapStore,
} from "./localization-runtime-bootstrap-store";
import { SourceDictionaryRegistry } from "./source-dictionary-registry";
import { UserGlossaryStore } from "./user-glossary-store";

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

type NormalizableCategorySelections = Readonly<
  Record<string, string | undefined>
>;

type ApprovedUserFacingCategoryId =
  | "ui_labels"
  | "ui_helper_text"
  | "messages_for_the_user"
  | "artifacts_for_the_user";

const APPROVED_CATEGORY_SELECTION_PRIORITY = {
  ui_labels: ["ui_labels", "ui_interface", "workflow_terms"],
  ui_helper_text: ["ui_helper_text", "user_guidance"],
  messages_for_the_user: ["messages_for_the_user", "system_feedback"],
  artifacts_for_the_user: ["artifacts_for_the_user", "interactive_templates"],
} as const satisfies Readonly<
  Record<ApprovedUserFacingCategoryId, readonly string[]>
>;

const LEGACY_CATEGORY_SELECTION_PRIORITY = {
  interactive_templates:
    APPROVED_CATEGORY_SELECTION_PRIORITY.artifacts_for_the_user,
  system_feedback: APPROVED_CATEGORY_SELECTION_PRIORITY.messages_for_the_user,
  ui_interface: APPROVED_CATEGORY_SELECTION_PRIORITY.ui_labels,
  user_guidance: APPROVED_CATEGORY_SELECTION_PRIORITY.ui_helper_text,
  workflow_terms: APPROVED_CATEGORY_SELECTION_PRIORITY.ui_labels,
} as const satisfies Readonly<
  Record<LocalizationCategoryId, readonly string[]>
>;

const resolveCategorySelection = (
  categories: NormalizableCategorySelections,
  fallbackLanguage: string,
  candidateKeys: readonly string[]
): string => {
  for (const key of candidateKeys) {
    const value = categories[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }
    return normalizeLanguageSelection(value);
  }

  return fallbackLanguage;
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

const isSourceSelection = (language: string, sourceLanguage: string): boolean =>
  language === LOCALIZATION_SOURCE_SELECTION ||
  language.toLowerCase() === sourceLanguage.toLowerCase();

const createRuntimeBootstrapCacheKey = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class LocalizationFacade {
  private readonly availableEngines: readonly LocalizationEngineLanguageCatalog[];
  private readonly bundleStore: LocalizationBundleStore;
  private readonly defaultSourceLanguage: string;
  private readonly glossaryBundleLoader: GlossaryBundleLoader;
  private readonly languageCatalogService: LanguageCatalogService;
  private readonly localizationMaterializer: LocalizationMaterializer;
  private readonly runtimeBootstrapStore: LocalizationRuntimeBootstrapStore;
  private readonly sourceDictionaryRegistry: SourceDictionaryRegistry;
  private readonly userGlossaryStore: UserGlossaryStore;

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
    this.glossaryBundleLoader = new GlossaryBundleLoader();
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
    this.runtimeBootstrapStore = new LocalizationRuntimeBootstrapStore();
    this.userGlossaryStore = new UserGlossaryStore();
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

  async loadRuntimeBootstrapSnapshot(
    settings?: LocalizationRuntimeSettingsSnapshot
  ): Promise<LocalizationRuntimeBootstrapSnapshot | null> {
    const persistedSnapshot = await this.runtimeBootstrapStore.load();
    if (!persistedSnapshot) {
      return null;
    }

    if (!settings) {
      return persistedSnapshot;
    }

    const normalizedSettings = this.normalizeRuntimeSettings(settings);
    const cacheKey =
      await this.createRuntimeBootstrapCacheKey(normalizedSettings);
    return persistedSnapshot.cacheKey === cacheKey ? persistedSnapshot : null;
  }

  async resolveRuntimePayload(
    settings: LocalizationRuntimeSettingsSnapshot
  ): Promise<LocalizationRuntimePayload> {
    const runtimeBootstrapSnapshot =
      await this.resolveRuntimeBootstrapSnapshot(settings);

    return runtimeBootstrapSnapshot.runtimePayload;
  }

  async resolveRuntimeBootstrapSnapshot(
    settings: LocalizationRuntimeSettingsSnapshot
  ): Promise<LocalizationRuntimeBootstrapSnapshot> {
    const normalizedSettings = this.normalizeRuntimeSettings(settings);
    const cacheKey =
      await this.createRuntimeBootstrapCacheKey(normalizedSettings);
    const persistedSnapshot = await this.runtimeBootstrapStore.load();

    if (persistedSnapshot?.cacheKey === cacheKey) {
      return persistedSnapshot;
    }

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

    const runtimePayload = {
      activeEngineId: normalizedSettings.engineId,
      availableEngines: this.listAvailableEngines(),
      resolvedBundlesByCategory,
    } satisfies LocalizationRuntimePayload;
    const runtimeBootstrapSnapshot = {
      cacheKey,
      generatedAt: new Date().toISOString(),
      runtimePayload,
      schemaVersion: 1,
      settings: normalizedSettings,
    } satisfies LocalizationRuntimeBootstrapSnapshot;

    await this.runtimeBootstrapStore.save(runtimeBootstrapSnapshot);

    return runtimeBootstrapSnapshot;
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
    const rawCategories = settings.categories as NormalizableCategorySelections;
    const categories = Object.fromEntries(
      LOCALIZATION_CATEGORY_IDS.map((category) => [
        category,
        resolveCategorySelection(
          rawCategories,
          defaultLanguage,
          LEGACY_CATEGORY_SELECTION_PRIORITY[category]
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

  private async createRuntimeBootstrapCacheKey(
    settings: LocalizationRuntimeSettingsSnapshot
  ): Promise<string> {
    const targetLanguages = [
      ...new Set(
        Object.values(settings.categories).filter(
          (language) => !isSourceSelection(language, this.defaultSourceLanguage)
        )
      ),
    ].sort();
    const sourceDictionaries = this.listSourceDictionaries(
      this.defaultSourceLanguage
    )
      .map((dictionary) => ({
        category: dictionary.category,
        entries: dictionary.entries,
        language: dictionary.language,
      }))
      .sort((left, right) => left.category.localeCompare(right.category));
    const [baseGlossary, userGlossaryOverrides, languageGlossaries] =
      await Promise.all([
        this.glossaryBundleLoader.loadBaseBundle(),
        this.userGlossaryStore.load(),
        Promise.all(
          targetLanguages.map(async (language) => [
            language,
            await this.glossaryBundleLoader.loadLanguageBundle(language),
          ])
        ),
      ]);

    return createRuntimeBootstrapCacheKey({
      availableEngines: this.listAvailableEngines(),
      glossary: {
        base: baseGlossary.rules,
        byLanguage: Object.fromEntries(languageGlossaries),
        userOverrides: userGlossaryOverrides,
      },
      schemaVersion: 1,
      settings,
      sourceDictionaries,
      sourceLanguage: this.defaultSourceLanguage,
    });
  }
}
