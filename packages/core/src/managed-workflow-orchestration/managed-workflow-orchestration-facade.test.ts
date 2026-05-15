import assert from "node:assert/strict";
import test from "node:test";
import {
  ManagedWorkflowOrchestrationFacade,
  type ManagedWorkflowOrchestrationFacadeContract,
} from ".";
import type { ManagedWorkflowStepController } from "./managed-workflow-step-controller";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

const MANAGED_WORKFLOW_CLUSTER_MESSAGE_PATTERN =
  /Managed Workflow Orchestration cluster/u;
const buildManagedDispatchController = (): ManagedWorkflowStepController => ({
  createPreviewBoundary: () => ({
    code: "managed_workflow_preview_boundary",
    message: "Preview should not be used for managed dispatch.",
  }),
  descriptor: {
    displayName: "Diagram Modules",
    phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
    stageId: "diagram_modules",
    startPolicy: "managed_dispatch",
  },
  ownedPathGlobs: [".codeai-hub/**/diagram_modules/**"],
  phases: [],
});

test("managed workflow facade exposes registered trunk stages through the public contract", () => {
  const facade: ManagedWorkflowOrchestrationFacadeContract =
    new ManagedWorkflowOrchestrationFacade();

  assert.deepEqual(
    facade.listRegisteredStages().map((stage) => stage.stageId),
    [
      "description",
      "virtual_simulation",
      "diagram_modules",
      "application_skeleton",
      "quality_gates",
    ]
  );
  assert.equal(facade.canHandleStage("diagram_modules"), true);
  assert.equal(facade.canHandleStage("description"), true);
  assert.equal(
    facade.describeStage("description")?.startPolicy,
    "provider_direct"
  );
  assert.equal(
    facade.describeStage("diagram_modules")?.startPolicy,
    "managed_dispatch"
  );
});

test("managed workflow facade lets preliminary provider-direct stages dispatch normally", () => {
  const facade = new ManagedWorkflowOrchestrationFacade();

  for (const stageId of ["description", "virtual_simulation"]) {
    const decision = facade.resolveStageStart({
      providerId: "claudeCodeCli",
      stageId,
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    });

    assert.ok(decision);
    assert.equal(decision.canDispatchProvider, true);
    assert.equal(decision.code, "managed_workflow_provider_direct");
    assert.equal(decision.message, "");
    assert.equal(decision.mode, "provider_direct");
    assert.equal(
      facade.previewStageStart({
        providerId: "claudeCodeCli",
        stageId,
        workspaceRoot: "/tmp/demo",
        workspaceSlug: "demo",
      }),
      null
    );
  }
});

test("managed workflow facade returns a preview boundary for technical stages", () => {
  const facade = new ManagedWorkflowOrchestrationFacade();

  const decision = facade.previewStageStart({
    providerId: "codexCli",
    stageId: "quality_gates",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.ok(decision);
  assert.equal(decision.canDispatchProvider, false);
  assert.equal(decision.controllerId, "quality_gates");
  assert.equal(decision.mode, "preview");
  assert.match(decision.message, MANAGED_WORKFLOW_CLUSTER_MESSAGE_PATTERN);
});

test("managed workflow facade can return managed dispatch decisions through the public contract", () => {
  const facade = new ManagedWorkflowOrchestrationFacade({
    registry: new ManagedWorkflowStepRegistry([
      buildManagedDispatchController(),
    ]),
  });

  const decision = facade.resolveStageStart({
    providerId: "codexCli",
    stageId: "diagram_modules",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.ok(decision);
  assert.equal(decision.canDispatchProvider, true);
  assert.equal(decision.code, "managed_workflow_managed_dispatch");
  assert.equal(decision.controllerId, "diagram_modules");
  assert.equal(decision.mode, "managed_dispatch");
  assert.match(decision.message, MANAGED_WORKFLOW_CLUSTER_MESSAGE_PATTERN);
  assert.equal(
    facade.previewStageStart({
      providerId: "codexCli",
      stageId: "diagram_modules",
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    }),
    null
  );
});
