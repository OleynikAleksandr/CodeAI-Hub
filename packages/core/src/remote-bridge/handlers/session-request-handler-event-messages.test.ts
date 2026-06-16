import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { computeSessionMessageSourceHash } from "../../session-translation/session-message-source-hash";
import { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

const noop = (): void => {
  // Intentional test stub.
};

const WORKFLOW_BLOCKER_RE = /Git must be clean/u;

const flushAsync = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (predicate()) {
      return;
    }
    await flushAsync();
  }
  assert.equal(predicate(), true);
};

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

  let visibilityArgs: readonly unknown[] = [];
  const translatedCandidates: Array<{
    readonly providerId?: string;
    readonly role: string;
    readonly settingsPath?: string;
    readonly tag?: string;
  }> = [];
  const captureVisibilityArgs = (...args: readonly unknown[]): boolean => {
    visibilityArgs = args;
    return true;
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
      resolveThinkingVisibilityForProvider: captureVisibilityArgs,
      translateDialogMessage: captureTranslationCandidate,
    } as never,
  });

  handler.appendProviderMessage(session.id, "thinking", {
    content: "Reasoning text.",
    tag: "thinking",
  });
  await handler.waitForMessagePersistence(session.id);
  assert.deepEqual(visibilityArgs, [
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

test("SessionRequestHandlerEventMessages translates Core system messages through overlay without changing source content", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codex",
    "/tmp/core-message-localization",
    "provider-session-id"
  );
  const storedMessages: Array<{
    readonly content: string;
    readonly id: string;
  }> = [];
  const storedTranslations: Array<{
    readonly messageId: string;
    readonly sourceHash: string;
    readonly translatedContent: string;
  }> = [];
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
        message: { readonly content: string; readonly id: string }
      ) => {
        storedMessages.push(message);
        return Promise.resolve();
      },
      appendMessageTranslation: (
        _sessionId: string,
        translation: {
          readonly messageId: string;
          readonly sourceHash: string;
          readonly translatedContent: string;
        }
      ) => {
        storedTranslations.push(translation);
        return Promise.resolve();
      },
    } as never,
    sessionTranslation: {
      resolveThinkingVisibilityForProvider: () => true,
      translateDialogMessage: (candidate: {
        readonly content: string;
        readonly messageId: string;
        readonly role: string;
        readonly sessionId: string;
      }) => {
        assert.equal(candidate.role, "system");
        return Promise.resolve({
          messageId: candidate.messageId,
          sessionId: candidate.sessionId,
          sourceHash: computeSessionMessageSourceHash(candidate.content),
          targetLanguage: "ru",
          translatedContent: "Ядро приняло текущий артефакт.",
        });
      },
    } as never,
  });

  handler.appendCoreMessage(session.id, {
    content: "Core accepted the current artifact.",
    tag: "managed-workflow-continuation",
  });

  await waitFor(() => storedTranslations.length === 1);

  assert.equal(
    session.messages[0]?.content,
    "Core accepted the current artifact."
  );
  assert.equal(
    storedMessages[0]?.content,
    "Core accepted the current artifact."
  );
  assert.equal(storedTranslations[0]?.messageId, storedMessages[0]?.id);
  assert.equal(
    storedTranslations[0]?.translatedContent,
    "Ядро приняло текущий артефакт."
  );
  assert.equal(
    broadcasts.some(
      (event) =>
        (event as { type?: string }).type === "dialog:message_translation"
    ),
    true
  );
});

test("SessionRequestHandlerEventMessages waits for latest Core system translation", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codex",
    "/tmp/core-message-localization-tail",
    "provider-session-id"
  );
  const storedTranslations: string[] = [];
  let releaseTranslation: (() => void) | undefined;
  let resolveTranslationStarted: (() => void) | undefined;
  const translationStarted = new Promise<void>((resolve) => {
    resolveTranslationStarted = resolve;
  });
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
      appendMessageTranslation: (
        _sessionId: string,
        translation: { readonly translatedContent: string }
      ) => {
        storedTranslations.push(translation.translatedContent);
        return Promise.resolve();
      },
    } as never,
    sessionTranslation: {
      resolveThinkingVisibilityForProvider: () => true,
      translateDialogMessage: async () => {
        resolveTranslationStarted?.();
        await new Promise<void>((resolve) => {
          releaseTranslation = resolve;
        });
        return {
          messageId: session.messages[0]?.id ?? "message-1",
          sessionId: session.id,
          sourceHash: "hash",
          targetLanguage: "ru",
          translatedContent: "Последнее системное сообщение.",
        };
      },
    } as never,
  });

  handler.appendCoreMessage(session.id, {
    content: "Latest system message.",
  });

  const waitForPersistence = handler.waitForMessagePersistence(session.id);

  await translationStarted;
  await flushAsync();
  assert.deepEqual(storedTranslations, []);
  releaseTranslation?.();
  await waitForPersistence;
  assert.deepEqual(storedTranslations, ["Последнее системное сообщение."]);
});

test("SessionRequestHandlerEventMessages translates workflow validation blockers", async () => {
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
      resolveThinkingVisibilityForProvider: () => true,
      translateDialogMessage: (candidate: {
        readonly content: string;
        readonly messageId: string;
        readonly role: string;
        readonly sessionId: string;
        readonly tag?: string;
      }) => {
        translatedTags.push(candidate.tag);
        assert.equal(candidate.role, "system");
        assert.equal(candidate.tag, "managed-workflow-validation");
        assert.match(candidate.content, WORKFLOW_BLOCKER_RE);
        return Promise.resolve({
          messageId: candidate.messageId,
          sessionId: candidate.sessionId,
          sourceHash: computeSessionMessageSourceHash(candidate.content),
          targetLanguage: "ru",
          translatedContent: "Шаг заблокирован: Git должен быть чистым.",
        });
      },
    } as never,
  });

  handler.appendCoreMessage(session.id, {
    content:
      "The next workflow step remains blocked because Git must be clean first.",
    tag: "managed-workflow-validation",
  });

  await handler.waitForMessagePersistence(session.id);

  assert.deepEqual(translatedTags, ["managed-workflow-validation"]);
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
