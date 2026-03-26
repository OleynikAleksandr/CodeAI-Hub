/**
 * Thought Translator Service — translates Gemini agent thoughts into Russian
 * using a lightweight Gemini model (Flash Lite) through the same authenticated
 * Gemini CLI Core client that powers the main session. No separate API key needed.
 */

import type { ModuleReporter } from "../types";

const TRANSLATION_MODEL = "gemini-2.5-flash-lite";
const TRANSLATION_TIMEOUT_MS = 15_000;

const SYSTEM_INSTRUCTION =
  "You are a one-shot translator. Output ONLY the Russian translation. " +
  "No commentary, no analysis, no intermediate steps, no markdown.";

const PARAGRAPH_SPLIT_REGEX = /\n\s*\n/;

const USER_PROMPT_PREFIX =
  "Translate this AI agent thought to Russian. " +
  "Remove filler ('I am now', 'I need to', 'Let me'). " +
  "One concise sentence. ONLY the translation:\n\n";

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

/**
 * Extract only the final translation from potentially verbose output.
 * If the model includes chain-of-thought, take the last non-empty paragraph.
 */
const extractFinalTranslation = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "";
  }
  // Split by double newline (paragraph breaks)
  const paragraphs = trimmed
    .split(PARAGRAPH_SPLIT_REGEX)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  // Last paragraph is most likely the actual translation
  return paragraphs.at(-1) ?? trimmed;
};

export class ThoughtTranslatorService {
  private clientRef: GeminiClientBridge | null = null;
  private readonly reporter?: ModuleReporter;

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
  }

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
      return text && text.length > 0 ? extractFinalTranslation(text) : null;
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
          { role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] },
          {
            role: "model",
            parts: [
              {
                text: "Understood. I will output only the Russian translation.",
              },
            ],
          },
          { role: "user", parts: [{ text: `${USER_PROMPT_PREFIX}${input}` }] },
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
