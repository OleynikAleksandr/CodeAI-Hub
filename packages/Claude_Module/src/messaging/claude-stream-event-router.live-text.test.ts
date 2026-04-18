import assert from "node:assert/strict";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { ClaudeContentStreamHandler } from "./claude-content-stream-handler";
import { ClaudeStreamEventRouter } from "./claude-stream-event-router";
import { ClaudeTextLiveBuffer } from "./claude-text-live-buffer";
import { ClaudeThinkingLiveBuffer } from "./claude-thinking-live-buffer";

interface AssistantEmission {
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
  readonly tag?: string;
  readonly type: "assistant";
  readonly uuid: string;
}

interface ThinkingEmission {
  readonly content: string;
  readonly role: "assistant";
  readonly tag: "thinking";
  readonly type: "dialog_message";
  readonly uuid: string;
}

const isLiveAssistant = (value: unknown): value is AssistantEmission =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "assistant";

const isThinkingEmission = (value: unknown): value is ThinkingEmission =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "dialog_message" &&
  (value as { role?: unknown }).role === "assistant" &&
  (value as { tag?: unknown }).tag === "thinking";

const createSession = (
  sessionId: string,
  targetLanguage?: string
): ActiveSession => {
  const listeners = new Map<string, Array<(payload: unknown) => void>>();
  return {
    sessionId,
    runtimeTurnConfig: {
      messagesForTheUserLanguage: targetLanguage,
    },
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

const collectAssistantEmissions = (
  session: ActiveSession
): AssistantEmission[] => {
  const emissions: AssistantEmission[] = [];
  session.eventEmitter.on("message", (payload: unknown) => {
    if (isLiveAssistant(payload)) {
      emissions.push(payload);
    }
  });
  return emissions;
};

const collectThinkingEmissions = (
  session: ActiveSession
): ThinkingEmission[] => {
  const emissions: ThinkingEmission[] = [];
  session.eventEmitter.on("message", (payload: unknown) => {
    if (isThinkingEmission(payload)) {
      emissions.push(payload);
    }
  });
  return emissions;
};

const buildTextBlockStart = (index: number): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: `start-text-${index}`,
  event: {
    type: "content_block_start",
    index,
    content_block: { type: "text", text: "" },
  },
});

const buildTextDelta = (
  index: number,
  text: string,
  uuidSuffix: string
): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: `delta-text-${uuidSuffix}`,
  event: {
    type: "content_block_delta",
    index,
    delta: { type: "text_delta", text },
  },
});

const buildContentBlockStop = (index: number): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: `stop-${index}`,
  event: { type: "content_block_stop", index },
});

const buildMessageDelta = (stopReason: string): ClaudeStreamMessage => ({
  type: "stream_event",
  uuid: `message-delta-${stopReason}`,
  event: {
    type: "message_delta",
    delta: { stop_reason: stopReason },
  },
});

const buildAssistantTextMessage = (
  text: string,
  uuid: string
): ClaudeStreamMessage => ({
  type: "assistant",
  uuid,
  message: {
    id: `msg-${uuid}`,
    content: [{ type: "text", text } as never],
  },
});

test("ClaudeStreamEventRouter emits live assistant text segment when text_delta crosses flush threshold", async () => {
  const handler = new ClaudeContentStreamHandler(
    new ClaudeThinkingLiveBuffer(),
    new ClaudeTextLiveBuffer()
  );
  const router = new ClaudeStreamEventRouter(undefined, undefined, handler);
  const session = createSession("session-text-flush");
  const emissions = collectAssistantEmissions(session);

  await router.handleStreamEvent(session, buildTextBlockStart(0));

  // First delta is short enough to stay buffered below the 96-char threshold.
  const part1 = "I'll start by ";
  // Second delta pushes the tail past the flush boundary and ends on a period.
  const part2 =
    "reading the questionnaire and drafting the description. Then I will run the build.";

  await router.handleStreamEvent(session, buildTextDelta(0, part1, "1"));
  assert.equal(
    emissions.length,
    0,
    "first short delta should not flush live segment"
  );

  await router.handleStreamEvent(session, buildTextDelta(0, part2, "2"));
  assert.equal(
    emissions.length >= 1,
    true,
    "second delta should flush live segment"
  );
  const combined = emissions.map((e) => e.content).join("");
  assert.equal(combined.includes("reading the questionnaire"), true);
  assert.equal(
    emissions[0].metadata?.live,
    true,
    "live assistant emission must carry live=true in metadata"
  );
  assert.equal(
    emissions[0].tag,
    "live",
    "live assistant emission must carry tag='live' so Core forwards it into SessionMessage.tag for UI merge"
  );
});

test("ClaudeStreamEventRouter flushes remaining text tail on content_block_stop for text block", async () => {
  const buffer = new ClaudeTextLiveBuffer();
  const handler = new ClaudeContentStreamHandler(
    new ClaudeThinkingLiveBuffer(),
    buffer
  );
  const router = new ClaudeStreamEventRouter(undefined, undefined, handler);
  const session = createSession("session-text-tail");
  const emissions = collectAssistantEmissions(session);

  await router.handleStreamEvent(session, buildTextBlockStart(0));
  await router.handleStreamEvent(
    session,
    buildTextDelta(0, "short tail under threshold", "tail")
  );
  assert.equal(emissions.length, 0, "short delta stays buffered");

  await router.handleStreamEvent(session, buildContentBlockStop(0));
  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].content, "short tail under threshold");
});

test("ClaudeStreamEventRouter ignores non-text_delta fragments on a text block", async () => {
  const buffer = new ClaudeTextLiveBuffer();
  const handler = new ClaudeContentStreamHandler(
    new ClaudeThinkingLiveBuffer(),
    buffer
  );
  const router = new ClaudeStreamEventRouter(undefined, undefined, handler);
  const session = createSession("session-text-noise");
  const emissions = collectAssistantEmissions(session);

  await router.handleStreamEvent(session, buildTextBlockStart(0));
  // input_json_delta during a text block must not feed the text buffer.
  await router.handleStreamEvent(session, {
    type: "stream_event",
    uuid: "noise",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: '{"x":1}' },
    },
  });
  await router.handleStreamEvent(session, buildContentBlockStop(0));

  assert.deepEqual(emissions, []);
  assert.equal(buffer.hasAccumulatedContent("session-text-noise"), false);
});

test("ClaudeStreamEventRouter emits only unseen tail when final assistant text supersedes live materialized text", async () => {
  const buffer = new ClaudeTextLiveBuffer();
  const handler = new ClaudeContentStreamHandler(
    new ClaudeThinkingLiveBuffer(),
    buffer
  );
  const router = new ClaudeStreamEventRouter(undefined, undefined, handler);
  const session = createSession("session-text-superset");
  const emissions = collectAssistantEmissions(session);

  await router.handleStreamEvent(session, buildTextBlockStart(0));
  const livePart =
    "I'll read the questionnaire and prepare a draft description. " +
    "Then I will verify the build succeeds.\n";
  await router.handleStreamEvent(session, buildTextDelta(0, livePart, "1"));
  await router.handleStreamEvent(session, buildContentBlockStop(0));
  const liveCount = emissions.length;
  assert.equal(liveCount > 0, true, "live path should have emitted");

  const finalText = `${livePart}Closing summary: description created successfully.`;
  await router.handleAssistantMessage(
    session,
    buildAssistantTextMessage(finalText, "final-text-1")
  );

  const finalEmissions = emissions.slice(liveCount);
  assert.equal(finalEmissions.length, 1);
  assert.equal(
    finalEmissions[0].content.includes("Closing summary"),
    true,
    "final emission should carry unseen tail"
  );
  assert.equal(
    finalEmissions[0].content.includes("questionnaire"),
    false,
    "already-materialized text must not reappear"
  );
});

test("ClaudeStreamEventRouter falls back to full assembled text when no live delta path ran", async () => {
  const buffer = new ClaudeTextLiveBuffer();
  const handler = new ClaudeContentStreamHandler(
    new ClaudeThinkingLiveBuffer(),
    buffer
  );
  const router = new ClaudeStreamEventRouter(undefined, undefined, handler);
  const session = createSession("session-text-nolive");
  const emissions = collectAssistantEmissions(session);

  const finalText = "Single end-turn assistant reply with no streaming.";
  await router.handleAssistantMessage(
    session,
    buildAssistantTextMessage(finalText, "final-text-2")
  );
  // Legacy path pends the text until a terminal message_stop arrives.
  await router.handleStreamEvent(session, {
    type: "stream_event",
    uuid: "legacy-stop",
    event: { type: "message_stop" },
  });

  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].content, finalText);
});

test("ClaudeStreamEventRouter emits full canonical text when assembled diverges from live draft", async () => {
  const buffer = new ClaudeTextLiveBuffer();
  const handler = new ClaudeContentStreamHandler(
    new ClaudeThinkingLiveBuffer(),
    buffer
  );
  const router = new ClaudeStreamEventRouter(undefined, undefined, handler);
  const session = createSession("session-text-diverge");
  const emissions = collectAssistantEmissions(session);

  await router.handleStreamEvent(session, buildTextBlockStart(0));
  const livePart =
    "Initial draft that the model later rewrote entirely before committing. " +
    "Unrelated sentence to cross threshold.\n";
  await router.handleStreamEvent(session, buildTextDelta(0, livePart, "div"));
  await router.handleStreamEvent(session, buildContentBlockStop(0));
  const liveCount = emissions.length;

  const finalText = "Different canonical assistant text unrelated to draft.";
  await router.handleAssistantMessage(
    session,
    buildAssistantTextMessage(finalText, "final-text-3")
  );

  const finalEmissions = emissions.slice(liveCount);
  assert.equal(finalEmissions.length, 1);
  assert.equal(finalEmissions[0].content, finalText);
});

test("ClaudeStreamEventRouter suppresses localized live pre-tool text until it can emit it as thinking", async () => {
  const handler = new ClaudeContentStreamHandler(
    new ClaudeThinkingLiveBuffer(),
    new ClaudeTextLiveBuffer()
  );
  const router = new ClaudeStreamEventRouter(
    undefined,
    {
      translateReasoning: (text: string) => Promise.resolve(text),
      translateUserFacingText: () => Promise.resolve(null),
    },
    handler
  );
  const session = createSession("session-localized-tool-use", "ru");
  const assistantEmissions = collectAssistantEmissions(session);
  const thinkingEmissions = collectThinkingEmissions(session);
  const preToolText =
    "I've read the Final_Description.md. The workspace has description/ and continuity/ set up, but virtual_simulation/ directory does not exist yet and there's no existing virtual-simulation.md. Let me create the directory and the first draft of the document.";

  await router.handleStreamEvent(session, buildTextBlockStart(0));
  await router.handleStreamEvent(
    session,
    buildTextDelta(0, preToolText, "localized-pretool")
  );
  assert.equal(
    assistantEmissions.length,
    0,
    "localized pre-tool text must not materialize as assistant/live before classification"
  );

  await router.handleStreamEvent(session, buildContentBlockStop(0));
  assert.equal(
    assistantEmissions.length,
    0,
    "content_block_stop must keep suppressed pre-tool text off the assistant path"
  );

  await router.handleStreamEvent(session, buildMessageDelta("tool_use"));
  assert.equal(
    assistantEmissions.length,
    0,
    "tool_use preamble must not produce assistant bubbles"
  );
  assert.equal(thinkingEmissions.length, 1);
  assert.equal(thinkingEmissions[0].content, preToolText);
});
