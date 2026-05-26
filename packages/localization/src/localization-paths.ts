import { homedir } from "node:os";
import path from "node:path";
import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  type LocalizationCategoryId,
} from "./localization-contract";

export interface LocalizationPaths {
  readonly browserRuntimeBootstrapFilePath: string;
  readonly cacheDirectory: string;
  readonly catalogsDirectory: string;
  readonly glossaryDirectory: string;
  readonly metadataFilePath: string;
  readonly rootDirectory: string;
}

export interface LocalizationPathOptions {
  readonly homeDirectory?: string;
  readonly rootDirectory?: string;
}

export type LocalizationPathScope = string | LocalizationPathOptions;

const normalizeLanguage = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : DEFAULT_LOCALIZATION_SOURCE_LANGUAGE;
};

const normalizeRootDirectory = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? path.resolve(trimmed) : null;
};

export const resolveLocalizationRootDirectory = (
  scope: LocalizationPathScope = homedir()
): string => {
  if (typeof scope === "string") {
    return path.join(scope, ".codeai-hub", "localization");
  }

  return (
    normalizeRootDirectory(scope.rootDirectory) ??
    path.join(scope.homeDirectory ?? homedir(), ".codeai-hub", "localization")
  );
};

export const resolveLocalizationPaths = (
  scope: LocalizationPathScope = homedir()
): LocalizationPaths => {
  const rootDirectory = resolveLocalizationRootDirectory(scope);
  return {
    rootDirectory,
    catalogsDirectory: path.join(rootDirectory, "catalogs"),
    glossaryDirectory: path.join(rootDirectory, "glossary"),
    cacheDirectory: path.join(rootDirectory, "cache"),
    browserRuntimeBootstrapFilePath: path.join(
      rootDirectory,
      "cache",
      "browser-runtime-bootstrap.json"
    ),
    metadataFilePath: path.join(rootDirectory, "metadata.json"),
  };
};

export const resolveLocalizationCatalogDirectory = (
  category: LocalizationCategoryId,
  scope: LocalizationPathScope = homedir()
): string =>
  path.join(resolveLocalizationPaths(scope).catalogsDirectory, category);

export const resolveLocalizationBundlePath = (
  category: LocalizationCategoryId,
  language: string,
  scope: LocalizationPathScope = homedir()
): string =>
  path.join(
    resolveLocalizationCatalogDirectory(category, scope),
    `${normalizeLanguage(language)}.json`
  );
