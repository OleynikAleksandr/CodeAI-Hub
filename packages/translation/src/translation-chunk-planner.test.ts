import assert from "node:assert/strict";
import test from "node:test";
import { createTranslationChunkPlan } from "./translation-chunk-planner";

test("createTranslationChunkPlan returns one chunk when chunking is disabled", () => {
  const text = "A short string should stay whole.";

  const plan = createTranslationChunkPlan(text, {
    hardCharacterLimit: 40,
    mode: "disabled",
    softCharacterLimit: 20,
  });

  assert.equal(plan.chunkCount, 1);
  assert.equal(plan.chunks[0]?.text, text);
});

test("createTranslationChunkPlan preserves full text through multi-chunk planning", () => {
  const text = [
    "The first paragraph is intentionally long enough to require chunking, but it should still split on a sentence boundary.",
    "",
    "The second paragraph keeps markdown-safe prose together and should appear as its own planned fragment.",
    "",
    "The third paragraph confirms that round-trip assembly reproduces the original string exactly.",
  ].join("\n");

  const plan = createTranslationChunkPlan(text, {
    hardCharacterLimit: 130,
    mode: "auto",
    softCharacterLimit: 90,
  });

  assert.ok(plan.chunkCount > 1);
  assert.equal(plan.chunks.map((chunk) => chunk.text).join(""), text);
  assert.ok(plan.chunks.every((chunk) => chunk.text.length > 0));
});
