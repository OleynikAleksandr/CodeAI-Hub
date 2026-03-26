/**
 * Thought Translator Service — translates Gemini agent thoughts into Russian
 * using a lightweight Gemini model (Flash Lite) through the same authenticated
 * Gemini CLI Core client that powers the main session. No separate API key needed.
 */

import type { ModuleReporter } from "../types";

const TRANSLATION_MODEL = "gemini-2.5-flash-lite";
const TRANSLATION_TIMEOUT_MS = 8000;

const TRANSLATION_PROMPT = [
  "You are a translator for an AI coding agent.",
  "Translate the following agent thought into Russian.",
  "Remove filler phrases like 'I am now', 'I need to', 'Let me'.",
  "Keep the essence. Do not add anything of your own.",
  "Return ONLY the translated text, no explanations.",
].join(" ");

// GeminiClient.generateContent signature from @google/gemini-cli-core
type GeminiClientBridge = {
  generateContent(
    modelConfigKey: { model: string },
    contents: readonly { role: string; parts: readonly { text: string }[] }[],
    abortSignal: AbortSignal
  ): Promise<{
    candidates?: readonly {
      content?: { parts?: readonly { text?: string }[] };
    }[];
  }>;
};

export class ThoughtTranslatorService {
  private clientRef: GeminiClientBridge | null = null;
  private readonly reporter?: ModuleReporter;

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
  }

  /**
   * Bind the translator to an authenticated GeminiClient from an active session.
   * Called once the first session is fully initialized.
   */
  bindClient(client: GeminiClientBridge): void {
    this.clientRef = client;
    this.reporter?.info?.(
      "ThoughtTranslator: bound to authenticated GeminiClient"
    );
  }

  async translateThought(thought: {
    readonly subject: string;
    readonly description: string;
  }): Promise<string | null> {
    if (!this.clientRef) {
      return null;
    }

    const input = thought.subject?.trim()
      ? `${thought.subject.trim()}: ${thought.description}`
      : thought.description;

    if (!input || input.trim().length === 0) {
      return null;
    }

    try {
      const result = await this.callWithTimeout(input);
      const text = result?.trim();
      return text && text.length > 0 ? text : null;
    } catch (error) {
      this.reporter?.warn?.("Thought translation failed (non-blocking)", {
        model: TRANSLATION_MODEL,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async callWithTimeout(input: string): Promise<string | null> {
    if (!this.clientRef) {
      return null;
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      TRANSLATION_TIMEOUT_MS
    );

    try {
      const response = await this.clientRef.generateContent(
        { model: TRANSLATION_MODEL },
        [
          {
            role: "user",
            parts: [{ text: `${TRANSLATION_PROMPT}\n\n${input}` }],
          },
        ],
        controller.signal
      );
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ?? null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
