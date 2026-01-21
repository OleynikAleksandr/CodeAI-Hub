type WorkflowStateQueryParams = {
  readonly workspaceSlug: string;
  readonly workspacePath?: string;
};

export const buildWorkflowStateQuery = (
  params: WorkflowStateQueryParams
): string => {
  const query = new URLSearchParams();
  query.set("workspaceSlug", params.workspaceSlug);
  if (typeof params.workspacePath === "string") {
    const trimmed = params.workspacePath.trim();
    if (trimmed.length > 0) {
      query.set("workspacePath", trimmed);
    }
  }
  return query.toString();
};
