import { promises as fs } from "node:fs";
import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
  type LocalizationCategoryId,
} from "./localization-contract";
import { resolveLocalizationPaths } from "./localization-paths";

export interface LocalizationBundleMetadataRecord {
  readonly category: LocalizationCategoryId;
  readonly engineId: string;
  readonly generatedAt: string;
  readonly language: string;
  readonly sourceHash: string;
}

export interface LocalizationMetadataRecord {
  readonly bundles: Readonly<Record<string, LocalizationBundleMetadataRecord>>;
  readonly schemaVersion: 1;
  readonly updatedAt: string;
}

const LOCALIZATION_METADATA_SCHEMA_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createBundleKey = (
  category: LocalizationCategoryId,
  language: string
): string => {
  const normalizedLanguage = language.trim().toLowerCase();
  return `${category}::${normalizedLanguage || DEFAULT_LOCALIZATION_SOURCE_LANGUAGE}`;
};

const parseBundleMetadataRecord = (
  value: unknown
): LocalizationBundleMetadataRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.category !== "string" ||
    typeof value.engineId !== "string" ||
    typeof value.generatedAt !== "string" ||
    typeof value.language !== "string" ||
    typeof value.sourceHash !== "string"
  ) {
    return null;
  }

  if (
    !LOCALIZATION_CATEGORY_IDS.includes(
      value.category as LocalizationCategoryId
    )
  ) {
    return null;
  }

  return {
    category: value.category as LocalizationCategoryId,
    engineId: value.engineId,
    generatedAt: value.generatedAt,
    language: value.language,
    sourceHash: value.sourceHash,
  };
};

const createEmptyMetadata = (): LocalizationMetadataRecord => ({
  schemaVersion: LOCALIZATION_METADATA_SCHEMA_VERSION,
  updatedAt: new Date(0).toISOString(),
  bundles: {},
});

const parseMetadataRecord = (value: unknown): LocalizationMetadataRecord => {
  if (
    !(
      isRecord(value) &&
      value.schemaVersion === LOCALIZATION_METADATA_SCHEMA_VERSION &&
      typeof value.updatedAt === "string" &&
      isRecord(value.bundles)
    )
  ) {
    return createEmptyMetadata();
  }

  const bundles: Record<string, LocalizationBundleMetadataRecord> = {};
  for (const [key, bundleValue] of Object.entries(value.bundles)) {
    const parsedBundle = parseBundleMetadataRecord(bundleValue);
    if (parsedBundle) {
      bundles[key] = parsedBundle;
    }
  }

  return {
    schemaVersion: LOCALIZATION_METADATA_SCHEMA_VERSION,
    updatedAt: value.updatedAt,
    bundles,
  };
};

export class LocalizationMetadataStore {
  async getBundle(
    category: LocalizationCategoryId,
    language: string
  ): Promise<LocalizationBundleMetadataRecord | null> {
    const metadata = await this.load();
    return metadata.bundles[createBundleKey(category, language)] ?? null;
  }

  async load(): Promise<LocalizationMetadataRecord> {
    try {
      const raw = await fs.readFile(
        resolveLocalizationPaths().metadataFilePath,
        "utf8"
      );
      return parseMetadataRecord(JSON.parse(raw) as unknown);
    } catch {
      return createEmptyMetadata();
    }
  }

  async save(metadata: LocalizationMetadataRecord): Promise<void> {
    const { metadataFilePath, rootDirectory } = resolveLocalizationPaths();
    await fs.mkdir(rootDirectory, { recursive: true });
    await fs.writeFile(
      metadataFilePath,
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8"
    );
  }

  async upsertBundle(
    bundle: LocalizationBundleMetadataRecord
  ): Promise<LocalizationMetadataRecord> {
    const metadata = await this.load();
    const nextMetadata: LocalizationMetadataRecord = {
      ...metadata,
      updatedAt: new Date().toISOString(),
      bundles: {
        ...metadata.bundles,
        [createBundleKey(bundle.category, bundle.language)]: bundle,
      },
    };
    await this.save(nextMetadata);
    return nextMetadata;
  }

  async removeBundle(
    category: LocalizationCategoryId,
    language: string
  ): Promise<LocalizationMetadataRecord> {
    const metadata = await this.load();
    const bundleKey = createBundleKey(category, language);
    const { [bundleKey]: _removed, ...remainingBundles } = metadata.bundles;
    const nextMetadata: LocalizationMetadataRecord = {
      ...metadata,
      updatedAt: new Date().toISOString(),
      bundles: remainingBundles,
    };
    await this.save(nextMetadata);
    return nextMetadata;
  }
}
