/**
 * Thought Translator Service — translates Gemini agent thoughts into Russian
 * using the free Google Translate API endpoint. No API key or auth needed.
 */

import type { ModuleReporter } from "../types";

const TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t";

const TRANSLATION_TIMEOUT_MS = 3000;

/**
 * Parse the Google Translate JSON response array.
 * Response shape: [[["translated","original",null,null,N],...],null,"en",...]
 * Each element in response[0] is a sentence pair — join all [0] elements.
 */
const parseTranslateResponse = (
  data: readonly (readonly (readonly string[])[] | null)[]
): string => {
  const segments = data[0];
  if (!Array.isArray(segments)) {
    return "";
  }
  return segments
    .map((segment) => (Array.isArray(segment) ? (segment[0] ?? "") : ""))
    .join("");
};

export class ThoughtTranslatorService {
  private readonly reporter?: ModuleReporter;

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
  }

  async translateThought(thought: {
    readonly subject: string;
    readonly description: string;
  }): Promise<string | null> {
    const input = thought.subject?.trim()
      ? `${thought.subject.trim()}: ${thought.description}`
      : thought.description;

    if (!input || input.trim().length === 0) {
      return null;
    }

    try {
      const result = await this.callGoogleTranslate(input);
      const text = result?.trim();
      return text && text.length > 0 ? text : null;
    } catch (error) {
      this.reporter?.warn?.("Thought translation failed (non-blocking)", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async callGoogleTranslate(input: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      TRANSLATION_TIMEOUT_MS
    );

    try {
      const url = `${TRANSLATE_URL}&q=${encodeURIComponent(input)}`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return parseTranslateResponse(data);
    } finally {
      clearTimeout(timeout);
    }
  }
}
