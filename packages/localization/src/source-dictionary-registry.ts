import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
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

type ApprovedUserFacingCategoryId =
  | "ui_labels"
  | "ui_helper_text"
  | "messages_for_the_user"
  | "artifacts_for_the_user";

const LEGACY_CATEGORY_TO_APPROVED_CATEGORY = {
  interactive_templates: "artifacts_for_the_user",
  system_feedback: "messages_for_the_user",
  ui_interface: "ui_labels",
  user_guidance: "ui_helper_text",
  workflow_terms: "ui_labels",
} as const satisfies Readonly<
  Record<LocalizationCategoryId, ApprovedUserFacingCategoryId>
>;

const APPROVED_CATEGORY_FILE_CANDIDATES = {
  // `ui_labels` replaces the former split between `ui_interface` and
  // `workflow_terms`, so both legacy runtime buckets can converge on one
  // approved source dictionary as soon as the new file exists.
  ui_labels: ["ui_labels.json"],
  ui_helper_text: ["ui_helper_text.json"],
  messages_for_the_user: ["messages_for_the_user.json"],
  artifacts_for_the_user: ["artifacts_for_the_user.json"],
} as const satisfies Readonly<
  Record<ApprovedUserFacingCategoryId, readonly string[]>
>;

const LEGACY_CATEGORY_FILE_FALLBACKS = {
  interactive_templates: ["interactive_templates.json"],
  system_feedback: ["system_feedback.json"],
  ui_interface: ["ui_interface.json"],
  user_guidance: ["user_guidance.json"],
  workflow_terms: ["workflow_terms.json"],
} as const satisfies Readonly<
  Record<LocalizationCategoryId, readonly string[]>
>;

const resolveBundledSourceFileCandidates = (
  category: LocalizationCategoryId
): readonly string[] => [
  ...APPROVED_CATEGORY_FILE_CANDIDATES[
    LEGACY_CATEGORY_TO_APPROVED_CATEGORY[category]
  ],
  ...LEGACY_CATEGORY_FILE_FALLBACKS[category],
];

const loadBundledSourceDictionaryEntries = (
  fileNames: readonly string[]
): LocalizationSourceDictionaryEntries => {
  const attemptedPaths: string[] = [];

  for (const fileName of fileNames) {
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
  }

  throw new Error(
    `Unable to load bundled localization source dictionary from any supported runtime root: ${attemptedPaths.join(", ")}`
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
  LOCALIZATION_CATEGORY_IDS.map((category) =>
    createBundledSourceDictionary(
      category,
      loadBundledSourceDictionaryEntries(
        resolveBundledSourceFileCandidates(category)
      )
    )
  );

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
