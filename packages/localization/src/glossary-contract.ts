import type { LocalizationCategoryId } from "./localization-contract";

export type GlossaryRuleKind =
  | "preserve"
  | "preferred_translation"
  | "user_preserve";

interface GlossaryRuleBase {
  readonly categories?: readonly LocalizationCategoryId[];
  readonly sourceTerm: string;
}

export interface GlossaryPreserveRule extends GlossaryRuleBase {
  readonly kind: "preserve" | "user_preserve";
}

export interface GlossaryPreferredTranslationRule extends GlossaryRuleBase {
  readonly kind: "preferred_translation";
  readonly targetLanguage: string;
  readonly translatedTerm: string;
}

export type GlossaryRule =
  | GlossaryPreferredTranslationRule
  | GlossaryPreserveRule;

export interface GlossaryBundle {
  readonly rules: readonly GlossaryRule[];
}

export interface ResolvedGlossary {
  readonly rules: readonly GlossaryRule[];
}

export interface ProtectedGlossaryToken {
  readonly marker: string;
  readonly rule: GlossaryRule;
}

export interface ProtectedGlossaryText {
  readonly protectedText: string;
  readonly tokens: readonly ProtectedGlossaryToken[];
}
