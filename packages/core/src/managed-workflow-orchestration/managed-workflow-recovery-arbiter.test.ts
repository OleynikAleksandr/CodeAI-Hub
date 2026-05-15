import assert from "node:assert/strict";
import test from "node:test";
import { ManagedWorkflowRecoveryArbiter } from "./managed-workflow-recovery-arbiter";
import type { ManagedWorkflowSnapshot } from "./managed-workflow-snapshot";

const createSnapshot = (
  status: ManagedWorkflowSnapshot["status"]
): ManagedWorkflowSnapshot => ({
  accepted: false,
  activeTaskId: null,
  blocker: null,
  currentPhase: null,
  integrated: false,
  lastCoreMessage: null,
  materialized: false,
  stageId: "quality_gates",
  status,
  updatedAt: "2026-05-15T00:00:00.000Z",
  version: 1,
  workspaceRoot: "/tmp/demo",
  workspaceSlug: "demo",
});

test("recovery arbiter waits for user during user-led review", () => {
  const decision = new ManagedWorkflowRecoveryArbiter().decide({
    idleForMs: 120_000,
    snapshot: createSnapshot("waiting_for_user"),
  });

  assert.equal(decision.action, "wait_user");
});

test("recovery arbiter retries provider only after the retry threshold", () => {
  const arbiter = new ManagedWorkflowRecoveryArbiter({ retryAfterMs: 10_000 });

  assert.equal(
    arbiter.decide({
      idleForMs: 9000,
      snapshot: createSnapshot("waiting_for_provider"),
    }).action,
    "wait_provider"
  );
  assert.equal(
    arbiter.decide({
      idleForMs: 10_000,
      snapshot: createSnapshot("waiting_for_provider"),
    }).action,
    "retry_provider"
  );
});

test("recovery arbiter preserves blocked and panic-stop states", () => {
  const arbiter = new ManagedWorkflowRecoveryArbiter();

  assert.equal(
    arbiter.decide({ idleForMs: 0, snapshot: createSnapshot("blocked") })
      .action,
    "blocked"
  );
  assert.equal(
    arbiter.decide({ idleForMs: 0, snapshot: createSnapshot("panic_stopped") })
      .action,
    "panic_stop"
  );
});
