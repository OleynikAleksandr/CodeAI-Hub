import type { ApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import type { ApplicationSkeletonPrematureDecision } from "./application-skeleton-premature-materialization-validator";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";

// Phase 1A post-turn structural guard.
//
// Encodes the Observe-vs-Dispatch rule plus the Readiness Resolution table:
//   - terminal event + owned diff → implicit readiness; validate the draft;
//     if structurally complete → commit_ready; otherwise → repair_invalid_draft;
//   - terminal event + no owned diff in Phase 1A → repair_no_progress
//     (one non-commit corrective decision asking the agent to write the draft
//     or report blockers);
//   - no terminal event → noop (Core continues waiting; no validation).
//
// Phases other than `phase_1_draft` return noop because their guards are
// owned by separate microtasks (Phase 2 revision classifier, Phase 3 gate).
// The decision is intentionally describable with a single tagged enum so the
// caller can log/route without re-deriving state.

export type ApplicationSkeletonGuardDecision =
  | {
      readonly kind: "noop";
      readonly reason: ApplicationSkeletonGuardNoopReason;
    }
  | {
      readonly kind: "commit_ready";
      readonly reason: "draft_complete";
    }
  | {
      readonly kind: "repair_invalid_draft";
      readonly reason: "implicit_readiness_with_invalid_draft";
      readonly details: readonly string[];
    }
  | {
      readonly kind: "repair_no_progress";
      readonly reason: "terminal_no_owned_diff_in_phase_1a";
    }
  | {
      readonly blockedPaths: readonly string[];
      readonly kind: "repair_premature_materialization";
      readonly reason: "premature_materialization_before_acceptance";
    };

export type ApplicationSkeletonGuardNoopReason =
  | "no_terminal_event"
  | "out_of_scope_phase";

export interface ApplicationSkeletonContractGuardInput {
  readonly ownedDirtyFiles: readonly string[];
  readonly phase: ApplicationSkeletonPhase;
  readonly prematureDecision?: ApplicationSkeletonPrematureDecision;
  readonly progress: ApplicationSkeletonProgressSnapshot | null;
  readonly terminalEventReceived: boolean;
}

const collectInvalidDraftDetails = (
  progress: ApplicationSkeletonProgressSnapshot | null
): readonly string[] => {
  if (!progress) {
    return ["progress snapshot unavailable"];
  }
  const details: string[] = [];
  if (!progress.markdownExists) {
    details.push("application-skeleton.md is missing");
  }
  if (!progress.mapExists) {
    details.push("application-skeleton-map.json is missing");
  } else if (!progress.mappingReady) {
    details.push("application-skeleton-map.json is not parseable");
  }
  for (const validationError of progress.validationErrors) {
    details.push(validationError);
  }
  return details;
};

export const evaluateApplicationSkeletonContractGuard = (
  input: ApplicationSkeletonContractGuardInput
): ApplicationSkeletonGuardDecision => {
  if (!input.terminalEventReceived) {
    return { kind: "noop", reason: "no_terminal_event" };
  }
  // Premature materialization fires across both Phase 1A and Phase 1B because
  // both phases run before Core opens Phase 2. Higher priority than the
  // structural draft checks: if the agent already touched materialization
  // scope, that is the most actionable repair signal to surface.
  if (
    (input.phase === "phase_1_draft" || input.phase === "phase_2_review") &&
    input.prematureDecision?.kind === "blocked"
  ) {
    return {
      blockedPaths: input.prematureDecision.blockedPaths,
      kind: "repair_premature_materialization",
      reason: "premature_materialization_before_acceptance",
    };
  }
  if (input.phase !== "phase_1_draft") {
    return { kind: "noop", reason: "out_of_scope_phase" };
  }
  if (input.ownedDirtyFiles.length === 0) {
    return {
      kind: "repair_no_progress",
      reason: "terminal_no_owned_diff_in_phase_1a",
    };
  }
  const progress = input.progress;
  const draftStructurallyComplete =
    progress?.markdownExists === true &&
    progress.mapExists === true &&
    progress.mappingReady === true &&
    progress.validationErrors.length === 0;
  if (draftStructurallyComplete) {
    return { kind: "commit_ready", reason: "draft_complete" };
  }
  return {
    kind: "repair_invalid_draft",
    reason: "implicit_readiness_with_invalid_draft",
    details: collectInvalidDraftDetails(progress),
  };
};
