import assert from "node:assert/strict";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { ClaudeStreamEventRouter } from "./claude-stream-event-router";
import { ClaudeThinkingLiveBuffer } from "./claude-thinking-live-buffer";
import { ClaudeThinkingStreamHandler } from "./claude-thinking-stream-handler";

interface DialogMessageEvent {
  readonly content: string;
  readonly role: "assistant";
  readonly tag: "thinking";
  readonly timestamp: string;
  readonly type: "dialog_message";
  readonly uuid: string;
}

const isDialogMessage = (value: unknown): value is DialogMessageEvent =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "dialog_message" &&
  (value as { role?: unknown }).role === "assistant" &&
  (value as { tag?: unknown }).tag === "thinking";

const createSession = (sessionId: string): ActiveSession => {
  const listeners = new Map<string, Array<(payload: unknown) => void>>();
  return {
    sessionId,
    eventEmitter: {
      emit: (event: string, payload: unknown) => {
        const handlers = listeners.get(event) ?? [];
        for (const handler of handlers) {
          handler(payload);
        }
      },
      on: (event: string, handler: (payload: unknown) => void) => {
        const existing = listeners.get(event) ?? [];
        existing.push(handler);
        listeners.set(event, existing);
      },
    },
  } as unknown as ActiveSession;
};

const collectThinkingDialogs = (session: ActiveSession): string[] => {
  const dialogs: string[] = [];
  session.eventEmitter.on("message", (payload: unknown) => {
    if (isDialogMessage(payload)) {
      dialogs.push(payload.content);
    }
  });
  return dialogs;
};

const buildContentBlockStart = (
  index: number,
  type: "thinking" | "text"
): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: `start-${index}`,
  event: {
    type: "content_block_start",
    index,
    content_block:
      type === "thinking"
        ? { type: "thinking", thinking: "" }
        : { type: "text", text: "" },
  },
});

const buildThinkingDelta = (
  index: number,
  text: string,
  uuidSuffix: string
): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: `delta-${uuidSuffix}`,
  event: {
    type: "content_block_delta",
    index,
    delta: { type: "thinking_delta", thinking: text },
  },
});

const buildContentBlockStop = (index: number): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: `stop-${index}`,
  event: { type: "content_block_stop", index },
});

const buildMessageStop = (): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: "message-stop",
  event: { type: "message_stop" },
});

test("ClaudeStreamEventRouter emits readable thinking segment after delta accumulation crosses flush threshold", async () => {
  const buffer = new ClaudeThinkingLiveBuffer();
  const router = new ClaudeStreamEventRouter(
    undefined,
    undefined,
    new ClaudeThinkingStreamHandler(buffer)
  );
  const session = createSession("session-delta-flush");
  const dialogs = collectThinkingDialogs(session);

  await router.handleStreamEvent(
    session,
    buildContentBlockStart(0, "thinking")
  );

  // Two short deltas — together over 240 chars and ending on a sentence boundary.
  const part1 =
    "I am reasoning about the problem and breaking it down into smaller steps. " +
    "First, the user asked for a stop button to behave safely without crashing core. ";
  const part2 =
    "Second, the user asked for live thinking to surface incrementally instead of as one final block. " +
    "I will keep both contracts in mind while drafting the response.\n";

  await router.handleStreamEvent(session, buildThinkingDelta(0, part1, "1"));
  assert.equal(dialogs.length, 0, "first short delta should not flush");

  await router.handleStreamEvent(session, buildThinkingDelta(0, part2, "2"));
  assert.equal(dialogs.length >= 1, true, "second delta should trigger flush");
  const combined = dialogs.join("");
  assert.equal(combined.includes("breaking it down"), true);
  assert.equal(combined.includes("response."), true);
});

test("ClaudeStreamEventRouter flushes the remaining thinking tail on content_block_stop", async () => {
  const buffer = new ClaudeThinkingLiveBuffer();
  const router = new ClaudeStreamEventRouter(
    undefined,
    undefined,
    new ClaudeThinkingStreamHandler(buffer)
  );
  const session = createSession("session-tail-flush");
  const dialogs = collectThinkingDialogs(session);

  await router.handleStreamEvent(
    session,
    buildContentBlockStart(0, "thinking")
  );
  await router.handleStreamEvent(
    session,
    buildThinkingDelta(0, "short reasoning tail", "tail")
  );
  assert.equal(dialogs.length, 0, "short delta below threshold stays buffered");

  await router.handleStreamEvent(session, buildContentBlockStop(0));
  assert.deepEqual(dialogs, ["short reasoning tail"]);
});

test("ClaudeStreamEventRouter ignores content_block_delta when block type is not thinking", async () => {
  const buffer = new ClaudeThinkingLiveBuffer();
  const router = new ClaudeStreamEventRouter(
    undefined,
    undefined,
    new ClaudeThinkingStreamHandler(buffer)
  );
  const session = createSession("session-non-thinking");
  const dialogs = collectThinkingDialogs(session);

  await router.handleStreamEvent(session, buildContentBlockStart(0, "text"));
  await router.handleStreamEvent(session, {
    type: "stream_event",
    uuid: "text-delta",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "hello" },
    },
  });
  await router.handleStreamEvent(session, buildContentBlockStop(0));

  assert.deepEqual(dialogs, []);
  assert.equal(buffer.hasAccumulatedContent("session-non-thinking"), false);
});

test("ClaudeStreamEventRouter resets live buffer on message_stop terminal event", async () => {
  const buffer = new ClaudeThinkingLiveBuffer();
  const router = new ClaudeStreamEventRouter(
    undefined,
    undefined,
    new ClaudeThinkingStreamHandler(buffer)
  );
  const session = createSession("session-message-stop");
  collectThinkingDialogs(session);

  await router.handleStreamEvent(
    session,
    buildContentBlockStart(0, "thinking")
  );
  await router.handleStreamEvent(
    session,
    buildThinkingDelta(0, "buffered reasoning", "1")
  );
  assert.equal(buffer.hasAccumulatedContent("session-message-stop"), true);

  await router.handleStreamEvent(session, buildMessageStop());
  assert.equal(buffer.hasAccumulatedContent("session-message-stop"), false);
});
