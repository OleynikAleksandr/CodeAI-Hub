import type {
  TranslationChunkingMode,
  TranslationChunkPolicy,
  TranslationRequest,
} from "./translation-contract";
import type { NormalizedTranslationRequest } from "./translation-engine";
import { TranslationEngineProfileRegistry } from "./translation-engine-profile-registry";

const DEFAULT_TRANSLATION_TIMEOUT_MS = 3000;
const DEFAULT_TRANSLATION_CHUNKING_MODE = "auto";
const DEFAULT_REASONING_CHUNKING_MODE = "disabled";
const REASONING_CATEGORY = "reasoning";
const DEFAULT_TRANSLATION_CATEGORY = "generic";
const profileRegistry = new TranslationEngineProfileRegistry();

const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const normalizeChunkingMode = (
  category: string,
  value: TranslationChunkingMode | undefined
): TranslationChunkingMode => {
  if (value === "disabled") {
    return "disabled";
  }

  if (value === "auto") {
    return "auto";
  }

  return category === REASONING_CATEGORY
    ? DEFAULT_REASONING_CHUNKING_MODE
    : DEFAULT_TRANSLATION_CHUNKING_MODE;
};

export interface NormalizedTranslationRequestWithChunkPolicy
  extends NormalizedTranslationRequest {
  readonly chunkPolicy: TranslationChunkPolicy;
}

export const normalizeTranslationRequest = (
  request: TranslationRequest
): NormalizedTranslationRequestWithChunkPolicy | null => {
  const text = trimToNull(request.text);
  const sourceLanguage = trimToNull(request.sourceLanguage);
  const targetLanguage = trimToNull(request.targetLanguage);

  if (!(text && sourceLanguage && targetLanguage)) {
    return null;
  }

  const category = trimToNull(request.category) ?? DEFAULT_TRANSLATION_CATEGORY;
  const engineId = trimToNull(request.engineId) ?? "google-gtx";
  const chunkingMode = normalizeChunkingMode(category, request.chunkingMode);

  return {
    ...request,
    category,
    chunkPolicy: profileRegistry.resolveChunkPolicy(engineId, chunkingMode),
    chunkingMode,
    engineId,
    sourceLanguage,
    targetLanguage,
    text,
    timeoutMs:
      typeof request.timeoutMs === "number" &&
      Number.isFinite(request.timeoutMs)
        ? Math.max(1, Math.floor(request.timeoutMs))
        : DEFAULT_TRANSLATION_TIMEOUT_MS,
  };
};
