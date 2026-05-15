import assert from "node:assert/strict";
import test from "node:test";
import {
  ManagedWorkflowOrchestrationFacade,
  type ManagedWorkflowOrchestrationFacadeContract,
} from ".";

const MANAGED_WORKFLOW_CLUSTER_MESSAGE_PATTERN =
  /Managed Workflow Orchestration cluster/u;

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
    "core_preview_boundary"
  );
});

test("managed workflow facade lets preliminary provider-direct stages dispatch normally", () => {
  const facade = new ManagedWorkflowOrchestrationFacade();

  assert.equal(
    facade.previewStageStart({
      providerId: "claudeCodeCli",
      stageId: "description",
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    }),
    null
  );
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
