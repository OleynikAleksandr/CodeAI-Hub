const WORKFLOW_STEP_CLEAR_ENDPOINT =
  "/api/v1/orchestrator/workflow-step-clear";

export type WorkflowStepClearTarget =
  | { readonly kind: "workflow_stage"; readonly stage: string }
  | {
      readonly codeWorkspacePath?: string | null;
      readonly kind: "development_tree_node";
      readonly workflowPath: string;
    };

export const clearWorkflowStep = async (params: {
  readonly httpUrl: string;
  readonly target: WorkflowStepClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const response = await fetch(
    `${params.httpUrl}${WORKFLOW_STEP_CLEAR_ENDPOINT}`,
    {
      body: JSON.stringify({
        target: params.target,
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new Error(`Workflow step clear failed: ${response.status}`);
  }
};
