import { promises as fs } from "node:fs";
import type {
  LocalizationCategoryId,
  LocalizationEngineLanguageCatalog,
  LocalizationResolvedRuntimeBundle,
  LocalizationRuntimePayload,
  LocalizationRuntimeSettingsSnapshot,
  LocalizationSourceDictionaryEntries,
} from "./localization-contract";
import { LOCALIZATION_CATEGORY_IDS } from "./localization-contract";
import { resolveLocalizationPaths } from "./localization-paths";

const LOCALIZATION_RUNTIME_BOOTSTRAP_SCHEMA_VERSION = 1;

export interface LocalizationRuntimeBootstrapSnapshot {
  readonly cacheKey: string;
  readonly generatedAt: string;
  readonly runtimePayload: LocalizationRuntimePayload;
  readonly schemaVersion: typeof LOCALIZATION_RUNTIME_BOOTSTRAP_SCHEMA_VERSION;
  readonly settings: LocalizationRuntimeSettingsSnapshot;
}

interface LocalizationRuntimeBootstrapStoreOptions {
  readonly homeDirectory?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseStringEntries = (
  value: unknown
): LocalizationSourceDictionaryEntries | null => {
  if (!isRecord(value)) {
    return null;
  }

  const entries: Record<string, string> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (key.trim().length === 0 || typeof entryValue !== "string") {
      return null;
    }
    entries[key] = entryValue;
  }

  return entries;
};

const parseLanguageCatalogs = (
  value: unknown
): readonly LocalizationEngineLanguageCatalog[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const catalogs: LocalizationEngineLanguageCatalog[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.engineId !== "string") {
      return null;
    }
    if (!Array.isArray(entry.languages)) {
      return null;
    }
    const languages = entry.languages.map((language) => {
      if (
        !(
          isRecord(language) &&
          typeof language.code === "string" &&
          typeof language.label === "string"
        )
      ) {
        return null;
      }
      return {
        code: language.code,
        label: language.label,
      };
    });
    if (languages.some((language) => language === null)) {
      return null;
    }
    catalogs.push({
      engineId: entry.engineId,
      languages: languages as {
        readonly code: string;
        readonly label: string;
      }[],
    });
  }

  return catalogs;
};

const parseResolvedRuntimeBundle = (
  value: unknown
): LocalizationResolvedRuntimeBundle | null => {
  if (!(isRecord(value) && typeof value.language === "string")) {
    return null;
  }

  if (value.source !== "materialized" && value.source !== "source_fallback") {
    return null;
  }

  const entries = parseStringEntries(value.entries);
  if (!entries) {
    return null;
  }

  if (
    !(
      value.error === undefined ||
      value.error === null ||
      typeof value.error === "string"
    )
  ) {
    return null;
  }

  return {
    entries,
    language: value.language,
    source: value.source,
    ...(typeof value.error === "string" ? { error: value.error } : {}),
  };
};

const parseRuntimePayload = (
  value: unknown
): LocalizationRuntimePayload | null => {
  if (!(isRecord(value) && typeof value.activeEngineId === "string")) {
    return null;
  }

  const availableEngines = parseLanguageCatalogs(value.availableEngines);
  const resolvedBundlesValue = value.resolvedBundlesByCategory;
  if (!(availableEngines && isRecord(resolvedBundlesValue))) {
    return null;
  }

  const resolvedBundlesByCategory = Object.fromEntries(
    LOCALIZATION_CATEGORY_IDS.map((category) => {
      const parsedBundle = parseResolvedRuntimeBundle(
        resolvedBundlesValue[category]
      );
      return [category, parsedBundle];
    })
  ) as Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle | null>;

  if (
    Object.values(resolvedBundlesByCategory).some((bundle) => bundle === null)
  ) {
    return null;
  }

  return {
    activeEngineId: value.activeEngineId,
    availableEngines,
    resolvedBundlesByCategory: resolvedBundlesByCategory as Record<
      LocalizationCategoryId,
      LocalizationResolvedRuntimeBundle
    >,
  };
};

const parseSettingsSnapshot = (
  value: unknown
): LocalizationRuntimeSettingsSnapshot | null => {
  if (
    !(
      isRecord(value) &&
      typeof value.defaultLanguage === "string" &&
      typeof value.engineId === "string" &&
      (value.workflowTermsPolicy === "keep_english" ||
        value.workflowTermsPolicy === "translate") &&
      isRecord(value.categories)
    )
  ) {
    return null;
  }

  const categoriesValue = value.categories;
  const categories = Object.fromEntries(
    LOCALIZATION_CATEGORY_IDS.map((category) => {
      const categoryValue = categoriesValue[category];
      return [
        category,
        typeof categoryValue === "string" ? categoryValue : null,
      ];
    })
  ) as Record<LocalizationCategoryId, string | null>;

  if (
    Object.values(categories).some((categoryValue) => categoryValue === null)
  ) {
    return null;
  }

  return {
    categories: categories as Record<LocalizationCategoryId, string>,
    defaultLanguage: value.defaultLanguage,
    engineId: value.engineId,
    workflowTermsPolicy: value.workflowTermsPolicy,
  };
};

const parseSnapshot = (
  value: unknown
): LocalizationRuntimeBootstrapSnapshot | null => {
  if (
    !(
      isRecord(value) &&
      value.schemaVersion === LOCALIZATION_RUNTIME_BOOTSTRAP_SCHEMA_VERSION &&
      typeof value.cacheKey === "string" &&
      typeof value.generatedAt === "string"
    )
  ) {
    return null;
  }

  const settings = parseSettingsSnapshot(value.settings);
  const runtimePayload = parseRuntimePayload(value.runtimePayload);
  if (!(settings && runtimePayload)) {
    return null;
  }

  return {
    cacheKey: value.cacheKey,
    generatedAt: value.generatedAt,
    runtimePayload,
    schemaVersion: LOCALIZATION_RUNTIME_BOOTSTRAP_SCHEMA_VERSION,
    settings,
  };
};

export class LocalizationRuntimeBootstrapStore {
  private readonly homeDirectory?: string;

  constructor(options: LocalizationRuntimeBootstrapStoreOptions = {}) {
    this.homeDirectory = options.homeDirectory;
  }

  async load(): Promise<LocalizationRuntimeBootstrapSnapshot | null> {
    try {
      const raw = await fs.readFile(
        resolveLocalizationPaths(this.homeDirectory)
          .browserRuntimeBootstrapFilePath,
        "utf8"
      );
      return parseSnapshot(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  async save(snapshot: LocalizationRuntimeBootstrapSnapshot): Promise<void> {
    const { browserRuntimeBootstrapFilePath, cacheDirectory } =
      resolveLocalizationPaths(this.homeDirectory);
    await fs.mkdir(cacheDirectory, { recursive: true });
    await fs.writeFile(
      browserRuntimeBootstrapFilePath,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8"
    );
  }

  async remove(): Promise<void> {
    try {
      await fs.unlink(
        resolveLocalizationPaths(this.homeDirectory)
          .browserRuntimeBootstrapFilePath
      );
    } catch {
      // keep removal idempotent for callers that invalidate startup cache
    }
  }
}
