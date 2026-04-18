import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { CodexSessionEventEmitter } from "../messaging/codex-session-event-emitter";
import { StructuredOutputStreamController } from "../messaging/structured-output-stream-controller";
import { DEFAULT_CODEX_RESPONSE_POLICY } from "../response-policy/response-policy-defaults";
import type { ActiveSession } from "../session/types";
import { CodexRolloutLiveSync } from "./codex-rollout-live-sync";

test("CodexRolloutLiveSync emits raw rollout thinking for core-owned translation overlays", async () => {
  const events: unknown[] = [];
  const session = createSession();
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  const liveSync = new CodexRolloutLiveSync(
    {} as never,
    new CodexSessionEventEmitter()
  ) as unknown as {
    emitParsedEvent: (
      activeSession: ActiveSession,
      event: {
        readonly content: string;
        readonly kind: "thinking";
        readonly payloadType: "agent_reasoning";
        readonly phase: null;
        readonly timestamp: string | null;
        readonly turnId: string | null;
      }
    ) => Promise<void>;
  };

  await liveSync.emitParsedEvent(session, {
    content: "Thoughts about runtime translation.",
    kind: "thinking",
    payloadType: "agent_reasoning",
    phase: null,
    timestamp: "2026-04-13T10:00:00.000Z",
    turnId: "turn-1",
  });

  assert.deepEqual(
    events.map((event) => (event as { content?: string }).content),
    ["Thoughts about runtime translation."]
  );
});

test("CodexRolloutLiveSync falls back to plain-text final answers when outputSchema parsing yields no assistant text", async () => {
  const events: unknown[] = [];
  const structuredOutput = new StructuredOutputStreamController();
  const session = createSession();
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  structuredOutput.prepareTurn(
    session.sessionId,
    {
      outputSchema: {
        properties: {
          answer: {
            type: "string",
          },
        },
        required: ["answer"],
        type: "object",
      },
    },
    DEFAULT_CODEX_RESPONSE_POLICY
  );
  structuredOutput.startTurn(session.sessionId);

  const liveSync = new CodexRolloutLiveSync(
    structuredOutput,
    new CodexSessionEventEmitter()
  ) as unknown as {
    emitParsedEvent: (
      activeSession: ActiveSession,
      event: {
        readonly content: string;
        readonly kind: "final_answer" | "task_complete";
        readonly payloadType: "agent_message" | "task_complete";
        readonly phase: "final_answer" | null;
        readonly timestamp: string | null;
        readonly turnId: string | null;
      }
    ) => Promise<void>;
  };

  const finalAnswer =
    "Compiled Final_Description.md and captured the next validation steps.";
  await liveSync.emitParsedEvent(session, {
    content: finalAnswer,
    kind: "final_answer",
    payloadType: "agent_message",
    phase: "final_answer",
    timestamp: "2026-04-13T10:05:00.000Z",
    turnId: "turn-2",
  });
  await liveSync.emitParsedEvent(session, {
    content: finalAnswer,
    kind: "task_complete",
    payloadType: "task_complete",
    phase: null,
    timestamp: "2026-04-13T10:05:01.000Z",
    turnId: "turn-2",
  });

  assert.deepEqual(
    events
      .filter((event) => (event as { type?: string }).type === "assistant")
      .map((event) => (event as { content?: string }).content),
    [finalAnswer]
  );
});

test("CodexRolloutLiveSync suppresses task_complete duplicates when final_answer omits turn_id", async () => {
  const events: unknown[] = [];
  const structuredOutput = new StructuredOutputStreamController();
  const session = createSession();
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  structuredOutput.prepareTurn(
    session.sessionId,
    {} as never,
    DEFAULT_CODEX_RESPONSE_POLICY
  );
  structuredOutput.startTurn(session.sessionId);

  const liveSync = new CodexRolloutLiveSync(
    structuredOutput,
    new CodexSessionEventEmitter()
  ) as unknown as {
    emitParsedEvent: (
      activeSession: ActiveSession,
      event: {
        readonly content: string;
        readonly kind: "final_answer" | "task_complete";
        readonly payloadType: "agent_message" | "task_complete";
        readonly phase: "final_answer" | null;
        readonly timestamp: string | null;
        readonly turnId: string | null;
      }
    ) => Promise<void>;
  };

  const finalAnswer = "Updated Final_Description.md.";
  await liveSync.emitParsedEvent(session, {
    content: finalAnswer,
    kind: "final_answer",
    payloadType: "agent_message",
    phase: "final_answer",
    timestamp: "2026-04-18T10:43:20.019Z",
    turnId: null,
  });
  await liveSync.emitParsedEvent(session, {
    content: finalAnswer,
    kind: "task_complete",
    payloadType: "task_complete",
    phase: null,
    timestamp: "2026-04-18T10:43:20.521Z",
    turnId: "turn-observed",
  });

  assert.deepEqual(collectAssistantMessages(events), [finalAnswer]);
});

test("CodexRolloutLiveSync keeps fallback-only task_complete finalization", async () => {
  const events: unknown[] = [];
  const structuredOutput = new StructuredOutputStreamController();
  const session = createSession();
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  structuredOutput.prepareTurn(
    session.sessionId,
    {} as never,
    DEFAULT_CODEX_RESPONSE_POLICY
  );
  structuredOutput.startTurn(session.sessionId);

  const liveSync = new CodexRolloutLiveSync(
    structuredOutput,
    new CodexSessionEventEmitter()
  ) as unknown as {
    emitParsedEvent: (
      activeSession: ActiveSession,
      event: {
        readonly content: string;
        readonly kind: "task_complete";
        readonly payloadType: "task_complete";
        readonly phase: null;
        readonly timestamp: string | null;
        readonly turnId: string | null;
      }
    ) => Promise<void>;
  };

  const finalAnswer =
    "Captured the next validation steps from the fallback-only task completion.";
  await liveSync.emitParsedEvent(session, {
    content: finalAnswer,
    kind: "task_complete",
    payloadType: "task_complete",
    phase: null,
    timestamp: "2026-04-18T10:43:21.021Z",
    turnId: "turn-fallback-only",
  });

  assert.deepEqual(collectAssistantMessages(events), [finalAnswer]);
});

const collectAssistantMessages = (events: readonly unknown[]): string[] =>
  events
    .filter((event) => (event as { type?: string }).type === "assistant")
    .map((event) => (event as { content?: string }).content ?? "");

const createSession = (): ActiveSession => ({
  codexThreadId: "codex-thread",
  createdAt: Date.now(),
  eventEmitter: new EventEmitter(),
  internalTurn: false,
  logger: null,
  messageController: {
    pendingMessages: [],
    resolveNext: null,
  },
  runtimeTurnConfig: {
    messagesForTheUserLanguage: "ru",
    thinkingDisplaySyncEnabled: true,
    translationEngineId: "codex-gpt-5.4-mini",
  },
  sessionId: "codex-session",
  workspacePath: "/tmp/workspace",
});
