import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
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
  messages: readonly ClaudeStreamMessage[],
  error?: Error
): AsyncIterableIterator<ClaudeStreamMessage> => {
  const iterator = async function* generate() {
    for (const message of messages) {
      await Promise.resolve();
      yield message;
    }
    if (error) {
      await Promise.resolve();
      throw error;
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
    // noop: tests assert lifecycle events, not error channel delivery.
  });
  session.eventEmitter.on("message", (payload: unknown) => {
    if (isRecord(payload)) {
      events.push(payload);
    }
  });
  return events;
};

test("SDKMessageProcessor processes queued turns in FIFO order", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test",
    NOOP_LOGGER
  );
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test",
  });
  const events = collectMessageEvents(session);

  const iterators = [
    createIterator([
      {
        type: "assistant",
        session_id: "real-session-1",
        message: {
          content: [{ type: "text", text: "first-response" }],
        },
      },
      { type: "result", session_id: "real-session-1" },
    ]),
    createIterator([
      {
        type: "assistant",
        session_id: "real-session-1",
        message: {
          content: [{ type: "text", text: "second-response" }],
        },
      },
      { type: "result", session_id: "real-session-1" },
    ]),
  ];

  processor.enqueueTurn(
    tempId,
    { content: "first", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () => {
        const next = iterators.shift();
        if (!next) {
          throw new Error("Missing iterator for queued turn");
        }
        return next;
      },
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  processor.enqueueTurn(
    tempId,
    { content: "second", internal: false, enqueuedAt: Date.now() + 1 },
    {
      createIterator: () => {
        const next = iterators.shift();
        if (!next) {
          throw new Error("Missing iterator for queued turn");
        }
        return next;
      },
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  const types = events.map((event) => event.type);
  assert.deepEqual(
    events
      .filter((event) => event.type === "user_input")
      .map((event) => event.content),
    ["first", "second"]
  );
  assert.equal(types.filter((type) => type === "turn_started").length, 2);
  assert.equal(types.filter((type) => type === "turn_completed").length, 2);
  assert.equal(types.filter((type) => type === "turn_failed").length, 0);
});

test("SDKMessageProcessor emits turn_failed exactly once on stream error", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-failure",
    NOOP_LOGGER
  );
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-failure",
  });
  const events = collectMessageEvents(session);

  processor.enqueueTurn(
    tempId,
    { content: "fail", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () => createIterator([], new Error("stream exploded")),
      onRealSessionId: () => {
        // noop
      },
    }
  );

  await waitForQueueDrain(session);

  const types = events.map((event) => event.type);
  assert.equal(types.filter((type) => type === "turn_started").length, 1);
  assert.equal(types.filter((type) => type === "turn_completed").length, 0);
  assert.equal(types.filter((type) => type === "turn_failed").length, 1);

  const failureEvent = events.find((event) => event.type === "turn_failed");
  assert.equal(failureEvent?.message, "stream exploded");
});

test("SDKMessageProcessor filters content_block_delta from sdk logger and keeps result logs", async () => {
  const loggedSDKEvents: { type: string; eventType: string | null }[] = [];
  const logger: SessionLogger = {
    start: () => {
      // noop
    },
    end: () => {
      // noop
    },
    logUserInput: () => {
      // noop
    },
    logSDKMessage: (type: string, payload: unknown) => {
      const eventType =
        isRecord(payload) && typeof payload.event === "object"
          ? ((payload.event as { readonly type?: unknown }).type ?? null)
          : null;
      loggedSDKEvents.push({
        type,
        eventType: typeof eventType === "string" ? eventType : null,
      });
    },
  };

  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-log-filter",
    logger
  );
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-log-filter",
  });

  processor.enqueueTurn(
    tempId,
    { content: "log-filter", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () =>
        createIterator([
          {
            type: "stream_event",
            session_id: "real-session-log-filter",
            event: { type: "content_block_delta", text: "..." },
          },
          { type: "result", session_id: "real-session-log-filter" },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  assert.equal(
    loggedSDKEvents.some(
      (event) =>
        event.type === "stream_event" &&
        event.eventType === "content_block_delta"
    ),
    false
  );
  assert.equal(
    loggedSDKEvents.some((event) => event.type === "result"),
    true
  );
});

test("SDKMessageProcessor does not derive tokenUsage from modelUsage fallback", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-no-model-usage-fallback",
    NOOP_LOGGER
  );
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-no-model-usage-fallback",
  });
  const events = collectMessageEvents(session);

  processor.enqueueTurn(
    tempId,
    { content: "trigger", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () =>
        createIterator([
          {
            type: "assistant",
            session_id: "real-session-no-fallback",
            message: { content: [{ type: "text", text: "ok" }] },
          },
          {
            type: "result",
            session_id: "real-session-no-fallback",
            modelUsage: {
              "claude-sonnet-4-6": {
                contextWindow: 200_000,
                inputTokens: 6,
                outputTokens: 15_572,
                cacheReadInputTokens: 116_451,
                cacheCreationInputTokens: 41_536,
              },
            },
          },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  const completed = events.find((event) => event.type === "turn_completed");
  assert.equal(Boolean(completed), true);
  assert.equal(Boolean(completed && "tokenUsage" in completed), false);
});

test("SDKMessageProcessor emits tagged assistant thinking bubbles when display sync is enabled", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-thinking-enabled",
    NOOP_LOGGER
  );
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-thinking-enabled",
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
            session_id: "real-session-thinking-enabled",
            message: {
              content: [{ type: "thinking", thinking: "internal reasoning" }],
            },
          },
          { type: "result", session_id: "real-session-thinking-enabled" },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  const thinkingEvent = events.find(
    (event) =>
      event.type === "dialog_message" &&
      event.role === "assistant" &&
      event.tag === "thinking"
  );
  assert.equal(Boolean(thinkingEvent), true);
  assert.equal(thinkingEvent?.content, "internal reasoning");
  assert.equal(
    events.filter((event) => event.type === "dialog_message").length,
    1
  );
  assert.equal(
    events.filter((event) => event.type === "turn_completed").length,
    1
  );
});

test("SDKMessageProcessor still emits Claude thinking bubbles when display sync is disabled", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-thinking-disabled",
    NOOP_LOGGER
  );
  session.runtimeTurnConfig.thinkingDisplaySyncEnabled = false;
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-thinking-disabled",
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
            session_id: "real-session-thinking-disabled",
            message: {
              content: [{ type: "thinking", thinking: "hidden reasoning" }],
            },
          },
          { type: "result", session_id: "real-session-thinking-disabled" },
        ]),
      onRealSessionId: ({ previousSessionId, realSessionId }) => {
        sessionManager.updateSessionId(previousSessionId, realSessionId);
      },
    }
  );

  await waitForQueueDrain(session);

  assert.equal(
    events.some(
      (event) =>
        event.type === "dialog_message" &&
        event.role === "assistant" &&
        event.tag === "thinking" &&
        event.content === "hidden reasoning"
    ),
    true
  );
  assert.equal(
    events.filter((event) => event.type === "turn_completed").length,
    1
  );
});
