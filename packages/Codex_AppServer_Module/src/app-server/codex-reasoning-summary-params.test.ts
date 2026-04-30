import assert from "node:assert/strict";
import test from "node:test";
import { buildCodexReasoningSummaryParams } from "./codex-reasoning-summary-params";

test("Codex reasoning summary params omit summary for Spark", () => {
  assert.deepEqual(
    buildCodexReasoningSummaryParams("gpt-5.3-codex-spark", "detailed"),
    {}
  );
});

test("Codex reasoning summary params keep summary for non-Spark models", () => {
  assert.deepEqual(buildCodexReasoningSummaryParams("gpt-5.4", "none"), {
    summary: "none",
  });
});

test("Codex reasoning summary params keep summary for unknown models", () => {
  assert.deepEqual(
    buildCodexReasoningSummaryParams("future-codex-model", "detailed"),
    {
      summary: "detailed",
    }
  );
});
