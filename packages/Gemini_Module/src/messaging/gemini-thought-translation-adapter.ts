import type { TranslationRequest } from "@codeai-hub/translation";
import { TranslationFacade } from "@codeai-hub/translation";
import type { ModuleReporter } from "../types";

const SOURCE_LANGUAGE = "en";
const TARGET_LANGUAGE = "ru";
const TRANSLATION_TIMEOUT_MS = 3000;
const TRANSLATION_CATEGORY = "reasoning";
const TRANSLATION_ENGINE_ID = "google-gtx";
const TRANSLATION_PROVIDER_ID = "gemini";

interface ThoughtSummaryLike {
  readonly description: string;
  readonly subject: string;
}

export class GeminiThoughtTranslationAdapter {
  private readonly facade: TranslationFacade;
  private readonly reporter?: ModuleReporter;

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
    this.facade = new TranslationFacade({ reporter });
  }

  async translateThought(thought: ThoughtSummaryLike): Promise<string | null> {
    const input = this.buildInput(thought);
    if (input === null) {
      return null;
    }

    try {
      const request = {
        category: TRANSLATION_CATEGORY,
        engineId: TRANSLATION_ENGINE_ID,
        providerId: TRANSLATION_PROVIDER_ID,
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage: TARGET_LANGUAGE,
        text: input,
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
        "Gemini thought translation failed (non-blocking)",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return null;
    }
  }

  private buildInput(thought: ThoughtSummaryLike): string | null {
    const description = thought.description.trim();
    if (description.length === 0) {
      return null;
    }

    const subject = thought.subject.trim();
    return subject.length > 0 ? `${subject}: ${description}` : description;
  }
}
