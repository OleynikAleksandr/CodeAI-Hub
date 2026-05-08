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
  readonly type: "assistant";
}

interface ThinkingEmission {
  readonly content: string;
  readonly role: "assistant";
  readonly tag: "thinking";
  readonly type: "dialog_message";
}

const isAssistantEmission = (value: unknown): value is AssistantEmission =>
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
    if (isAssistantEmission(payload)) {
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

test("ClaudeStreamEventRouter suppresses micro assistant chunks but keeps real short status", async () => {
  const router = new ClaudeStreamEventRouter();
  const session = createSession("session-text-micro-filter");
  const emissions = collectAssistantEmissions(session);

  await router.handleAssistantMessage(
    session,
    buildAssistantTextMessage("ceptance.", "micro-final-word")
  );
  await router.handleStreamEvent(session, {
    type: "stream_event",
    uuid: "legacy-stop-micro-word",
    event: { type: "message_stop" },
  });

  await router.handleAssistantMessage(
    session,
    buildAssistantTextMessage("Core acceptance.", "micro-core-acceptance")
  );
  await router.handleStreamEvent(session, {
    type: "stream_event",
    uuid: "legacy-stop-micro-core",
    event: { type: "message_stop" },
  });

  await router.handleAssistantMessage(
    session,
    buildAssistantTextMessage("Готово.", "short-real-status")
  );
  await router.handleStreamEvent(session, {
    type: "stream_event",
    uuid: "legacy-stop-short-real",
    event: { type: "message_stop" },
  });

  assert.deepEqual(
    emissions.map((emission) => emission.content),
    ["Готово."]
  );
});

test("ClaudeStreamEventRouter suppresses punctuation-only and suffix thinking fallback chunks", async () => {
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
  const session = createSession("session-micro-thinking-fallback", "ru");
  const thinkingEmissions = collectThinkingEmissions(session);

  await router.handleStreamEvent(session, buildTextBlockStart(0));
  await router.handleStreamEvent(session, buildTextDelta(0, ".", "dot"));
  await router.handleStreamEvent(session, buildContentBlockStop(0));
  await router.handleStreamEvent(session, buildMessageDelta("tool_use"));

  await router.handleStreamEvent(session, buildTextBlockStart(1));
  await router.handleStreamEvent(
    session,
    buildTextDelta(1, "Ference.", "suffix")
  );
  await router.handleStreamEvent(session, buildContentBlockStop(1));
  await router.handleStreamEvent(session, buildMessageDelta("tool_use"));

  assert.deepEqual(thinkingEmissions, []);
});
