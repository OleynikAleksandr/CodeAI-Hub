import { useEffect, useState } from "react";
import {
  WORKFLOW_STAGE_ORDER,
  type WorkflowStageId,
} from "../../services/workflow-state-client";

const STARTUP_STAGE: WorkflowStageId = "description";

const isWorkflowStageId = (value: unknown): value is WorkflowStageId =>
  typeof value === "string" &&
  WORKFLOW_STAGE_ORDER.includes(value as WorkflowStageId);

export const useWorkspaceTreeActiveStage = (
  selectedWorkspaceId?: string
): WorkflowStageId | null => {
  const [activeStage, setActiveStage] = useState<WorkflowStageId | null>(
    selectedWorkspaceId ? STARTUP_STAGE : null
  );

  useEffect(() => {
    setActiveStage(selectedWorkspaceId ? STARTUP_STAGE : null);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const handleStageActivated = (
      event: Event
    ) => {
      const stage = (event as CustomEvent<{ readonly stage?: unknown }>).detail
        ?.stage;
      if (isWorkflowStageId(stage)) {
        setActiveStage(stage);
      }
    };

    window.addEventListener("pm:stage:activated", handleStageActivated);
    return () => {
      window.removeEventListener("pm:stage:activated", handleStageActivated);
    };
  }, []);

  return activeStage;
};
