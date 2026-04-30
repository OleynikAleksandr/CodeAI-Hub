import assert from "node:assert/strict";
import test from "node:test";
import {
  CODEX_REASONING_EFFORT_OPTIONS,
  getCodexModelCapabilities,
  listCodexModelCapabilities,
} from "./codex-model-capabilities";

test("Codex runtime model capabilities gate reasoning summary per model", () => {
  assert.equal(
    getCodexModelCapabilities("gpt-5.3-codex-spark").supportsReasoningSummary,
    false
  );
  assert.equal(
    getCodexModelCapabilities("gpt-5.3-codex").supportsReasoningSummary,
    true
  );
});

test("Codex runtime model capabilities preserve xhigh reasoning effort", () => {
  for (const capabilities of listCodexModelCapabilities()) {
    assert.deepEqual(
      capabilities.reasoningEffortOptions,
      CODEX_REASONING_EFFORT_OPTIONS
    );
    assert.equal(capabilities.reasoningEffortOptions.includes("xhigh"), true);
  }
});

test("Unknown Codex models keep conservative summary support", () => {
  const capabilities = getCodexModelCapabilities(" future-codex-model ");

  assert.equal(capabilities.modelId, "future-codex-model");
  assert.equal(capabilities.supportsReasoningSummary, true);
  assert.equal(capabilities.supportsVerbosity, true);
  assert.equal(capabilities.reasoningEffortOptions.includes("xhigh"), true);
});
