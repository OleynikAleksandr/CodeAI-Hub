import type {
  DescriptionBranchSnapshot,
  WorkflowStateSnapshot,
} from "./workflow-state-client";

const hasDescriptionArtifacts = (
  branch: DescriptionBranchSnapshot | null
): boolean =>
  Boolean(
    branch?.draftPath ||
      branch?.finalPath ||
      branch?.questionnairePath ||
      branch?.primarySession
  );

export const isEmptyWorkflowState = (
  snapshot: WorkflowStateSnapshot | null
): boolean => {
  if (!snapshot) {
    return false;
  }
  if (hasDescriptionArtifacts(snapshot.description)) {
    return false;
  }
  if (snapshot.continuity.chains.length > 0) {
    return false;
  }
  return Object.values(snapshot.stages).every((status) => status === "idle");
};

// Development Tree unlock truth lives in Core: it is driven by the Quality
// Gates integration commit recorded in `workspace.plan.md` and surfaced via
// the snapshot's `qualityGatesProgress.integrated` flag. PM consumers must
// not recompute upstream completion from local heuristics; reading the
// snapshot field directly keeps the stage light consistent across PM panels,
// sidebar, and Project Manager workspace cards.
