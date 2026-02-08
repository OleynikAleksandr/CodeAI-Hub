import assert from "node:assert/strict";
import test from "node:test";
import { SessionRuntime } from "./session-runtime";
import type { SessionKey } from "./workspace-runtime-types";

const sessionKey: SessionKey = {
  workspaceRoot: "/tmp/workspace-runtime",
  nodeId: "description",
  sessionId: "session-1",
};

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

test("SessionRuntime handles idle-running-idle transitions", () => {
  const changes: string[] = [];
  const runtime = new SessionRuntime({
    watchdogTimeoutMs: 1000,
    watchdogTickMs: 20,
    onStateChanged: (_key, field, snapshot) => {
      changes.push(`${field}:${snapshot.turnState}`);
    },
  });

  runtime.markRunning(sessionKey);
  assert.equal(runtime.getState(sessionKey).turnState, "running");

  runtime.markIdle(sessionKey);
  assert.equal(runtime.getState(sessionKey).turnState, "idle");

  assert.deepEqual(changes, [
    "turnState:running",
    "lastHeartbeatAt:running",
    "turnState:idle",
  ]);
  runtime.dispose();
});

test("SessionRuntime watchdog sets running session to idle on timeout", async () => {
  let now = 0;
  const changes: string[] = [];
  const runtime = new SessionRuntime({
    watchdogTimeoutMs: 50,
    watchdogTickMs: 5,
    now: () => now,
    onStateChanged: (_key, field, snapshot) => {
      changes.push(`${field}:${snapshot.turnState}`);
    },
  });

  runtime.markRunning(sessionKey);
  now = 80;
  await wait(20);

  assert.equal(runtime.getState(sessionKey).turnState, "idle");
  assert.ok(changes.includes("turnState:idle"));
  runtime.dispose();
});

test("SessionRuntime heartbeat resets watchdog timeout window", async () => {
  let now = 0;
  const runtime = new SessionRuntime({
    watchdogTimeoutMs: 50,
    watchdogTickMs: 5,
    now: () => now,
  });

  runtime.markRunning(sessionKey);
  now = 30;
  runtime.recordHeartbeat(sessionKey);

  now = 70;
  await wait(20);
  assert.equal(runtime.getState(sessionKey).turnState, "running");

  now = 95;
  await wait(20);
  assert.equal(runtime.getState(sessionKey).turnState, "idle");
  runtime.dispose();
});

test("SessionRuntime emits lock transitions", () => {
  const changes: string[] = [];
  const runtime = new SessionRuntime({
    watchdogTimeoutMs: 1000,
    watchdogTickMs: 20,
    onStateChanged: (_key, field, snapshot) => {
      changes.push(`${field}:${snapshot.continuityLockActive}`);
    },
  });

  runtime.setLock(sessionKey, true);
  runtime.setLock(sessionKey, false);

  assert.deepEqual(changes, [
    "continuityLockActive:true",
    "continuityLockActive:false",
  ]);
  runtime.dispose();
});

test("SessionRuntime tracks finalTurnCompleted transitions", () => {
  const values: boolean[] = [];
  const runtime = new SessionRuntime({
    watchdogTimeoutMs: 1000,
    watchdogTickMs: 20,
    onStateChanged: (_key, field, snapshot) => {
      if (field === "finalTurnCompleted") {
        values.push(snapshot.finalTurnCompleted);
      }
    },
  });

  runtime.setFinalTurnCompleted(sessionKey, true);
  runtime.setFinalTurnCompleted(sessionKey, false);

  assert.deepEqual(values, [true, false]);
  runtime.dispose();
});

test("SessionRuntime invokes callback with latest heartbeat state", () => {
  let now = 100;
  const heartbeatTimestamps: number[] = [];
  const runtime = new SessionRuntime({
    watchdogTimeoutMs: 1000,
    watchdogTickMs: 20,
    now: () => now,
    onStateChanged: (_key, field, snapshot) => {
      if (field === "lastHeartbeatAt" && snapshot.lastHeartbeatAt !== null) {
        heartbeatTimestamps.push(snapshot.lastHeartbeatAt);
      }
    },
  });

  runtime.markRunning(sessionKey);
  now = 150;
  runtime.recordHeartbeat(sessionKey);

  assert.deepEqual(heartbeatTimestamps, [100, 150]);
  runtime.dispose();
});
