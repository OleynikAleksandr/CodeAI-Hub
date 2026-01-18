import { isWorkflowWorkspacePathAllowed } from "../workflow/paths/workflow-artifact-paths";

export const isWorkspacePathAllowlisted = (params: {
  readonly relativePath: string;
  readonly workspaceSlug: string | null;
}): boolean => {
  if (!params.workspaceSlug) {
    return false;
  }
  return isWorkflowWorkspacePathAllowed({
    relativePath: params.relativePath,
    workspaceSlug: params.workspaceSlug,
  });
};
