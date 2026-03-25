import type { ModuleReporter } from "../types";

const TRANSLATION_MODEL = "gemini-2.0-flash-lite";
const TRANSLATION_TIMEOUT_MS = 5000;

const TRANSLATION_PROMPT = [
  "You are a translator for an AI coding agent.",
  "Translate the following agent thought into Russian.",
  "Remove filler phrases like 'I am now', 'I need to', 'Let me'.",
  "Keep the essence. Do not add anything of your own.",
  "Return ONLY the translated text, no explanations.",
].join(" ");

// Lazy-loaded GoogleGenAI client type (resolved at runtime via require)
type GenAIClient = {
  models: {
    generateContent(options: {
      model: string;
      contents: string;
      config?: { abortSignal?: AbortSignal };
    }): Promise<{ text?: string }>;
  };
};

// Lazy require to avoid crashing the entire module when @google/genai
// is not installed in the provider runtime directory.
const createGenAIClient = (apiKey: string): GenAIClient | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleGenAI } = require("@google/genai") as {
      GoogleGenAI: new (options: { apiKey: string }) => GenAIClient;
    };
    return new GoogleGenAI({ apiKey });
  } catch {
    return null;
  }
};

export class ThoughtTranslatorService {
  private readonly client: GenAIClient | null;
  private readonly reporter?: ModuleReporter;

  constructor(apiKey: string, reporter?: ModuleReporter) {
    this.client = createGenAIClient(apiKey);
    this.reporter = reporter;
    if (!this.client) {
      this.reporter?.warn?.(
        "ThoughtTranslatorService: @google/genai not available, translations disabled"
      );
    }
  }

  async translateThought(thought: {
    readonly subject: string;
    readonly description: string;
  }): Promise<string | null> {
    if (!this.client) {
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
    if (!this.client) {
      return null;
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      TRANSLATION_TIMEOUT_MS
    );

    try {
      const response = await this.client.models.generateContent({
        model: TRANSLATION_MODEL,
        contents: `${TRANSLATION_PROMPT}\n\n${input}`,
        config: {
          abortSignal: controller.signal,
        },
      });
      return response.text ?? null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
