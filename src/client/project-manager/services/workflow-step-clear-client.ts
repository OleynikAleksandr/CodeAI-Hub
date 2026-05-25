const WORKFLOW_STEP_CLEAR_ENDPOINT =
  "/api/v1/orchestrator/workflow-step-clear";

export type WorkflowStepClearTarget =
  | { readonly kind: "workflow_stage"; readonly stage: string }
  | {
      readonly codeWorkspacePath?: string | null;
      readonly kind: "development_tree_node";
      readonly workflowPath: string;
    };

export interface WorkflowStepClearRestoreResult {
  readonly boundaryHash: string;
  readonly clearCommitHash: string;
  readonly prunedStages: readonly string[];
  readonly registryPath: string;
  readonly stage: string;
}

export interface WorkflowStepClearResult {
  readonly cleared: true;
  readonly deletedSessionIds: readonly string[];
  readonly restore: WorkflowStepClearRestoreResult;
  readonly target: WorkflowStepClearTarget;
  readonly workspaceSlug: string;
}

export const clearWorkflowStep = async (params: {
  readonly httpUrl: string;
  readonly target: WorkflowStepClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowStepClearResult> => {
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
    const detail = await readWorkflowClearError(response);
    throw new Error(
      detail
        ? `Workflow step clear failed: ${response.status} ${detail}`
        : `Workflow step clear failed: ${response.status}`
    );
  }
  const payload = await response.json();
  if (!isWorkflowStepClearResult(payload)) {
    throw new Error("Workflow step clear failed: invalid Core response");
  }
  return payload;
};

const isWorkflowStepClearResult = (
  value: unknown
): value is WorkflowStepClearResult => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<WorkflowStepClearResult>;
  return (
    record.cleared === true &&
    Array.isArray(record.deletedSessionIds) &&
    typeof record.workspaceSlug === "string" &&
    Boolean(record.restore) &&
    Boolean(record.target)
  );
};

const readWorkflowClearError = async (
  response: Response
): Promise<string | null> => {
  try {
    const payload = (await response.json()) as { readonly error?: unknown };
    return typeof payload.error === "string" ? payload.error : null;
  } catch {
    return null;
  }
};
