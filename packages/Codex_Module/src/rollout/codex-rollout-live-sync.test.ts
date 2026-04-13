import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { CodexSessionEventEmitter } from "../messaging/codex-session-event-emitter";
import type { ActiveSession } from "../session/types";
import { CodexRolloutLiveSync } from "./codex-rollout-live-sync";

test("CodexRolloutLiveSync passes selected translation engine to the thought adapter", async () => {
  const events: unknown[] = [];
  const session = createSession();
  session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  let capturedEngineId: string | undefined;
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
    thoughtTranslator: {
      translateReasoning: (
        text: string,
        targetLanguage?: string,
        translationEngineId?: string
      ) => Promise<string | null>;
    };
  };

  liveSync.thoughtTranslator = {
    translateReasoning: (_text, _targetLanguage, translationEngineId) => {
      capturedEngineId = translationEngineId;
      return Promise.resolve("Переведённое размышление");
    },
  };

  await liveSync.emitParsedEvent(session, {
    content: "Thoughts about runtime translation.",
    kind: "thinking",
    payloadType: "agent_reasoning",
    phase: null,
    timestamp: "2026-04-13T10:00:00.000Z",
    turnId: "turn-1",
  });

  assert.equal(capturedEngineId, "codex-gpt-5.4-mini");
  assert.deepEqual(
    events.map((event) => (event as { content?: string }).content),
    ["Переведённое размышление"]
  );
});

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
