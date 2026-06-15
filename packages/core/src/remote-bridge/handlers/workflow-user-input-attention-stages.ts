import type { SessionManager } from "../../session-manager";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { ManagedDocumentationReviewOpenStages } from "./managed-review-state-readers";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import { resolvePreliminaryReviewOpenStages } from "./workflow-preliminary-review-attention";
import type { WorkflowInputAttentionDocumentationStage } from "./workflow-user-input-attention";

const MANAGED_REVIEW_TAG = "managed-workflow-user-review";
const MANAGED_REVIEW_COMPLETE_TAG = "managed-workflow-complete";
const USER_ACTION_PENDING_STAGES = new Set([
  "application_skeleton",
  "description",
  "diagram_modules",
  "quality_gates",
  "virtual_simulation",
]);

type UserActionPendingStage =
  | "application_skeleton"
  | "description"
  | "diagram_modules"
  | "quality_gates"
  | "virtual_simulation";

const isUserActionPendingStage = (
  stage: string | null
): stage is UserActionPendingStage =>
  Boolean(stage && USER_ACTION_PENDING_STAGES.has(stage));

const hasPendingManagedReviewUserAction = (
  messages: readonly {
    readonly role: string;
    readonly tag?: string;
  }[]
): boolean => {
  let reviewOpen = false;
  let actionPending = false;
  for (const message of messages) {
    if (message.role === "system" && message.tag === MANAGED_REVIEW_TAG) {
      reviewOpen = true;
      actionPending = false;
      continue;
    }
    if (
      message.role === "system" &&
      message.tag === MANAGED_REVIEW_COMPLETE_TAG
    ) {
      reviewOpen = false;
      actionPending = false;
      continue;
    }
    if (message.role === "user" && reviewOpen) {
      actionPending = true;
    }
  }
  return actionPending;
};

const resolveManagedReviewUserActionPendingStages = (params: {
  readonly sessionManager?: SessionManager;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): ReadonlySet<UserActionPendingStage> => {
  const stages = new Set<UserActionPendingStage>();
  for (const session of params.sessionManager?.listSessions() ?? []) {
    if (
      session.workspacePath !== params.workspaceRoot ||
      session.initiativeSlug !== params.workspaceSlug ||
      !isUserActionPendingStage(session.stage)
    ) {
      continue;
    }
    if (hasPendingManagedReviewUserAction(session.messages)) {
      stages.add(session.stage);
    }
  }
  return stages;
};

export const buildWorkflowUserInputDocumentationStages = (params: {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly managedReviewOpen: ManagedDocumentationReviewOpenStages;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly sessionManager?: SessionManager;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): readonly WorkflowInputAttentionDocumentationStage[] => {
  const preliminaryReviewOpenStages = resolvePreliminaryReviewOpenStages({
    sessionManager: params.sessionManager,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  const reviewActionPendingStages = resolveManagedReviewUserActionPendingStages(
    {
      sessionManager: params.sessionManager,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    }
  );
  const managedReviewOpen =
    params.managedReviewOpen.diagramModules ||
    params.managedReviewOpen.applicationSkeleton ||
    params.managedReviewOpen.qualityGates;
  const virtualSimulationReviewOpen =
    preliminaryReviewOpenStages.has("virtual_simulation") && !managedReviewOpen;
  const descriptionReviewOpen =
    preliminaryReviewOpenStages.has("description") &&
    !virtualSimulationReviewOpen &&
    !managedReviewOpen;

  return [
    {
      progress: null,
      reviewActionPending: reviewActionPendingStages.has("description"),
      reviewOpen: descriptionReviewOpen,
      stage: "description",
    },
    {
      progress: null,
      reviewActionPending: reviewActionPendingStages.has("virtual_simulation"),
      reviewOpen: virtualSimulationReviewOpen,
      stage: "virtual_simulation",
    },
    {
      progress: null,
      reviewActionPending: reviewActionPendingStages.has("diagram_modules"),
      reviewOpen: params.managedReviewOpen.diagramModules,
      stage: "diagram_modules",
    },
    {
      progress: params.applicationSkeletonProgress,
      reviewActionPending: reviewActionPendingStages.has(
        "application_skeleton"
      ),
      reviewOpen: params.managedReviewOpen.applicationSkeleton,
      stage: "application_skeleton",
    },
    {
      artifactPaths: params.qualityGatesProgress
        ? undefined
        : [
            `.codeai-hub/${params.workspaceSlug}/quality_gates/quality-gates-research.md`,
            `.codeai-hub/${params.workspaceSlug}/quality_gates/quality-gates-research.json`,
          ],
      progress: params.qualityGatesProgress,
      reviewActionPending: reviewActionPendingStages.has("quality_gates"),
      reviewOpen: params.managedReviewOpen.qualityGates,
      stage: "quality_gates",
    },
  ];
};
