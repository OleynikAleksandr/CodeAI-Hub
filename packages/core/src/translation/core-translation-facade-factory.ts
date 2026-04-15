import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import {
  createDefaultTranslationEngines,
  DEFAULT_TRANSLATION_ENGINE_ID,
  type TranslationEngine,
  TranslationFacade,
  type TranslationReporter,
} from "@codeai-hub/translation";
import { ClaudeHaikuTranslationEngine } from "./claude-haiku-translation-engine";

export interface CoreTranslationFacadeFactoryOptions {
  readonly claudeHaikuTranslationService?: ClaudeHaikuTranslationService;
  readonly defaultEngineId?: string;
  readonly extraEngines?: readonly TranslationEngine[];
  readonly reporter?: TranslationReporter;
}

export const buildCoreTranslationEngines = (
  options: CoreTranslationFacadeFactoryOptions
): readonly TranslationEngine[] => {
  const reporter = options.reporter;
  const builtInEngines = createDefaultTranslationEngines({ reporter });
  const providerEngines: TranslationEngine[] = [];
  if (options.claudeHaikuTranslationService) {
    providerEngines.push(
      new ClaudeHaikuTranslationEngine({
        reporter,
        service: options.claudeHaikuTranslationService,
      })
    );
  }
  if (options.extraEngines) {
    providerEngines.push(...options.extraEngines);
  }
  return [...builtInEngines, ...providerEngines];
};

export const createCoreTranslationFacade = (
  options: CoreTranslationFacadeFactoryOptions = {}
): TranslationFacade =>
  new TranslationFacade({
    defaultEngineId: options.defaultEngineId ?? DEFAULT_TRANSLATION_ENGINE_ID,
    engines: buildCoreTranslationEngines(options),
    reporter: options.reporter,
  });
