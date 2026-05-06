import type { ConfirmableStageId } from "../shared/stage-confirmation-card";
import {
  APPLICATION_SKELETON_TOOL_LABEL,
  QUALITY_GATES_TOOL_LABEL,
  VIRTUAL_SIMULATION_TOOL_LABEL,
} from "./use-workflow-tool-select";

const TOOL_TO_CONFIRMABLE_STAGE: Record<string, ConfirmableStageId> = {
  [VIRTUAL_SIMULATION_TOOL_LABEL]: "virtual_simulation",
  "Diagram Modules": "diagram_modules",
  [APPLICATION_SKELETON_TOOL_LABEL]: "application_skeleton",
  [QUALITY_GATES_TOOL_LABEL]: "quality_gates",
};

const TOOL_HEADER_TITLES: Record<string, string> = {
  [VIRTUAL_SIMULATION_TOOL_LABEL]: "Virtual Simulation",
  [APPLICATION_SKELETON_TOOL_LABEL]: "Application Skeleton",
  [QUALITY_GATES_TOOL_LABEL]: "Quality Gates Baseline",
};

export const resolveConfirmableStageFromTool = (
  tool: string | null
): ConfirmableStageId | undefined =>
  tool ? TOOL_TO_CONFIRMABLE_STAGE[tool] : undefined;

export const resolveStartupStageFromTool = (tool: string | null): string => {
  if (!tool) return "description";
  return TOOL_TO_CONFIRMABLE_STAGE[tool] ?? "description";
};

export const resolveWorkflowToolHeaderTitle = (
  tool: string | null
): string | null => (tool ? (TOOL_HEADER_TITLES[tool] ?? tool) : null);
