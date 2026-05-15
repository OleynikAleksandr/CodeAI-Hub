import assert from "node:assert/strict";
import test from "node:test";
import { ManagedWorkflowPlanStore } from "./managed-workflow-plan-store";
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
  stageId: "diagram_modules",
  status,
  updatedAt: "2026-05-15T00:00:00.000Z",
  version: 1,
  workspaceRoot: "/tmp/demo",
  workspaceSlug: "demo",
});

test("plan store appends snapshots and reconstructs latest state read-only", () => {
  const store = new ManagedWorkflowPlanStore();
  store.appendSnapshot({
    recordedAt: "2026-05-15T00:00:00.000Z",
    recordId: "record-1",
    snapshot: createSnapshot("core_gated"),
  });
  store.appendSnapshot({
    recordedAt: "2026-05-15T00:01:00.000Z",
    recordId: "record-2",
    snapshot: createSnapshot("waiting_for_user"),
  });

  const latest = store.readLatestSnapshot({
    stageId: "diagram_modules",
    workspaceSlug: "demo",
  });

  assert.equal(latest?.status, "waiting_for_user");
  assert.equal(
    store.readLedger({ stageId: "diagram_modules", workspaceSlug: "demo" })
      .length,
    2
  );
});

test("plan store separates stage ledgers without child-plan mutation", () => {
  const store = new ManagedWorkflowPlanStore();
  store.appendSnapshot({
    recordedAt: "2026-05-15T00:00:00.000Z",
    recordId: "record-1",
    snapshot: createSnapshot("core_gated"),
  });

  assert.equal(
    store.readLatestSnapshot({
      stageId: "quality_gates",
      workspaceSlug: "demo",
    }),
    null
  );
});
