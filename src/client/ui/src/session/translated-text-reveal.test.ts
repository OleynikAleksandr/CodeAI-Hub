import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTranslatedTextRevealFrame,
  resolveTranslatedTextRevealBatchSize,
  splitTranslatedTextRevealTokens,
} from "./translated-text-reveal";

test("splitTranslatedTextRevealTokens preserves the original text", () => {
  const content =
    "Позвольте мне проверить inputs.\n\nГотовлю Final_Description.md.";
  const tokens = splitTranslatedTextRevealTokens(content);

  assert.equal(tokens.join(""), content);
  assert.deepEqual(tokens.slice(0, 3), ["Позвольте ", "мне ", "проверить "]);
});

test("buildTranslatedTextRevealFrame returns a token prefix", () => {
  const tokens = splitTranslatedTextRevealTokens("Раз два три.");

  assert.equal(buildTranslatedTextRevealFrame(tokens, 0), "");
  assert.equal(buildTranslatedTextRevealFrame(tokens, 1), "Раз ");
  assert.equal(buildTranslatedTextRevealFrame(tokens, 2), "Раз два ");
  assert.equal(buildTranslatedTextRevealFrame(tokens, 99), "Раз два три.");
});

test("resolveTranslatedTextRevealBatchSize grows for long translations", () => {
  assert.equal(resolveTranslatedTextRevealBatchSize(1), 1);
  assert.equal(resolveTranslatedTextRevealBatchSize(90), 1);
  assert.equal(resolveTranslatedTextRevealBatchSize(91), 2);
});
