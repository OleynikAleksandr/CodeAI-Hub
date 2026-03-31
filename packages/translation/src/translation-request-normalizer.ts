import type { TranslationRequest } from "./translation-contract";
import type { NormalizedTranslationRequest } from "./translation-engine";

const DEFAULT_TRANSLATION_TIMEOUT_MS = 3000;

const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const normalizeTranslationRequest = (
  request: TranslationRequest
): NormalizedTranslationRequest | null => {
  const text = trimToNull(request.text);
  const sourceLanguage = trimToNull(request.sourceLanguage);
  const targetLanguage = trimToNull(request.targetLanguage);

  if (!(text && sourceLanguage && targetLanguage)) {
    return null;
  }

  return {
    ...request,
    category: trimToNull(request.category) ?? "generic",
    engineId: trimToNull(request.engineId) ?? "google-gtx",
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
