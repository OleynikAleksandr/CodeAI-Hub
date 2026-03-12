import type {
  DescriptionBranchSnapshot,
  DescriptionSessionRef,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";

export type DescriptionArtifactSnapshot = {
  readonly path: string;
  readonly label: "questionnaire.md" | "description.md" | "Final_Description.md";
};

export const resolveDescriptionSession = (
  state: WorkflowStateSnapshot | null
): DescriptionSessionRef | null =>
  state?.description?.collectorSession ?? state?.description?.session ?? null;

export const resolveDescriptionHasSession = (
  state: WorkflowStateSnapshot | null
): boolean => {
  const branch = state?.description;
  const session = resolveDescriptionSession(state);
  return Boolean(session?.providerSessionId || branch?.sessionKind);
};

export const resolveDescriptionQuestionnairePath = (
  branch: DescriptionBranchSnapshot | null,
  workspaceSlug: string | null
): string | null => {
  if (!workspaceSlug) {
    return null;
  }
  if (branch?.questionnairePath && branch.questionnairePath.trim().length > 0) {
    return branch.questionnairePath;
  }
  return `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;
};

export const resolveDescriptionArtifact = (
  branch: DescriptionBranchSnapshot | null,
  workspaceSlug: string | null
): DescriptionArtifactSnapshot | null => {
  if (!branch) {
    return null;
  }
  if (branch.finalPath) {
    return {
      path: branch.finalPath,
      label: "Final_Description.md",
    };
  }
  if (branch.draftPath) {
    return {
      path: branch.draftPath,
      label: "description.md",
    };
  }
  const questionnairePath = resolveDescriptionQuestionnairePath(
    branch,
    workspaceSlug
  );
  return questionnairePath
    ? {
        path: questionnairePath,
        label: "questionnaire.md",
      }
    : null;
};
