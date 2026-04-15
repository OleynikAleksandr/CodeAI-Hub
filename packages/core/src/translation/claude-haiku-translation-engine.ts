import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import {
  CLAUDE_HAIKU_TRANSLATION_ENGINE_ID,
  CLAUDE_HAIKU_TRANSLATION_MODEL_ID,
  CLAUDE_HAIKU_TRANSLATION_PROVIDER_ID,
} from "@codeai-hub/claude-module";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
  TranslationReporter,
  TranslationResult,
} from "@codeai-hub/translation";

const buildFallback = (
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

const buildTranslated = (
  request: NormalizedTranslationRequest,
  engineId: string,
  translatedText: string
): TranslationResult => ({
  engine: engineId,
  finalText: translatedText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated",
  targetLanguage: request.targetLanguage,
  translatedText,
});

export interface ClaudeHaikuTranslationEngineOptions {
  readonly reporter?: TranslationReporter;
  readonly service: ClaudeHaikuTranslationService;
}

export class ClaudeHaikuTranslationEngine implements TranslationEngine {
  readonly id = CLAUDE_HAIKU_TRANSLATION_ENGINE_ID;
  private readonly reporter?: TranslationReporter;
  private readonly service: ClaudeHaikuTranslationService;

  constructor(options: ClaudeHaikuTranslationEngineOptions) {
    this.reporter = options.reporter;
    this.service = options.service;
  }

  async translate(
    request: NormalizedTranslationRequest
  ): Promise<TranslationResult> {
    try {
      const result = await this.service.translate(
        {
          category: request.category,
          providerId:
            request.providerId ?? CLAUDE_HAIKU_TRANSLATION_PROVIDER_ID,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          text: request.text,
        },
        { timeoutMs: request.timeoutMs }
      );
      if (result.text === null) {
        this.reporter?.warn?.("Claude Haiku translation engine returned null", {
          engineId: this.id,
          errorCode: result.errorCode,
          modelId: CLAUDE_HAIKU_TRANSLATION_MODEL_ID,
        });
        return buildFallback(
          request,
          this.id,
          result.errorCode ?? "empty_translation"
        );
      }
      return buildTranslated(request, this.id, result.text);
    } catch (error) {
      this.reporter?.warn?.("Claude Haiku translation engine threw", {
        engineId: this.id,
        error: error instanceof Error ? error.message : String(error),
        modelId: CLAUDE_HAIKU_TRANSLATION_MODEL_ID,
      });
      return buildFallback(request, this.id, "engine_threw");
    }
  }
}
