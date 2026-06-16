import assert from "node:assert/strict";
import test from "node:test";
import { resolveOpenCodeUnseenTextTail } from "./glm-opencode-turn-stream";

test("resolveOpenCodeUnseenTextTail prefers provider delta when available", () => {
  assert.equal(
    resolveOpenCodeUnseenTextTail("Hello", "Hello world", " world"),
    " world"
  );
});

test("resolveOpenCodeUnseenTextTail derives appended tail from full text snapshots", () => {
  assert.equal(
    resolveOpenCodeUnseenTextTail("Hello", "Hello world", null),
    " world"
  );
});

test("resolveOpenCodeUnseenTextTail falls back to full text when snapshot rewrites the prefix", () => {
  assert.equal(
    resolveOpenCodeUnseenTextTail("Hello", "Rewritten answer", null),
    "Rewritten answer"
  );
});

test("resolveOpenCodeUnseenTextTail suppresses unchanged snapshots", () => {
  assert.equal(resolveOpenCodeUnseenTextTail("Hello", "Hello", null), null);
});
