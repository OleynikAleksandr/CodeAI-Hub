import {
  PERSISTENT_RETURN_PHASE,
  TYPE_A_CORE_GATED_PHASE,
  TYPE_B_USER_REVIEW_PHASE,
} from "../managed-workflow-phase-contracts";
import type { ManagedWorkflowStepController } from "../managed-workflow-step-controller";

export const applicationSkeletonStepController: ManagedWorkflowStepController =
  {
    createPreviewBoundary: (request) => ({
      code: "managed_workflow_preview_boundary",
      message: [
        "Core managed orchestration preview is active for Application Skeleton.",
        "This controller owns contract bootstrap, user-led contract review, filesystem materialization, and the persistent return-open boundary.",
        "Provider dispatch is waiting for the Application Skeleton end-to-end controller release.",
        `Workspace: ${request.workspaceSlug}. Provider requested: ${request.providerId}.`,
      ].join("\n"),
    }),
    descriptor: {
      displayName: "Application Skeleton",
      phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
      stageId: "application_skeleton",
      startPolicy: "managed_dispatch",
    },
    ownedPathGlobs: [
      ".codeai-hub/**/application_skeleton/**",
      "doc/TODO/stages/application-skeleton/**",
      "product-parts/**",
    ],
    phases: [
      TYPE_A_CORE_GATED_PHASE,
      TYPE_B_USER_REVIEW_PHASE,
      PERSISTENT_RETURN_PHASE,
    ],
  };
