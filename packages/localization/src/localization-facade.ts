import { LanguageCatalogService } from "./language-catalog-service";
import {
  type LocalizationBundleRecord,
  LocalizationBundleStore,
} from "./localization-bundle-store";
import {
  DEFAULT_LOCALIZATION_ENGINE_ID,
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
  type LocalizationFacadeOptions,
  type LocalizationSourceDictionary,
  type LocalizationSourceLookupRequest,
} from "./localization-contract";
import {
  type LocalizationMaterializationRequest,
  type LocalizationMaterializationResult,
  LocalizationMaterializer,
} from "./localization-materializer";
import { SourceDictionaryRegistry } from "./source-dictionary-registry";

const normalizeLanguage = (value: string | undefined): string => {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed.length > 0 ? trimmed : DEFAULT_LOCALIZATION_SOURCE_LANGUAGE;
};

export class LocalizationFacade {
  private readonly bundleStore: LocalizationBundleStore;
  private readonly defaultSourceLanguage: string;
  private readonly languageCatalogService: LanguageCatalogService;
  private readonly localizationMaterializer: LocalizationMaterializer;
  private readonly sourceDictionaryRegistry: SourceDictionaryRegistry;

  constructor(options: LocalizationFacadeOptions = {}) {
    this.defaultSourceLanguage = normalizeLanguage(
      options.defaultSourceLanguage
    );
    this.sourceDictionaryRegistry = new SourceDictionaryRegistry(
      options.sourceDictionaries
    );
    this.bundleStore = new LocalizationBundleStore();
    this.languageCatalogService = new LanguageCatalogService({
      defaultEngineId: DEFAULT_LOCALIZATION_ENGINE_ID,
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
}
