import assert from "node:assert/strict";
import test from "node:test";
import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";
import {
  PERSISTENT_RETURN_PHASE,
  TYPE_B_USER_REVIEW_PHASE,
} from "./managed-workflow-phase-contracts";
import { ManagedWorkflowStateMachine } from "./managed-workflow-state-machine";
import { classifyManagedWorkflowUserIntent } from "./managed-workflow-user-intent-classifier";

const createMachineSnapshot = (
  stageId: ManagedWorkflowStageId = "application_skeleton"
) =>
  new ManagedWorkflowStateMachine().createInitialSnapshot({
    stageId,
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

test("state machine moves accepted Type A validation into Type B user review", () => {
  const machine = new ManagedWorkflowStateMachine();
  const transition = machine.reduce(createMachineSnapshot("diagram_modules"), {
    eventId: "evt-accepted-core",
    kind: "core_validation_completed",
    occurredAt: "2026-05-15T00:02:00.000Z",
    reasons: [],
    result: "accepted",
    stageId: "diagram_modules",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.equal(transition.snapshot.status, "waiting_for_user");
  assert.equal(transition.snapshot.currentPhase?.type, "user_led_review");
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

test("state machine opens persistent return after Diagram Modules review acceptance", () => {
  const machine = new ManagedWorkflowStateMachine();
  const reviewSnapshot = machine.reduce(
    createMachineSnapshot("diagram_modules"),
    {
      eventId: "evt-core-accepted",
      kind: "core_validation_completed",
      occurredAt: "2026-05-15T00:02:00.000Z",
      reasons: [],
      result: "accepted",
      stageId: "diagram_modules",
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    }
  ).snapshot;

  const transition = machine.reduce(reviewSnapshot, {
    content: "Окей, подтверждаю",
    eventId: "evt-user-accepted",
    intent: classifyManagedWorkflowUserIntent("Окей, подтверждаю"),
    kind: "user_message_received",
    occurredAt: "2026-05-15T00:03:00.000Z",
    stageId: "diagram_modules",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.equal(transition.snapshot.accepted, true);
  assert.equal(transition.snapshot.status, "persistent_return_open");
  assert.equal(
    transition.snapshot.currentPhase?.type,
    "persistent_user_return"
  );
  assert.equal(transition.effects[0]?.kind, "append_core_message");
});

test("state machine routes Diagram Modules review revisions to the provider", () => {
  const machine = new ManagedWorkflowStateMachine();
  const reviewSnapshot = machine.reduce(
    createMachineSnapshot("diagram_modules"),
    {
      eventId: "evt-core-accepted",
      kind: "core_validation_completed",
      occurredAt: "2026-05-15T00:02:00.000Z",
      reasons: [],
      result: "accepted",
      stageId: "diagram_modules",
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    }
  ).snapshot;

  const transition = machine.reduce(reviewSnapshot, {
    content: "Добавь отдельный модуль session-store",
    eventId: "evt-user-revision",
    intent: classifyManagedWorkflowUserIntent(
      "Добавь отдельный модуль session-store"
    ),
    kind: "user_message_received",
    occurredAt: "2026-05-15T00:03:00.000Z",
    stageId: "diagram_modules",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.equal(transition.snapshot.status, "waiting_for_provider");
  assert.equal(
    transition.snapshot.lastCoreMessage,
    "Добавь отдельный модуль session-store"
  );
  assert.equal(
    transition.effects.some(
      (effect) =>
        effect.kind === "append_core_message" && effect.visibleToProvider
    ),
    true
  );
});

test("state machine asks for clarification on ambiguous user review messages", () => {
  const machine = new ManagedWorkflowStateMachine();
  const reviewSnapshot = machine.reduce(
    createMachineSnapshot("diagram_modules"),
    {
      eventId: "evt-core-accepted",
      kind: "core_validation_completed",
      occurredAt: "2026-05-15T00:02:00.000Z",
      reasons: [],
      result: "accepted",
      stageId: "diagram_modules",
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    }
  ).snapshot;

  const transition = machine.reduce(reviewSnapshot, {
    content: "интересно",
    eventId: "evt-user-unknown",
    intent: classifyManagedWorkflowUserIntent("интересно"),
    kind: "user_message_received",
    occurredAt: "2026-05-15T00:03:00.000Z",
    stageId: "diagram_modules",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.equal(transition.snapshot.status, "waiting_for_user");
  assert.equal(transition.snapshot.blocker?.owner, "user");
  assert.equal(
    transition.effects.some(
      (effect) =>
        effect.kind === "append_core_message" &&
        effect.visibleToUser &&
        !effect.visibleToProvider
    ),
    true
  );
});

test("phase contracts expose reusable Type B and persistent-return descriptors", () => {
  assert.equal(TYPE_B_USER_REVIEW_PHASE.type, "user_led_review");
  assert.equal(TYPE_B_USER_REVIEW_PHASE.successStatus, "waiting_for_provider");
  assert.equal(PERSISTENT_RETURN_PHASE.type, "persistent_user_return");
  assert.equal(PERSISTENT_RETURN_PHASE.successStatus, "persistent_return_open");
});
