import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import {
  createDefaultTranslationEngines,
  DEFAULT_TRANSLATION_ENGINE_ID,
  type TranslationEngine,
  TranslationFacade,
  type TranslationReporter,
} from "@codeai-hub/translation";
import { LocalModelsFacade } from "../local-models/local-models-facade";
import { ClaudeHaikuTranslationEngine } from "./claude-haiku-translation-engine";
import {
  CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
  CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID,
  CODEX_SPARK_TRANSLATION_ENGINE_ID,
  CODEX_SPARK_TRANSLATION_MODEL_ID,
  CodexAppServerTranslationEngine,
} from "./codex-app-server-translation-engine";

export interface CoreTranslationFacadeFactoryOptions {
  readonly claudeHaikuTranslationService?: ClaudeHaikuTranslationService;
  readonly defaultEngineId?: string;
  readonly extraEngines?: readonly TranslationEngine[];
  readonly reporter?: TranslationReporter;
}

const CODEX_APP_SERVER_TRANSLATION_ENGINE_SPECS = [
  {
    engineId: CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID,
    modelId: CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID,
  },
  {
    engineId: CODEX_SPARK_TRANSLATION_ENGINE_ID,
    modelId: CODEX_SPARK_TRANSLATION_MODEL_ID,
  },
] as const;

const findEngine = (
  engines: readonly TranslationEngine[],
  engineId: string
): TranslationEngine | undefined =>
  engines.find((engine) => engine.id === engineId);

export const buildCoreTranslationEngines = (
  options: CoreTranslationFacadeFactoryOptions
): readonly TranslationEngine[] => {
  const reporter = options.reporter;
  const builtInEngines = createDefaultTranslationEngines({ reporter });
  const codexAppServerEngineIds = new Set<string>(
    CODEX_APP_SERVER_TRANSLATION_ENGINE_SPECS.map((spec) => spec.engineId)
  );
  const registryBuiltInEngines = builtInEngines.filter(
    (engine) => !codexAppServerEngineIds.has(engine.id)
  );
  const providerEngines: TranslationEngine[] = [];
  for (const spec of CODEX_APP_SERVER_TRANSLATION_ENGINE_SPECS) {
    providerEngines.push(
      new CodexAppServerTranslationEngine({
        engineId: spec.engineId,
        fallbackEngine: findEngine(builtInEngines, spec.engineId),
        modelId: spec.modelId,
        reporter,
      })
    );
  }
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
  providerEngines.push(
    ...new LocalModelsFacade({ reporter }).createTranslationEngines()
  );
  return [...registryBuiltInEngines, ...providerEngines];
};

export const createCoreTranslationFacade = (
  options: CoreTranslationFacadeFactoryOptions = {}
): TranslationFacade =>
  new TranslationFacade({
    defaultEngineId: options.defaultEngineId ?? DEFAULT_TRANSLATION_ENGINE_ID,
    engines: buildCoreTranslationEngines(options),
    reporter: options.reporter,
  });
