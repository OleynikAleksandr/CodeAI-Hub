import assert from "node:assert/strict";
import test from "node:test";
import type { TranslationResult } from "./translation-contract";
import type { TranslationEngine } from "./translation-engine";
import { TranslationFacade } from "./translation-facade";

class FakeChunkEngine implements TranslationEngine {
  readonly id = "fake";

  translate(request: {
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
    readonly text: string;
  }): Promise<TranslationResult> {
    if (request.text.includes("fallback-fragment")) {
      return Promise.resolve({
        engine: this.id,
        errorCode: "request_failed",
        finalText: request.text,
        originalText: request.text,
        sourceLanguage: request.sourceLanguage,
        status: "fallback",
        targetLanguage: request.targetLanguage,
        translatedText: null,
      });
    }

    return Promise.resolve({
      engine: this.id,
      finalText: `[ru] ${request.text}`,
      originalText: request.text,
      sourceLanguage: request.sourceLanguage,
      status: "translated",
      targetLanguage: request.targetLanguage,
      translatedText: `[ru] ${request.text}`,
    });
  }
}

class RecordingEngine implements TranslationEngine {
  readonly id = "fake";
  readonly calls: string[] = [];

  translate(request: {
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
    readonly text: string;
  }): Promise<TranslationResult> {
    this.calls.push(request.text);
    return {
      engine: this.id,
      finalText: `[ru] ${request.text}`,
      originalText: request.text,
      sourceLanguage: request.sourceLanguage,
      status: "translated",
      targetLanguage: request.targetLanguage,
      translatedText: `[ru] ${request.text}`,
    };
  }
}

test("TranslationFacade assembles translated and fallback chunks into one translated result", async () => {
  const translation = new TranslationFacade({
    defaultEngineId: "fake",
    engines: [new FakeChunkEngine()],
  });
  const sourceText = [
    "Translated fragment one is intentionally long enough to fill a full paragraph and exceed the conservative planner budget without relying on a hard split. It repeats the same idea a few times so the first planned chunk can translate successfully before the failing middle paragraph appears.\n\n",
    "fallback-fragment should remain in source English if its chunk fails. This middle paragraph is also intentionally verbose so it stays isolated as its own planned translation chunk under the shared paragraph-first planner.\n\n",
    "Translated fragment two should still succeed after the fallback chunk. This closing paragraph confirms that later chunks continue through the same engine contract instead of being cancelled by one earlier fallback.",
  ].join("");

  const result = await translation.translate({
    chunkingMode: "auto",
    engineId: "fake",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: sourceText,
    timeoutMs: 3000,
  });

  assert.equal(result.status, "translated");
  assert.equal(result.errorCode, "partial_fallback");
  assert.equal(result.finalText.includes("[ru] Translated fragment one"), true);
  assert.equal(
    result.finalText.includes(
      "fallback-fragment should remain in source English"
    ),
    true
  );
  assert.equal(
    result.finalText.includes("[ru] This closing paragraph confirms"),
    true
  );
});

test("TranslationFacade disables chunking by default for reasoning requests", async () => {
  const engine = new RecordingEngine();
  const translation = new TranslationFacade({
    defaultEngineId: "fake",
    engines: [engine],
  });
  const sourceText = [
    "Reasoning fragment one is intentionally verbose so the shared generic profile would normally split it into multiple requests when chunking stays enabled. It keeps adding detail about runtime translation latency to push the payload above the conservative chunk threshold.\n\n",
    "Reasoning fragment two continues the same internal thought and exists only to ensure the payload clearly exceeds the generic soft character limit while still representing one provider-emitted reasoning block.",
  ].join("");

  const result = await translation.translate({
    category: "reasoning",
    engineId: "fake",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: sourceText,
    timeoutMs: 3000,
  });

  assert.equal(result.status, "translated");
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.calls[0], sourceText);
});

test("TranslationFacade still chunks generic requests by default and reasoning can explicitly opt back in", async () => {
  const genericEngine = new RecordingEngine();
  const genericTranslation = new TranslationFacade({
    defaultEngineId: "fake",
    engines: [genericEngine],
  });
  const sourceText = [
    "Generic fragment one is intentionally verbose so the shared planner keeps the previous chunking behavior for non-reasoning content. It repeats itself a little to make sure the fallback google profile budget is exceeded without any ambiguity.\n\n",
    "Generic fragment two continues the long payload so default chunking remains necessary for document-like or generic long-form translation requests.",
  ].join("");

  const genericResult = await genericTranslation.translate({
    category: "generic",
    engineId: "fake",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: sourceText,
    timeoutMs: 3000,
  });

  assert.equal(genericResult.status, "translated");
  assert.equal(genericEngine.calls.length > 1, true);

  const reasoningEngine = new RecordingEngine();
  const reasoningTranslation = new TranslationFacade({
    defaultEngineId: "fake",
    engines: [reasoningEngine],
  });

  const reasoningResult = await reasoningTranslation.translate({
    category: "reasoning",
    chunkingMode: "auto",
    engineId: "fake",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: sourceText,
    timeoutMs: 3000,
  });

  assert.equal(reasoningResult.status, "translated");
  assert.equal(reasoningEngine.calls.length > 1, true);
});
