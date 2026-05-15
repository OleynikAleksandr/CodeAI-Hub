import type { ManagedWorkflowStepController } from "../managed-workflow-step-controller";

export const virtualSimulationStepController: ManagedWorkflowStepController = {
  createPreviewBoundary: (request) => ({
    code: "managed_workflow_preview_boundary",
    message: [
      "Virtual Simulation is registered in Managed Workflow Orchestration as a provider-direct preliminary step.",
      "Provider dispatch remains enabled; Core does not open managed Git phases for this preliminary step.",
      `Workspace: ${request.workspaceSlug}. Provider requested: ${request.providerId}.`,
    ].join("\n"),
  }),
  descriptor: {
    displayName: "Virtual Simulation",
    phaseTypes: ["provider_direct"],
    stageId: "virtual_simulation",
    startPolicy: "provider_direct",
  },
  ownedPathGlobs: [
    ".codeai-hub/**/virtual_simulation/virtual-simulation.md",
    ".codeai-hub/**/virtual_simulation/**",
    ".codeai-hub/templates/virtual_simulation/**",
  ],
  phases: [],
};
