import assert from "node:assert/strict";
import test from "node:test";
import { CodexReasoningLiveBuffer } from "./codex-reasoning-live-buffer";

test("CodexReasoningLiveBuffer flushes summary deltas at a readable boundary", () => {
  const buffer = new CodexReasoningLiveBuffer();
  buffer.ensureSummaryPart("item", 0);
  const first = buffer.appendSummaryDelta(
    "item",
    0,
    "First reasoning sentence stays buffered because it is still below threshold. "
  );
  assert.equal(first, null);
  const second = buffer.appendSummaryDelta(
    "item",
    0,
    "Second reasoning sentence crosses the readable threshold and should flush now. Trailing tail without boundary"
  );
  assert.ok(
    second,
    "summary deltas should flush once threshold and boundary are met"
  );
  assert.equal(
    second?.includes("Trailing tail without boundary"),
    false,
    "unbounded tail must stay buffered"
  );
});

test("CodexReasoningLiveBuffer consumeFinal returns only unseen tail", () => {
  const buffer = new CodexReasoningLiveBuffer();
  const livePrefix =
    "This reasoning prefix is long enough to cross the threshold and end on a sentence boundary. ".repeat(
      3
    );
  const firstSegment = buffer.appendTextDelta("item", livePrefix);
  assert.ok(firstSegment);
  assert.equal(buffer.hasMaterializedContent("item"), true);
  const tail = buffer.consumeFinal(
    "item",
    `${livePrefix}Closing reasoning tail that arrived only with item completion.`
  );
  assert.equal(
    tail,
    "Closing reasoning tail that arrived only with item completion."
  );
});

test("CodexReasoningLiveBuffer falls back to accumulated text when final item is empty", () => {
  const buffer = new CodexReasoningLiveBuffer();
  buffer.appendTextDelta(
    "item",
    "Short reasoning tail without any boundary but still valuable."
  );
  const tail = buffer.consumeFinal("item", "");
  assert.equal(
    tail,
    "Short reasoning tail without any boundary but still valuable."
  );
});
