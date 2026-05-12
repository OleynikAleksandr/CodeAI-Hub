import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

export type QualityGatesPhase =
  | "phase_1_draft"
  | "phase_2_review"
  | "phase_2_accepted"
  | "phase_3_integration"
  | "phase_4_user_return"
  | "phase_outdated"
  | "phase_idle";

export type QualityGatesGuardNoopReason =
  | "no_terminal_event"
  | "out_of_scope_phase";

export type QualityGatesGuardDecision =
  | { readonly kind: "noop"; readonly reason: QualityGatesGuardNoopReason }
  | { readonly kind: "commit_ready"; readonly reason: "draft_complete" }
  | {
      readonly details: readonly string[];
      readonly kind: "repair_invalid_draft";
      readonly reason: "implicit_readiness_with_invalid_draft";
    }
  | {
      readonly kind: "repair_no_progress";
      readonly reason: "terminal_no_owned_diff_in_phase_1_draft";
    }
  | {
      readonly blockedPaths: readonly string[];
      readonly kind: "repair_premature_integration";
      readonly reason: "premature_integration_before_acceptance";
    };

export interface QualityGatesContractGuardInput {
  readonly ownedDirtyFiles: readonly string[];
  readonly phase: QualityGatesPhase;
  readonly progress: QualityGatesProgressSnapshot | null;
  readonly terminalEventReceived: boolean;
}

const DRAFT_OWNED_FILE_RE = /\/quality_gates\/quality-gates\.(md|json)$/u;

const collectInvalidDraftDetails = (
  progress: QualityGatesProgressSnapshot | null
): readonly string[] => {
  if (!progress) {
    return ["progress snapshot unavailable"];
  }
  const details: string[] = [];
  if (!progress.markdownExists) {
    details.push("quality-gates.md is missing");
  }
  if (!progress.jsonExists) {
    details.push("quality-gates.json is missing");
  } else if (!progress.commandContractReady) {
    details.push(
      "quality-gates.json is missing a parseable commands object keyed by gate id"
    );
  }
  if (progress.integrated) {
    details.push(
      "quality-gates.json reports integrated: true before acceptance"
    );
  }
  for (const validationError of progress.validationErrors) {
    details.push(validationError);
  }
  return details;
};

const findIntegrationOnlyPaths = (
  ownedDirtyFiles: readonly string[]
): readonly string[] =>
  ownedDirtyFiles.filter(
    (file) =>
      file.includes("/quality_gates/") && !DRAFT_OWNED_FILE_RE.test(file)
  );

export const evaluateQualityGatesContractGuard = (
  input: QualityGatesContractGuardInput
): QualityGatesGuardDecision => {
  if (!input.terminalEventReceived) {
    return { kind: "noop", reason: "no_terminal_event" };
  }
  if (input.phase !== "phase_1_draft") {
    return { kind: "noop", reason: "out_of_scope_phase" };
  }
  const integrationOnlyPaths = findIntegrationOnlyPaths(input.ownedDirtyFiles);
  if (integrationOnlyPaths.length > 0) {
    return {
      blockedPaths: integrationOnlyPaths,
      kind: "repair_premature_integration",
      reason: "premature_integration_before_acceptance",
    };
  }
  if (input.ownedDirtyFiles.length === 0) {
    return {
      kind: "repair_no_progress",
      reason: "terminal_no_owned_diff_in_phase_1_draft",
    };
  }
  const draftDetails = collectInvalidDraftDetails(input.progress);
  if (draftDetails.length > 0) {
    return {
      details: draftDetails,
      kind: "repair_invalid_draft",
      reason: "implicit_readiness_with_invalid_draft",
    };
  }
  return { kind: "commit_ready", reason: "draft_complete" };
};
