import assert from "node:assert/strict";
import test from "node:test";
import type { IncomingMessage } from "../core-stream-message-types";
import type { WorkbenchOutgoingMessage } from "./workbench-bridge-types";
import { createWorkbenchStateClient } from "./workbench-state-client";

const createTransportHarness = (): {
  readonly emit: (message: IncomingMessage) => void;
  readonly sent: readonly WorkbenchOutgoingMessage[];
  readonly transport: {
    readonly onCoreEvent: (
      listener: (message: IncomingMessage) => void
    ) => () => void;
    readonly sendWorkbenchMessage: (message: WorkbenchOutgoingMessage) => void;
  };
} => {
  const listeners = new Set<(message: IncomingMessage) => void>();
  const sent: WorkbenchOutgoingMessage[] = [];
  return {
    emit: (message) => {
      for (const listener of listeners) {
        listener(message);
      }
    },
    sent,
    transport: {
      onCoreEvent: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      sendWorkbenchMessage: (message) => {
        sent.push(message);
      },
    },
  };
};

test("WorkbenchStateClient loads index through Core workbench bridge", async () => {
  const harness = createTransportHarness();
  const client = createWorkbenchStateClient(harness.transport);

  const pending = client.loadIndex();
  assert.deepEqual(harness.sent, [
    { type: "workbench:state:load", payload: { kind: "index" } },
  ]);
  harness.emit({
    type: "workbench:state:loaded",
    payload: {
      kind: "index",
      payload: { version: 1, slots: [] },
      error: null,
    },
  } as IncomingMessage);

  assert.deepEqual(await pending, { version: 1, slots: [] });
});

test("WorkbenchStateClient saves selection through Core workbench bridge", async () => {
  const harness = createTransportHarness();
  const client = createWorkbenchStateClient(harness.transport);

  const pending = client.saveSelection({
    version: 1,
    selection: {
      step: "description",
      provider: "claude",
      model: "sonnet",
      reasoning: "thinking-high",
    },
  });
  assert.deepEqual(harness.sent, [
    {
      type: "workbench:state:save",
      payload: {
        kind: "selection",
        state: {
          version: 1,
          selection: {
            step: "description",
            provider: "claude",
            model: "sonnet",
            reasoning: "thinking-high",
          },
        },
      },
    },
  ]);
  harness.emit({
    type: "workbench:state:saved",
    payload: { kind: "selection", ok: true },
  } as IncomingMessage);

  await pending;
});

test("WorkbenchStateClient reads artifact records through Core workbench bridge", async () => {
  const harness = createTransportHarness();
  const client = createWorkbenchStateClient(harness.transport);
  const jsonlPath = "/tmp/capture.jsonl";

  const pending = client.readArtifactRecords(jsonlPath);
  assert.deepEqual(harness.sent, [
    { type: "workbench:artifact:read", payload: { jsonlPath } },
  ]);
  harness.emit({
    type: "workbench:artifact:loaded",
    payload: {
      jsonlPath,
      records: [{ type: "capture_start" }],
    },
  } as IncomingMessage);

  assert.deepEqual(await pending, [{ type: "capture_start" }]);
});
