import { promises as fs } from "node:fs";
import path from "node:path";
import type { GlossaryBundle, GlossaryRule } from "./glossary-contract";
import {
  LOCALIZATION_CATEGORY_IDS,
  type LocalizationCategoryId,
} from "./localization-contract";

const EMPTY_GLOSSARY_BUNDLE: GlossaryBundle = {
  rules: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseCategories = (
  value: unknown
): readonly LocalizationCategoryId[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const categories = value.filter(
    (category): category is LocalizationCategoryId =>
      typeof category === "string" &&
      LOCALIZATION_CATEGORY_IDS.includes(category as LocalizationCategoryId)
  );

  return categories.length > 0 ? categories : undefined;
};

const parseGlossaryRule = (value: unknown): GlossaryRule | null => {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  if (
    (value.kind === "preserve" || value.kind === "user_preserve") &&
    typeof value.sourceTerm === "string"
  ) {
    return {
      kind: value.kind,
      sourceTerm: value.sourceTerm,
      categories: parseCategories(value.categories),
    };
  }

  if (
    value.kind === "preferred_translation" &&
    typeof value.sourceTerm === "string" &&
    typeof value.targetLanguage === "string" &&
    typeof value.translatedTerm === "string"
  ) {
    return {
      kind: "preferred_translation",
      sourceTerm: value.sourceTerm,
      targetLanguage: value.targetLanguage,
      translatedTerm: value.translatedTerm,
      categories: parseCategories(value.categories),
    };
  }

  return null;
};

const parseGlossaryBundle = (value: unknown): GlossaryBundle => {
  if (!(isRecord(value) && Array.isArray(value.rules))) {
    return EMPTY_GLOSSARY_BUNDLE;
  }

  return {
    rules: value.rules
      .map((rule) => parseGlossaryRule(rule))
      .filter((rule): rule is GlossaryRule => rule !== null),
  };
};

const resolveGlossaryAssetPath = (fileName: string): string =>
  require.resolve(
    path.join("..", "..", "..", "assets", "localization", "glossary", fileName)
  );

export class GlossaryBundleLoader {
  loadBaseBundle(): Promise<GlossaryBundle> {
    return this.loadBundleByFileName("base.json");
  }

  loadLanguageBundle(language: string): Promise<GlossaryBundle> {
    const normalizedLanguage = language.trim().toLowerCase();
    if (!normalizedLanguage) {
      return Promise.resolve(EMPTY_GLOSSARY_BUNDLE);
    }
    return this.loadBundleByFileName(`${normalizedLanguage}.json`);
  }

  private async loadBundleByFileName(
    fileName: string
  ): Promise<GlossaryBundle> {
    try {
      const raw = await fs.readFile(resolveGlossaryAssetPath(fileName), "utf8");
      return parseGlossaryBundle(JSON.parse(raw) as unknown);
    } catch {
      return EMPTY_GLOSSARY_BUNDLE;
    }
  }
}
