import type { WorkspaceProject } from "../../types";
import {
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
} from "../../services/workflow-state-client";
import {
  VIRTUAL_SIMULATION_TOOL_LABEL,
} from "./use-workflow-tool-select";

const STAGE_TO_TOOL_MAP: Readonly<Record<WorkflowStageId, string>> = {
  description: "Description",
  virtual_simulation: VIRTUAL_SIMULATION_TOOL_LABEL,
  diagram_modules: "Diagram Modules",
};

export const resolveToolByStage = (stage: string): string | null =>
  stage in STAGE_TO_TOOL_MAP
    ? STAGE_TO_TOOL_MAP[stage as WorkflowStageId]
    : null;

export const resolveWorkspaceSlug = (
  workspace?: WorkspaceProject
): string | null => {
  if (!workspace) {
    return null;
  }
  if (workspace.slug && workspace.slug.trim().length > 0) {
    return workspace.slug.trim();
  }
  if (workspace.name && workspace.name.trim().length > 0) {
    return toWorkflowWorkspaceSlug(workspace.name);
  }
  return null;
};
