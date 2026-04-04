import type { TranslationRequest } from "@codeai-hub/translation";
import { TranslationFacade } from "@codeai-hub/translation";
import type { ModuleReporter } from "../types";
import {
  buildClaudeTranslationChunks,
  joinClaudeTranslatedChunks,
} from "./claude-readable-text-chunker";

const SOURCE_LANGUAGE = "en";
const TRANSLATION_MAX_CHUNK_CHARS = 1200;
const TRANSLATION_TIMEOUT_MS = 5000;
const TRANSLATION_ENGINE_ID = "google-gtx";
const TRANSLATION_PROVIDER_ID = "claude";

const resolveTargetLanguage = (value?: string): string | null => {
  const normalized = value?.trim().toLowerCase();
  if (!(normalized && normalized.length > 0)) {
    return null;
  }

  return normalized === SOURCE_LANGUAGE ? null : normalized;
};

export interface ClaudeTextTranslationAdapter {
  translateReasoning(
    text: string,
    targetLanguage?: string
  ): Promise<string | null>;
  translateUserFacingText(
    text: string,
    targetLanguage?: string
  ): Promise<string | null>;
}

export interface ClaudeTranslationClient {
  translate(request: TranslationRequest): Promise<{
    readonly finalText: string;
    readonly status: "translated" | "fallback" | "skipped";
  }>;
}

export class ClaudeThoughtTranslationAdapter
  implements ClaudeTextTranslationAdapter
{
  private readonly translationClient: ClaudeTranslationClient;
  private readonly reporter?: ModuleReporter;

  constructor(
    reporter?: ModuleReporter,
    translationClient?: ClaudeTranslationClient
  ) {
    this.reporter = reporter;
    this.translationClient =
      translationClient ?? new TranslationFacade({ reporter });
  }

  translateReasoning(
    text: string,
    targetLanguage?: string
  ): Promise<string | null> {
    return this.translateText(text, targetLanguage, {
      category: "reasoning",
      warningLabel: "Claude reasoning translation failed",
    });
  }

  translateUserFacingText(
    text: string,
    targetLanguage?: string
  ): Promise<string | null> {
    return this.translateText(text, targetLanguage, {
      category: "generic",
      warningLabel: "Claude assistant text translation failed",
    });
  }

  private async translateText(
    text: string,
    targetLanguage: string | undefined,
    options: {
      readonly category: TranslationRequest["category"];
      readonly warningLabel: string;
    }
  ): Promise<string | null> {
    const normalized = text.trim();
    const resolvedTargetLanguage = resolveTargetLanguage(targetLanguage);
    if (!(normalized.length > 0 && resolvedTargetLanguage)) {
      return null;
    }

    try {
      const requestBase = {
        category: options.category,
        engineId: TRANSLATION_ENGINE_ID,
        providerId: TRANSLATION_PROVIDER_ID,
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage: resolvedTargetLanguage,
        timeoutMs: TRANSLATION_TIMEOUT_MS,
      } satisfies Omit<TranslationRequest, "text">;
      const chunks = buildClaudeTranslationChunks(
        normalized,
        TRANSLATION_MAX_CHUNK_CHARS
      );
      if (chunks.length === 0) {
        return null;
      }

      const results = await Promise.all(
        chunks.map((chunk) =>
          this.translationClient.translate({
            ...requestBase,
            text: chunk.text,
          })
        )
      );
      if (results.some((result) => result.status !== "translated")) {
        return null;
      }

      const translatedText = joinClaudeTranslatedChunks(
        chunks,
        results.map((result) => result.finalText)
      );
      return translatedText.length > 0 ? translatedText : null;
    } catch (error) {
      this.reporter?.warn?.(
        `${options.warningLabel} (non-blocking): ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
}
