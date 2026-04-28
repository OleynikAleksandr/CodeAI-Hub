import assert from "node:assert/strict";
import test from "node:test";
import type { TranslationResult } from "./translation-contract";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
} from "./translation-engine";
import { TranslationEngineRegistry } from "./translation-engine-registry";

class NamedTranslationEngine implements TranslationEngine {
  readonly id: string;
  private readonly finalText: string;

  constructor(id: string, finalText: string) {
    this.id = id;
    this.finalText = finalText;
  }

  translate(request: NormalizedTranslationRequest): Promise<TranslationResult> {
    return Promise.resolve({
      engine: this.id,
      finalText: this.finalText,
      originalText: request.text,
      sourceLanguage: request.sourceLanguage,
      status: "translated",
      targetLanguage: request.targetLanguage,
      translatedText: this.finalText,
    });
  }
}

const createRequest = (): NormalizedTranslationRequest => ({
  category: "generic",
  engineId: "codex-gpt-5.4-mini",
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "Hello",
  timeoutMs: 3000,
});

test("TranslationEngineRegistry lets later provider-owned engines override shared fallback ids", async () => {
  const registry = new TranslationEngineRegistry([
    new NamedTranslationEngine("codex-gpt-5.4-mini", "shared exec"),
    new NamedTranslationEngine("codex-gpt-5.4-mini", "provider app-server"),
  ]);

  const engine = registry.resolve("codex-gpt-5.4-mini", {
    allowDefaultFallback: false,
  });
  const result = await engine?.translate(createRequest());

  assert.equal(result?.finalText, "provider app-server");
});

test("TranslationEngineRegistry does not resolve the default engine for unavailable explicit ids when fallback is disabled", () => {
  const registry = new TranslationEngineRegistry(
    [new NamedTranslationEngine("google-gtx", "default")],
    "google-gtx"
  );

  const engine = registry.resolve("codex-gpt-5.4-mini", {
    allowDefaultFallback: false,
  });

  assert.equal(engine, null);
});
