import {
  PERSISTENT_RETURN_PHASE,
  TYPE_A_CORE_GATED_PHASE,
  TYPE_B_USER_REVIEW_PHASE,
} from "../managed-workflow-phase-contracts";
import type { ManagedWorkflowStepController } from "../managed-workflow-step-controller";

export const diagramModulesStepController: ManagedWorkflowStepController = {
  createPreviewBoundary: (request) => ({
    code: "managed_workflow_preview_boundary",
    message: [
      "Core managed orchestration preview is active for Diagram Modules.",
      "This controller owns the Core-gated diagram materialization phase, the user-led review phase, and the persistent return-open boundary.",
      "Provider dispatch is waiting for the Diagram Modules end-to-end controller release.",
      `Workspace: ${request.workspaceSlug}. Provider requested: ${request.providerId}.`,
    ].join("\n"),
  }),
  descriptor: {
    displayName: "Diagram Modules",
    phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
    stageId: "diagram_modules",
  },
  ownedPathGlobs: [
    ".codeai-hub/**/diagram_modules/**",
    "doc/TODO/stages/diagram-modules/**",
  ],
  phases: [
    TYPE_A_CORE_GATED_PHASE,
    TYPE_B_USER_REVIEW_PHASE,
    PERSISTENT_RETURN_PHASE,
  ],
};
