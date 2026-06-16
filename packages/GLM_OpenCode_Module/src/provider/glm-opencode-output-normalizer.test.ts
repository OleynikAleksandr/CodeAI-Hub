import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeOpenCodeJsonLine } from "./glm-opencode-output-normalizer";

test("normalizes OpenCode text JSON events to assistant events", () => {
  const [event] = normalizeOpenCodeJsonLine(
    JSON.stringify({ part: { text: "GLM52_OK" }, type: "text" })
  );

  assert.equal(event?.type, "assistant");
  assert.equal(event?.content, "GLM52_OK");
});

test("normalizes OpenCode error JSON events to turn_failed events", () => {
  const [event] = normalizeOpenCodeJsonLine(
    JSON.stringify({ error: { message: "bad key" }, type: "error" })
  );

  assert.equal(event?.type, "turn_failed");
  assert.equal(event?.message, "bad key");
});

test("ignores malformed and non-user-visible events", () => {
  assert.deepEqual(normalizeOpenCodeJsonLine("not-json"), []);
  assert.deepEqual(
    normalizeOpenCodeJsonLine(JSON.stringify({ type: "step_start" })),
    []
  );
});
