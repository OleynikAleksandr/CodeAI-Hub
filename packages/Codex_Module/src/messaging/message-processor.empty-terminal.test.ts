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

test("codex restores a substantive assistant when reasoning tail ends with an empty terminal message", async () => {
  const session = createSessionWithThread({
    model: "gpt-5.4",
    modelReasoningEffort: "high",
  });
  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  const substantiveAssistant = [
    "Compiled the working draft and captured the key scenarios for the next step.",
    "",
    "1. Confirm the main desktop app remains the primary UI.",
    "2. Confirm the local runtime stays local-first for the mandatory flow.",
    "3. Confirm which AI providers are required in v1.",
  ].join("\n");

  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-substantive",
      type: "agent_message",
      text: substantiveAssistant,
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "reasoning-tail",
      type: "reasoning",
      text: "Checking whether one more state file needs verification.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-progress",
      type: "agent_message",
      text: "I will verify one more file before finishing.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.started",
    item: {
      id: "cmd-verify",
      type: "command_execution",
      command: "sed -n '1,20p' description-step.json",
      aggregated_output: "",
      status: "in_progress",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-empty-terminal",
      type: "agent_message",
      text: "",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      output_tokens: 1,
    },
  } satisfies ThreadEvent);

  const assistantMessages = events.filter(
    (event) => (event as { type?: string }).type === "assistant"
  ) as Array<{ content?: string }>;
  const thinkingMessages = events.filter(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { tag?: string }).tag === "thinking"
  ) as Array<{ content?: string }>;

  assert.equal(assistantMessages.length, 1);
  assert.equal(assistantMessages[0]?.content, substantiveAssistant);
  assert.ok(
    thinkingMessages.some(
      (message) =>
        message.content === "I will verify one more file before finishing."
    )
  );
});

const createRouter = (): {
  readonly router: CodexStreamEventRouter;
  readonly structuredOutput: StructuredOutputStreamController;
} => {
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

  return {
    router: new CodexStreamEventRouter(
      {
        getSession: () => undefined,
        updateSessionId: () => {
          // no-op
        },
      } as never,
      structuredOutput,
      reasoningStreams,
      emitter,
      finishHandler,
      undefined
    ),
    structuredOutput,
  };
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

const createSessionWithThread = (threadOptions: {
  readonly effectiveModelId?: string;
  readonly model?: string;
  readonly modelReasoningEffort?: string;
}): ActiveSession => ({
  sessionId: "codex-session",
  workspacePath: "/tmp/workspace",
  createdAt: Date.now(),
  eventEmitter: new EventEmitter(),
  messageController: {
    pendingMessages: [],
    resolveNext: null,
  },
  logger: null,
  codexThreadId: "codex-thread",
  internalTurn: false,
  runtimeTurnConfig: {
    thinkingDisplaySyncEnabled: true,
  },
  thread: {
    _threadOptions: threadOptions,
  } as never,
});
