import type { QualityGatesPhase } from "./quality-gates-contract-guard";

export type QualityGatesReviewTurnKind =
  | "revision"
  | "discussion"
  | "out_of_scope";

export interface QualityGatesReviewTurnClassifierInput {
  readonly ownedDirtyFiles: readonly string[];
  readonly phase: QualityGatesPhase;
}

export const classifyQualityGatesReviewTurn = (
  input: QualityGatesReviewTurnClassifierInput
): QualityGatesReviewTurnKind => {
  if (
    input.phase !== "phase_2_review" &&
    input.phase !== "phase_4_user_return"
  ) {
    return "out_of_scope";
  }
  return input.ownedDirtyFiles.length > 0 ? "revision" : "discussion";
};
