import { DEFAULT_ENGINE_LANGUAGE_CATALOGS } from "./language-catalog";
import {
  DEFAULT_LOCALIZATION_ENGINE_ID,
  type LocalizationEngineLanguageCatalog,
  type LocalizationLanguageCatalogEntry,
  type LocalizationLanguageCatalogServiceOptions,
} from "./localization-contract";

const normalizeIdentifier = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export class LanguageCatalogService {
  private readonly catalogs = new Map<
    string,
    LocalizationEngineLanguageCatalog
  >();
  private readonly defaultEngineId: string;

  constructor(options: LocalizationLanguageCatalogServiceOptions = {}) {
    this.defaultEngineId = normalizeIdentifier(
      options.defaultEngineId ?? DEFAULT_LOCALIZATION_ENGINE_ID,
      DEFAULT_LOCALIZATION_ENGINE_ID
    );

    for (const catalog of options.engineCatalogs ??
      DEFAULT_ENGINE_LANGUAGE_CATALOGS) {
      this.registerCatalog(catalog);
    }
  }

  registerCatalog(catalog: LocalizationEngineLanguageCatalog): void {
    this.catalogs.set(catalog.engineId, {
      ...catalog,
      languages: [...catalog.languages],
    });
  }

  resolveCatalog(engineId?: string): LocalizationEngineLanguageCatalog | null {
    const normalizedEngineId = normalizeIdentifier(
      engineId ?? this.defaultEngineId,
      this.defaultEngineId
    );
    return (
      this.catalogs.get(normalizedEngineId) ??
      this.catalogs.get(this.defaultEngineId) ??
      null
    );
  }

  listLanguages(
    engineId?: string
  ): readonly LocalizationLanguageCatalogEntry[] {
    return this.resolveCatalog(engineId)?.languages ?? [];
  }

  resolveLanguage(
    languageCode: string,
    engineId?: string
  ): LocalizationLanguageCatalogEntry | null {
    const normalizedLanguageCode = normalizeIdentifier(
      languageCode,
      ""
    ).toLowerCase();
    if (!normalizedLanguageCode) {
      return null;
    }

    return (
      this.listLanguages(engineId).find(
        (language) => language.code.toLowerCase() === normalizedLanguageCode
      ) ?? null
    );
  }

  supportsLanguage(languageCode: string, engineId?: string): boolean {
    return this.resolveLanguage(languageCode, engineId) !== null;
  }
}
