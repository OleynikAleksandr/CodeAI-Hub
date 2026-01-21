import type { WorkflowStageId } from "../../services/idea-collector-submit-service";

export const resolveSchemaStage = (
  stage: string | null | undefined
): WorkflowStageId | null => {
  if (!stage) {
    return null;
  }
  if (stage === "idea") {
    return "description";
  }
  return null;
};
