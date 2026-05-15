import assert from "node:assert/strict";
import test from "node:test";
import {
  TYPE_A_CORE_GATED_PHASE,
  TYPE_B_USER_REVIEW_PHASE,
} from "./managed-workflow-phase-contracts";
import type { ManagedWorkflowStepController } from "./managed-workflow-step-controller";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

const ALREADY_REGISTERED_PATTERN = /already registered/u;
const QUALITY_GATES_BASELINE_PATTERN = /Quality Gates Baseline/u;

const createController = (
  stageId: "diagram_modules" | "application_skeleton"
): ManagedWorkflowStepController => ({
  createPreviewBoundary: () => ({
    code: "managed_workflow_preview_boundary",
    message: `Preview boundary for ${stageId}`,
  }),
  descriptor: {
    displayName: stageId,
    phaseTypes: ["core_gated", "user_led_review"],
    stageId,
  },
  ownedPathGlobs: [`.codeai-hub/**/${stageId}/**`],
  phases: [TYPE_A_CORE_GATED_PHASE, TYPE_B_USER_REVIEW_PHASE],
});

test("step registry registers controllers without runtime dispatch branches", () => {
  const registry = new ManagedWorkflowStepRegistry([
    createController("diagram_modules"),
    createController("application_skeleton"),
  ]);

  assert.equal(registry.has("diagram_modules"), true);
  assert.equal(registry.has("quality_gates"), false);
  assert.deepEqual(
    registry.list().map((controller) => controller.descriptor.stageId),
    ["diagram_modules", "application_skeleton"]
  );
});

test("default step registry exposes all registered trunk stages", () => {
  const registry = new ManagedWorkflowStepRegistry();

  assert.deepEqual(
    registry.list().map((controller) => controller.descriptor.stageId),
    [
      "description",
      "virtual_simulation",
      "diagram_modules",
      "application_skeleton",
      "quality_gates",
    ]
  );
  assert.equal(
    registry.get("description")?.descriptor.startPolicy,
    "provider_direct"
  );
  assert.equal(
    registry.get("diagram_modules")?.descriptor.startPolicy,
    "managed_dispatch"
  );
  assert.match(
    registry.get("quality_gates")?.createPreviewBoundary({
      providerId: "claudeCodeCli",
      stageId: "quality_gates",
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    }).message ?? "",
    QUALITY_GATES_BASELINE_PATTERN
  );
});

test("step registry rejects duplicate stage controllers", () => {
  assert.throws(
    () =>
      new ManagedWorkflowStepRegistry([
        createController("diagram_modules"),
        createController("diagram_modules"),
      ]),
    ALREADY_REGISTERED_PATTERN
  );
});
