import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

export const createQualityGatesActionLines = (params: {
  readonly outOfOwnerDirtyFiles: readonly string[];
  readonly progress: QualityGatesProgressSnapshot;
}): readonly string[] => {
  if (params.outOfOwnerDirtyFiles.length > 0) {
    return [
      "Do not update Quality Gates artifacts in response to this message.",
      "The orchestration rewrite boundary is blocked for the current target; report the blocker without changing files.",
    ];
  }
  if (!params.progress.accepted) {
    return [
      "Update only the draft Quality Gates artifacts: quality-gates.md and quality-gates.json.",
      "Do not create package scripts, hook wiring, gate scripts, CI files, or mark the contract accepted/integrated before explicit user acceptance.",
      "When the draft artifacts are ready, respond with a content-readiness note. Do not run Git, staging, or plan commands.",
    ];
  }
  if (!params.progress.integrated) {
    return [
      "Do not start integration yet.",
      "Integration continuation is suspended until the new orchestrator owns this transition.",
    ];
  }
  return [
    "Continue the Phase 3 Quality Gates integration repair. Update only Quality Gates integration-owned files: quality-gates.md/json, package.json/package-lock.json, QG tool configs, scripts/quality-gates/** or scripts/qg/**, tsconfig.qg*.json, and .husky/pre-commit/.husky/pre-push.",
    "Wire every selected required gate explicitly into project checks and hooks; do not mark the baseline integrated while hook wiring is missing.",
    "Re-run the affected qg:* checks and the aggregate quality gate command, then respond with a content-readiness note. Do not run Git, staging, or plan commands.",
  ];
};
