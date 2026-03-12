type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

export type WorkflowExecutionProfileSnapshot = {
  readonly lockedAt: string;
  readonly lockedFromStage: WorkflowStageId;
  readonly providerId: string;
  readonly modelId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isWorkflowStageId = (value: unknown): value is WorkflowStageId =>
  value === "description" ||
  value === "virtual_simulation" ||
  value === "diagram_modules" ||
  value === "diagram_facades";

export const parseWorkflowExecutionProfile = (
  payload: unknown
): WorkflowExecutionProfileSnapshot | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const lockedAt = readNonEmptyString(payload.lockedAt);
  const lockedFromStage = readNonEmptyString(payload.lockedFromStage);
  const providerId = readNonEmptyString(payload.providerId);
  const modelId = readNonEmptyString(payload.modelId);
  if (
    !(lockedAt && providerId && modelId) ||
    !isWorkflowStageId(lockedFromStage)
  ) {
    return null;
  }
  return {
    lockedAt,
    lockedFromStage,
    providerId,
    modelId,
  };
};
