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

const createInterruptibleErrorIterator = (
  error: Error
): AsyncIterableIterator<ClaudeStreamMessage> & {
  interrupt?: () => Promise<void>;
} => {
  let released = false;
  let done = false;
  let resolver: (() => void) | null = null;
  return {
    next: async () => {
      if (done) {
        return { done: true, value: undefined };
      }
      if (!released) {
        await new Promise<void>((resolve) => {
          resolver = resolve;
        });
      }
      done = true;
      throw error;
    },
    return: () => {
      done = true;
      return Promise.resolve({ done: true, value: undefined });
    },
    throw: (cause?: unknown) => {
      done = true;
      return Promise.reject(cause);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    interrupt: () => {
      released = true;
      resolver?.();
      return Promise.resolve();
    },
  };
};

const waitForQueueDrain = async (session: ActiveSession): Promise<void> => {
  if (session.processingLoop) {
    await session.processingLoop;
  }
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
};

const collectMessageEvents = (session: ActiveSession): void => {
  session.eventEmitter.on("message", () => {
    // noop: stop suite asserts only error channel events.
  });
};

const collectErrorEvents = (
  session: ActiveSession
): Record<string, unknown>[] => {
  const events: Record<string, unknown>[] = [];
  session.eventEmitter.on("error", (payload: unknown) => {
    if (isRecord(payload)) {
      events.push(payload);
    }
  });
  return events;
};

test("SDKMessageProcessor emits processing error on active stream failure", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-processing-error-channel",
    NOOP_LOGGER
  );
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-processing-error-channel",
  });
  collectMessageEvents(session);
  const errorEvents = collectErrorEvents(session);

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

  assert.deepEqual(
    errorEvents.map((event) => event.type),
    ["processing"]
  );
});

test("SDKMessageProcessor suppresses late error emission after session shutdown interrupt", async () => {
  const sessionManager = new SDKSessionManager();
  const { tempId, session } = sessionManager.createSession(
    "/tmp/claude-test-shutdown-interrupt",
    NOOP_LOGGER
  );
  const processor = new SDKMessageProcessor(sessionManager, {
    projectPath: "/tmp/claude-test-shutdown-interrupt",
  });
  collectMessageEvents(session);
  const errorEvents = collectErrorEvents(session);
  const iterator = createInterruptibleErrorIterator(
    new Error("interrupted by stop")
  );

  processor.enqueueTurn(
    tempId,
    { content: "stop-me", internal: false, enqueuedAt: Date.now() },
    {
      createIterator: () => iterator,
      onRealSessionId: () => {
        // noop
      },
    }
  );

  await sessionManager.closeSession(tempId);
  await waitForQueueDrain(session);

  assert.deepEqual(errorEvents, []);
});
