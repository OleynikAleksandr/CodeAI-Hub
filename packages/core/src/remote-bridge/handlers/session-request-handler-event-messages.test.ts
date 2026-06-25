import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

const noop = (): void => {
  // Intentional test stub.
};

const WORKFLOW_BLOCKER_RE = /Git must be clean/u;

const flushAsync = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const assertThinkingTranslationRouting = async (params: {
  readonly expectedProviderId: string;
  readonly modelId: string;
  readonly providerId: "glmOpenCode" | "kimiCode";
  readonly sessionPath: string;
}): Promise<void> => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    params.providerId,
    params.sessionPath,
    "provider-session-id"
  );
  sessionManager.setModelBinding(session.id, {
    boundAt: "2026-06-16T07:19:31.139Z",
    key: `session:${params.expectedProviderId}-workflow-settings-path`,
    modelId: params.modelId,
    providerId: params.providerId,
    settingsPath: "/tmp/workflow/runtime/settings/settings.json",
    source: "start_step_selection",
    updatedAt: "2026-06-16T07:19:31.139Z",
  });

  let displayStateArgs: readonly unknown[] = [];
  const translatedCandidates: Array<{
    readonly providerId?: string;
    readonly role: string;
    readonly settingsPath?: string;
    readonly tag?: string;
  }> = [];
  const captureDisplayStateArgs = (candidate: {
    readonly providerId?: string;
    readonly settingsPath?: string;
  }) => {
    displayStateArgs = [candidate.providerId, candidate.settingsPath];
    return { translationState: "pending", visibilityAtEmission: "visible" };
  };
  const captureTranslationCandidate = (
    candidate: (typeof translatedCandidates)[number]
  ): Promise<null> => {
    translatedCandidates.push(candidate);
    return Promise.resolve(null);
  };
  const handler = new SessionRequestHandlerEventMessages({
    broadcaster: noop,
    continuityRootBySessionId: new Map([[session.id, "dialog-1"]]),
    logger: { error: noop, info: noop, warn: noop } as never,
    sessionManager,
    sessionStorage: {
      appendMessage: () => Promise.resolve(),
      appendMessageTranslation: () => Promise.resolve(),
    } as never,
    sessionTranslation: {
      resolveThinkingDisplayState: captureDisplayStateArgs,
      shouldTranslateDialogMessage: (candidate: {
        readonly role: string;
        readonly tag?: string;
      }) => candidate.role === "thinking" || candidate.tag === "thinking",
      translateDialogMessage: captureTranslationCandidate,
    } as never,
  });

  handler.appendProviderMessage(session.id, "thinking", {
    content: "Reasoning text.",
    tag: "thinking",
  });
  await handler.waitForMessagePersistence(session.id);
  assert.deepEqual(displayStateArgs, [
    params.expectedProviderId,
    "/tmp/workflow/runtime/settings/settings.json",
  ]);
  assert.equal(translatedCandidates[0]?.providerId, params.expectedProviderId);
  assert.equal(translatedCandidates[0]?.role, "thinking");
  assert.equal(translatedCandidates[0]?.tag, "thinking");
  assert.equal(
    translatedCandidates[0]?.settingsPath,
    "/tmp/workflow/runtime/settings/settings.json"
  );
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
      resolveThinkingDisplayState: () => ({ visibilityAtEmission: "visible" }),
      shouldTranslateDialogMessage: () => false,
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
      resolveThinkingDisplayState: () => ({ visibilityAtEmission: "visible" }),
      shouldTranslateDialogMessage: (candidate: {
        readonly role: string;
        readonly tag?: string;
      }) => candidate.role === "thinking" || candidate.tag === "thinking",
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

test("SessionRequestHandlerEventMessages does not translate Core system messages", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codex",
    "/tmp/core-message-localization",
    "provider-session-id"
  );
  let translateCalls = 0;
  const handler = new SessionRequestHandlerEventMessages({
    broadcaster: noop,
    continuityRootBySessionId: new Map([[session.id, "dialog-1"]]),
    logger: {
      error: noop,
      info: noop,
      warn: noop,
    } as never,
    sessionManager,
    sessionStorage: {
      appendMessage: () => Promise.resolve(),
      appendMessageTranslation: () => Promise.resolve(),
    } as never,
    sessionTranslation: {
      resolveThinkingDisplayState: () => ({ visibilityAtEmission: "visible" }),
      shouldTranslateDialogMessage: () => false,
      translateDialogMessage: () => {
        translateCalls += 1;
        return Promise.resolve(null);
      },
    } as never,
  });

  handler.appendCoreMessage(session.id, {
    content: "Core accepted the current artifact.",
    tag: "managed-workflow-continuation",
  });

  await handler.waitForMessagePersistence(session.id);

  assert.equal(
    session.messages[0]?.content,
    "Core accepted the current artifact."
  );
  assert.equal(translateCalls, 0);
});

test("SessionRequestHandlerEventMessages does not queue translation for workflow validation blockers", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codex",
    "/tmp/core-workflow-blocker-localization",
    "provider-session-id"
  );
  const translatedTags: Array<string | undefined> = [];
  const handler = new SessionRequestHandlerEventMessages({
    broadcaster: noop,
    continuityRootBySessionId: new Map([[session.id, "dialog-1"]]),
    logger: {
      error: noop,
      info: noop,
      warn: noop,
    } as never,
    sessionManager,
    sessionStorage: {
      appendMessage: () => Promise.resolve(),
      appendMessageTranslation: () => Promise.resolve(),
    } as never,
    sessionTranslation: {
      resolveThinkingDisplayState: () => ({ visibilityAtEmission: "visible" }),
      shouldTranslateDialogMessage: () => false,
      translateDialogMessage: (candidate: { readonly tag?: string }) => {
        translatedTags.push(candidate.tag);
        return Promise.resolve(null);
      },
    } as never,
  });

  handler.appendCoreMessage(session.id, {
    content:
      "The next workflow step remains blocked because Git must be clean first.",
    tag: "managed-workflow-validation",
  });

  await handler.waitForMessagePersistence(session.id);

  assert.deepEqual(translatedTags, []);
  assert.match(session.messages[0]?.content ?? "", WORKFLOW_BLOCKER_RE);
});

test("SessionRequestHandlerEventMessages passes workflow settings path for Kimi thinking translation", async () => {
  await assertThinkingTranslationRouting({
    expectedProviderId: "kimi",
    modelId: "kimi-for-coding",
    providerId: "kimiCode",
    sessionPath: "/tmp/kimi-workflow-settings-path",
  });
});

test("SessionRequestHandlerEventMessages passes workflow settings path for OpenCode thinking translation", async () => {
  await assertThinkingTranslationRouting({
    expectedProviderId: "glmOpenCode",
    modelId: "zai-coding-plan/glm-5.2",
    providerId: "glmOpenCode",
    sessionPath: "/tmp/opencode-workflow-settings-path",
  });
});
