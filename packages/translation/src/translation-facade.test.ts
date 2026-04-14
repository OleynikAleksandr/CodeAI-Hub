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
