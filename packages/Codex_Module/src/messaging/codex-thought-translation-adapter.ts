import type { TranslationRequest } from "@codeai-hub/translation";
import { TranslationFacade } from "@codeai-hub/translation";
import type { ModuleReporter } from "../types";

const SOURCE_LANGUAGE = "en";
const TRANSLATION_TIMEOUT_MS = 3000;
const TRANSLATION_CATEGORY = "reasoning";
const TRANSLATION_ENGINE_ID = "google-gtx";
const TRANSLATION_PROVIDER_ID = "codex";

const resolveTargetLanguage = (value?: string): string | null => {
  const normalized = value?.trim().toLowerCase();
  if (!(normalized && normalized.length > 0)) {
    return null;
  }

  return normalized === SOURCE_LANGUAGE ? null : normalized;
};

export class CodexThoughtTranslationAdapter {
  private readonly facade: TranslationFacade;
  private readonly reporter?: ModuleReporter;

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
    this.facade = new TranslationFacade({ reporter });
  }

  async translateReasoning(
    text: string,
    targetLanguage?: string
  ): Promise<string | null> {
    const normalized = text.trim();
    const resolvedTargetLanguage = resolveTargetLanguage(targetLanguage);
    if (!(normalized.length > 0 && resolvedTargetLanguage)) {
      return null;
    }

    try {
      const request = {
        category: TRANSLATION_CATEGORY,
        engineId: TRANSLATION_ENGINE_ID,
        providerId: TRANSLATION_PROVIDER_ID,
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage: resolvedTargetLanguage,
        text: normalized,
        timeoutMs: TRANSLATION_TIMEOUT_MS,
      } satisfies TranslationRequest;
      const result = await this.facade.translate(request);
      if (result.status !== "translated") {
        return null;
      }

      const translatedText = result.finalText.trim();
      return translatedText.length > 0 ? translatedText : null;
    } catch (error) {
      this.reporter?.warn?.(
        `Codex reasoning translation failed (non-blocking): ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
}
