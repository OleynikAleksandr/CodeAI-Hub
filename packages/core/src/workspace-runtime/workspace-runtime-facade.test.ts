import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceRuntimeFacade } from "./workspace-runtime-facade";
import type { SessionKey } from "./workspace-runtime-types";
import type { WorkspaceSnapshotPush } from "./workspace-wire-types";

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const workspaceA = "/tmp/workspace-a";
const workspaceB = "/tmp/workspace-b";

const createSessionKey = (
  workspaceRoot: string,
  sessionId: string
): SessionKey => ({
  workspaceRoot,
  nodeId: "description",
  sessionId,
});

test("WorkspaceRuntimeFacade select generates selectionId and pushes snapshots", async () => {
  const generated = ["sel-a", "sel-b"];
  const events: WorkspaceSnapshotPush[] = [];
  const facade = new WorkspaceRuntimeFacade({
    snapshotDebounceMs: 20,
    selectionIdFactory: () => generated.shift() ?? "sel-fallback",
  });

  facade.subscribe("client-1", (message) => {
    events.push(message);
  });

  const ackA = facade.select({
    clientId: "client-1",
    request: {
      requestId: "req-1",
      workspaceRoot: workspaceA,
      reason: "workspace_selected",
    },
  });

  assert.equal(ackA.status, "applied");
  assert.equal(ackA.selectionId, "sel-a");
  assert.equal(events.length, 1);
  assert.equal(events[0].payload.workspaceRoot, workspaceA);
  assert.equal(events[0].payload.selectionId, "sel-a");
  assert.equal(events[0].payload.sequence, 1);

  facade.notifySessionCreated(createSessionKey(workspaceA, "s-1"), {
    providerId: "codexCli",
  });
  await wait(30);

  assert.equal(events.length, 2);
  assert.equal(events[1].payload.selectionId, "sel-a");
  assert.equal(events[1].payload.sequence, 2);

  const ackB = facade.select({
    clientId: "client-1",
    request: {
      requestId: "req-2",
      workspaceRoot: workspaceB,
      reason: "workspace_selected",
    },
  });

  assert.equal(ackB.status, "applied");
  assert.equal(ackB.selectionId, "sel-b");
  assert.equal(events.length, 3);
  assert.equal(events[2].payload.workspaceRoot, workspaceB);
  assert.equal(events[2].payload.selectionId, "sel-b");
  assert.equal(events[2].payload.sequence, 1);

  facade.notifySessionCreated(createSessionKey(workspaceA, "s-2"), {
    providerId: "codexCli",
  });
  await wait(30);

  assert.equal(events.length, 3);
  facade.dispose();
});

test("WorkspaceRuntimeFacade coalesces debounced snapshot updates", async () => {
  const events: WorkspaceSnapshotPush[] = [];
  const facade = new WorkspaceRuntimeFacade({
    snapshotDebounceMs: 30,
    selectionIdFactory: () => "sel-coalesce",
  });

  facade.subscribe("client-1", (message) => {
    events.push(message);
  });

  facade.select({
    clientId: "client-1",
    request: {
      requestId: "req-1",
      workspaceRoot: workspaceA,
      reason: "workspace_selected",
    },
  });
  assert.equal(events.length, 1);

  facade.notifyArtifactWritten(
    { workspaceRoot: workspaceA, nodeId: "description" },
    "draft",
    {
      artifactId: "draft",
      version: "1",
      path: `${workspaceA}/draft.md`,
    }
  );
  facade.notifyArtifactWritten(
    { workspaceRoot: workspaceA, nodeId: "description" },
    "final",
    {
      artifactId: "final",
      version: "1",
      path: `${workspaceA}/final.md`,
    }
  );

  await wait(10);
  assert.equal(events.length, 1);

  await wait(40);
  assert.equal(events.length, 2);
  assert.equal(events[1].payload.sequence, 2);
  facade.dispose();
});

test("WorkspaceRuntimeFacade flushes turn state with high priority", async () => {
  const events: WorkspaceSnapshotPush[] = [];
  const facade = new WorkspaceRuntimeFacade({
    snapshotDebounceMs: 80,
    selectionIdFactory: () => "sel-priority",
  });

  facade.subscribe("client-1", (message) => {
    events.push(message);
  });

  const sessionKey = createSessionKey(workspaceA, "session-priority");
  facade.select({
    clientId: "client-1",
    request: {
      requestId: "req-1",
      workspaceRoot: workspaceA,
      reason: "workspace_selected",
    },
  });
  assert.equal(events.length, 1);

  facade.notifySessionCreated(sessionKey, { providerId: "codexCli" });
  await wait(90);
  assert.equal(events.length, 2);

  facade.notifyTurnStateChanged(sessionKey, "running");
  await wait(5);

  assert.ok(events.length >= 3);
  const latestEvent = events.at(-1);
  assert.ok(latestEvent);
  assert.equal(
    latestEvent.payload.snapshot.sessions[sessionKey.sessionId]?.turnState,
    "running"
  );

  facade.dispose();
});

test("WorkspaceRuntimeFacade publishes lock transition metadata in snapshot", async () => {
  const events: WorkspaceSnapshotPush[] = [];
  const facade = new WorkspaceRuntimeFacade({
    snapshotDebounceMs: 25,
    selectionIdFactory: () => "sel-lock-transition",
  });

  facade.subscribe("client-1", (message) => {
    events.push(message);
  });

  const sessionKey = createSessionKey(workspaceA, "session-lock-transition");
  facade.select({
    clientId: "client-1",
    request: {
      requestId: "req-1",
      workspaceRoot: workspaceA,
      reason: "workspace_selected",
    },
  });
  facade.notifySessionCreated(sessionKey, { providerId: "claudeCodeCli" });
  await wait(40);

  facade.notifyLockChanged(sessionKey, {
    active: true,
    reason: "resume_bootstrap",
    transition: {
      rolloverId: "rollover-1",
      sourceSessionId: "source-session",
      targetSessionId: sessionKey.sessionId,
      stageId: "description",
      runSlug: "reviewer",
      reason: "resume_bootstrap",
      awaitingBootstrapTurn: true,
      updatedAt: new Date().toISOString(),
    },
  });
  await wait(5);

  const lockedSnapshot =
    events.at(-1)?.payload.snapshot.sessions[sessionKey.sessionId];
  assert.ok(lockedSnapshot);
  assert.equal(lockedSnapshot.continuityLockActive, true);
  assert.equal(lockedSnapshot.continuityLockReason, "resume_bootstrap");
  assert.equal(
    lockedSnapshot.continuityLockTransition?.awaitingBootstrapTurn,
    true
  );

  facade.notifyLockChanged(sessionKey, {
    active: false,
    reason: "resume_ready",
    transition: null,
  });
  await wait(5);

  const unlockedSnapshot =
    events.at(-1)?.payload.snapshot.sessions[sessionKey.sessionId];
  assert.ok(unlockedSnapshot);
  assert.equal(unlockedSnapshot.continuityLockActive, false);
  assert.equal(unlockedSnapshot.continuityLockReason, "resume_ready");
  assert.equal(unlockedSnapshot.continuityLockTransition, undefined);

  facade.dispose();
});
