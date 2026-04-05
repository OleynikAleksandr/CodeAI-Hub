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

test("codex rollout replay suppresses duplicates in-session and rebuilds deterministically on cold start", async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), "codex-replay-"));
  const providerSessionId = "019d5da1-8406-73e1-9a64-e77662dfed73";
  const rolloutPath = await buildRolloutPath(codexHome, providerSessionId);
  const reasoning = "Inspecting the saved rollout before replay.";
  const commentary = "Restoring the last visible progress update.";
  const finalAnswer = "Restored Final_Description.md.";

  await writeFile(
    rolloutPath,
    [
      JSON.stringify({
        timestamp: "2026-04-05T12:32:52.687Z",
        type: "event_msg",
        payload: {
          type: "agent_reasoning",
          text: reasoning,
          turn_id: "turn-replay",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:32:52.823Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: commentary,
          phase: "commentary",
          turn_id: "turn-replay",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:37:30.041Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: finalAnswer,
          phase: "final_answer",
          turn_id: "turn-replay",
        },
      }),
      JSON.stringify({
        timestamp: "2026-04-05T12:37:30.043Z",
        type: "event_msg",
        payload: {
          type: "task_complete",
          last_agent_message: finalAnswer,
          turn_id: "turn-replay",
        },
      }),
    ].join("\n"),
    "utf8"
  );

  const firstPass = createReplayHarness({ codexHome, providerSessionId });
  await firstPass.liveSync.sync(firstPass.session);
  assert.deepEqual(collectVisibleSummary(firstPass.events), {
    assistant: [finalAnswer],
    commentary: [commentary],
    thinking: [reasoning],
  });

  firstPass.session.rolloutTailState?.advance({
    filePath: rolloutPath,
    nextLine: 0,
  });
  await firstPass.liveSync.sync(firstPass.session);
  assert.deepEqual(collectVisibleSummary(firstPass.events), {
    assistant: [finalAnswer],
    commentary: [commentary],
    thinking: [reasoning],
  });

  const coldStart = createReplayHarness({ codexHome, providerSessionId });
  await coldStart.liveSync.sync(coldStart.session);
  assert.deepEqual(collectVisibleSummary(coldStart.events), {
    assistant: [finalAnswer],
    commentary: [commentary],
    thinking: [reasoning],
  });
});

const createReplayHarness = (payload: {
  readonly codexHome: string;
  readonly providerSessionId: string;
}): {
  readonly events: unknown[];
  readonly liveSync: CodexRolloutLiveSync;
  readonly session: ActiveSession;
} => {
  const events: unknown[] = [];
  const structuredOutput = new StructuredOutputStreamController();
  const liveSync = new CodexRolloutLiveSync(
    structuredOutput,
    new CodexSessionEventEmitter()
  );
  (liveSync as unknown as { reader: CodexRolloutReader }).reader =
    new CodexRolloutReader({ codexHome: payload.codexHome });
  const session = createSession(payload.providerSessionId);
  session.eventEmitter.on("message", (message) => events.push(message));
  preparePassthroughTurn(session, structuredOutput);
  return { events, liveSync, session };
};

const collectVisibleSummary = (
  events: readonly unknown[]
): {
  readonly assistant: string[];
  readonly commentary: string[];
  readonly thinking: string[];
} => ({
  assistant: events
    .filter((event) => (event as { type?: string }).type === "assistant")
    .map((event) => (event as { content?: string }).content ?? ""),
  commentary: events
    .filter(
      (event) =>
        (event as { type?: string }).type === "dialog_message" &&
        (event as { role?: string }).role === "assistant" &&
        (event as { tag?: string }).tag !== "thinking"
    )
    .map((event) => (event as { content?: string }).content ?? ""),
  thinking: events
    .filter(
      (event) =>
        (event as { type?: string }).type === "dialog_message" &&
        (event as { tag?: string }).tag === "thinking"
    )
    .map((event) => (event as { content?: string }).content ?? ""),
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
