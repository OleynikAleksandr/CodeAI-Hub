import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { ThreadEvent } from "@openai/codex-sdk";
import { DEFAULT_CODEX_RESPONSE_POLICY } from "../response-policy/response-policy-defaults";
import { CodexRolloutTailState } from "../rollout/codex-rollout-tail-state";
import type { ActiveSession } from "../session/types";
import { applyCodexTurnRuntimeConfig } from "./codex-applied-turn-config";
import { waitForNextResultWithIdlePulses } from "./codex-async-helpers";
import { CodexMessageFinishHandler } from "./codex-message-finish-handler";
import { CodexReasoningStreams } from "./codex-reasoning-streams";
import { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import { CodexStreamEventRouter } from "./codex-stream-event-router";
import { CodexTokenUsageSync } from "./codex-token-usage-sync";
import { CodexUsageSync } from "./codex-usage-sync";
import { StructuredOutputStreamController } from "./structured-output-stream-controller";

const STREAM_FAILED_RE = /stream failed/;

interface ThreadRuntimeState {
  readonly _threadOptions?: {
    readonly effectiveModelId?: string;
    readonly model?: string;
    readonly modelReasoningEffort?: string;
  };
}

test("waitForNextResultWithIdlePulses resolves without idle callback when next event is immediate", async () => {
  const idlePulses: number[] = [];

  const result = await waitForNextResultWithIdlePulses({
    nextPromise: Promise.resolve("done"),
    idleTimeoutMs: 10,
    onIdle: ({ idleCount }) => {
      idlePulses.push(idleCount);
    },
  });

  assert.equal(result, "done");
  assert.deepEqual(idlePulses, []);
});

test("waitForNextResultWithIdlePulses keeps waiting across idle pulses until an event arrives", async () => {
  const idlePulses: number[] = [];

  const result = await waitForNextResultWithIdlePulses({
    nextPromise: new Promise<string>((resolve) => {
      setTimeout(() => resolve("late-event"), 35);
    }),
    idleTimeoutMs: 10,
    onIdle: ({ idleCount }) => {
      idlePulses.push(idleCount);
    },
  });

  assert.equal(result, "late-event");
  assert.deepEqual(idlePulses, [1, 2, 3]);
});

test("waitForNextResultWithIdlePulses preserves generator failures", async () => {
  await assert.rejects(
    () =>
      waitForNextResultWithIdlePulses({
        nextPromise: Promise.reject(new Error("stream failed")),
        idleTimeoutMs: 10,
        onIdle: () => {
          // No-op: this branch should reject before any idle pulse matters.
        },
      }),
    STREAM_FAILED_RE
  );
});

test("applyCodexTurnRuntimeConfig mutates active thread model and strips internal payload", () => {
  const session = createSessionWithThread({
    model: "gpt-5.3-codex",
    modelReasoningEffort: "medium",
  });
  const outputSchema = { type: "object" };

  const turnOptions = applyCodexTurnRuntimeConfig(session, {
    outputSchema,
    __codeaiAppliedTurnConfig: {
      messagesForTheUserLanguage: "ru",
      providerId: "codexCli",
      modelId: "gpt-5.4",
      reasoningEffort: "high",
      source: "settings_snapshot",
      thinkingDisplaySyncEnabled: true,
    },
  } as never);

  assert.equal(
    (session.thread as unknown as ThreadRuntimeState)._threadOptions?.model,
    "gpt-5.4"
  );
  assert.equal(
    (session.thread as unknown as ThreadRuntimeState)._threadOptions
      ?.modelReasoningEffort,
    "high"
  );
  assert.equal(
    (session.thread as unknown as ThreadRuntimeState)._threadOptions
      ?.effectiveModelId,
    "gpt-5.4"
  );
  assert.equal(session.messagesForTheUserLanguage, "ru");
  assert.equal(session.runtimeTurnConfig?.messagesForTheUserLanguage, "ru");
  assert.equal(session.runtimeTurnConfig?.thinkingDisplaySyncEnabled, true);
  assert.deepEqual(turnOptions, { outputSchema });
});

test("applyCodexTurnRuntimeConfig preserves base model and updates effective identity for reasoning-only changes", () => {
  const session = createSessionWithThread({
    effectiveModelId: "gpt-5.3-codex reasoning:medium",
    model: "gpt-5.3-codex",
    modelReasoningEffort: "medium",
  });

  applyCodexTurnRuntimeConfig(session, {
    __codeaiAppliedTurnConfig: {
      providerId: "codexCli",
      baseModelId: "gpt-5.3-codex",
      effectiveModelId: "gpt-5.3-codex reasoning:xhigh",
      modelId: "gpt-5.3-codex reasoning:xhigh",
      reasoningEffort: "xhigh",
      source: "settings_snapshot",
    },
  } as never);

  assert.equal(
    (session.thread as unknown as ThreadRuntimeState)._threadOptions?.model,
    "gpt-5.3-codex"
  );
  assert.equal(
    (session.thread as unknown as ThreadRuntimeState)._threadOptions
      ?.modelReasoningEffort,
    "xhigh"
  );
  assert.equal(
    (session.thread as unknown as ThreadRuntimeState)._threadOptions
      ?.effectiveModelId,
    "gpt-5.3-codex reasoning:xhigh"
  );
});

test("applyCodexTurnRuntimeConfig ignores non-codex payloads", () => {
  const session = createSessionWithThread({
    model: "gpt-5.3-codex",
    modelReasoningEffort: "medium",
  });

  const turnOptions = applyCodexTurnRuntimeConfig(session, {
    __codeaiAppliedTurnConfig: {
      providerId: "geminiCli",
      modelId: "gemini-3-flash-preview",
      source: "settings_snapshot",
    },
  } as never);

  assert.equal(
    (session.thread as unknown as ThreadRuntimeState)._threadOptions?.model,
    "gpt-5.3-codex"
  );
  assert.equal(turnOptions, undefined);
});

test("codex intermediate completed agent_message becomes thinking when later item proves work continues", async () => {
  const session = createSessionWithThread({
    model: "gpt-5.3-codex",
    modelReasoningEffort: "medium",
  });
  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-progress",
      type: "agent_message",
      text: "Checking workspace state before the next tool call.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.started",
    item: {
      id: "cmd-1",
      type: "command_execution",
      command: "pwd",
      aggregated_output: "",
      status: "in_progress",
    },
  } satisfies ThreadEvent);

  const thinkingMessage = events.find(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { tag?: string }).tag === "thinking"
  ) as { content?: string } | undefined;

  assert.equal(
    thinkingMessage?.content,
    "Checking workspace state before the next tool call."
  );
});

test("codex gpt-5.4 native reasoning stays visible while agent_message fallback remains additive", async () => {
  const session = createSessionWithThread({
    model: "gpt-5.4",
    modelReasoningEffort: "medium",
  });
  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => events.push(payload));
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "native-reasoning",
      type: "reasoning",
      text: "Native reasoning from gpt-5.4.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-progress",
      type: "agent_message",
      text: "Checking workspace state before the next tool call.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.started",
    item: {
      id: "cmd-1",
      type: "command_execution",
      command: "pwd",
      aggregated_output: "",
      status: "in_progress",
    },
  } satisfies ThreadEvent);

  const thinkingMessages = events.filter(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { tag?: string }).tag === "thinking"
  ) as Array<{ content?: string }>;

  assert.deepEqual(
    thinkingMessages.map((message) => message.content),
    [
      "Native reasoning from gpt-5.4.",
      "Checking workspace state before the next tool call.",
    ]
  );
});

test("codex final completed agent_message stays assistant on turn completion", async () => {
  const session = createSessionWithThread({
    model: "gpt-5.3-codex",
    modelReasoningEffort: "medium",
  });
  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => events.push(payload));
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-final",
      type: "agent_message",
      text: "Final answer from Codex.",
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

  const assistantMessage = events.find(
    (event) => (event as { type?: string }).type === "assistant"
  ) as { content?: string } | undefined;
  const thinkingMessages = events.filter(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { tag?: string }).tag === "thinking"
  );

  assert.equal(assistantMessage?.content, "Final answer from Codex.");
  assert.equal(thinkingMessages.length, 0);
});

test("codex intermediate agent_message stays hidden when thinking display sync is disabled", async () => {
  const session = createSessionWithThread({
    model: "gpt-5.3-codex",
    modelReasoningEffort: "medium",
  });
  session.runtimeTurnConfig = {
    thinkingDisplaySyncEnabled: false,
  };
  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => events.push(payload));
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-progress",
      type: "agent_message",
      text: "Checking workspace state before the next tool call.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.started",
    item: {
      id: "cmd-1",
      type: "command_execution",
      command: "pwd",
      aggregated_output: "",
      status: "in_progress",
    },
  } satisfies ThreadEvent);

  const thinkingMessages = events.filter(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { tag?: string }).tag === "thinking"
  );

  assert.equal(thinkingMessages.length, 0);
});

test("codex router suppresses SDK reasoning and agent_message once rollout routing is active", async () => {
  const session = createSessionWithThread({
    model: "gpt-5.4",
    modelReasoningEffort: "medium",
  });
  const rolloutTailState = new CodexRolloutTailState();
  rolloutTailState.advance({
    filePath: "/tmp/rollout.jsonl",
    nextLine: 4,
  });
  session.rolloutTailState = rolloutTailState;

  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => events.push(payload));
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "native-reasoning",
      type: "reasoning",
      text: "Native reasoning from SDK should stay suppressed.",
    },
  } satisfies ThreadEvent);
  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "agent-progress",
      type: "agent_message",
      text: "SDK commentary should stay suppressed.",
    },
  } satisfies ThreadEvent);

  const dialogMessages = events.filter(
    (event) => (event as { type?: string }).type === "dialog_message"
  );
  const assistantMessages = events.filter(
    (event) => (event as { type?: string }).type === "assistant"
  );

  assert.equal(dialogMessages.length, 0);
  assert.equal(assistantMessages.length, 0);
});

test("codex router suppresses SDK terminal assistant completion once rollout routing is active", async () => {
  const session = createSessionWithThread({
    model: "gpt-5.4",
    modelReasoningEffort: "medium",
  });
  const rolloutTailState = new CodexRolloutTailState();
  rolloutTailState.advance({
    filePath: "/tmp/rollout.jsonl",
    nextLine: 4,
  });
  session.rolloutTailState = rolloutTailState;

  const events: unknown[] = [];
  session.eventEmitter.on("message", (payload) => events.push(payload));
  const { router, structuredOutput } = createRouter();
  preparePassthroughTurn(session, structuredOutput);

  await router.dispatchEvent(session, {
    type: "item.completed",
    item: {
      id: "sdk-final",
      type: "agent_message",
      text: "SDK final answer should stay suppressed.",
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
  );
  assert.equal(assistantMessages.length, 0);
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
