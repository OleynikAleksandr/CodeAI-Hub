import {
  createDefaultTranslationEngines,
  DEFAULT_TRANSLATION_ENGINE_ID,
} from "./default-translation-engine-factory";
import { createTranslationChunkPlan } from "./translation-chunk-planner";
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

const createChunkReporterMetadata = (
  request: TranslationRequest,
  chunk: {
    readonly end: number;
    readonly index: number;
    readonly start: number;
    readonly text: string;
  },
  chunkCount: number
): Record<string, unknown> => ({
  category: request.category ?? "generic",
  chunkCount,
  chunkEnd: chunk.end,
  chunkIndex: chunk.index,
  chunkSourceLength: chunk.text.length,
  chunkStart: chunk.start,
  engineId: request.engineId ?? "google-gtx",
  targetLanguage: request.targetLanguage,
});

export class TranslationFacade {
  private readonly reporter?: TranslationReporter;
  private readonly registry: TranslationEngineRegistry;

  constructor(options: TranslationFacadeOptions = {}) {
    this.reporter = options.reporter;
    const engines =
      options.engines ??
      createDefaultTranslationEngines({ reporter: this.reporter });
    this.registry = new TranslationEngineRegistry(
      engines,
      options.defaultEngineId ?? DEFAULT_TRANSLATION_ENGINE_ID
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

      this.reporter?.info?.("Translation chunk plan created", {
        category: normalized.category,
        chunkCharacterLengths: chunkPlan.chunks.map(
          (chunk) => chunk.text.length
        ),
        chunkCount: chunkPlan.chunkCount,
        engineId: engine.id,
        hardCharacterLimit: normalized.chunkPolicy.hardCharacterLimit,
        softCharacterLimit: normalized.chunkPolicy.softCharacterLimit,
        sourceLength: normalized.text.length,
        targetLanguage: normalized.targetLanguage,
      });

      const chunkResults: TranslationResult[] = [];
      for (const chunk of chunkPlan.chunks) {
        const startedAt = Date.now();
        this.reporter?.info?.("Translation chunk dispatch started", {
          ...createChunkReporterMetadata(
            normalized,
            chunk,
            chunkPlan.chunkCount
          ),
        });
        const chunkResult = await engine.translate({
          ...normalized,
          text: chunk.text,
        });
        const metadata = {
          ...createChunkReporterMetadata(
            normalized,
            chunk,
            chunkPlan.chunkCount
          ),
          elapsedMs: Date.now() - startedAt,
          errorCode: chunkResult.errorCode,
          resolvedEngineId: chunkResult.engine,
          status: chunkResult.status,
        };
        if (chunkResult.status === "translated") {
          this.reporter?.info?.("Translation chunk completed", metadata);
        } else {
          this.reporter?.warn?.(
            "Translation chunk returned non-translated result",
            metadata
          );
        }
        chunkResults.push(chunkResult);
      }
      const assembledResult = createChunkedResult(
        normalized,
        chunkResults,
        engine.id
      );
      this.reporter?.info?.("Translation chunk assembly completed", {
        category: normalized.category,
        chunkCount: chunkPlan.chunkCount,
        engineId: engine.id,
        errorCode: assembledResult.errorCode,
        fallbackChunkCount: chunkResults.filter(
          (result) => result.status !== "translated"
        ).length,
        finalStatus: assembledResult.status,
        sourceLength: normalized.text.length,
        targetLanguage: normalized.targetLanguage,
        translatedChunkCount: chunkResults.filter(
          (result) => result.status === "translated"
        ).length,
      });
      return assembledResult;
    } catch (error) {
      this.reporter?.warn?.("Translation engine threw unexpectedly", {
        engineId: engine.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return createFallbackResult(normalized, engine.id, "engine_threw");
    }
  }
}
