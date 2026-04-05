import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ThreadEvent } from "@openai/codex-sdk";
import { DEFAULT_CODEX_RESPONSE_POLICY } from "../response-policy/response-policy-defaults";
import { CodexRolloutLiveSync } from "../rollout/codex-rollout-live-sync";
import { CodexRolloutReader } from "../rollout/codex-rollout-reader";
import type { ActiveSession } from "../session/types";
import { CodexMessageFinishHandler } from "./codex-message-finish-handler";
import { CodexReasoningStreams } from "./codex-reasoning-streams";
import { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import { CodexStreamEventRouter } from "./codex-stream-event-router";
import { CodexTokenUsageSync } from "./codex-token-usage-sync";
import { CodexUsageSync } from "./codex-usage-sync";
import { StructuredOutputStreamController } from "./structured-output-stream-controller";

const buildRolloutPath = async (root: string, providerSessionId: string) => {
  const dayDir = path.join(root, "sessions", "2026", "04", "05");
  await mkdir(dayDir, { recursive: true });
  return path.join(
    dayDir,
    `rollout-2026-04-05T14-32-39-${providerSessionId}.jsonl`
  );
};

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

test("codex rollout restores a substantive assistant from task_complete when final answer content is empty", async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), "codex-empty-tail-"));
  const providerSessionId = "019d5da1-8406-73e1-9a64-e77662dfed73";
  const rolloutPath = await buildRolloutPath(codexHome, providerSessionId);
  const substantiveAssistant =
    "Compiled the working draft and captured the key scenarios for the next step.";
  const commentary = "I will verify one more file before finishing.";
  const reasoning = "Checking whether one more state file needs verification.";

  await writeFile(
    rolloutPath,
    [
      JSON.stringify({
        timestamp: "2026-04-05T12:32:52.687Z",
        type: "event_msg",
        payload: {
          type: "agent_reasoning",
          text: reasoning,
          turn_id: "turn-empty-tail",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:35:12.010Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: commentary,
          phase: "commentary",
          turn_id: "turn-empty-tail",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:37:30.041Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "",
          phase: "final_answer",
          turn_id: "turn-empty-tail",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:37:30.043Z",
        type: "event_msg",
        payload: {
          type: "task_complete",
          last_agent_message: substantiveAssistant,
          turn_id: "turn-empty-tail",
        },
      }),
    ].join("\n"),
    "utf8"
  );

  const events: unknown[] = [];
  const structuredOutput = new StructuredOutputStreamController();
  const liveSync = new CodexRolloutLiveSync(
    structuredOutput,
    new CodexSessionEventEmitter()
  );
  (liveSync as unknown as { reader: CodexRolloutReader }).reader =
    new CodexRolloutReader({ codexHome });
  const session = createRolloutSession(providerSessionId);
  session.eventEmitter.on("message", (payload) => events.push(payload));
  preparePassthroughTurn(session, structuredOutput);

  await liveSync.sync(session);

  const assistantMessages = events.filter(
    (event) => (event as { type?: string }).type === "assistant"
  ) as Array<{ content?: string }>;
  const thinkingMessages = events.filter(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { tag?: string }).tag === "thinking"
  ) as Array<{ content?: string }>;
  const commentaryMessages = events.filter(
    (event) =>
      (event as { type?: string }).type === "dialog_message" &&
      (event as { role?: string }).role === "assistant" &&
      (event as { tag?: string }).tag !== "thinking"
  ) as Array<{ content?: string }>;

  assert.deepEqual(
    assistantMessages.map((message) => message.content),
    [substantiveAssistant]
  );
  assert.deepEqual(
    thinkingMessages.map((message) => message.content),
    [reasoning]
  );
  assert.deepEqual(
    commentaryMessages.map((message) => message.content),
    [commentary]
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

const createRolloutSession = (providerSessionId: string): ActiveSession => ({
  sessionId: "codex-session",
  workspacePath: "/tmp/workspace",
  createdAt: Date.now(),
  eventEmitter: new EventEmitter(),
  messageController: {
    pendingMessages: [],
    resolveNext: null,
  },
  logger: null,
  codexThreadId: providerSessionId,
  internalTurn: false,
  runtimeTurnConfig: {
    thinkingDisplaySyncEnabled: true,
  },
  messagesForTheUserLanguage: "en",
});
