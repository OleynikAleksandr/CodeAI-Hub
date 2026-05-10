import type { ApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

// Core-owned command handler for Application Skeleton "Accept Contract".
// Pilot scope: Application Skeleton only. The handler is a pure decision —
// callers are responsible for routing it to the existing Phase 2 materialization
// dispatcher (Option B acceptance commit policy: acceptance is folded into the
// next managed commit, not produced as a separate `docs: accept ...` commit).
//
// Preconditions (Phase 1B → Phase 2 transition):
//   - phase classifier reports `phase_1b_review`;
//   - Application Skeleton draft exists (markdown + map) and is parseable;
//   - the draft is not yet materialized;
//   - there is no uncommitted owned diff (the latest revision must already be
//     committed by the Phase 1B per-revision boundary);
//   - the Git tree has no out-of-owner dirty paths blocking the stage.

export interface ApplicationSkeletonAcceptContractContext {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly managedGitStatus: ManagedGitStatus;
  readonly phase: ApplicationSkeletonPhase;
}

export type ApplicationSkeletonAcceptContractDecision =
  | { readonly kind: "accepted"; readonly stage: "application_skeleton" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly string[];
      readonly stage: "application_skeleton";
    };

export const evaluateApplicationSkeletonAcceptContractCommand = (
  context: ApplicationSkeletonAcceptContractContext
): ApplicationSkeletonAcceptContractDecision => {
  const reasons: string[] = [];
  if (context.phase !== "phase_1b_review") {
    reasons.push(
      "Application Skeleton stage is not in Phase 1B review (current phase: " +
        `${context.phase}).`
    );
  }
  const progress = context.applicationSkeletonProgress;
  if (progress) {
    if (!(progress.markdownExists && progress.mapExists)) {
      reasons.push(
        "Application Skeleton draft artifacts are missing (markdown or map.json)."
      );
    }
    if (!progress.mappingReady) {
      reasons.push(
        "Application Skeleton map.json is not parseable; the draft cannot be accepted."
      );
    }
    if (progress.materialized) {
      reasons.push(
        "Application Skeleton is already materialized; acceptance is no-op."
      );
    }
    if (progress.validationErrors.length > 0) {
      reasons.push(
        `Application Skeleton validator has ${progress.validationErrors.length} unresolved error(s).`
      );
    }
  } else {
    reasons.push("Application Skeleton progress snapshot is unavailable.");
  }
  if (context.managedGitStatus.dirtyByStage.application_skeleton.length > 0) {
    reasons.push(
      "Application Skeleton has an uncommitted owned diff; the latest revision must be committed first."
    );
  }
  const outOfOwnerDirty =
    context.managedGitStatus.dirtyByStage.diagram_modules.length +
    context.managedGitStatus.dirtyByStage.quality_gates.length;
  if (outOfOwnerDirty > 0) {
    reasons.push(
      "Other managed stages have unresolved dirty paths blocking the workspace."
    );
  }
  if (reasons.length > 0) {
    return { kind: "rejected", reasons, stage: "application_skeleton" };
  }
  return { kind: "accepted", stage: "application_skeleton" };
};
