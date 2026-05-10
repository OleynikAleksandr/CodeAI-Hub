import type { ApplicationSkeletonPhase } from "./application-skeleton-phase-state";

// Phase 2 (Type B) revision-vs-discussion classifier.
//
// In Phase 2 the user leads the conversation and the agent answers without
// Core steering. Per-revision autocommit applies only to artifact-changing
// turns. The diff-based pilot rule (per the planning doc) is:
//   - any tracked Application Skeleton owned diff   → "revision"
//     (Core's Phase 2 structural guard validates and the per-revision
//     managed commit fires after the post-turn boundary);
//   - no tracked Application Skeleton owned diff    → "discussion"
//     (a pure no-op / clarifying turn that is recorded only in the standard
//     session history and does not produce a Git commit).
// Phases other than `phase_2_review` return `out_of_scope` because their
// arbitration is owned by separate microtasks (Phase 1 guard, Phase 3 gate).

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
  if (input.phase !== "phase_2_review") {
    return "out_of_scope";
  }
  return input.ownedDirtyFiles.length > 0 ? "revision" : "discussion";
};
