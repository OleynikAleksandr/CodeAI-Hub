import {
  PERSISTENT_RETURN_PHASE,
  TYPE_A_CORE_GATED_PHASE,
  TYPE_B_USER_REVIEW_PHASE,
} from "../managed-workflow-phase-contracts";
import type { ManagedWorkflowStepController } from "../managed-workflow-step-controller";

export const qualityGatesStepController: ManagedWorkflowStepController = {
  createPreviewBoundary: (request) => ({
    code: "managed_workflow_preview_boundary",
    message: [
      "Core managed orchestration preview is active for Quality Gates Baseline.",
      "This controller owns baseline contract bootstrap, user-led contract review, accepted-only integration, and the persistent return-open boundary.",
      "Provider dispatch is waiting for the Quality Gates end-to-end controller release.",
      `Workspace: ${request.workspaceSlug}. Provider requested: ${request.providerId}.`,
    ].join("\n"),
  }),
  descriptor: {
    displayName: "Quality Gates Baseline",
    phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
    stageId: "quality_gates",
  },
  ownedPathGlobs: [
    ".codeai-hub/**/quality_gates/**",
    "doc/TODO/stages/quality-gates/**",
    ".husky/**",
    "scripts/**",
  ],
  phases: [
    TYPE_A_CORE_GATED_PHASE,
    TYPE_B_USER_REVIEW_PHASE,
    TYPE_A_CORE_GATED_PHASE,
    PERSISTENT_RETURN_PHASE,
  ],
};
