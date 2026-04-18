import assert from "node:assert/strict";
import test from "node:test";
import { ClaudeTextLiveBuffer } from "./claude-text-live-buffer";

test("ClaudeTextLiveBuffer does not flush until accumulated tail reaches threshold", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const segment = buffer.appendDelta("s", "short prefix");
  assert.equal(segment, null);
  assert.equal(buffer.hasMaterializedContent("s"), false);
});

test("ClaudeTextLiveBuffer flushes at last sentence boundary once threshold crossed", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const first = buffer.appendDelta(
    "s",
    "This is the first sentence describing the setup. "
  );
  assert.equal(first, null, "below threshold, first sentence stays buffered");
  const second = buffer.appendDelta(
    "s",
    "This is the second sentence that crosses the minimum flush length. Trailing fragment without boundary"
  );
  assert.ok(second, "second delta should produce a flushable segment");
  assert.equal(
    second?.endsWith(". ") || second?.endsWith(".") || second?.endsWith("\n"),
    true,
    "segment should end on a sentence boundary"
  );
  assert.equal(
    second?.includes("first sentence"),
    true,
    "segment should include already-buffered content up to the boundary"
  );
  assert.equal(
    second?.includes("Trailing fragment without boundary"),
    false,
    "unbounded trailing fragment must stay buffered"
  );
});

test("ClaudeTextLiveBuffer flushRemaining returns leftover tail and clears it", () => {
  const buffer = new ClaudeTextLiveBuffer();
  buffer.appendDelta("s", "pending tail without any boundary at all");
  assert.equal(buffer.hasAccumulatedContent("s"), true);
  const tail = buffer.flushRemaining("s");
  assert.equal(tail, "pending tail without any boundary at all");
  // A second flushRemaining returns null because the tail has been consumed.
  assert.equal(buffer.flushRemaining("s"), null);
});

test("ClaudeTextLiveBuffer consumeFinal returns full text when no delta path ran", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const tail = buffer.consumeFinal("s", "entire final text without deltas");
  assert.equal(tail, "entire final text without deltas");
  assert.equal(buffer.hasAccumulatedContent("s"), false);
});

test("ClaudeTextLiveBuffer consumeFinal returns only unseen tail when final is superset", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const livePart =
    "This is the first sentence describing the setup. This is the second sentence crossing threshold.";
  buffer.appendDelta("s", livePart);
  const tail = buffer.consumeFinal(
    "s",
    `${livePart}Closing summary sentence that was not materialized live.`
  );
  assert.equal(
    tail,
    "Closing summary sentence that was not materialized live."
  );
});

test("ClaudeTextLiveBuffer suppresses orphan tail flush after early finalization", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const livePrefix =
    "This is the first sentence describing the setup in detail so the live buffer crosses threshold. ";
  const trailingDraft = "This affects shell";

  const firstSegment = buffer.appendDelta("s", livePrefix);
  assert.equal(firstSegment, livePrefix.trimEnd());

  const secondSegment = buffer.appendDelta("s", trailingDraft);
  assert.equal(secondSegment, null);

  const finalTail = buffer.consumeFinal("s", `${livePrefix}${trailingDraft}.`);
  assert.equal(finalTail, " This affects shell.");
  assert.notEqual(finalTail, "ell.");
  assert.equal(buffer.flushRemaining("s"), null);
});

test("ClaudeTextLiveBuffer consumeFinal returns full final when diverging from live draft", () => {
  const buffer = new ClaudeTextLiveBuffer();
  buffer.appendDelta(
    "s",
    "Initial draft that the model later rewrote entirely. Second sentence to cross threshold."
  );
  const finalText =
    "Different canonical assistant text unrelated to the draft.";
  const tail = buffer.consumeFinal("s", finalText);
  assert.equal(tail, finalText);
});

test("ClaudeTextLiveBuffer reset drops state without emitting", () => {
  const buffer = new ClaudeTextLiveBuffer();
  buffer.appendDelta("s", "buffered tail");
  buffer.reset("s");
  assert.equal(buffer.hasAccumulatedContent("s"), false);
  assert.equal(buffer.flushRemaining("s"), null);
});
