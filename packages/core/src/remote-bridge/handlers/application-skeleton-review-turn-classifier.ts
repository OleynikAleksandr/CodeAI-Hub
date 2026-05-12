import type { ApplicationSkeletonPhase } from "./application-skeleton-phase-state";

// Application Skeleton revision-vs-discussion classifier.
//
// In the user-led Phase 2 review and the post-completion Phase 4 idle anchor,
// Core distinguishes between artifact-changing turns that must inject a
// concrete revision task pair and pure discussion turns that stay uncommitted.
// The diff-based rule is the same in both phases:
//   - any tracked Application Skeleton owned diff   → "revision"
//   - no tracked Application Skeleton owned diff    → "discussion"
// Other phases remain `out_of_scope` because their arbitration is owned by
// separate microtasks (Phase 1 guard, Phase 3 materialization gate).

export type ApplicationSkeletonReviewTurnKind =
  | "revision"
  | "discussion"
  | "out_of_scope";

export interface ApplicationSkeletonReviewTurnClassifierInput {
  readonly ownedDirtyFiles: readonly string[];
  readonly phase: ApplicationSkeletonPhase;
}

export const classifyApplicationSkeletonReviewTurn = (
  input: ApplicationSkeletonReviewTurnClassifierInput
): ApplicationSkeletonReviewTurnKind => {
  if (input.phase !== "phase_2_review" && input.phase !== "phase_handoff") {
    return "out_of_scope";
  }
  return input.ownedDirtyFiles.length > 0 ? "revision" : "discussion";
};
