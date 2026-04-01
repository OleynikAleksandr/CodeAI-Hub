import { homedir } from "node:os";
import path from "node:path";
import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
} from "./localization-contract";

export interface LocalizationPaths {
  readonly cacheDirectory: string;
  readonly catalogsDirectory: string;
  readonly glossaryDirectory: string;
  readonly metadataFilePath: string;
  readonly rootDirectory: string;
}

const normalizeLanguage = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : DEFAULT_LOCALIZATION_SOURCE_LANGUAGE;
};

export const resolveLocalizationRootDirectory = (
  homeDirectory = homedir()
): string => path.join(homeDirectory, ".codeai-hub", "localization");

export const resolveLocalizationPaths = (
  homeDirectory = homedir()
): LocalizationPaths => {
  const rootDirectory = resolveLocalizationRootDirectory(homeDirectory);
  return {
    rootDirectory,
    catalogsDirectory: path.join(rootDirectory, "catalogs"),
    glossaryDirectory: path.join(rootDirectory, "glossary"),
    cacheDirectory: path.join(rootDirectory, "cache"),
    metadataFilePath: path.join(rootDirectory, "metadata.json"),
  };
};

export const resolveLocalizationCatalogDirectory = (
  category: LocalizationCategoryId,
  homeDirectory = homedir()
): string =>
  path.join(
    resolveLocalizationPaths(homeDirectory).catalogsDirectory,
    category
  );

export const resolveLocalizationBundlePath = (
  category: LocalizationCategoryId,
  language: string,
  homeDirectory = homedir()
): string =>
  path.join(
    resolveLocalizationCatalogDirectory(category, homeDirectory),
    `${normalizeLanguage(language)}.json`
  );
