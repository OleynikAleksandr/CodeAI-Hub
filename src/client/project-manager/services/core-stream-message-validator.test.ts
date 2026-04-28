import assert from "node:assert/strict";
import test from "node:test";
import type { IncomingMessage } from "../core-stream-message-types";
import {
  parseCoreStreamMessage,
  type CoreStreamMessageValidationResult,
} from "./core-stream-message-validator";

const parseJsonValue = (value: unknown): CoreStreamMessageValidationResult =>
  parseCoreStreamMessage(JSON.stringify(value));

const assertOk = (
  result: CoreStreamMessageValidationResult
): IncomingMessage => {
  if (result.ok) {
    return result.message;
  }
  throw new Error(`Expected valid message, got ${result.reason}`);
};

const assertRejected = (
  result: CoreStreamMessageValidationResult,
  reason: string
): void => {
  if (!result.ok) {
    assert.equal(result.reason, reason);
    return;
  }
  throw new Error(`Expected rejection, got ${result.message.type}`);
};

test("parseCoreStreamMessage rejects invalid JSON and invalid root envelopes", () => {
  assertRejected(parseCoreStreamMessage("{"), "invalid-json");
  assertRejected(parseJsonValue(null), "message-not-object");
  assertRejected(parseJsonValue([]), "message-not-object");
  assertRejected(parseJsonValue({ payload: {} }), "message-type-invalid");
  assertRejected(parseJsonValue({ type: "   " }), "message-type-invalid");
});

test("parseCoreStreamMessage rejects malformed payloads for PM state-mutating messages", () => {
  assertRejected(
    parseJsonValue({ payload: { projects: "not-array" }, type: "projects:update" }),
    "invalid-payload:projects:update"
  );
  assertRejected(
    parseJsonValue({
      payload: {
        projects: [
          {
            id: "workspace-1",
            name: "Workspace",
            path: "/tmp/workspace",
            slug: "workspace",
          },
        ],
      },
      type: "projects:update",
    }),
    "invalid-payload:projects:update"
  );
  assertRejected(
    parseJsonValue({
      payload: { busy: "yes", message: null },
      type: "settings:localization-sync-status",
    }),
    "invalid-payload:settings:localization-sync-status"
  );
  assertRejected(
    parseJsonValue({ payload: { error: null }, type: "settings:save-error" }),
    "invalid-payload:settings:save-error"
  );
});

test("parseCoreStreamMessage accepts known Project Manager stream messages", () => {
  const projectUpdate = assertOk(
    parseJsonValue({
      payload: {
        projects: [
          {
            id: "workspace-1",
            lastUsed: "2026-04-28T16:00:00.000Z",
            name: "Workspace",
            path: "/tmp/workspace",
            slug: "workspace",
          },
        ],
      },
      type: "projects:update",
    })
  );
  assert.equal(projectUpdate.type, "projects:update");

  const localizationStatus = assertOk(
    parseJsonValue({
      payload: { busy: false, message: null },
      type: "settings:localization-sync-status",
    })
  );
  assert.equal(localizationStatus.type, "settings:localization-sync-status");

  const coreState = assertOk(
    parseJsonValue({
      payload: { providers: [], sessions: [] },
      type: "core:state",
    })
  );
  assert.equal(coreState.type, "core:state");
});

test("parseCoreStreamMessage keeps forward-compatible string-typed events", () => {
  const unknownMessage = assertOk(
    parseJsonValue({
      payload: "forward-compatible",
      type: "provider:new-event",
    })
  );
  assert.equal(unknownMessage.type, "provider:new-event");

  const knownObjectMessage = assertOk(
    parseJsonValue({
      payload: { chunk: "delta", sessionId: "session-1" },
      type: "session:stream",
    })
  );
  assert.equal(knownObjectMessage.type, "session:stream");
});
