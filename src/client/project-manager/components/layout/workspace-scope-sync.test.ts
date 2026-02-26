import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-scope-sync.ts"
);

test("workspace-scope-sync stores workspace snapshots independently from session view mount state", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('message.type !== "workspace:snapshot"'),
    true,
    "workspace scope sync must subscribe to workspace snapshot events"
  );
  assert.equal(
    source.includes("workspaceSnapshotStore.applySnapshot(message.payload);"),
    true,
    "workspace snapshot payloads must be persisted even when runtime session view is not mounted"
  );
});
