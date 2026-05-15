import assert from "node:assert/strict";
import test from "node:test";
import { ManagedWorkflowProviderGateway } from "./managed-workflow-provider-gateway";

test("provider gateway produces visible Core preview message without provider dispatch", () => {
  const gateway = new ManagedWorkflowProviderGateway();
  const message = gateway.buildPreviewBoundaryMessage({
    decision: {
      canDispatchProvider: false,
      code: "managed_workflow_preview_boundary",
      controllerId: "diagram_modules",
      message: "Core preview boundary.",
      mode: "preview",
      stage: {
        displayName: "Diagram Modules",
        phaseTypes: ["core_gated"],
        stageId: "diagram_modules",
      },
    },
    timestamp: "2026-05-15T00:00:00.000Z",
  });

  assert.deepEqual(message, {
    content: "Core preview boundary.",
    role: "system",
    stageId: "diagram_modules",
    tag: "managed-workflow-preview",
    timestamp: "2026-05-15T00:00:00.000Z",
    visibleToProvider: false,
    visibleToUser: true,
  });
});
