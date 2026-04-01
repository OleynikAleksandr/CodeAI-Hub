import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
  type LocalizationFacadeOptions,
  type LocalizationSourceDictionary,
  type LocalizationSourceLookupRequest,
} from "./localization-contract";
import { SourceDictionaryRegistry } from "./source-dictionary-registry";

const normalizeLanguage = (value: string | undefined): string => {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed.length > 0 ? trimmed : DEFAULT_LOCALIZATION_SOURCE_LANGUAGE;
};

export class LocalizationFacade {
  private readonly defaultSourceLanguage: string;
  private readonly sourceDictionaryRegistry: SourceDictionaryRegistry;

  constructor(options: LocalizationFacadeOptions = {}) {
    this.defaultSourceLanguage = normalizeLanguage(
      options.defaultSourceLanguage
    );
    this.sourceDictionaryRegistry = new SourceDictionaryRegistry(
      options.sourceDictionaries
    );
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
}
