import { CodexCliTranslationEngine } from "./codex-cli-translation-engine";
import { GoogleTranslateClient } from "./google-translate-client";
import { createTranslationChunkPlan } from "./translation-chunk-planner";
import type {
  TranslationReporter,
  TranslationRequest,
  TranslationResult,
} from "./translation-contract";
import type {
  TranslationEngine,
  TranslationFacadeOptions,
} from "./translation-engine";
import { TranslationEngineRegistry } from "./translation-engine-registry";
import { normalizeTranslationRequest } from "./translation-request-normalizer";

const createDefaultTranslationEngines = (
  reporter?: TranslationReporter
): readonly TranslationEngine[] => [
  new GoogleTranslateClient({ reporter }),
  new CodexCliTranslationEngine({
    engineId: "codex-gpt-5.4-mini",
    modelId: "gpt-5.4-mini",
    reporter,
  }),
  new CodexCliTranslationEngine({
    engineId: "codex-gpt-5.3-codex-spark",
    modelId: "gpt-5.3-codex-spark",
    reporter,
  }),
];

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

const createTranslatedResult = (
  request: TranslationRequest,
  engine: string,
  translatedText: string,
  errorCode?: string
): TranslationResult => ({
  engine,
  errorCode,
  finalText: translatedText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated",
  targetLanguage: request.targetLanguage,
  translatedText,
});

const createChunkedResult = (
  request: TranslationRequest,
  chunkResults: readonly TranslationResult[],
  resolvedEngineId: string
): TranslationResult => {
  const finalText = chunkResults.map((result) => result.finalText).join("");
  const translatedChunkCount = chunkResults.filter(
    (result) => result.status === "translated"
  ).length;

  if (translatedChunkCount === 0) {
    return createFallbackResult(
      request,
      resolvedEngineId,
      chunkResults.find((result) => result.errorCode)?.errorCode ??
        "chunk_translation_failed"
    );
  }

  return createTranslatedResult(
    request,
    resolvedEngineId,
    finalText,
    translatedChunkCount === chunkResults.length
      ? undefined
      : "partial_fallback"
  );
};

export class TranslationFacade {
  private readonly reporter?: TranslationReporter;
  private readonly registry: TranslationEngineRegistry;

  constructor(options: TranslationFacadeOptions = {}) {
    this.reporter = options.reporter;
    const engines =
      options.engines ?? createDefaultTranslationEngines(this.reporter);
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
      const chunkPlan = createTranslationChunkPlan(
        normalized.text,
        normalized.chunkPolicy
      );
      if (chunkPlan.chunkCount <= 1) {
        return await engine.translate(normalized);
      }

      const chunkResults: TranslationResult[] = [];
      for (const chunk of chunkPlan.chunks) {
        chunkResults.push(
          await engine.translate({
            ...normalized,
            text: chunk.text,
          })
        );
      }
      return createChunkedResult(normalized, chunkResults, engine.id);
    } catch (error) {
      this.reporter?.warn?.("Translation engine threw unexpectedly", {
        engineId: engine.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return createFallbackResult(normalized, engine.id, "engine_threw");
    }
  }
}
