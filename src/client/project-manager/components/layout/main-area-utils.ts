import type { WorkspaceProject } from "../../types";
import { toWorkflowWorkspaceSlug } from "../../services/workflow-state-client";
import { VIRTUAL_SIMULATION_TOOL_LABEL } from "./use-workflow-tool-select";

const TOOL_TO_STAGE_MAP: Readonly<Record<string, string>> = {
  Description: "description",
  [VIRTUAL_SIMULATION_TOOL_LABEL]: "virtual_simulation",
  "Diagram Modules": "diagram_modules",
  "Diagram Facades": "diagram_facades",
};

export const dispatchStageActivated = (tool: string): void => {
  const stage = TOOL_TO_STAGE_MAP[tool];
  if (stage) {
    window.dispatchEvent(
      new CustomEvent("pm:stage:activated", {
        detail: { stage, skipSession: tool === VIRTUAL_SIMULATION_TOOL_LABEL },
      })
    );
  }
};

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
