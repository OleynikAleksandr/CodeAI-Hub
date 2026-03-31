import { GoogleTranslateClient } from "./google-translate-client";
import type {
  TranslationReporter,
  TranslationRequest,
  TranslationResult,
} from "./translation-contract";
import type { TranslationFacadeOptions } from "./translation-engine";
import { TranslationEngineRegistry } from "./translation-engine-registry";
import { normalizeTranslationRequest } from "./translation-request-normalizer";

const createSkippedResult = (
  request: TranslationRequest
): TranslationResult => ({
  engine: request.engineId?.trim() || "unresolved",
  finalText: request.text,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "skipped",
  targetLanguage: request.targetLanguage,
  translatedText: null,
});

const createFallbackResult = (
  request: TranslationRequest,
  engine: string,
  errorCode: string
): TranslationResult => ({
  engine,
  errorCode,
  finalText: request.text,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "fallback",
  targetLanguage: request.targetLanguage,
  translatedText: null,
});

export class TranslationFacade {
  private readonly reporter?: TranslationReporter;
  private readonly registry: TranslationEngineRegistry;

  constructor(options: TranslationFacadeOptions = {}) {
    this.reporter = options.reporter;
    const engines = options.engines ?? [
      new GoogleTranslateClient({ reporter: this.reporter }),
    ];
    this.registry = new TranslationEngineRegistry(
      engines,
      options.defaultEngineId ?? "google-gtx"
    );
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const normalized = normalizeTranslationRequest(request);
    if (!normalized) {
      return createSkippedResult(request);
    }

    const engine = this.registry.resolve(normalized.engineId);
    if (!engine) {
      this.reporter?.warn?.("Translation engine unavailable", {
        engineId: normalized.engineId,
      });
      return createFallbackResult(normalized, normalized.engineId, "no_engine");
    }

    try {
      return await engine.translate(normalized);
    } catch (error) {
      this.reporter?.warn?.("Translation engine threw unexpectedly", {
        engineId: engine.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return createFallbackResult(normalized, engine.id, "engine_threw");
    }
  }
}
