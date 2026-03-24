import type { WorkspaceProject } from "../../types";
import {
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
} from "../../services/workflow-state-client";
import { VIRTUAL_SIMULATION_TOOL_LABEL } from "./use-workflow-tool-select";

const TOOL_TO_STAGE_MAP: Readonly<Record<string, string>> = {
  Description: "description",
  [VIRTUAL_SIMULATION_TOOL_LABEL]: "virtual_simulation",
  "Diagram Modules": "diagram_modules",
};

const STAGE_TO_TOOL_MAP: Readonly<Record<WorkflowStageId, string>> = {
  description: "Description",
  virtual_simulation: VIRTUAL_SIMULATION_TOOL_LABEL,
  diagram_modules: "Diagram Modules",
};

export const resolveStageByTool = (tool: string): string | null =>
  TOOL_TO_STAGE_MAP[tool] ?? null;

export const dispatchStageActivated = (tool: string): void => {
  const stage = resolveStageByTool(tool);
  if (stage) {
    window.dispatchEvent(
      new CustomEvent("pm:stage:activated", {
        detail: { stage, source: "toolbar" },
      })
    );
  }
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
