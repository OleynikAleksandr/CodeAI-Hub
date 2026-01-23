import type { WorkflowStageId } from "../../services/workflow-state-client";

export type TreeStatus = "active" | "todo" | "blocked" | "draft" | "outdated";

export type TreeNode = {
  readonly id: string;
  readonly label: string;
  readonly status: TreeStatus;
  readonly visualDepth: number;
  readonly title?: string;
  readonly onSelect?: () => void;
  readonly isCollapsible?: boolean;
  readonly children?: readonly TreeNode[];
};

export const WORKFLOW_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  diagram_facades: "Diagram Facades",
};
