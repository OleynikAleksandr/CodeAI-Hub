import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { ThreadEvent } from "@openai/codex-sdk";
import { DEFAULT_CODEX_RESPONSE_POLICY } from "../response-policy/response-policy-defaults";
import type { ActiveSession } from "../session/types";
import { CodexMessageFinishHandler } from "./codex-message-finish-handler";
import { CodexReasoningStreams } from "./codex-reasoning-streams";
import { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import { CodexStreamEventRouter } from "./codex-stream-event-router";
import { CodexTokenUsageSync } from "./codex-token-usage-sync";
import { CodexUsageSync } from "./codex-usage-sync";
import { StructuredOutputStreamController } from "./structured-output-stream-controller";

test("codex reasoning deltas emit unique stable message ids per visible chunk", async () => {
  const firstPass = await collectThinkingMessages();
  const secondPass = await collectThinkingMessages();

  assert.deepEqual(
    firstPass.map((message) => message.content),
    [
      "Inspecting the workspace state.",
      " Verifying persisted localization settings.",
      " Preparing the narrowest hotfix.",
    ]
  );
  assert.deepEqual(
    firstPass.map((message) => message.uuid),
    secondPass.map((message) => message.uuid)
  );
  assert.equal(firstPass.length, 3);
  assert.equal(new Set(firstPass.map((message) => message.uuid)).size, 3);
});

const collectThinkingMessages = async (): Promise<
  Array<{ content?: string; uuid?: string }>
> => {
  const session = createSession();
  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => events.push(payload));
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  await router.dispatchEvent(session, {
    type: "item.updated",
    item: {
      id: "reasoning-1",
      type: "reasoning",
      text: "Inspecting the workspace state.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.updated",
    item: {
      id: "reasoning-1",
      type: "reasoning",
      text: "Inspecting the workspace state. Verifying persisted localization settings.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "reasoning-1",
      type: "reasoning",
      text: "Inspecting the workspace state. Verifying persisted localization settings. Preparing the narrowest hotfix.",
    },
  } satisfies ThreadEvent);

  return events.filter(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { tag?: string }).tag === "thinking"
  ) as Array<{ content?: string; uuid?: string }>;
};

const createRouter = () => {
  const structuredOutput = new StructuredOutputStreamController();
  const reasoningStreams = new CodexReasoningStreams();
  const emitter = new CodexSessionEventEmitter();
  const finishHandler = new CodexMessageFinishHandler(
    structuredOutput,
    reasoningStreams,
    emitter,
    new CodexTokenUsageSync(),
    new CodexUsageSync()
  );
  const router = new CodexStreamEventRouter(
    {
      seedProviderSessionId: () => {
        // No-op for isolated router tests.
      },
      updateProviderSessionId: () => {
        // No-op for isolated router tests.
      },
    } as never,
    structuredOutput,
    reasoningStreams,
    emitter,
    finishHandler
  );
  return { router, structuredOutput };
};

const preparePassthroughTurn = (
  session: ActiveSession,
  structuredOutput: StructuredOutputStreamController
): void => {
  structuredOutput.prepareTurn(
    session.sessionId,
    {} as never,
    DEFAULT_CODEX_RESPONSE_POLICY
  );
  structuredOutput.startTurn(session.sessionId);
};

const createSession = (): ActiveSession => ({
  sessionId: "codex-session",
  workspacePath: "/tmp/workspace",
  createdAt: Date.now(),
  eventEmitter: new EventEmitter(),
  messageController: {
    pendingMessages: [],
    resolveNext: null,
  },
  logger: null,
  codexThreadId: "provider-session-1",
  internalTurn: false,
  runtimeTurnConfig: {
    thinkingDisplaySyncEnabled: true,
  },
  messagesForTheUserLanguage: "en",
});
