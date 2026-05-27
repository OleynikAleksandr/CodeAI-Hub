import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";

const createActions = (sessionManager: SessionManager) => {
  const dialogMessages: Array<{
    readonly content: unknown;
    readonly role?: string;
  }> = [];
  const dispatchedUserMessages: string[] = [];
  const events: BridgeEvent[] = [];
  const actions = new SessionRequestHandlerSessionActions({
    appliedTurnConfig: {} as never,
    broadcaster: (event: BridgeEvent) => {
      events.push(event);
    },
    continuityLockService: { getContext: () => null } as never,
    continuityRolloverOrchestrator: {} as never,
    eventMessages: {
      appendCoreMessage: () => undefined,
      appendDialogMessage: (
        _sessionId: string,
        message: { readonly content: unknown; readonly role?: string }
      ) => {
        dialogMessages.push(message);
      },
      extractMessageContentAndTurnOptions: (payload: unknown) => {
        if (typeof payload === "string") {
          return { content: payload };
        }
        if (!payload || typeof payload !== "object") {
          return null;
        }
        const typed = payload as {
          readonly content?: unknown;
          readonly turnOptions?: unknown;
        };
        return typeof typed.content === "string"
          ? {
              content: typed.content,
              turnOptions:
                typed.turnOptions &&
                typeof typed.turnOptions === "object" &&
                !Array.isArray(typed.turnOptions)
                  ? (typed.turnOptions as Record<string, unknown>)
                  : undefined,
            }
          : null;
      },
    } as never,
    logger: new Logger("error"),
    messageDispatch: {
      dispatchUserMessage: (options: { readonly content: string }) => {
        dispatchedUserMessages.push(options.content);
        return Promise.resolve();
      },
    } as never,
    onProviderFailure: () => undefined,
    providerRegistry: {} as never,
    providerSessions: new Map(),
    resumeLifecycle: {
      clearPostTurnContextDecision: () => undefined,
      getSessionResumeLifecycleState: () => ({
        finalTurnCompleted: false,
        mode: "resume",
        terminalLockReason: null,
      }),
      hasPendingPostTurnContextDecision: () => false,
      updateSessionResumeLifecycleState: () => undefined,
    } as never,
    sessionManager,
    sessionStorage: {} as never,
    stopRebind: { ensureSessionReadyForSend: async () => true } as never,
  });
  return { actions, dialogMessages, dispatchedUserMessages, events };
};

test("managed review confirm action accepts the current gate without provider dispatch", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/workspace",
    "provider-session-1",
    {
      stage: "description",
    }
  );
  const reviewMessage = sessionManager.appendMessage(
    session.id,
    "system",
    "Core: Description перешёл в пользовательскую проверку.\nНажмите кнопку «Подтверждаю» ниже.",
    { tag: "managed-workflow-user-review" }
  );
  const harness = createActions(sessionManager);

  await harness.actions.handleMessage(session.id, {
    content: "ignored visible label",
    turnOptions: {
      managedReviewAction: {
        reviewMessageId: reviewMessage?.id,
        type: "confirm",
      },
    },
  });

  assert.deepEqual(harness.dispatchedUserMessages, []);
  assert.equal(harness.dialogMessages.at(-1)?.role, "user");
  assert.equal(harness.dialogMessages.at(-1)?.content, "подтверждаю");
  assert.deepEqual(harness.events, []);
});

test("managed review confirm action rejects stale gates without provider dispatch", async () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/workspace",
    "provider-session-1",
    {
      stage: "description",
    }
  );
  const staleReviewMessage = sessionManager.appendMessage(
    session.id,
    "system",
    "Core: Description перешёл в пользовательскую проверку.",
    { tag: "managed-workflow-user-review" }
  );
  sessionManager.appendMessage(session.id, "user", "later user text");
  const harness = createActions(sessionManager);

  await harness.actions.handleMessage(session.id, {
    content: "ignored visible label",
    turnOptions: {
      managedReviewAction: {
        reviewMessageId: staleReviewMessage?.id,
        type: "confirm",
      },
    },
  });

  assert.deepEqual(harness.dispatchedUserMessages, []);
  assert.deepEqual(harness.dialogMessages, []);
  assert.equal(eventsErrorCode(harness.events), "managed_review_gate_stale");
});

const eventsErrorCode = (events: readonly BridgeEvent[]): string | null => {
  const event = events.find((candidate) => candidate.type === "session:error");
  const payload = event?.payload;
  return typeof payload === "object" && payload !== null && "code" in payload
    ? String(payload.code)
    : null;
};
