import interactiveTemplatesSource from "../../../assets/localization/source/en/interactive_templates.json";
import systemFeedbackSource from "../../../assets/localization/source/en/system_feedback.json";
import uiInterfaceSource from "../../../assets/localization/source/en/ui_interface.json";
import userGuidanceSource from "../../../assets/localization/source/en/user_guidance.json";
import workflowTermsSource from "../../../assets/localization/source/en/workflow_terms.json";
import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
  type LocalizationSourceDictionary,
  type LocalizationSourceDictionaryEntries,
} from "./localization-contract";

const normalizeIdentifier = (value: string, fallback: string): string => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeEntries = (
  entries: LocalizationSourceDictionaryEntries
): LocalizationSourceDictionaryEntries => {
  const normalizedEntries: Record<string, string> = {};

  for (const [messageId, text] of Object.entries(entries)) {
    const normalizedMessageId = messageId.trim();
    if (!normalizedMessageId) {
      continue;
    }
    normalizedEntries[normalizedMessageId] = text;
  }

  return normalizedEntries;
};

const normalizeSourceDictionary = (
  dictionary: LocalizationSourceDictionary
): LocalizationSourceDictionary => ({
  ...dictionary,
  language: normalizeIdentifier(
    dictionary.language,
    DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
  ),
  entries: normalizeEntries(dictionary.entries),
});

const createRegistryKey = (
  category: LocalizationCategoryId,
  language: string
): string =>
  `${category}::${normalizeIdentifier(language, DEFAULT_LOCALIZATION_SOURCE_LANGUAGE)}`;

const createBundledSourceDictionary = (
  category: LocalizationCategoryId,
  entries: LocalizationSourceDictionaryEntries
): LocalizationSourceDictionary => ({
  category,
  entries,
  language: DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
});

export const BUNDLED_SOURCE_DICTIONARIES: readonly LocalizationSourceDictionary[] =
  [
    createBundledSourceDictionary(
      "interactive_templates",
      interactiveTemplatesSource
    ),
    createBundledSourceDictionary("system_feedback", systemFeedbackSource),
    createBundledSourceDictionary("ui_interface", uiInterfaceSource),
    createBundledSourceDictionary("user_guidance", userGuidanceSource),
    createBundledSourceDictionary("workflow_terms", workflowTermsSource),
  ];

export class SourceDictionaryRegistry {
  private readonly dictionaries = new Map<
    string,
    LocalizationSourceDictionary
  >();

  constructor(
    sourceDictionaries: readonly LocalizationSourceDictionary[] = BUNDLED_SOURCE_DICTIONARIES
  ) {
    for (const dictionary of sourceDictionaries) {
      this.register(dictionary);
    }
  }

  register(dictionary: LocalizationSourceDictionary): void {
    const normalizedDictionary = normalizeSourceDictionary(dictionary);
    this.dictionaries.set(
      createRegistryKey(
        normalizedDictionary.category,
        normalizedDictionary.language
      ),
      normalizedDictionary
    );
  }

  registerAll(
    sourceDictionaries: readonly LocalizationSourceDictionary[]
  ): void {
    for (const dictionary of sourceDictionaries) {
      this.register(dictionary);
    }
  }

  resolve(
    category: LocalizationCategoryId,
    language = DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
  ): LocalizationSourceDictionary | null {
    return this.dictionaries.get(createRegistryKey(category, language)) ?? null;
  }

  getMessage(
    category: LocalizationCategoryId,
    messageId: string,
    language = DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
  ): string | null {
    const dictionary = this.resolve(category, language);
    if (!dictionary) {
      return null;
    }

    return dictionary.entries[messageId] ?? null;
  }

  list(language?: string): readonly LocalizationSourceDictionary[] {
    const normalizedLanguage = language
      ? normalizeIdentifier(language, DEFAULT_LOCALIZATION_SOURCE_LANGUAGE)
      : null;

    const dictionaries = [...this.dictionaries.values()];
    if (!normalizedLanguage) {
      return dictionaries;
    }

    return dictionaries.filter(
      (dictionary) => dictionary.language === normalizedLanguage
    );
  }
}
