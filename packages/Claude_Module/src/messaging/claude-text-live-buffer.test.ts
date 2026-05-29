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

test("ClaudeTextLiveBuffer backtracks from a marker-only list line to the previous safe boundary", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const segment = buffer.appendDelta(
    "s",
    "I need to summarize what I created, what is in the file, and which questions matter most next. " +
      "The questions are:\n1. Entry point\n2."
  );

  assert.equal(segment?.trimEnd().endsWith("2."), false);
  assert.equal(segment?.includes("1. Entry point"), true);

  buffer.appendDelta("s", " First-run without projects");
  const tail = buffer.flushRemaining("s");
  assert.equal(tail, "2. First-run without projects");
});

test("ClaudeTextLiveBuffer does not split inline-code filenames at periods", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const segment = buffer.appendDelta(
    "s",
    "I am updating the project documentation references now. " +
      "The next file is `project-manager."
  );

  assert.equal(segment, null);

  const nextSegment = buffer.appendDelta(
    "s",
    "md`, and the Core validation feedback should stay readable."
  );

  assert.equal(
    nextSegment,
    "I am updating the project documentation references now. The next file is `project-manager.md`, and the Core validation feedback should stay readable."
  );
});

test("ClaudeTextLiveBuffer does not split markdown links inside URL domains", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const segment = buffer.appendDelta(
    "s",
    "The finalized Quality Gates research cites official sources before the handoff. " +
      "Sources:\n- [Ultracite Agent Skills](https://docs.ultracite."
  );

  assert.notEqual(segment, null);
  assert.equal(segment?.includes("https://docs.ultracite."), false);

  buffer.appendDelta("s", "ai/skills)\n- [Biome](https://biomejs.dev/)\n");
  const completedLink = buffer.flushRemaining("s");

  assert.equal(
    completedLink?.includes("https://docs.ultracite.ai/skills"),
    true
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

test("ClaudeTextLiveBuffer suppresses short orphan final word tails", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const livePrefix =
    "This live assistant segment is long enough to cross the flushing threshold and to materialize as a complete sentence.";

  assert.equal(buffer.appendDelta("s", livePrefix), livePrefix.trimEnd());

  const tail = buffer.consumeFinal("s", `${livePrefix}ceptance.`);
  assert.equal(tail, null);
});

test("ClaudeTextLiveBuffer suppresses final suffix already covered by live text", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const livePrefix =
    "Sources:\n- [Ultracite](https://www.ultracite.ai/)\n- [Ultracite Agent Skills](https://docs.ultracite.";
  const liveTail =
    "ai/skills)\n- [Biome](https://biomejs.dev/)\n- [GitHub Actions](https://docs.github.com/en/actions)";

  buffer.appendDelta("s", `${livePrefix}${liveTail}`);
  buffer.flushRemaining("s");

  const finalTail = buffer.consumeFinal(
    "s",
    "ills)\n- [Biome](https://biomejs.dev/)\n- [GitHub Actions](https://docs.github.com/en/actions)"
  );
  assert.equal(finalTail, null);
});

test("ClaudeTextLiveBuffer trims overlapped final suffix and emits only unseen tail", () => {
  const buffer = new ClaudeTextLiveBuffer();
  const liveText =
    "The assistant already streamed a complete card with enough detail to cross the live boundary. " +
    "The final snapshot restarts from this exact visible suffix.";
  const overlap = liveText.slice(-72);

  buffer.appendDelta("s", liveText);
  buffer.flushRemaining("s");

  const finalTail = buffer.consumeFinal(
    "s",
    `${overlap} New sentence not shown live.`
  );
  assert.equal(finalTail, " New sentence not shown live.");
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
