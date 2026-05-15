import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSISTENT_RETURN_PHASE,
  TYPE_B_USER_REVIEW_PHASE,
} from "./managed-workflow-phase-contracts";
import { ManagedWorkflowStateMachine } from "./managed-workflow-state-machine";

const createMachineSnapshot = () =>
  new ManagedWorkflowStateMachine().createInitialSnapshot({
    stageId: "application_skeleton",
    updatedAt: "2026-05-15T00:00:00.000Z",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

test("state machine opens Type A core-gated phase without side-effect execution", () => {
  const machine = new ManagedWorkflowStateMachine();
  const transition = machine.reduce(createMachineSnapshot(), {
    eventId: "evt-1",
    kind: "stage_start_requested",
    occurredAt: "2026-05-15T00:01:00.000Z",
    providerId: "codexCli",
    stageId: "application_skeleton",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.equal(transition.snapshot.status, "core_gated");
  assert.deepEqual(
    transition.effects.map((effect) => effect.kind),
    ["append_core_message", "persist_snapshot", "expose_read_model"]
  );
});

test("state machine turns Core rejection into provider-visible correction state", () => {
  const machine = new ManagedWorkflowStateMachine();
  const transition = machine.reduce(createMachineSnapshot(), {
    eventId: "evt-2",
    kind: "core_validation_completed",
    occurredAt: "2026-05-15T00:02:00.000Z",
    reasons: ["missing accepted flag"],
    result: "rejected",
    stageId: "application_skeleton",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.equal(transition.snapshot.status, "waiting_for_provider");
  assert.equal(transition.snapshot.blocker?.owner, "provider");
  assert.equal(
    transition.effects.some((effect) => effect.kind === "request_commit"),
    false
  );
});

test("state machine treats user acceptance as a provider-visible continuation signal", () => {
  const machine = new ManagedWorkflowStateMachine();
  const transition = machine.reduce(createMachineSnapshot(), {
    content: "Подтверждаю",
    eventId: "evt-3",
    intent: "accept",
    kind: "user_message_received",
    occurredAt: "2026-05-15T00:03:00.000Z",
    stageId: "application_skeleton",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.equal(transition.snapshot.accepted, true);
  assert.equal(transition.snapshot.status, "waiting_for_provider");
  assert.equal(transition.effects[0]?.kind, "append_core_message");
});

test("phase contracts expose reusable Type B and persistent-return descriptors", () => {
  assert.equal(TYPE_B_USER_REVIEW_PHASE.type, "user_led_review");
  assert.equal(TYPE_B_USER_REVIEW_PHASE.successStatus, "waiting_for_provider");
  assert.equal(PERSISTENT_RETURN_PHASE.type, "persistent_user_return");
  assert.equal(PERSISTENT_RETURN_PHASE.successStatus, "persistent_return_open");
});
