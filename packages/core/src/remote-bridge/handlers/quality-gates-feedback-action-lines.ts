import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

export const createQualityGatesActionLines = (params: {
  readonly outOfOwnerDirtyFiles: readonly string[];
  readonly progress: QualityGatesProgressSnapshot;
}): readonly string[] => {
  if (params.outOfOwnerDirtyFiles.length > 0) {
    return [
      "Do not update Quality Gates artifacts in response to this message.",
      "Wait for Core to finish or repair the managed lifecycle boundary for the current target.",
    ];
  }
  if (!params.progress.accepted) {
    return [
      "Update only the draft Quality Gates artifacts: quality-gates.md and quality-gates.json.",
      "Do not create package scripts, hook wiring, gate scripts, CI files, or mark the contract accepted/integrated before explicit user acceptance advances the managed plan.",
      "When the draft artifacts are ready, respond with a content-readiness note; Core owns the managed commit and user review unlock.",
    ];
  }
  if (params.progress.acceptanceCommitted !== true) {
    return [
      "Do not start integration yet.",
      "Wait for Core to commit the accepted Quality Gates contract and send the Phase 3 integration continuation prompt.",
    ];
  }
  return [
    "Update the Quality Gates integration so every selected required gate is wired into the managed lifecycle hooks.",
    "Re-run the affected qg:* checks and the aggregate quality gate command.",
    "When the artifacts are ready, respond with a content-readiness note; Core owns the managed commit and downstream unlock.",
  ];
};
