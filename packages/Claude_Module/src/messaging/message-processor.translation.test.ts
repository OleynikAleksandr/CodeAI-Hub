import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { applyClaudeTurnRuntimeConfig } from "../provider/claude-applied-turn-config";
import { SDKSessionManager } from "../session/session-manager";
import type { ActiveSession, SessionLogger } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { SDKMessageProcessor } from "./message-processor";

const NOOP_LOGGER: SessionLogger = {
  start: () => {
    // noop
  },
  end: () => {
    // noop
  },
  logUserInput: () => {
    // noop
  },
  logSDKMessage: () => {
    // noop
  },
};

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

test("applyClaudeTurnRuntimeConfig stores messages-for-user language", () => {
  const sessionManager = new SDKSessionManager();
  const { session } = sessionManager.createSession(
    "/tmp/claude-test-language-runtime-config",
    NOOP_LOGGER
  );

  applyClaudeTurnRuntimeConfig({
    owner: session,
    turnOptions: {
      __codeaiAppliedTurnConfig: {
        providerId: "claudeCodeCli",
        messagesForTheUserLanguage: "ru",
        reasoningEffort: "high",
        thinkingEnabled: true,
        thinkingDisplaySyncEnabled: true,
      },
    },
  });

  assert.equal(session.runtimeTurnConfig.messagesForTheUserLanguage, "ru");
  assert.equal(session.runtimeTurnConfig.reasoningEffort, "high");
  assert.equal(session.runtimeTurnConfig.thinkingEnabled, true);
  assert.equal(session.runtimeTurnConfig.thinkingDisplaySyncEnabled, true);
});

test("SDKMessageProcessor translates Claude thinking bubbles to user language", async () => {
  const translationCalls: string[] = [];
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-thinking-translation",
    NOOP_LOGGER
  );
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-thinking-translation",
    thoughtTranslator: {
      translateReasoning: (text: string, targetLanguage?: string) => {
        translationCalls.push(`${targetLanguage ?? ""}:${text}`);
        return Promise.resolve("Сначала нужно прочитать анкету");
      },
      translateUserFacingText: () => Promise.resolve(null),
    },
  });
  const events = collectMessageEvents(session);

  processor.enqueueTurn(
    tempId,
    { content: "thinking", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () =>
        createIterator([
          {
            type: "assistant",
            session_id: "real-session-thinking-translation",
            message: {
              content: [
                {
                  type: "thinking",
                  thinking: "Need to read the questionnaire first",
                },
              ],
            },
          },
          { type: "result", session_id: "real-session-thinking-translation" },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  assert.deepEqual(translationCalls, [
    "ru:Need to read the questionnaire first",
  ]);
  assert.equal(
    events.some(
      (event) =>
        event.type === "dialog_message" &&
        event.role === "assistant" &&
        event.tag === "thinking" &&
        event.content === "Сначала нужно прочитать анкету"
    ),
    true
  );
});

test("SDKMessageProcessor translates Claude pre-tool assistant text to user language", async () => {
  const translationCalls: string[] = [];
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-pretool-translation",
    NOOP_LOGGER
  );
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-pretool-translation",
    thoughtTranslator: {
      translateReasoning: () => Promise.resolve(null),
      translateUserFacingText: (text: string, targetLanguage?: string) => {
        translationCalls.push(`${targetLanguage ?? ""}:${text}`);
        return Promise.resolve("Сейчас проверю, существует ли целевой файл");
      },
    },
  });
  const events = collectMessageEvents(session);

  processor.enqueueTurn(
    tempId,
    { content: "diagram-modules", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () =>
        createIterator([
          {
            type: "assistant",
            session_id: "real-session-pretool-translation",
            message: {
              id: "msg-pretool",
              content: [
                {
                  type: "text",
                  text: "Now let me check if the target file already exists:",
                },
              ],
            },
          },
          {
            type: "stream_event",
            session_id: "real-session-pretool-translation",
            event: {
              type: "message_delta",
              delta: { stop_reason: "tool_use" },
            },
          },
          { type: "result", session_id: "real-session-pretool-translation" },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  assert.deepEqual(translationCalls, [
    "ru:Now let me check if the target file already exists:",
  ]);
  assert.equal(
    events.some(
      (event) =>
        event.type === "assistant" &&
        event.content === "Сейчас проверю, существует ли целевой файл"
    ),
    true
  );
});

test("SDKMessageProcessor keeps Claude same-message tool-use text under thinking", async () => {
  const reasoningCalls: string[] = [];
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-thinking-text-classification",
    NOOP_LOGGER
  );
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-thinking-text-classification",
    thoughtTranslator: {
      translateReasoning: (text: string, targetLanguage?: string) => {
        reasoningCalls.push(`${targetLanguage ?? ""}:${text}`);
        if (text === "Let me inspect the workspace state first.") {
          return Promise.resolve("Сначала проверю состояние workspace.");
        }
        return Promise.resolve("Сначала читаю анкету.");
      },
      translateUserFacingText: () =>
        Promise.resolve("Этого перевода быть не должно"),
    },
  });
  const events = collectMessageEvents(session);

  processor.enqueueTurn(
    tempId,
    { content: "description", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () =>
        createIterator([
          {
            type: "assistant",
            session_id: "real-session-thinking-text-classification",
            message: {
              id: "msg-thinking-text",
              content: [
                {
                  type: "thinking",
                  thinking: "Need to read the questionnaire first.",
                },
              ],
            },
          },
          {
            type: "assistant",
            session_id: "real-session-thinking-text-classification",
            message: {
              id: "msg-thinking-text",
              content: [
                {
                  type: "text",
                  text: "Let me inspect the workspace state first.",
                },
              ],
            },
          },
          {
            type: "stream_event",
            session_id: "real-session-thinking-text-classification",
            event: {
              type: "message_delta",
              delta: { stop_reason: "tool_use" },
            },
          },
          {
            type: "result",
            session_id: "real-session-thinking-text-classification",
          },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  assert.deepEqual(reasoningCalls, [
    "ru:Need to read the questionnaire first.",
    "ru:Let me inspect the workspace state first.",
  ]);
  assert.equal(
    events.some(
      (event) =>
        event.type === "dialog_message" &&
        event.role === "assistant" &&
        event.tag === "thinking" &&
        event.content === "Сначала проверю состояние workspace."
    ),
    true
  );
  assert.equal(
    events.some(
      (event) =>
        event.type === "assistant" &&
        event.content === "Этого перевода быть не должно"
    ),
    false
  );
});

test("SDKMessageProcessor keeps end_turn Claude assistant text untouched", async () => {
  const translationCalls: string[] = [];
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-end-turn-assistant-text",
    NOOP_LOGGER
  );
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-end-turn-assistant-text",
    thoughtTranslator: {
      translateReasoning: () => Promise.resolve(null),
      translateUserFacingText: (text: string, targetLanguage?: string) => {
        translationCalls.push(`${targetLanguage ?? ""}:${text}`);
        return Promise.resolve("translated");
      },
    },
  });
  const events = collectMessageEvents(session);
  const finalReply = "Файл `product-parts.index.md` создан.";

  processor.enqueueTurn(
    tempId,
    { content: "diagram-modules", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () =>
        createIterator([
          {
            type: "assistant",
            session_id: "real-session-end-turn-text",
            message: {
              id: "msg-final",
              content: [{ type: "text", text: finalReply }],
            },
          },
          {
            type: "stream_event",
            session_id: "real-session-end-turn-text",
            event: {
              type: "message_delta",
              delta: { stop_reason: "end_turn" },
            },
          },
          { type: "result", session_id: "real-session-end-turn-text" },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  assert.deepEqual(translationCalls, []);
  assert.equal(
    events.some(
      (event) => event.type === "assistant" && event.content === finalReply
    ),
    true
  );
});

test("SDKMessageProcessor emits long Claude thinking in multiple dialog chunks", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-thinking-dialog-chunks",
    NOOP_LOGGER
  );
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-thinking-dialog-chunks",
    thoughtTranslator: {
      translateReasoning: () =>
        Promise.resolve(
          [
            "Первый блок размышления. ".repeat(40).trim(),
            "Второй блок размышления. ".repeat(38).trim(),
          ].join("\n\n")
        ),
      translateUserFacingText: () => Promise.resolve(null),
    },
  });
  const events = collectMessageEvents(session);

  processor.enqueueTurn(
    tempId,
    { content: "thinking", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () =>
        createIterator([
          {
            type: "assistant",
            session_id: "real-session-thinking-dialog-chunks",
            message: {
              content: [
                {
                  type: "thinking",
                  thinking: "Very long original thinking",
                },
              ],
            },
          },
          {
            type: "result",
            session_id: "real-session-thinking-dialog-chunks",
          },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  const thinkingEvents = events.filter(
    (event) =>
      event.type === "dialog_message" &&
      event.role === "assistant" &&
      event.tag === "thinking"
  );
  assert.equal(thinkingEvents.length > 1, true);
});
