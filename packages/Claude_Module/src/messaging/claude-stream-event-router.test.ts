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

const buildAssistantThinkingMessage = (
  text: string,
  uuid: string
): ClaudeStreamMessage => ({
  type: "assistant",
  uuid,
  message: {
    id: `msg-${uuid}`,
    content: [{ type: "thinking", thinking: text } as never],
  },
});

test("ClaudeStreamEventRouter emits only the unseen tail when final thinking block supersedes live materialized text", async () => {
  const buffer = new ClaudeThinkingLiveBuffer();
  const router = new ClaudeStreamEventRouter(
    undefined,
    undefined,
    new ClaudeThinkingStreamHandler(buffer)
  );
  const session = createSession("session-final-superset");
  const dialogs = collectThinkingDialogs(session);

  await router.handleStreamEvent(
    session,
    buildContentBlockStart(0, "thinking")
  );
  const livePart =
    "I am reasoning about the problem and breaking it down into smaller steps. " +
    "First, the user asked for stop to behave safely without crashing core. " +
    "Second, the user asked for live thinking to surface incrementally instead of one final block.\n";
  await router.handleStreamEvent(session, buildThinkingDelta(0, livePart, "1"));
  await router.handleStreamEvent(session, buildContentBlockStop(0));

  const liveDialogsCount = dialogs.length;
  assert.equal(liveDialogsCount > 0, true, "live path should have emitted");

  const finalText = `${livePart}Closing summary: both contracts will be honored.`;
  await router.handleAssistantMessage(
    session,
    buildAssistantThinkingMessage(finalText, "final-1")
  );

  const finalDialogs = dialogs.slice(liveDialogsCount);
  assert.equal(
    finalDialogs.length,
    1,
    "final emission should be a single tail"
  );
  assert.equal(
    finalDialogs[0].includes("Closing summary"),
    true,
    "tail should carry only the unseen suffix"
  );
  assert.equal(
    finalDialogs[0].includes("breaking it down"),
    false,
    "tail must not repeat already materialized text"
  );
});

test("ClaudeStreamEventRouter falls back to full final thinking block when no delta path ran", async () => {
  const buffer = new ClaudeThinkingLiveBuffer();
  const router = new ClaudeStreamEventRouter(
    undefined,
    undefined,
    new ClaudeThinkingStreamHandler(buffer)
  );
  const session = createSession("session-final-no-live");
  const dialogs = collectThinkingDialogs(session);

  const finalText = "This is the entire reasoning the model produced.";
  await router.handleAssistantMessage(
    session,
    buildAssistantThinkingMessage(finalText, "final-2")
  );

  assert.deepEqual(dialogs, [finalText]);
});

test("ClaudeStreamEventRouter emits the divergent final thinking block in full when live materialization no longer matches", async () => {
  const buffer = new ClaudeThinkingLiveBuffer();
  const router = new ClaudeStreamEventRouter(
    undefined,
    undefined,
    new ClaudeThinkingStreamHandler(buffer)
  );
  const session = createSession("session-final-divergent");
  const dialogs = collectThinkingDialogs(session);

  await router.handleStreamEvent(
    session,
    buildContentBlockStart(0, "thinking")
  );
  const livePart =
    "Initial draft of the reasoning that will not match the final assembly. " +
    "The model later rewrote this entirely before producing the canonical block.\n";
  await router.handleStreamEvent(
    session,
    buildThinkingDelta(0, livePart, "div")
  );
  await router.handleStreamEvent(session, buildContentBlockStop(0));
  const liveDialogsCount = dialogs.length;

  const finalText =
    "Different canonical reasoning unrelated to the live draft.";
  await router.handleAssistantMessage(
    session,
    buildAssistantThinkingMessage(finalText, "final-3")
  );

  const finalDialogs = dialogs.slice(liveDialogsCount);
  assert.deepEqual(finalDialogs, [finalText]);
});
