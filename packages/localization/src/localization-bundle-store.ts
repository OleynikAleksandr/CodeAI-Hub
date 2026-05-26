import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  LocalizationCategoryId,
  LocalizationSourceDictionaryEntries,
} from "./localization-contract";
import {
  type LocalizationPathOptions,
  resolveLocalizationBundlePath,
} from "./localization-paths";

export interface LocalizationBundleRecord {
  readonly category: LocalizationCategoryId;
  readonly entries: LocalizationSourceDictionaryEntries;
  readonly language: string;
}

export type LocalizationBundleStoreOptions = LocalizationPathOptions;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const parseBundleRecord = (
  value: unknown,
  category: LocalizationCategoryId,
  language: string
): LocalizationBundleRecord | null => {
  if (!(isRecord(value) && isRecord(value.entries))) {
    return null;
  }

  const rawEntries = Object.entries(value.entries).filter(
    ([messageId, text]) =>
      messageId.trim().length > 0 && typeof text === "string"
  );
  const entries = Object.fromEntries(rawEntries) as Record<string, string>;

  return {
    category,
    language,
    entries: normalizeEntries(entries),
  };
};

export class LocalizationBundleStore {
  private readonly pathOptions: LocalizationBundleStoreOptions;

  constructor(options: LocalizationBundleStoreOptions = {}) {
    this.pathOptions = options;
  }

  async has(
    category: LocalizationCategoryId,
    language: string
  ): Promise<boolean> {
    return (await this.load(category, language)) !== null;
  }

  async load(
    category: LocalizationCategoryId,
    language: string
  ): Promise<LocalizationBundleRecord | null> {
    const bundlePath = this.resolveBundlePath(category, language);
    try {
      const raw = await fs.readFile(bundlePath, "utf8");
      return parseBundleRecord(JSON.parse(raw) as unknown, category, language);
    } catch {
      return null;
    }
  }

  async save(bundle: LocalizationBundleRecord): Promise<void> {
    const bundlePath = this.resolveBundlePath(bundle.category, bundle.language);
    await fs.mkdir(path.dirname(bundlePath), { recursive: true });
    await fs.writeFile(
      bundlePath,
      `${JSON.stringify(
        {
          category: bundle.category,
          language: bundle.language,
          entries: normalizeEntries(bundle.entries),
        } satisfies LocalizationBundleRecord,
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  async remove(
    category: LocalizationCategoryId,
    language: string
  ): Promise<void> {
    const bundlePath = this.resolveBundlePath(category, language);
    try {
      await fs.unlink(bundlePath);
    } catch {
      // ignore missing files to keep invalidation idempotent
    }
  }

  private resolveBundlePath(
    category: LocalizationCategoryId,
    language: string
  ): string {
    return resolveLocalizationBundlePath(category, language, this.pathOptions);
  }
}
