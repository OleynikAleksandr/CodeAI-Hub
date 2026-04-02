import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
  type LocalizationSourceDictionary,
  type LocalizationSourceDictionaryEntries,
} from "./localization-contract";

const LOCALIZATION_PACKAGE_DIST_DIRECTORY = dirname(
  require.resolve("@codeai-hub/localization")
);

const BUNDLED_SOURCE_DIRECTORY_CANDIDATES = [
  resolve(
    LOCALIZATION_PACKAGE_DIST_DIRECTORY,
    "../../../assets/localization/source/en"
  ),
  resolve(
    LOCALIZATION_PACKAGE_DIST_DIRECTORY,
    "../../../../assets/localization/source/en"
  ),
] as const;

const loadBundledSourceDictionaryEntries = (
  fileName: string
): LocalizationSourceDictionaryEntries => {
  const attemptedPaths: string[] = [];

  for (const directory of BUNDLED_SOURCE_DIRECTORY_CANDIDATES) {
    const candidatePath = resolve(directory, fileName);
    attemptedPaths.push(candidatePath);

    try {
      return JSON.parse(
        readFileSync(candidatePath, "utf8")
      ) as LocalizationSourceDictionaryEntries;
    } catch (error) {
      const missingFile =
        error instanceof Error && "code" in error && error.code === "ENOENT";
      if (missingFile) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Unable to load bundled localization source dictionary "${fileName}" from any supported runtime root: ${attemptedPaths.join(", ")}`
  );
};

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
      loadBundledSourceDictionaryEntries("interactive_templates.json")
    ),
    createBundledSourceDictionary(
      "system_feedback",
      loadBundledSourceDictionaryEntries("system_feedback.json")
    ),
    createBundledSourceDictionary(
      "ui_interface",
      loadBundledSourceDictionaryEntries("ui_interface.json")
    ),
    createBundledSourceDictionary(
      "user_guidance",
      loadBundledSourceDictionaryEntries("user_guidance.json")
    ),
    createBundledSourceDictionary(
      "workflow_terms",
      loadBundledSourceDictionaryEntries("workflow_terms.json")
    ),
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
