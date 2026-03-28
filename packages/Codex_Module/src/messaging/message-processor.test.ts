import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import { applyCodexTurnRuntimeConfig } from "./codex-applied-turn-config";
import { waitForNextResultWithIdlePulses } from "./message-processor";

const STREAM_FAILED_RE = /stream failed/;

interface ThreadRuntimeState {
  readonly _threadOptions?: {
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
      providerId: "codexCli",
      modelId: "gpt-5.4",
      reasoningEffort: "high",
      source: "settings_snapshot",
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
  assert.deepEqual(turnOptions, { outputSchema });
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

const createSessionWithThread = (threadOptions: {
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
  thread: {
    _threadOptions: threadOptions,
  } as never,
});
