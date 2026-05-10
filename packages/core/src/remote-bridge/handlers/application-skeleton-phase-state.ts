import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";

// Application Skeleton orchestration phase derived from observable artifact state.
// phase_1_draft → Core-gated initial draft (artifacts missing or partial).
// phase_2_review → user-led review (Core-clean draft exists, not accepted yet).
// phase_3_materialization → Core-led materialization (accepted, not materialized).
// phase_handoff → materialized; stage awaits downstream handoff.
export type ApplicationSkeletonPhase =
  | "phase_1_draft"
  | "phase_2_review"
  | "phase_3_materialization"
  | "phase_handoff"
  // Deprecated aliases retained only while in-progress consumers migrate; removed in classifier-cleanup task.
  | "phase_1a_draft"
  | "phase_1b_review"
  | "phase_2_materialization";

export const classifyApplicationSkeletonPhase = (
  progress: ApplicationSkeletonProgressSnapshot | null
): ApplicationSkeletonPhase => {
  if (!progress) {
    return "phase_1_draft";
  }
  if (progress.materialized) {
    return "phase_handoff";
  }
  if (progress.accepted) {
    return "phase_3_materialization";
  }
  if (progress.markdownExists && progress.mapExists) {
    return "phase_2_review";
  }
  return "phase_1_draft";
};
