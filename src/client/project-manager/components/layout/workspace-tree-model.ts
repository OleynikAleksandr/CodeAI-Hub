import type {
  WorkflowStageId,
  WorkflowStageStatus,
} from "../../services/workflow-state-client";

export type TreeStatus = "active" | "progress" | "todo" | "blocked" | "draft" | "outdated";

export type TreeNode = {
  readonly id: string;
  readonly label: string;
  readonly status: TreeStatus;
  readonly visualDepth: number;
  readonly kind?: "separator";
  readonly stage?: WorkflowStageId;
  readonly title?: string;
  readonly isSelected?: boolean;
  readonly onSelect?: () => void;
  readonly isCollapsible?: boolean;
  readonly children?: readonly TreeNode[];
};

export const WORKFLOW_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
};

export const WORKFLOW_STAGE_OUTDATED_TITLE =
  "OUTDATED: upstream input changed; resync recommended.";

export const WORKFLOW_STAGE_BLOCKED_TITLES: Record<WorkflowStageId, string> = {
  description: "READY",
  virtual_simulation: "BLOCKED: requires Final_Description.md",
  diagram_modules: "BLOCKED: requires virtual-simulation.md (DONE)",
};

export const resolveTreeStatus = (
  status: WorkflowStageStatus,
  blocked: boolean,
  hasArtifact = false
): TreeStatus =>
  status === "idle"
    ? "todo"
    : status === "outdated"
      ? "outdated"
      : blocked || status === "invalid"
        ? "blocked"
        : hasArtifact || status === "completed"
          ? "active"
          : status === "in_progress"
            ? "progress"
            : "todo";
