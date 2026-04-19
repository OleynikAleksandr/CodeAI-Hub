import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

const noop = (): void => {
  // Intentional test stub.
};

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

  await Promise.resolve();
  await Promise.resolve();

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
