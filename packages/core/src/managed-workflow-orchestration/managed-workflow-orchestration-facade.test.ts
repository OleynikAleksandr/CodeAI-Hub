import assert from "node:assert/strict";
import test from "node:test";
import {
  ManagedWorkflowOrchestrationFacade,
  type ManagedWorkflowOrchestrationFacadeContract,
} from ".";

const MANAGED_WORKFLOW_CLUSTER_MESSAGE_PATTERN =
  /Managed Workflow Orchestration cluster/u;

test("managed workflow facade exposes registered technical stages through the public contract", () => {
  const facade: ManagedWorkflowOrchestrationFacadeContract =
    new ManagedWorkflowOrchestrationFacade();

  assert.deepEqual(
    facade.listRegisteredStages().map((stage) => stage.stageId),
    ["diagram_modules", "application_skeleton", "quality_gates"]
  );
  assert.equal(facade.canHandleStage("diagram_modules"), true);
  assert.equal(facade.canHandleStage("description"), false);
  assert.equal(facade.describeStage("description"), null);
});

test("managed workflow facade returns a preview boundary instead of provider dispatch", () => {
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
