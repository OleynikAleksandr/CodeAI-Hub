import {
  CodexAppServerTranslationService,
  type CodexAppServerTranslationServiceResult,
  type ModuleReporter,
} from "@codeai-hub/codex-app-server-module";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
  TranslationReporter,
  TranslationResult,
} from "@codeai-hub/translation";

export const CODEX_GPT_5_4_MINI_TRANSLATION_ENGINE_ID = "codex-gpt-5.4-mini";
export const CODEX_GPT_5_4_MINI_TRANSLATION_MODEL_ID = "gpt-5.4-mini";
export const CODEX_SPARK_TRANSLATION_ENGINE_ID = "codex-gpt-5.3-codex-spark";
export const CODEX_SPARK_TRANSLATION_MODEL_ID = "gpt-5.3-codex-spark";

interface CodexTranslationServiceLike {
  translate(
    request: NormalizedTranslationRequest
  ): Promise<CodexAppServerTranslationServiceResult>;
}

type CodexTranslationServiceFactory = (options: {
  readonly modelId: string;
  readonly reporter?: ModuleReporter;
}) => CodexTranslationServiceLike;

const createFallbackResult = (
  request: NormalizedTranslationRequest,
  engineId: string,
  errorCode: string
): TranslationResult => ({
  engine: engineId,
  errorCode,
  finalText: request.text,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "fallback",
  targetLanguage: request.targetLanguage,
  translatedText: null,
});

const createTranslatedResult = (
  result: CodexAppServerTranslationServiceResult,
  engineId: string
): TranslationResult => ({
  engine: engineId,
  finalText: result.finalText,
  originalText: result.originalText,
  sourceLanguage: result.sourceLanguage,
  status: "translated",
  targetLanguage: result.targetLanguage,
  translatedText: result.translatedText ?? result.finalText,
});

const createCodexModuleReporter = (
  reporter?: TranslationReporter
): ModuleReporter | undefined => {
  if (!reporter) {
    return undefined;
  }
  return {
    error: (message, error) => {
      reporter.warn?.(message, {
        error: error instanceof Error ? error.message : String(error),
      });
    },
    info: (message) => {
      reporter.info?.(message);
    },
    warn: (message) => {
      reporter.warn?.(message);
    },
  };
};

const createDefaultService: CodexTranslationServiceFactory = (options) =>
  new CodexAppServerTranslationService(options);

export interface CodexAppServerTranslationEngineOptions {
  readonly engineId: string;
  readonly fallbackEngine?: TranslationEngine;
  readonly modelId: string;
  readonly reporter?: TranslationReporter;
  readonly service?: CodexTranslationServiceLike;
  readonly serviceFactory?: CodexTranslationServiceFactory;
}

export class CodexAppServerTranslationEngine implements TranslationEngine {
  readonly id: string;
  private readonly fallbackEngine?: TranslationEngine;
  private readonly modelId: string;
  private readonly reporter?: TranslationReporter;
  private readonly service: CodexTranslationServiceLike;

  constructor(options: CodexAppServerTranslationEngineOptions) {
    this.id = options.engineId;
    this.fallbackEngine = options.fallbackEngine;
    this.modelId = options.modelId;
    this.reporter = options.reporter;
    this.service =
      options.service ??
      (options.serviceFactory ?? createDefaultService)({
        modelId: options.modelId,
        reporter: createCodexModuleReporter(options.reporter),
      });
  }

  async translate(
    request: NormalizedTranslationRequest
  ): Promise<TranslationResult> {
    try {
      const result = await this.service.translate(request);
      if (result.status === "translated") {
        return createTranslatedResult(result, this.id);
      }
      this.reporter?.warn?.("Codex app-server translation returned fallback", {
        engineId: this.id,
        errorCode: result.errorCode,
        modelId: this.modelId,
      });
      return await this.translateWithFallback(
        request,
        result.errorCode ?? "app_server_fallback"
      );
    } catch (error) {
      this.reporter?.warn?.("Codex app-server translation engine threw", {
        engineId: this.id,
        error: error instanceof Error ? error.message : String(error),
        modelId: this.modelId,
      });
      return await this.translateWithFallback(request, "app_server_threw");
    }
  }

  private async translateWithFallback(
    request: NormalizedTranslationRequest,
    errorCode: string
  ): Promise<TranslationResult> {
    if (!this.fallbackEngine) {
      return createFallbackResult(request, this.id, errorCode);
    }
    this.reporter?.warn?.(
      "Codex app-server translation fell back to codex exec",
      {
        engineId: this.id,
        errorCode,
        modelId: this.modelId,
      }
    );
    try {
      return await this.fallbackEngine.translate(request);
    } catch (error) {
      this.reporter?.warn?.("Codex exec translation fallback threw", {
        engineId: this.id,
        error: error instanceof Error ? error.message : String(error),
        modelId: this.modelId,
      });
      return createFallbackResult(request, this.id, "fallback_engine_threw");
    }
  }
}
