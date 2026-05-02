import assert from "node:assert/strict";
import test from "node:test";
import type { WorkbenchIndexFile } from "./workbench-bridge-types";
import {
  createWorkbenchIndexStore,
  resolveWorkbenchSlot,
  type WorkbenchSlotKey,
} from "./workbench-index-store";

const SLOT: WorkbenchSlotKey = {
  step: "description",
  provider: "claude",
  model: "sonnet",
  reasoning: "thinking-high",
};

test("WorkbenchIndexStore starts from Core-loaded index and rotates current to previous", async () => {
  let storedIndex: WorkbenchIndexFile | null = null;
  const store = createWorkbenchIndexStore({
    loadIndex: async () => storedIndex,
    saveIndex: async (index) => {
      storedIndex = index;
    },
  });

  const first = await store.rotateCapture({
    slot: SLOT,
    mode: "managed",
    captureResult: captureResult("first"),
    records: [captureStart("first", "2026-05-02T10:00:00.000Z", "1.2.123")],
  });
  assert.deepEqual(first, storedIndex);

  const second = await store.rotateCapture({
    slot: SLOT,
    mode: "managed",
    captureResult: captureResult("second"),
    records: [captureStart("second", "2026-05-02T11:00:00.000Z", "1.2.124")],
  });

  const slot = resolveWorkbenchSlot(second, SLOT);
  assert.equal(slot?.managed.current?.artifactId, "second");
  assert.equal(slot?.managed.previous?.artifactId, "first");
  assert.equal(slot?.managed.current?.releaseVersion, "1.2.124");
  assert.equal(slot?.vanilla.current, null);
});

test("WorkbenchIndexStore preserves rebuilt slots loaded from Core", async () => {
  const rebuiltIndex: WorkbenchIndexFile = {
    version: 1,
    slots: [
      {
        ...SLOT,
        managed: {
          current: {
            artifactId: "rebuilt",
            capturedAt: "2026-05-02T09:00:00.000Z",
            jsonlPath: "/tmp/rebuilt.jsonl",
            markdownPath: "/tmp/rebuilt.md",
            releaseVersion: "1.2.122",
          },
          previous: null,
        },
        vanilla: { current: null, previous: null },
      },
    ],
  };
  let savedIndex: WorkbenchIndexFile | null = null;
  const store = createWorkbenchIndexStore({
    loadIndex: async () => rebuiltIndex,
    saveIndex: async (index) => {
      savedIndex = index;
    },
  });

  await store.rotateCapture({
    slot: SLOT,
    mode: "managed",
    captureResult: captureResult("new"),
    records: [captureStart("new", "2026-05-02T12:00:00.000Z", "1.2.125")],
  });

  const slot = savedIndex ? resolveWorkbenchSlot(savedIndex, SLOT) : null;
  assert.equal(slot?.managed.current?.artifactId, "new");
  assert.equal(slot?.managed.previous?.artifactId, "rebuilt");
});

test("WorkbenchIndexStore rejects malformed artifact records", async () => {
  const store = createWorkbenchIndexStore({
    loadIndex: async () => null,
    saveIndex: async () => undefined,
  });

  await assert.rejects(
    () =>
      store.rotateCapture({
        slot: SLOT,
        mode: "managed",
        captureResult: captureResult("broken"),
        records: [{ type: "not_capture_start" }],
      }),
    /Cannot materialize workbench slot entry/
  );
});

const captureResult = (artifactId: string) => ({
  ok: true,
  providerId: "claude" as const,
  jsonlPath: `/tmp/${artifactId}.jsonl`,
  markdownPath: `/tmp/${artifactId}.md`,
});

const captureStart = (
  captureId: string,
  timestamp: string,
  releaseVersion: string
) => ({
  type: "capture_start",
  captureId,
  timestamp,
  releaseVersion,
});
