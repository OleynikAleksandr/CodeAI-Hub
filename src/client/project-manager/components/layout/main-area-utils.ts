import type { WorkspaceProject } from "../../types";

export type BranchNodeKind = "product-part" | "cluster" | "module";

export type BranchNodeSelection = {
  readonly kind: BranchNodeKind;
  readonly nodeId: string;
  readonly label: string;
  readonly partId: string;
  readonly clusterId?: string;
};

const BRANCH_NODE_KINDS: readonly string[] = [
  "product-part",
  "cluster",
  "module",
];

const isBranchNodeKind = (value: unknown): value is BranchNodeKind =>
  typeof value === "string" && BRANCH_NODE_KINDS.includes(value);

export const parseBranchNodeSelection = (
  detail: unknown
): BranchNodeSelection | null => {
  if (typeof detail !== "object" || detail === null) return null;
  const record = detail as Record<string, unknown>;
  const kind = record.kind;
  const nodeId =
    typeof record.nodeId === "string" ? record.nodeId.trim() : null;
  const label =
    typeof record.label === "string" ? record.label.trim() : null;
  const partId =
    typeof record.partId === "string" ? record.partId.trim() : null;
  if (!(isBranchNodeKind(kind) && nodeId && label && partId)) return null;
  const clusterId =
    typeof record.clusterId === "string" && record.clusterId.trim().length > 0
      ? record.clusterId.trim()
      : undefined;
  return { kind, nodeId, label, partId, clusterId };
};
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
