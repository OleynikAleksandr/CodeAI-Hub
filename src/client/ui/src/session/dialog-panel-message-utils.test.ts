import assert from "node:assert/strict";
import test from "node:test";
import type { SessionMessage } from "../../../../types/session";
import {
  mergeLiveAssistantMessages,
  mergeThinkingMessages,
} from "./dialog-panel-message-utils";

const createMessage = (
  id: string,
  role: SessionMessage["role"],
  content: string,
  options?: {
    readonly tag?: SessionMessage["tag"];
    readonly localizedContent?: string;
  }
): SessionMessage => ({
  id,
  role,
  content,
  createdAt: Number(id),
  ...(options?.tag ? { tag: options.tag } : {}),
  ...(options?.localizedContent
    ? { localizedContent: options.localizedContent }
    : {}),
});

test("mergeLiveAssistantMessages concatenates consecutive live assistant bubbles into one card", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "user", "Run the build."),
    createMessage("2", "assistant", "Starting the task. ", { tag: "live" }),
    createMessage("3", "assistant", "Reading the questionnaire. ", {
      tag: "live",
    }),
    createMessage("4", "assistant", "Drafting the description now.", {
      tag: "live",
    }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].role, "user");
  assert.equal(merged[1].role, "assistant");
  assert.equal(merged[1].tag, "live");
  assert.equal(merged[1].id, "2");
  assert.equal(
    merged[1].content,
    "Starting the task. Reading the questionnaire. Drafting the description now."
  );
});

test("mergeLiveAssistantMessages keeps non-live assistant bubbles separate", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Live chunk one. ", { tag: "live" }),
    createMessage("2", "assistant", "Final untagged reply."),
    createMessage("3", "assistant", "Live chunk two.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 3);
  assert.equal(merged[0].tag, "live");
  assert.equal(merged[0].content, "Live chunk one. ");
  assert.equal(merged[1].tag, undefined);
  assert.equal(merged[1].content, "Final untagged reply.");
  assert.equal(merged[2].tag, "live");
  assert.equal(merged[2].content, "Live chunk two.");
});

test("mergeLiveAssistantMessages breaks the group when a thinking message sits between live bubbles", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Live chunk one. ", { tag: "live" }),
    createMessage("2", "assistant", "Some reasoning here.", {
      tag: "thinking",
    }),
    createMessage("3", "assistant", "Live chunk two.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 3);
  assert.equal(merged[0].content, "Live chunk one. ");
  assert.equal(merged[1].tag, "thinking");
  assert.equal(merged[2].content, "Live chunk two.");
});

test("mergeLiveAssistantMessages assembles localizedContent across consecutive live bubbles", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Starting the task. ", {
      tag: "live",
      localizedContent: "Начинаю задачу. ",
    }),
    createMessage("2", "assistant", "Drafting now.", {
      tag: "live",
      localizedContent: "Составляю черновик сейчас.",
    }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].content, "Starting the task. Drafting now.");
  assert.equal(
    merged[0].localizedContent,
    "Начинаю задачу. Составляю черновик сейчас."
  );
});

test("mergeLiveAssistantMessages falls back to raw content when localization is only partial", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Starting. ", {
      tag: "live",
      localizedContent: "Начинаю. ",
    }),
    createMessage("2", "assistant", "Done.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].content, "Starting. Done.");
  assert.equal(merged[0].localizedContent, "Начинаю. Done.");
});

test("mergeThinkingMessages and mergeLiveAssistantMessages compose so live and thinking do not cross-merge", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Live A. ", { tag: "live" }),
    createMessage("2", "assistant", "Thought A.", { tag: "thinking" }),
    createMessage("3", "assistant", "Thought B.", { tag: "thinking" }),
    createMessage("4", "assistant", "Live B.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(mergeThinkingMessages(source));

  assert.equal(merged.length, 3);
  assert.equal(merged[0].tag, "live");
  assert.equal(merged[0].content, "Live A. ");
  assert.equal(merged[1].tag, "thinking");
  assert.equal(merged[1].content, "Thought A.\nThought B.");
  assert.equal(merged[2].tag, "live");
  assert.equal(merged[2].content, "Live B.");
});
