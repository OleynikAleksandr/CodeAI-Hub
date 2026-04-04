import assert from "node:assert/strict";
import test from "node:test";
import type { TranslationRequest } from "@codeai-hub/translation";
import { ClaudeThoughtTranslationAdapter } from "./claude-thought-translation-adapter";

const createTranslatedResult = (
  request: TranslationRequest,
  finalText: string
) => ({
  engine: "fake",
  finalText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated" as const,
  targetLanguage: request.targetLanguage,
  translatedText: finalText,
});

test("ClaudeThoughtTranslationAdapter splits long reasoning into multiple translation requests", async () => {
  const calls: string[] = [];
  const adapter = new ClaudeThoughtTranslationAdapter(undefined, {
    translate: (request: TranslationRequest) => {
      calls.push(request.text);
      return Promise.resolve(
        createTranslatedResult(request, `[ru] ${request.text}`)
      );
    },
  });

  const longReasoning = [
    "The user wants me to fill in all product parts as I see fit, and they'll review and discuss afterwards.",
    "This means I should proceed to create all product-parts/<part-id>.md files based on my analysis of the inputs.",
    "Let me re-read the instructions carefully and confirm whether the continuation subturn should still materialize one product part per iteration.",
  ]
    .join(" ")
    .repeat(18);

  const translated = await adapter.translateReasoning(longReasoning, "ru");

  assert.equal(typeof translated, "string");
  assert.equal(calls.length > 1, true);
  assert.equal(translated?.includes("[ru]"), true);
});

test("ClaudeThoughtTranslationAdapter skips translation when target language is english", async () => {
  const calls: string[] = [];
  const adapter = new ClaudeThoughtTranslationAdapter(undefined, {
    translate: (request: TranslationRequest) => {
      calls.push(request.text);
      return Promise.resolve(
        createTranslatedResult(request, `[ru] ${request.text}`)
      );
    },
  });

  const translated = await adapter.translateReasoning(
    "Need to read the file",
    "en"
  );

  assert.equal(translated, null);
  assert.deepEqual(calls, []);
});
