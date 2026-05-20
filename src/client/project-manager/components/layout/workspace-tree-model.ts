import type { DevelopmentTreeOperationNodeKind } from "../../services/workflow-state-development-tree-client";
import type {
  DevelopmentTreeReadiness,
  WorkflowStageId,
  WorkflowStageStatus,
} from "../../services/workflow-state-client";

export type TreeStatus =
  | "active"
  | "blocked"
  | "draft"
  | "outdated"
  | "progress"
  | "todo";

export type TreeNodeType = "cluster" | "module" | "operation" | "product-part";

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
  readonly nodeType?: TreeNodeType;
  readonly operationKind?: DevelopmentTreeOperationNodeKind;
  readonly readiness?: DevelopmentTreeReadiness;
};

export const WORKFLOW_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  application_skeleton: "Application Skeleton",
  quality_gates: "Quality Gates Baseline",
};

export const WORKFLOW_STAGE_OUTDATED_TITLE =
  "OUTDATED: upstream input changed; resync recommended.";

export const WORKFLOW_STAGE_BLOCKED_TITLES: Record<WorkflowStageId, string> = {
  description: "READY",
  virtual_simulation: "BLOCKED: requires Final_Description.md",
  diagram_modules: "BLOCKED: requires virtual-simulation.md (DONE)",
  application_skeleton: "BLOCKED: requires Diagram Modules aggregate readiness",
  quality_gates: "BLOCKED: requires accepted Application Skeleton",
};

export const resolveTreeStatus = (
  status: WorkflowStageStatus,
  blocked: boolean
): TreeStatus => {
  if (status === "idle") {
    return "todo";
  }
  if (status === "outdated") {
    return "outdated";
  }
  if (blocked || status === "invalid") {
    return "blocked";
  }
  if (status === "completed") {
    return "active";
  }
  if (status === "in_progress") {
    return "progress";
  }
  return "todo";
};
