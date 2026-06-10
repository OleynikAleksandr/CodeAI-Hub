import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { dispatchManagedInternalContinuation } from "./managed-internal-continuation-dispatch";

test("managed continuation dispatch uses a visible user turn when available", () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/managed-continuation-user-turn",
    "provider-session-1"
  );
  const userTurns: Array<{
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly messageTag?: string;
    readonly sessionId: string;
  }> = [];

  dispatchManagedInternalContinuation(
    {
      dispatchUserMessage: (options) => {
        userTurns.push({
          content: options.content,
          hiddenUserMessage: options.hiddenUserMessage,
          messageTag: options.messageTag,
          sessionId: options.sessionId,
        });
        return Promise.resolve();
      },
      sendInternalMessage: () => {
        throw new Error("sendInternalMessage should not be used");
      },
    },
    {
      content: "Core continuation prompt",
      session,
      sessionId: session.id,
    }
  );

  assert.deepEqual(userTurns, [
    {
      content: "Core continuation prompt",
      hiddenUserMessage: false,
      messageTag: "managed-workflow-continuation",
      sessionId: session.id,
    },
  ]);
});

test("managed continuation dispatch falls back to internal send without a session", () => {
  const internalMessages: string[] = [];

  dispatchManagedInternalContinuation(
    {
      sendInternalMessage: (sessionId, content) => {
        internalMessages.push(`${sessionId}:${content}`);
        return Promise.resolve();
      },
    },
    {
      content: "Fallback prompt",
      session: null,
      sessionId: "session-1",
    }
  );

  assert.deepEqual(internalMessages, ["session-1:Fallback prompt"]);
});

test("managed continuation dispatch retries a failed send once before succeeding", async () => {
  let attempts = 0;
  const failures: unknown[] = [];

  dispatchManagedInternalContinuation(
    {
      sendInternalMessage: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new Error("transient send failure"))
          : Promise.resolve();
      },
    },
    {
      content: "Retry prompt",
      onDeliveryFailure: (error) => failures.push(error),
      session: null,
      sessionId: "session-1",
    }
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(attempts, 2);
  assert.deepEqual(failures, []);
});

test("managed continuation dispatch reports delivery failure after retry exhaustion", async () => {
  let attempts = 0;
  const failures: string[] = [];

  dispatchManagedInternalContinuation(
    {
      sendInternalMessage: () => {
        attempts += 1;
        return Promise.reject(new Error("provider unavailable"));
      },
    },
    {
      content: "Failing prompt",
      onDeliveryFailure: (error) =>
        failures.push(error instanceof Error ? error.message : String(error)),
      session: null,
      sessionId: "session-1",
    }
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(attempts, 2);
  assert.deepEqual(failures, ["provider unavailable"]);
});
