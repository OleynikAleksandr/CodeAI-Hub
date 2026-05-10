import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { recognizeManagedContractAcceptancePhrase } from "./managed-workflow-post-turn-service";
import { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

const noop = (): void => {
  // Intentional test stub.
};

const flushAsync = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

test("SessionRequestHandlerEventMessages normalizes assistant content before persistence and broadcast", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codex",
    "/tmp/thinking-formatting",
    "provider-session-id"
  );
  const storedMessages: Array<{ readonly content: string }> = [];
  const broadcasts: unknown[] = [];
  const handler = new SessionRequestHandlerEventMessages({
    broadcaster: (event) => {
      broadcasts.push(event);
    },
    continuityRootBySessionId: new Map([[session.id, "dialog-1"]]),
    logger: {
      error: noop,
      info: noop,
      warn: noop,
    } as never,
    sessionManager,
    sessionStorage: {
      appendMessage: (
        _sessionId: string,
        message: { readonly content: string }
      ) => {
        storedMessages.push(message);
        return Promise.resolve();
      },
      appendMessageTranslation: () => Promise.resolve(),
    } as never,
    sessionTranslation: {
      resolveThinkingVisibilityForProvider: () => true,
      translateDialogMessage: async () => null,
    } as never,
  });

  handler.appendProviderMessage(session.id, "assistant", {
    content: "Context.**Clarifying Project Manager term**\n\nI need details.",
    timestamp: "2026-04-19T18:11:00.000Z",
  });

  await flushAsync();

  assert.equal(session.messages.length, 1);
  assert.equal(
    session.messages[0]?.content,
    "Context.\n\n**Clarifying Project Manager term**\n\nI need details."
  );
  assert.equal(
    storedMessages[0]?.content,
    "Context.\n\n**Clarifying Project Manager term**\n\nI need details."
  );
  assert.equal(broadcasts.length >= 2, true);
});

test("SessionRequestHandlerEventMessages preserves append order during async persistence", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "claude",
    "/tmp/deferred-feedback-order",
    "provider-session-id"
  );
  const releaseFirstPersist: { current?: () => void } = {};
  const storedMessages: string[] = [];
  const broadcastMessages: string[] = [];
  const handler = new SessionRequestHandlerEventMessages({
    broadcaster: (event) => {
      if ((event as { type?: string }).type !== "session:message") {
        return;
      }
      const content = (event as { payload?: { readonly content?: unknown } })
        .payload?.content;
      if (typeof content === "string") {
        broadcastMessages.push(content);
      }
    },
    continuityRootBySessionId: new Map([[session.id, "dialog-1"]]),
    logger: {
      error: noop,
      info: noop,
      warn: noop,
    } as never,
    sessionManager,
    sessionStorage: {
      appendMessage: (
        _sessionId: string,
        message: { readonly content: string }
      ) => {
        storedMessages.push(message.content);
        if (storedMessages.length === 1) {
          return new Promise<void>((resolve) => {
            releaseFirstPersist.current = resolve;
          });
        }
        return Promise.resolve();
      },
      appendMessageTranslation: () => Promise.resolve(),
    } as never,
    sessionTranslation: {
      resolveThinkingVisibilityForProvider: () => true,
      translateDialogMessage: async () => null,
    } as never,
  });

  handler.appendDialogMessage(session.id, {
    content: "Core acceptance check failed for Diagram Modules.",
    role: "user",
  });
  handler.appendProviderMessage(session.id, "thinking", {
    content: "Reading the Core feedback.",
  });

  await flushAsync();

  assert.deepEqual(storedMessages, [
    "Core acceptance check failed for Diagram Modules.",
  ]);
  assert.deepEqual(broadcastMessages, []);

  assert.notEqual(releaseFirstPersist.current, undefined);
  releaseFirstPersist.current?.();
  await flushAsync();

  assert.deepEqual(storedMessages, [
    "Core acceptance check failed for Diagram Modules.",
    "Reading the Core feedback.",
  ]);
  assert.deepEqual(broadcastMessages, [
    "Core acceptance check failed for Diagram Modules.",
    "Reading the Core feedback.",
  ]);
});

test("recognizeManagedContractAcceptancePhrase matches the three accepted phrases under whitespace and case normalization", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Подтверждаю контракт"),
    "Подтверждаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("  Принимаю   контракт  "),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("утверждаю контракт"),
    "Утверждаю контракт"
  );
});

test("recognizeManagedContractAcceptancePhrase returns null for non-matching messages", () => {
  assert.equal(recognizeManagedContractAcceptancePhrase(""), null);
  assert.equal(recognizeManagedContractAcceptancePhrase("   "), null);
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю эту правку"),
    null
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Подтверждаю контракт детально"),
    null
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase(
      "обычное пользовательское сообщение"
    ),
    null
  );
});
