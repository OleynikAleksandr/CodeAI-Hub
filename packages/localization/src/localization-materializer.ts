import { TranslationFacade } from "@codeai-hub/translation";
import { LanguageCatalogService } from "./language-catalog-service";
import {
  type LocalizationBundleRecord,
  LocalizationBundleStore,
} from "./localization-bundle-store";
import {
  DEFAULT_LOCALIZATION_ENGINE_ID,
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
  type LocalizationSourceDictionary,
} from "./localization-contract";
import type { SourceDictionaryRegistry } from "./source-dictionary-registry";

export interface LocalizationMaterializationRequest {
  readonly category: LocalizationCategoryId;
  readonly engineId?: string;
  readonly force?: boolean;
  readonly sourceLanguage?: string;
  readonly targetLanguage: string;
}

export interface LocalizationMaterializationResult {
  readonly bundle: LocalizationBundleRecord;
  readonly reusedExistingBundle: boolean;
  readonly translatedEntryCount: number;
  readonly uniqueTranslationCount: number;
}

interface LocalizationMaterializerOptions {
  readonly bundleStore?: LocalizationBundleStore;
  readonly defaultEngineId?: string;
  readonly defaultSourceLanguage?: string;
  readonly languageCatalogService?: LanguageCatalogService;
  readonly sourceDictionaryRegistry: SourceDictionaryRegistry;
  readonly translationFacade?: TranslationFacade;
}

const normalizeLanguage = (
  value: string | undefined,
  fallback: string
): string => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : fallback;
};

const shouldSkipTranslation = (
  sourceLanguage: string,
  targetLanguage: string
): boolean =>
  targetLanguage === "source" ||
  targetLanguage.toLowerCase() === sourceLanguage.toLowerCase();

export class LocalizationMaterializer {
  private readonly bundleStore: LocalizationBundleStore;
  private readonly defaultEngineId: string;
  private readonly defaultSourceLanguage: string;
  private readonly languageCatalogService: LanguageCatalogService;
  private readonly sourceDictionaryRegistry: SourceDictionaryRegistry;
  private readonly translationFacade: TranslationFacade;

  constructor(options: LocalizationMaterializerOptions) {
    this.bundleStore = options.bundleStore ?? new LocalizationBundleStore();
    this.defaultEngineId = normalizeLanguage(
      options.defaultEngineId,
      DEFAULT_LOCALIZATION_ENGINE_ID
    );
    this.defaultSourceLanguage = normalizeLanguage(
      options.defaultSourceLanguage,
      DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
    );
    this.languageCatalogService =
      options.languageCatalogService ?? new LanguageCatalogService();
    this.sourceDictionaryRegistry = options.sourceDictionaryRegistry;
    this.translationFacade =
      options.translationFacade ??
      new TranslationFacade({
        defaultEngineId: this.defaultEngineId,
      });
  }

  async materialize(
    request: LocalizationMaterializationRequest
  ): Promise<LocalizationMaterializationResult | null> {
    const sourceLanguage = normalizeLanguage(
      request.sourceLanguage,
      this.defaultSourceLanguage
    );
    const targetLanguage = normalizeLanguage(
      request.targetLanguage,
      this.defaultSourceLanguage
    );
    const sourceDictionary = this.sourceDictionaryRegistry.resolve(
      request.category,
      sourceLanguage
    );
    if (!sourceDictionary) {
      return null;
    }

    const skipTranslation = shouldSkipTranslation(
      sourceLanguage,
      targetLanguage
    );
    if (!(request.force || skipTranslation)) {
      const existingBundle = await this.bundleStore.load(
        request.category,
        targetLanguage
      );
      if (existingBundle) {
        return {
          bundle: existingBundle,
          reusedExistingBundle: true,
          translatedEntryCount: Object.keys(existingBundle.entries).length,
          uniqueTranslationCount: 0,
        };
      }
    }

    const bundle = skipTranslation
      ? this.createSourceBundle(sourceDictionary, targetLanguage)
      : await this.translateSourceDictionary(
          sourceDictionary,
          sourceLanguage,
          targetLanguage,
          request.engineId ?? this.defaultEngineId
        );

    if (!skipTranslation) {
      await this.bundleStore.save(bundle);
    }

    return {
      bundle,
      reusedExistingBundle: false,
      translatedEntryCount: Object.keys(bundle.entries).length,
      uniqueTranslationCount: skipTranslation
        ? 0
        : new Set(Object.values(sourceDictionary.entries)).size,
    };
  }

  private createSourceBundle(
    sourceDictionary: LocalizationSourceDictionary,
    targetLanguage: string
  ): LocalizationBundleRecord {
    return {
      category: sourceDictionary.category,
      language: targetLanguage,
      entries: { ...sourceDictionary.entries },
    };
  }

  private async translateSourceDictionary(
    sourceDictionary: LocalizationSourceDictionary,
    sourceLanguage: string,
    targetLanguage: string,
    engineId: string
  ): Promise<LocalizationBundleRecord> {
    if (
      !this.languageCatalogService.supportsLanguage(targetLanguage, engineId)
    ) {
      throw new Error(
        `Localization engine '${engineId}' does not support language '${targetLanguage}'.`
      );
    }

    const translationCache = new Map<string, string>();
    const translatedEntries: Record<string, string> = {};

    for (const [messageId, sourceText] of Object.entries(
      sourceDictionary.entries
    )) {
      let translatedText = translationCache.get(sourceText);
      if (!translatedText) {
        const translationResult = await this.translationFacade.translate({
          category: sourceDictionary.category,
          engineId,
          sourceLanguage,
          targetLanguage,
          text: sourceText,
        });
        translatedText = translationResult.finalText;
        translationCache.set(sourceText, translatedText);
      }
      translatedEntries[messageId] = translatedText;
    }

    return {
      category: sourceDictionary.category,
      language: targetLanguage,
      entries: translatedEntries,
    };
  }
}
