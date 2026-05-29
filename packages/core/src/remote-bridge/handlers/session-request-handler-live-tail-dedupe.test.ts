import assert from "node:assert/strict";
import test from "node:test";
import { resolveLiveAssistantTailDedupe } from "./session-request-handler-live-tail-dedupe";

const liveMessage = (content: string) => ({
  content,
  role: "assistant" as const,
  tag: "live",
});

test("resolveLiveAssistantTailDedupe suppresses final suffix already covered by live chunks", () => {
  const livePrefix =
    "Sources:\n- [Ultracite](https://www.ultracite.ai/)\n- [Ultracite Agent Skills](https://docs.ultracite.";
  const liveTail =
    "ai/skills)\n- [Biome](https://biomejs.dev/)\n- [GitHub Actions](https://docs.github.com/en/actions)";

  const result = resolveLiveAssistantTailDedupe({
    content:
      "ills)\n- [Biome](https://biomejs.dev/)\n- [GitHub Actions](https://docs.github.com/en/actions)",
    messages: [liveMessage(livePrefix), liveMessage(liveTail)],
    role: "assistant",
  });

  assert.equal(result, null);
});

test("resolveLiveAssistantTailDedupe trims overlapped final text and keeps unseen tail", () => {
  const liveText =
    "The quality gate source list is ready and already visible in the live dialog card. " +
    "The final provider snapshot may restart inside this sentence boundary.";
  const overlap = liveText.slice(-70);

  const result = resolveLiveAssistantTailDedupe({
    content: `${overlap}\n\nNew final sentence that was not streamed.`,
    messages: [liveMessage(liveText)],
    role: "assistant",
  });

  assert.deepEqual(result, {
    content: "\n\nNew final sentence that was not streamed.",
    tag: "live",
  });
});

test("resolveLiveAssistantTailDedupe leaves unrelated final assistant text unchanged", () => {
  const result = resolveLiveAssistantTailDedupe({
    content: "Different canonical answer that does not overlap.",
    messages: [
      liveMessage(
        "This live assistant card has different content and should not own the final answer."
      ),
    ],
    role: "assistant",
  });

  assert.deepEqual(result, {
    content: "Different canonical answer that does not overlap.",
    tag: undefined,
  });
});
