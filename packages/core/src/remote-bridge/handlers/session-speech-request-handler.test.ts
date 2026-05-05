import assert from "node:assert/strict";
import test from "node:test";
import { SessionSpeechService } from "../../session-speech/session-speech-service";
import {
  SessionSpeechRequestHandler,
  type SessionSpeechStateEvent,
} from "./session-speech-request-handler";

test("SessionSpeechRequestHandler broadcasts invalid speak request errors", () => {
  const events: SessionSpeechStateEvent[] = [];
  const handler = new SessionSpeechRequestHandler({
    broadcaster: (event) => events.push(event),
    service: new SessionSpeechService(),
  });

  const state = handler.handleSpeakMessage({ sessionId: "session-1" });

  assert.equal(state.status, "error");
  assert.equal(events.length, 1);
  assert.equal(events[0]?.payload.status, "error");
});

test("SessionSpeechRequestHandler forwards stop state events from service", () => {
  const events: SessionSpeechStateEvent[] = [];
  const service = new SessionSpeechService({
    now: () => "2026-05-05T18:00:00.000Z",
  });
  const handler = new SessionSpeechRequestHandler({
    broadcaster: (event) => events.push(event),
    service,
  });

  const state = handler.handleStop({
    messageId: "message-1",
    sessionId: "session-1",
  });

  assert.equal(state.status, "idle");
  assert.equal(events.length, 1);
  assert.deepEqual(events[0]?.payload, state);
});
