import type {
  GlossaryBundle,
  GlossaryPreferredTranslationRule,
  GlossaryPreserveRule,
  GlossaryRule,
  ResolvedGlossary,
} from "./glossary-contract";
import { GlossaryValidator } from "./glossary-validator";
import type { LocalizationCategoryId } from "./localization-contract";
import type { UserGlossaryOverrides } from "./user-glossary-store";

const normalizeCategories = (
  categories: readonly LocalizationCategoryId[] | undefined
): readonly LocalizationCategoryId[] | undefined => {
  if (!categories || categories.length === 0) {
    return undefined;
  }

  const normalizedCategories = [...new Set(categories)].sort();
  return normalizedCategories.length > 0
    ? normalizedCategories.sort()
    : undefined;
};

const normalizeSourceTerm = (value: string): string => value.trim();

const normalizePreserveRule = (
  rule: GlossaryPreserveRule
): GlossaryPreserveRule | null => {
  const sourceTerm = normalizeSourceTerm(rule.sourceTerm);
  if (!sourceTerm) {
    return null;
  }

  return {
    ...rule,
    sourceTerm,
    categories: normalizeCategories(rule.categories),
  };
};

const normalizePreferredTranslationRule = (
  rule: GlossaryPreferredTranslationRule
): GlossaryPreferredTranslationRule | null => {
  const sourceTerm = normalizeSourceTerm(rule.sourceTerm);
  const translatedTerm = rule.translatedTerm.trim();
  const targetLanguage = rule.targetLanguage.trim();
  if (!(sourceTerm && translatedTerm && targetLanguage)) {
    return null;
  }

  return {
    ...rule,
    sourceTerm,
    translatedTerm,
    targetLanguage,
    categories: normalizeCategories(rule.categories),
  };
};

const normalizeGlossaryRule = (rule: GlossaryRule): GlossaryRule | null => {
  if (rule.kind === "preferred_translation") {
    return normalizePreferredTranslationRule(rule);
  }

  return normalizePreserveRule(rule);
};

const createRuleKey = (rule: GlossaryRule): string => {
  const categoriesKey = rule.categories?.join(",") ?? "*";
  if (rule.kind === "preferred_translation") {
    return [
      rule.kind,
      rule.sourceTerm.toLowerCase(),
      rule.targetLanguage.toLowerCase(),
      categoriesKey,
    ].join("::");
  }

  return [rule.kind, rule.sourceTerm.toLowerCase(), categoriesKey].join("::");
};

export class GlossaryMergeService {
  private readonly glossaryValidator = new GlossaryValidator();

  createUserPreserveBundle(preserveTerms: readonly string[]): GlossaryBundle {
    const validation =
      this.glossaryValidator.validatePreserveTerms(preserveTerms);

    return {
      rules: validation.preserve.map(
        (sourceTerm): GlossaryPreserveRule => ({
          kind: "user_preserve",
          sourceTerm,
        })
      ),
    };
  }

  createUserOverrideBundle(overrides: UserGlossaryOverrides): GlossaryBundle {
    return this.createUserPreserveBundle(overrides.preserve);
  }

  mergeBundles(bundles: readonly GlossaryBundle[]): ResolvedGlossary {
    const mergedRules = new Map<string, GlossaryRule>();

    for (const bundle of bundles) {
      for (const rule of bundle.rules) {
        const normalizedRule = normalizeGlossaryRule(rule);
        if (!normalizedRule) {
          continue;
        }
        mergedRules.set(createRuleKey(normalizedRule), normalizedRule);
      }
    }

    return {
      rules: [...mergedRules.values()],
    };
  }
}
