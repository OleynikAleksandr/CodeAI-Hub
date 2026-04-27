import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { SDKSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { SDKMessageProcessor } from "./message-processor";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createIterator = (
  messages: readonly ClaudeStreamMessage[]
): AsyncIterableIterator<ClaudeStreamMessage> => {
  const iterator = async function* generate() {
    for (const message of messages) {
      await Promise.resolve();
      yield message;
    }
  };
  return iterator();
};

const waitForQueueDrain = async (session: ActiveSession): Promise<void> => {
  if (session.processingLoop) {
    await session.processingLoop;
  }
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
};

const collectMessageEvents = (
  session: ActiveSession
): Record<string, unknown>[] => {
  const events: Record<string, unknown>[] = [];
  session.eventEmitter.on("error", () => {
    // noop
  });
  session.eventEmitter.on("message", (payload: unknown) => {
    if (isRecord(payload)) {
      events.push(payload);
    }
  });
  return events;
};

test("SDKMessageProcessor routes localized live Claude pre-tool text through thinking translation", async () => {
  const reasoningCalls: string[] = [];
  const userFacingCalls: string[] = [];
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-live-pretool-thinking-translation"
  );
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-live-pretool-thinking-translation",
    thoughtTranslator: {
      translateReasoning: (text: string, targetLanguage?: string) => {
        reasoningCalls.push(`${targetLanguage ?? ""}:${text}`);
        return Promise.resolve(
          "Я уже прочитал Final_Description.md и сейчас создам директорию virtual_simulation."
        );
      },
      translateUserFacingText: (text: string, targetLanguage?: string) => {
        userFacingCalls.push(`${targetLanguage ?? ""}:${text}`);
        return Promise.resolve("Этого перевода быть не должно");
      },
    },
  });
  const events = collectMessageEvents(session);
  const livePreToolText =
    "I've read the Final_Description.md. The workspace has description/ and continuity/ set up, but virtual_simulation/ directory does not exist yet and there's no existing virtual-simulation.md. Let me create the directory and the first draft of the document.";

  processor.enqueueTurn(
    tempId,
    {
      content: "virtual-simulation",
      internal: false,
      enqueuedAt: Date.now(),
    },
    {
      createIterator: () =>
        createIterator([
          {
            type: "stream_event",
            session_id: "real-session-live-pretool-thinking-translation",
            uuid: "live-start",
            event: {
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            },
          },
          {
            type: "stream_event",
            session_id: "real-session-live-pretool-thinking-translation",
            uuid: "live-delta",
            event: {
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: livePreToolText },
            },
          },
          {
            type: "stream_event",
            session_id: "real-session-live-pretool-thinking-translation",
            uuid: "live-stop",
            event: {
              type: "content_block_stop",
              index: 0,
            },
          },
          {
            type: "stream_event",
            session_id: "real-session-live-pretool-thinking-translation",
            uuid: "live-message-delta",
            event: {
              type: "message_delta",
              delta: { stop_reason: "tool_use" },
            },
          },
          {
            type: "result",
            session_id: "real-session-live-pretool-thinking-translation",
          },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  assert.deepEqual(reasoningCalls, [`ru:${livePreToolText}`]);
  assert.deepEqual(userFacingCalls, []);
  assert.equal(
    events.some(
      (event) =>
        event.type === "dialog_message" &&
        event.role === "assistant" &&
        event.tag === "thinking" &&
        event.content ===
          "Я уже прочитал Final_Description.md и сейчас создам директорию virtual_simulation."
    ),
    true
  );
  assert.equal(
    events.some(
      (event) => event.type === "assistant" && event.content === livePreToolText
    ),
    false
  );
});
