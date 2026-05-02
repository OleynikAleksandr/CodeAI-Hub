import assert from "node:assert/strict";
import test from "node:test";
import { RemoteBridgeWorkbenchCommandRouter } from "./remote-bridge-workbench-command-router";

test("RemoteBridgeWorkbenchCommandRouter emits state load and save events", async () => {
  const events: unknown[] = [];
  const saves: unknown[] = [];
  const router = new RemoteBridgeWorkbenchCommandRouter({
    getManager: () =>
      ({
        sendToClient: (_clientId: string, event: unknown) => {
          events.push(event);
        },
      }) as never,
    stateHandler: {
      load: async () => ({ version: 1, slots: [] }),
      save: (_kind: unknown, state: unknown) => {
        saves.push(state);
        return Promise.resolve();
      },
    } as never,
  });

  await router.handleStateLoad("client-1", { kind: "index" });
  await router.handleStateSave("client-1", {
    kind: "selection",
    state: { version: 1, selection: null },
  });

  assert.deepEqual(events, [
    {
      type: "workbench:state:loaded",
      payload: { kind: "index", state: { version: 1, slots: [] }, error: null },
    },
    {
      type: "workbench:state:saved",
      payload: { kind: "selection", error: null },
    },
  ]);
  assert.deepEqual(saves, [{ version: 1, selection: null }]);
});

test("RemoteBridgeWorkbenchCommandRouter emits artifact loaded and error events", async () => {
  const events: unknown[] = [];
  const router = new RemoteBridgeWorkbenchCommandRouter({
    artifactReader: {
      read: (payload) => {
        const jsonlPath =
          isRecord(payload) && typeof payload.jsonlPath === "string"
            ? payload.jsonlPath
            : "";
        const result = jsonlPath.endsWith("bad.jsonl")
          ? ({ ok: false, error: "invalid_jsonl" } as const)
          : ({ ok: true, records: [{ type: "capture_start" }] } as const);
        return Promise.resolve(result);
      },
    },
    getManager: () =>
      ({
        sendToClient: (_clientId: string, event: unknown) => {
          events.push(event);
        },
      }) as never,
  });

  await router.handleArtifactRead("client-1", {
    jsonlPath: "/tmp/good.jsonl",
  });
  await router.handleArtifactRead("client-1", {
    jsonlPath: "/tmp/bad.jsonl",
  });

  assert.deepEqual(events, [
    {
      type: "workbench:artifact:loaded",
      payload: {
        jsonlPath: "/tmp/good.jsonl",
        records: [{ type: "capture_start" }],
      },
    },
    {
      type: "workbench:artifact:error",
      payload: { jsonlPath: "/tmp/bad.jsonl", error: "invalid_jsonl" },
    },
  ]);
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
