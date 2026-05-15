import type { ManagedWorkflowStepController } from "../managed-workflow-step-controller";

export const descriptionStepController: ManagedWorkflowStepController = {
  createPreviewBoundary: (request) => ({
    code: "managed_workflow_preview_boundary",
    message: [
      "Description is registered in Managed Workflow Orchestration as a provider-direct preliminary step.",
      "Provider dispatch remains enabled; Core does not open managed Git phases for this preliminary step.",
      `Workspace: ${request.workspaceSlug}. Provider requested: ${request.providerId}.`,
    ].join("\n"),
  }),
  descriptor: {
    displayName: "Description",
    phaseTypes: ["provider_direct"],
    stageId: "description",
    startPolicy: "provider_direct",
  },
  ownedPathGlobs: [
    ".codeai-hub/**/description/Final_Description.md",
    ".codeai-hub/**/description/questionnaire.md",
    ".codeai-hub/**/description/**",
    ".codeai-hub/templates/description/**",
  ],
  phases: [],
};
