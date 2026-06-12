import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkflowUserInputAttentionCursor } from "./workflow-user-input-attention";

const WORKSPACE_SLUG = "finderwidget-test01";

test("resolveWorkflowUserInputAttentionCursor activates managed documentation review gate", () => {
  const cursor = resolveWorkflowUserInputAttentionCursor({
    developmentTree: {},
    documentationStages: [
      {
        progress: { substep: "awaiting_acceptance" },
        stage: "quality_gates",
      },
    ],
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.equal(cursor.activeUserGate?.nodeId, "workflow:quality_gates");
  assert.equal(cursor.activeUserGate?.nodeKind, "workflow_stage");
  assert.equal(cursor.activeUserGate?.stage, "quality_gates");
  assert.equal(cursor.activeUserGate?.inputLocked, false);
  assert.equal(cursor.activeUserGate?.status, "active");
  assert.equal(cursor.queuedUserGates.length, 0);
});

test("resolveWorkflowUserInputAttentionCursor ignores completed documentation stages", () => {
  const cursor = resolveWorkflowUserInputAttentionCursor({
    developmentTree: {},
    documentationStages: [
      {
        progress: { substep: "accepted" },
        stage: "application_skeleton",
      },
      {
        progress: { substep: "integrated" },
        stage: "quality_gates",
      },
    ],
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.equal(cursor.activeUserGate, null);
  assert.deepEqual(cursor.queuedUserGates, []);
});

test("resolveWorkflowUserInputAttentionCursor keeps development tree gates before documentation gates", () => {
  const cursor = resolveWorkflowUserInputAttentionCursor({
    developmentTree: {
      activeUserGate: {
        id: "product-part:finder-widget-shell/brief-review",
        nodeId: "product-part:finder-widget-shell",
        partId: "finder-widget-shell",
      },
      queuedUserGates: [
        {
          id: "product-part:finder-widget/brief-review",
          nodeId: "product-part:finder-widget",
          partId: "finder-widget",
        },
      ],
    },
    documentationStages: [
      {
        progress: { substep: "awaiting_acceptance" },
        stage: "quality_gates",
      },
    ],
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.equal(
    cursor.activeUserGate?.nodeId,
    "product-part:finder-widget-shell"
  );
  assert.equal(cursor.activeUserGate?.inputLocked, false);
  assert.equal(cursor.queuedUserGates.length, 2);
  assert.equal(cursor.queuedUserGates[0]?.nodeId, "product-part:finder-widget");
  assert.equal(cursor.queuedUserGates[0]?.inputLocked, true);
  assert.equal(cursor.queuedUserGates[1]?.nodeId, "workflow:quality_gates");
  assert.equal(cursor.queuedUserGates[1]?.inputLocked, true);
});
