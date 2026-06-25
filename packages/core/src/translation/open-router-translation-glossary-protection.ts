import {
  type GlossaryBundle,
  GlossaryBundleLoader,
  type GlossaryPreserveRule,
  GlossaryProtector,
  type LocalizationCategoryId,
  type UserGlossaryOverrides,
  UserGlossaryStore,
} from "@codeai-hub/localization";
import type { TranslationReporter } from "@codeai-hub/translation";

interface GlossaryBundleReader {
  loadBaseBundle(): Promise<GlossaryBundle>;
}

interface UserGlossaryReader {
  load(): Promise<UserGlossaryOverrides>;
}

interface OpenRouterTranslationGlossaryProtectionOptions {
  readonly glossaryBundleLoader?: GlossaryBundleReader;
  readonly glossaryProtector?: GlossaryProtector;
  readonly reporter?: TranslationReporter;
  readonly userGlossaryStore?: UserGlossaryReader;
}

export interface ProtectedOpenRouterTranslationText {
  readonly protectedTerms: readonly string[];
  restore(translatedText: string): string;
  readonly text: string;
}

const LIVE_TRANSLATION_GLOSSARY_CATEGORY: LocalizationCategoryId = "ui_labels";

const createIdentityProtection = (
  text: string
): ProtectedOpenRouterTranslationText => ({
  protectedTerms: [],
  restore: (translatedText) => translatedText,
  text,
});

const isGlobalPreserveRule = (
  rule: GlossaryBundle["rules"][number]
): rule is GlossaryPreserveRule =>
  rule.kind !== "preferred_translation" &&
  (!rule.categories || rule.categories.length === 0);

const createUserPreserveRule = (sourceTerm: string): GlossaryPreserveRule => ({
  kind: "user_preserve",
  sourceTerm,
});

export class OpenRouterTranslationGlossaryProtection {
  private readonly glossaryBundleLoader: GlossaryBundleReader;
  private readonly glossaryProtector: GlossaryProtector;
  private readonly reporter?: TranslationReporter;
  private readonly userGlossaryStore: UserGlossaryReader;

  constructor(options: OpenRouterTranslationGlossaryProtectionOptions = {}) {
    this.glossaryBundleLoader =
      options.glossaryBundleLoader ?? new GlossaryBundleLoader();
    this.glossaryProtector =
      options.glossaryProtector ?? new GlossaryProtector();
    this.reporter = options.reporter;
    this.userGlossaryStore =
      options.userGlossaryStore ?? new UserGlossaryStore();
  }

  async protect(text: string): Promise<ProtectedOpenRouterTranslationText> {
    try {
      const [baseBundle, userOverrides] = await Promise.all([
        this.glossaryBundleLoader.loadBaseBundle(),
        this.userGlossaryStore.load(),
      ]);
      const rules = [
        ...baseBundle.rules.filter(isGlobalPreserveRule),
        ...userOverrides.preserve.map(createUserPreserveRule),
      ];
      const glossary = { rules };
      if (
        !this.glossaryProtector.hasApplicableRules(
          LIVE_TRANSLATION_GLOSSARY_CATEGORY,
          "any",
          glossary
        )
      ) {
        return createIdentityProtection(text);
      }
      const protectedText = this.glossaryProtector.protect(
        text,
        LIVE_TRANSLATION_GLOSSARY_CATEGORY,
        "any",
        glossary
      );
      if (protectedText.tokens.length === 0) {
        return createIdentityProtection(text);
      }
      return {
        protectedTerms: protectedText.tokens.map(
          (token) => token.rule.sourceTerm
        ),
        restore: (translatedText) =>
          this.glossaryProtector.restore(
            translatedText,
            "any",
            protectedText.tokens
          ),
        text: protectedText.protectedText,
      };
    } catch (error) {
      this.reporter?.warn?.("Live translation glossary protection failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return createIdentityProtection(text);
    }
  }
}
