import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DEFAULT_CODEX_RESPONSE_POLICY } from "../response-policy/response-policy-defaults";
import { CodexRolloutLiveSync } from "../rollout/codex-rollout-live-sync";
import { CodexRolloutReader } from "../rollout/codex-rollout-reader";
import type { ActiveSession } from "../session/types";
import { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import { StructuredOutputStreamController } from "./structured-output-stream-controller";

const buildRolloutPath = async (root: string, providerSessionId: string) => {
  const dayDir = path.join(root, "sessions", "2026", "04", "05");
  await mkdir(dayDir, { recursive: true });
  return path.join(
    dayDir,
    `rollout-2026-04-05T14-32-39-${providerSessionId}.jsonl`
  );
};

test("codex rollout live sync keeps thinking, commentary, and final answer separated within one turn", async () => {
  const codexHome = await mkdtemp(
    path.join(os.tmpdir(), "codex-commentary-phase-")
  );
  const providerSessionId = "019d5da1-8406-73e1-9a64-e77662dfed73";
  const rolloutPath = await buildRolloutPath(codexHome, providerSessionId);
  const reasoning = "Inspecting the current description updates.";
  const commentary =
    "I am updating the description scope before finalizing the answer.";
  const finalAnswer = "Updated Final_Description.md.";

  await writeFile(
    rolloutPath,
    [
      JSON.stringify({
        timestamp: "2026-04-05T12:32:52.687Z",
        type: "event_msg",
        payload: {
          type: "agent_reasoning",
          text: reasoning,
          turn_id: "turn-2",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:32:52.823Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: commentary,
          phase: "commentary",
          turn_id: "turn-2",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:37:30.041Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: finalAnswer,
          phase: "final_answer",
          turn_id: "turn-2",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:37:30.043Z",
        type: "event_msg",
        payload: {
          type: "task_complete",
          last_agent_message: finalAnswer,
          turn_id: "turn-2",
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

  const session = createSession(providerSessionId);
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });
  preparePassthroughTurn(session, structuredOutput);

  await liveSync.sync(session);

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
  const assistantMessages = events.filter(
    (event) => (event as { type?: string }).type === "assistant"
  ) as Array<{ content?: string }>;

  assert.deepEqual(
    thinkingMessages.map((message) => message.content),
    [reasoning]
  );
  assert.deepEqual(
    commentaryMessages.map((message) => message.content),
    [commentary]
  );
  assert.deepEqual(
    assistantMessages.map((message) => message.content),
    [finalAnswer]
  );
  assert.equal(
    thinkingMessages.some(
      (message) =>
        message.content === commentary || message.content === finalAnswer
    ),
    false
  );
  assert.equal(session.rolloutTailState?.snapshot()?.filePath, rolloutPath);
  assert.equal(session.rolloutTailState?.snapshot()?.nextLine, 4);
});

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

const createSession = (providerSessionId: string): ActiveSession => ({
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
