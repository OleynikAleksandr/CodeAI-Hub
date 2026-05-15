import type {
  DevelopmentTreeReadiness,
  WorkflowStageId,
  WorkflowStageStatus,
} from "../../services/workflow-state-client";

export type TreeStatus = "active" | "progress" | "todo" | "blocked" | "draft" | "outdated";

export type TreeNodeType = "product-part" | "cluster" | "module";

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
  readonly readiness?: DevelopmentTreeReadiness;
};

export type ResolveTreeStatusOptions = {
  readonly hasArtifact?: boolean;
  readonly reviewReady?: boolean;
  readonly stage?: WorkflowStageId;
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
  blocked: boolean,
  options: boolean | ResolveTreeStatusOptions = false
): TreeStatus => {
  const hasArtifact =
    typeof options === "boolean" ? options : options.hasArtifact === true;
  const reviewReady =
    typeof options === "boolean" ? false : options.reviewReady === true;
  const stage = typeof options === "boolean" ? null : (options.stage ?? null);

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
    if (stage === "diagram_modules") {
      return reviewReady ? "active" : "progress";
    }
    return hasArtifact ? "active" : "progress";
  }
  return hasArtifact ? "active" : "todo";
};
