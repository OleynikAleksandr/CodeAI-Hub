import type { WorkspaceProject } from "../../types";
import type {
  DevelopmentTreeNodeArtifact,
  DevelopmentTreeNodeSession,
} from "../../services/workflow-state-client";
import type { WorkflowEvent } from "../../services/workflow-events-client";

export type BranchNodeKind = "product-part" | "cluster" | "module";

export type BranchNodeSelection = {
  readonly kind: BranchNodeKind;
  readonly nodeId: string;
  readonly label: string;
  readonly partId: string;
  readonly clusterId?: string;
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly session?: DevelopmentTreeNodeSession;
  readonly workflowPath?: string;
};

type ArtifactRefreshTarget = {
  readonly path: string;
  readonly workspaceSlug: string;
};

const normalizeArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/");

const eventMatchesArtifactTarget = (
  event: WorkflowEvent,
  target: ArtifactRefreshTarget
): boolean => {
  if (event.type !== "workflow.artifact.written") return false;
  if (event.workspaceSlug !== target.workspaceSlug) return false;
  if (!event.filePath) return true;
  const eventPath = normalizeArtifactPath(event.filePath);
  const targetPath = normalizeArtifactPath(target.path);
  return targetPath.endsWith(eventPath) || eventPath.endsWith(targetPath);
};

export const shouldRefreshArtifactForWorkflowEvents = (
  events: readonly WorkflowEvent[],
  selectedArtifact: ArtifactRefreshTarget | null,
  branchWorkspaceSlug: string | null,
  selectedBranchNode: BranchNodeSelection | null
): boolean => {
  if (events.length === 0) return false;
  if (
    selectedArtifact &&
    events.some((event) => eventMatchesArtifactTarget(event, selectedArtifact))
  ) {
    return true;
  }
  const branchArtifacts = selectedBranchNode?.artifacts ?? [];
  if (branchArtifacts.length === 0 || !branchWorkspaceSlug) return false;
  return events.some((event) =>
    branchArtifacts.some((artifact) =>
      eventMatchesArtifactTarget(event, {
        path: artifact.path,
        workspaceSlug: branchWorkspaceSlug,
      })
    )
  );
};

const BRANCH_NODE_KINDS: readonly string[] = [
  "product-part",
  "cluster",
  "module",
];

const isBranchNodeKind = (value: unknown): value is BranchNodeKind =>
  typeof value === "string" && BRANCH_NODE_KINDS.includes(value);

const parseBranchArtifact = (
  value: unknown
): DevelopmentTreeNodeArtifact | null => {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const fileName =
    typeof record.fileName === "string" ? record.fileName.trim() : null;
  const path = typeof record.path === "string" ? record.path.trim() : null;
  return fileName && path ? { fileName, path } : null;
};

const parseBranchSession = (
  value: unknown
): DevelopmentTreeNodeSession | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const dialogId =
    typeof record.dialogId === "string" ? record.dialogId.trim() : null;
  const providerId =
    typeof record.providerId === "string" ? record.providerId.trim() : null;
  const providerSessionId =
    typeof record.providerSessionId === "string"
      ? record.providerSessionId.trim()
      : null;
  const rootSessionId =
    typeof record.rootSessionId === "string" ? record.rootSessionId.trim() : null;
  const sessionId =
    typeof record.sessionId === "string" ? record.sessionId.trim() : null;
  const updatedAt =
    typeof record.updatedAt === "string" ? record.updatedAt.trim() : null;
  if (
    !(
      dialogId &&
      providerId &&
      providerSessionId &&
      rootSessionId &&
      sessionId &&
      updatedAt
    )
  ) {
    return undefined;
  }
  return {
    dialogId,
    providerId,
    providerSessionId,
    rootSessionId,
    sessionId,
    updatedAt,
  };
};

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
  const artifacts = Array.isArray(record.artifacts)
    ? record.artifacts
        .map(parseBranchArtifact)
        .filter((item): item is DevelopmentTreeNodeArtifact => item !== null)
    : [];
  const workflowPath =
    typeof record.workflowPath === "string" &&
    record.workflowPath.trim().length > 0
      ? record.workflowPath.trim()
      : undefined;
  return {
    kind,
    nodeId,
    label,
    partId,
    clusterId,
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    session: parseBranchSession(record.session),
    workflowPath,
  };
};
import {
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
} from "../../services/workflow-state-client";
import {
  APPLICATION_SKELETON_TOOL_LABEL,
  QUALITY_GATES_TOOL_LABEL,
  VIRTUAL_SIMULATION_TOOL_LABEL,
} from "./use-workflow-tool-select";

const STAGE_TO_TOOL_MAP: Readonly<Record<WorkflowStageId, string>> = {
  description: "Description",
  virtual_simulation: VIRTUAL_SIMULATION_TOOL_LABEL,
  diagram_modules: "Diagram Modules",
  application_skeleton: APPLICATION_SKELETON_TOOL_LABEL,
  quality_gates: QUALITY_GATES_TOOL_LABEL,
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
