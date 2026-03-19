import type { WorkflowStageId, WorkflowStageStatus } from "../../services/workflow-state-client";

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

export const WORKFLOW_STAGE_OUTDATED_TITLE =
  "OUTDATED: upstream input changed; resync recommended.";

export const WORKFLOW_STAGE_BLOCKED_TITLES: Record<WorkflowStageId, string> = {
  description: "READY",
  virtual_simulation: "BLOCKED: requires Final_Description.md",
  diagram_modules: "BLOCKED: requires virtual-simulation.md (DONE)",
  diagram_facades: "BLOCKED: requires module-inventory.md (DONE)",
};

export const resolveTreeStatus = (
  status: WorkflowStageStatus,
  blocked: boolean
): TreeStatus =>
  status === "outdated"
    ? "outdated"
    : blocked || status === "invalid"
      ? "blocked"
      : status === "completed" || status === "in_progress"
        ? "active"
        : "todo";
