import type {
  GlossaryRule,
  ProtectedGlossaryText,
  ProtectedGlossaryToken,
  ResolvedGlossary,
} from "./glossary-contract";
import type { LocalizationCategoryId } from "./localization-contract";

const GLOSSARY_MARKER_PREFIX = "[[CAIHUB_TERM_";
const GLOSSARY_MARKER_SUFFIX = "]]";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesCategory = (
  rule: GlossaryRule,
  category: LocalizationCategoryId
): boolean =>
  !rule.categories || rule.categories.length === 0
    ? true
    : rule.categories.includes(category);

const matchesTargetLanguage = (
  rule: GlossaryRule,
  targetLanguage: string
): boolean =>
  rule.kind === "preferred_translation"
    ? rule.targetLanguage.toLowerCase() === targetLanguage.toLowerCase()
    : true;

const getRestoredValue = (
  token: ProtectedGlossaryToken,
  targetLanguage: string
): string =>
  token.rule.kind === "preferred_translation" &&
  token.rule.targetLanguage.toLowerCase() === targetLanguage.toLowerCase()
    ? token.rule.translatedTerm
    : token.rule.sourceTerm;

export class GlossaryProtector {
  hasApplicableRules(
    category: LocalizationCategoryId,
    targetLanguage: string,
    glossary: ResolvedGlossary
  ): boolean {
    return glossary.rules.some(
      (rule) =>
        matchesCategory(rule, category) &&
        matchesTargetLanguage(rule, targetLanguage)
    );
  }

  protect(
    text: string,
    category: LocalizationCategoryId,
    targetLanguage: string,
    glossary: ResolvedGlossary
  ): ProtectedGlossaryText {
    const applicableRules = glossary.rules
      .filter((rule) => matchesCategory(rule, category))
      .filter((rule) => matchesTargetLanguage(rule, targetLanguage))
      .sort((left, right) => right.sourceTerm.length - left.sourceTerm.length);

    let protectedText = text;
    const tokens: ProtectedGlossaryToken[] = [];

    for (const rule of applicableRules) {
      const marker = `${GLOSSARY_MARKER_PREFIX}${tokens.length}${GLOSSARY_MARKER_SUFFIX}`;
      const pattern = new RegExp(escapeRegExp(rule.sourceTerm), "g");
      if (!pattern.test(protectedText)) {
        continue;
      }

      protectedText = protectedText.replace(pattern, marker);
      tokens.push({ marker, rule });
    }

    return {
      protectedText,
      tokens,
    };
  }

  restore(
    text: string,
    targetLanguage: string,
    tokens: readonly ProtectedGlossaryToken[]
  ): string {
    let restoredText = text;

    for (const token of tokens) {
      restoredText = restoredText
        .split(token.marker)
        .join(getRestoredValue(token, targetLanguage));
    }

    return restoredText;
  }
}
