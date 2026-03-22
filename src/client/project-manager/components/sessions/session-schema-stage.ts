import type { WorkflowStageId } from "../../services/description-submit-service";

export const resolveSchemaStage = (
  stage: string | null | undefined
): WorkflowStageId | null => {
  return stage === "description" ? "description" : null;
};
