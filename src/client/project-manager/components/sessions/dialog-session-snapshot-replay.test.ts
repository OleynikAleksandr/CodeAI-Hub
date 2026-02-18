import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const CONTROLLER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts"
);

const CORE_EVENTS_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts"
);

test("dialog session controller caches workspace snapshots for replay", async () => {
  const source = await readFile(CONTROLLER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes(
      "const latestWorkspaceSnapshotRef = useRef<WorkspaceSnapshotPushPayload | null>("
    ),
    true,
    "controller must keep last workspace snapshot to avoid race with dialog:list:result/session:created"
  );
  assert.equal(
    source.includes("latestWorkspaceSnapshotRef.current = payload;"),
    true,
    "controller must record latest workspace snapshot payload"
  );
  assert.equal(
    source.includes("latestWorkspaceSnapshotRef,"),
    true,
    "controller must pass latest snapshot ref into dialog core events"
  );
});

test("dialog core events replay workspace snapshot after creating base snapshot", async () => {
  const source = await readFile(CORE_EVENTS_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("options.latestWorkspaceSnapshotRef.current"),
    true,
    "dialog core events must consult latest workspace snapshot ref"
  );
  assert.equal(
    source.includes("applyWorkspaceSnapshotToSnapshots"),
    true,
    "dialog core events must replay lock state from workspace snapshot"
  );
});

