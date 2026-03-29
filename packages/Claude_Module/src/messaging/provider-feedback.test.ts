import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { ActiveSession, SessionLogger } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { logObservedProviderFeedback } from "./provider-feedback";

const createSession = (
  entries: { type: string; payload: unknown }[]
): ActiveSession => {
  const logger: SessionLogger = {
    start: () => {
      // noop
    },
    end: () => {
      // noop
    },
    logUserInput: () => {
      // noop
    },
    logSDKMessage: (type: string, payload: unknown) => {
      entries.push({ type, payload });
    },
  };

  return {
    sessionId: "temp-feedback-session",
    workspacePath: "/tmp/claude-provider-feedback",
    createdAt: Date.now(),
    eventEmitter: new EventEmitter(),
    messageController: {
      pendingMessages: [],
      resolveNext: null,
    },
    logger,
  };
};

test("logObservedProviderFeedback records only provider-observed model and thinking signals", () => {
  const entries: { type: string; payload: unknown }[] = [];
  const message: ClaudeStreamMessage = {
    type: "assistant",
    session_id: "claude-session-1",
    timestamp: "2026-03-29T15:10:00.000Z",
    message: {
      model: "claude-sonnet-4-6",
      content: [
        { type: "thinking", thinking: "provider-confirmed thinking" },
        { type: "text", text: "visible answer" },
      ],
    },
  };

  logObservedProviderFeedback(createSession(entries), message);

  assert.deepEqual(entries, [
    {
      type: "provider_feedback",
      payload: {
        provider: "claude",
        feedbackType: "message_model",
        sessionId: "claude-session-1",
        model: "claude-sonnet-4-6",
        timestamp: "2026-03-29T15:10:00.000Z",
      },
    },
    {
      type: "provider_feedback",
      payload: {
        provider: "claude",
        feedbackType: "thinking_block",
        sessionId: "claude-session-1",
        model: "claude-sonnet-4-6",
        thinkingChars: 27,
        timestamp: "2026-03-29T15:10:00.000Z",
      },
    },
  ]);
});

test("logObservedProviderFeedback ignores messages without provider feedback signals", () => {
  const entries: { type: string; payload: unknown }[] = [];
  const message: ClaudeStreamMessage = {
    type: "assistant",
    session_id: "claude-session-2",
    message: {
      content: [{ type: "text", text: "plain answer" }],
    },
  };

  logObservedProviderFeedback(createSession(entries), message);

  assert.deepEqual(entries, []);
});
