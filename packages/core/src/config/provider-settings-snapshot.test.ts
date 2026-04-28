import assert from "node:assert/strict";
import test from "node:test";
import { JsonFileSnapshotCache } from "./json-file-snapshot-cache";

const createCacheHarness = (snapshots: Map<string, string>) => {
  let nowMs = 0;
  const reads: string[] = [];
  const cache = new JsonFileSnapshotCache({
    now: () => nowMs,
    readFile: (filePath) => {
      reads.push(filePath);
      const snapshot = snapshots.get(filePath);
      if (snapshot === undefined) {
        throw new Error(`Missing test snapshot: ${filePath}`);
      }
      return snapshot;
    },
    ttlMs: 100,
  });
  return {
    advance: (ms: number) => {
      nowMs += ms;
    },
    cache,
    reads,
  };
};

test("JsonFileSnapshotCache reuses a path snapshot until the TTL expires", () => {
  const firstPath = "/tmp/codeai-hub-settings-a.json";
  const secondPath = "/tmp/codeai-hub-settings-b.json";
  const snapshots = new Map([
    [firstPath, '{"defaultModel":"codex-a"}'],
    [secondPath, '{"defaultModel":"codex-b"}'],
  ]);
  const harness = createCacheHarness(snapshots);

  assert.equal(harness.cache.readObject(firstPath)?.defaultModel, "codex-a");
  snapshots.set(firstPath, '{"defaultModel":"codex-a-updated"}');
  assert.equal(harness.cache.readObject(firstPath)?.defaultModel, "codex-a");
  assert.equal(harness.cache.readObject(secondPath)?.defaultModel, "codex-b");

  harness.advance(101);

  assert.equal(
    harness.cache.readObject(firstPath)?.defaultModel,
    "codex-a-updated"
  );
  assert.deepEqual(harness.reads, [firstPath, secondPath, firstPath]);
});

test("JsonFileSnapshotCache caches malformed snapshots as null per path", () => {
  const malformedPath = "/tmp/codeai-hub-malformed-settings.json";
  const arrayPath = "/tmp/codeai-hub-array-settings.json";
  const snapshots = new Map([
    [malformedPath, "{"],
    [arrayPath, "[]"],
  ]);
  const harness = createCacheHarness(snapshots);

  assert.equal(harness.cache.readObject(malformedPath), null);
  snapshots.set(malformedPath, '{"defaultModel":"claude"}');
  assert.equal(harness.cache.readObject(malformedPath), null);
  assert.equal(harness.cache.readObject(arrayPath), null);

  harness.advance(101);

  assert.equal(harness.cache.readObject(malformedPath)?.defaultModel, "claude");
  assert.deepEqual(harness.reads, [malformedPath, arrayPath, malformedPath]);
});
