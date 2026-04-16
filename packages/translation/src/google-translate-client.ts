import type {
  TranslationReporter,
  TranslationRequest,
  TranslationResult,
} from "./translation-contract";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
} from "./translation-engine";
import { parseGoogleTranslateResponse } from "./translation-response-parser";

const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t";
const GOOGLE_TRANSLATE_POST_HEADERS = {
  "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
} as const;
const GOOGLE_TRANSLATE_MAX_GET_URL_LENGTH = 1800;

const createFallbackResult = (
  request: TranslationRequest,
  errorCode: string
): TranslationResult => ({
  engine: "google-gtx",
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
  translatedText: string
): TranslationResult => ({
  engine: "google-gtx",
  finalText: translatedText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated",
  targetLanguage: request.targetLanguage,
  translatedText,
});

export class GoogleTranslateClient implements TranslationEngine {
  readonly id = "google-gtx";
  private readonly options: {
    readonly reporter?: TranslationReporter;
  };

  constructor(
    options: {
      readonly reporter?: TranslationReporter;
    } = {}
  ) {
    this.options = options;
  }

  async translate(
    request: NormalizedTranslationRequest
  ): Promise<TranslationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    const query = new URLSearchParams({
      q: request.text,
      sl: request.sourceLanguage,
      tl: request.targetLanguage,
    }).toString();
    const usePostTransport =
      GOOGLE_TRANSLATE_URL.length + 1 + query.length >
      GOOGLE_TRANSLATE_MAX_GET_URL_LENGTH;

    try {
      const response = await fetch(
        usePostTransport
          ? GOOGLE_TRANSLATE_URL
          : `${GOOGLE_TRANSLATE_URL}&${query}`,
        usePostTransport
          ? {
              body: query,
              headers: GOOGLE_TRANSLATE_POST_HEADERS,
              method: "POST",
              signal: controller.signal,
            }
          : {
              signal: controller.signal,
            }
      );

      if (!response.ok) {
        this.options.reporter?.warn?.("Google translation returned non-OK", {
          engine: this.id,
          status: response.status,
          transport: usePostTransport ? "post" : "get",
        });
        return createFallbackResult(request, "non_ok_response");
      }

      const data = await response.json();
      const translatedText = parseGoogleTranslateResponse(data);

      if (!translatedText) {
        this.options.reporter?.warn?.("Google translation response was empty", {
          engine: this.id,
        });
        return createFallbackResult(request, "empty_translation");
      }

      return createTranslatedResult(request, translatedText);
    } catch (error) {
      this.options.reporter?.warn?.("Google translation failed", {
        engine: this.id,
        error: error instanceof Error ? error.message : String(error),
        transport: usePostTransport ? "post" : "get",
      });
      return createFallbackResult(request, "request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
