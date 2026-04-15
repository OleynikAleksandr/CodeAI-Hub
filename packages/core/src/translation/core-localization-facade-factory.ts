import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import {
  LocalizationFacade,
  type LocalizationFacadeOptions,
} from "@codeai-hub/localization";
import type { TranslationReporter } from "@codeai-hub/translation";
import { createCoreTranslationFacade } from "./core-translation-facade-factory";

export interface CoreLocalizationFacadeFactoryOptions
  extends LocalizationFacadeOptions {
  readonly claudeHaikuTranslationService?: ClaudeHaikuTranslationService;
  readonly translationReporter?: TranslationReporter;
}

export const createCoreLocalizationFacade = (
  options: CoreLocalizationFacadeFactoryOptions = {}
): LocalizationFacade => {
  const {
    claudeHaikuTranslationService,
    translationReporter,
    translationFacade,
    ...localizationOptions
  } = options;
  const coreTranslationFacade =
    translationFacade ??
    createCoreTranslationFacade({
      claudeHaikuTranslationService,
      reporter: translationReporter,
    });
  return new LocalizationFacade({
    ...localizationOptions,
    translationFacade: coreTranslationFacade,
  });
};
