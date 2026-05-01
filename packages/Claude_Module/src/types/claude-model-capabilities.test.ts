import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAUDE_MODEL_CAPABILITIES,
  findClaudeModelCapabilities,
  isClaudeModelAliasId,
} from "./claude-model-capabilities";

test("Claude model capabilities cover current aliases", () => {
  assert.deepEqual(
    CLAUDE_MODEL_CAPABILITIES.map((capabilities) => capabilities.modelId),
    ["sonnet", "opus", "haiku"]
  );
});

test("Claude model capabilities expose thinking policy", () => {
  for (const capabilities of CLAUDE_MODEL_CAPABILITIES) {
    assert.equal(capabilities.supportsThinking, true);
    assert.equal(capabilities.supportsThinkingDisplaySummarized, true);
    assert.equal(capabilities.defaultThinkingEffort, "medium");
    assert.deepEqual(capabilities.thinkingEffortOptions, [
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
  }
});

test("Claude model capability lookup rejects unknown aliases", () => {
  assert.equal(findClaudeModelCapabilities("unknown"), null);
  assert.equal(isClaudeModelAliasId("unknown"), false);
  assert.equal(isClaudeModelAliasId("sonnet"), true);
});
