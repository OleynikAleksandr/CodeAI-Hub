import assert from "node:assert/strict";
import test from "node:test";
import { parseIncomingClientMessage } from "./incoming-message-validator";

const parse = (message: unknown) =>
  parseIncomingClientMessage(JSON.stringify(message));

test("parseIncomingClientMessage accepts session speech speak commands", () => {
  const result = parse({
    type: "session:speech:speak-message",
    payload: {
      messageId: "message-1",
      providerId: "codexCli",
      rate: 1.25,
      sessionId: "session-1",
      text: "Visible bubble text",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.ok ? result.message.type : null,
    "session:speech:speak-message"
  );
});

test("parseIncomingClientMessage accepts session speech stop commands", () => {
  const result = parse({
    type: "session:speech:stop",
    payload: {
      messageId: "message-1",
      sessionId: "session-1",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.message.type : null, "session:speech:stop");
});

test("parseIncomingClientMessage rejects malformed session speech payloads", () => {
  const result = parse({
    type: "session:speech:speak-message",
    payload: {
      messageId: "message-1",
      sessionId: "session-1",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.ok ? null : result.reason,
    "invalid-payload:session:speech:speak-message"
  );
});

test("parseIncomingClientMessage rejects removed provider updates", () => {
  assert.equal(
    parse({
      type: "settings:update-provider",
      payload: { provider: "claude", target: "cli" },
    }).ok,
    true
  );
  assert.equal(
    parse({
      type: "settings:update-provider",
      payload: { provider: "removed-provider", target: "cli" },
    }).ok,
    false
  );
  assert.equal(
    parse({
      type: "settings:update-provider",
      payload: { provider: "claude", target: "core" },
    }).ok,
    false
  );
});
