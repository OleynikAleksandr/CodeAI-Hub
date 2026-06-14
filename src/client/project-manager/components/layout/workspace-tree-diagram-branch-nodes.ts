import { getDefaultProviderTitle } from "../../../../types/provider";
import type { DevelopmentTreeOperationNode } from "../../services/workflow-state-development-tree-client";
import type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeModuleNode,
  DevelopmentTreePartNode,
  DevelopmentTreeReadiness,
  DiagramModulesProgressSnapshot,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import type { WorkflowStepClearTarget } from "../../services/workflow-step-clear-client";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";
import type { StageSyncPayload } from "./workspace-tree-branch-nodes";
import { resolvePartProgressVisuals } from "./workspace-tree-diagram-branch-progress";
import {
  WORKFLOW_STAGE_BLOCKED_TITLES,
  WORKFLOW_STAGE_OUTDATED_TITLE,
  resolveTreeStatus,
  type TreeNode,
} from "./workspace-tree-model";

const resolveProviderTitle = (providerId: string): string =>
  providerId === "claudeCodeCli" || providerId === "codexCli" || providerId === "geminiCli"
    ? getDefaultProviderTitle(providerId)
    : providerId;

const buildDevelopmentTreeClearTarget = (
  workflowPath?: string,
  codeWorkspacePath?: string | null
): WorkflowStepClearTarget | undefined =>
  workflowPath && codeWorkspacePath
    ? { codeWorkspacePath, kind: "development_tree_node", workflowPath }
    : workflowPath
      ? { kind: "development_tree_node", workflowPath }
      : undefined;

const dispatchStageActivated = (stage: string): void => {
  window.dispatchEvent(
    new CustomEvent("pm:stage:activated", {
      detail: { stage, source: "workspace-tree-diagram-branch-node" },
    })
  );
};

const resolveReadinessStatus = (
  readiness: DevelopmentTreeReadiness | undefined,
  fallback: TreeNode["status"]
): TreeNode["status"] => {
  if (readiness === "ready") {
    return "active";
  }
  if (readiness === "in_progress") {
    return "progress";
  }
  if (readiness === "idle") {
    return "todo";
  }
  return fallback;
};

const resolveCoordinationStatus = (
  status?: string
): TreeNode["status"] | undefined =>
  status === "locked"
    ? "blocked"
    : status === "merged"
      ? "active"
      : status === "merge_ready" || status === "unlocked"
        ? "progress"
        : status === "waiting"
          ? "todo"
          : undefined;

const resolveLatestDiagramChain = (
  chains: WorkflowStateSnapshot["continuity"]["chains"],
  stage: "diagram_modules"
) => {
  let best: (typeof chains)[number] | null = null;
  for (const chain of chains) {
    if (chain.stage !== stage) {
      continue;
    }
    if (chain.segments.length === 0) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = chain;
    }
  }
  return best;
};

const resolveDiagramNodeVisuals = (
  workflowState: WorkflowStateSnapshot,
  stage: "diagram_modules"
): { readonly status: TreeNode["status"]; readonly title?: string } => {
  const status = workflowState.stages[stage] ?? "idle";
  const blocked = workflowState.gating.blocked[stage] ?? false;
  return {
    status: resolveTreeStatus(status, blocked),
    title:
      status === "outdated"
        ? WORKFLOW_STAGE_OUTDATED_TITLE
        : blocked
          ? WORKFLOW_STAGE_BLOCKED_TITLES[stage]
          : undefined,
  };
};

const buildSessionIntent = (params: {
  readonly last: NonNullable<
    ReturnType<typeof resolveLatestDiagramChain>
  >["segments"][number];
  readonly stage: "diagram_modules";
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): SessionResumeIntent => ({
  providerId: params.last.providerId,
  providerSessionId: params.last.providerSessionId,
  workspacePath: params.workspacePath,
  workspaceSlug: params.workspaceSlug,
  initiativeSlug: params.workspaceSlug,
  stage: params.stage,
  sessionKind: "collector",
  runSlug: null,
});

export const resolveDiagramStageSyncPayload = (options: {
  readonly stage: "diagram_modules";
  readonly workflowState: WorkflowStateSnapshot;
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly diagramModulesArtifactAvailable?: boolean;
}): StageSyncPayload => {
  const { workflowState, workspaceSlug, workspacePath } = options;

  const chain = resolveLatestDiagramChain(workflowState.continuity.chains, "diagram_modules");
  const last = chain?.segments.at(-1) ?? null;
  const dmArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;
  const available = options.diagramModulesArtifactAvailable ?? false;
  return {
    artifact: available ? { path: dmArtifactPath, label: "Module Graph" } : null,
    clearTool: available ? null : "Diagram Modules",
    session: last
      ? {
          providerId: last.providerId,
          providerSessionId: last.providerSessionId,
          workspacePath,
          workspaceSlug,
          initiativeSlug: workspaceSlug,
          stage: "diagram_modules",
          sessionKind: "collector",
          runSlug: null,
        }
      : null,
  };
};

const dispatchBranchSelected = (detail: {
  readonly kind: string;
  readonly nodeId: string;
  readonly label: string;
  readonly partId: string;
  readonly clusterId?: string;
  readonly artifacts?: DevelopmentTreeModuleNode["artifacts"];
  readonly session?: DevelopmentTreeModuleNode["session"];
  readonly workflowPath?: string;
  readonly artifactWorkspacePath?: string;
  readonly codeWorkspacePath?: string;
  readonly operationKind?: DevelopmentTreeOperationNode["kind"];
}): void => {
  window.dispatchEvent(
    new CustomEvent("pm:branch:selected", { detail })
  );
};

const buildOperationTreeNode = (
  operation: DevelopmentTreeOperationNode,
  parentId: string,
  partId: string,
  clusterId: string | null,
  depth: number
): TreeNode => {
  const id = `${parentId}:operation:${operation.id}`;
  const children = operation.children?.map((child) =>
    buildOperationTreeNode(child, id, partId, clusterId, depth + 1)
  );
  return {
    id,
    label: operation.title,
    status: "todo",
    visualDepth: depth,
    clearTarget: buildDevelopmentTreeClearTarget(operation.workflowPath),
    nodeType: "operation",
    operationKind: operation.kind,
    isCollapsible: Boolean(children?.length),
    children: children && children.length > 0 ? children : undefined,
    onSelect: () =>
      dispatchBranchSelected({
        kind: "operation",
        nodeId: operation.id,
        label: operation.title,
        partId,
        clusterId: clusterId ?? undefined,
        workflowPath: operation.workflowPath,
        artifactWorkspacePath: operation.artifactWorkspacePath,
        operationKind: operation.kind,
      }),
  };
};

const buildModuleTreeNode = (
  mod: DevelopmentTreeModuleNode,
  partId: string,
  clusterId: string | null,
  depth: number
): TreeNode => {
  const id = clusterId
    ? `devtree:${partId}:${clusterId}:${mod.id}`
    : `devtree:${partId}:standalone:${mod.id}`;
  const children = mod.operations?.map((operation) =>
    buildOperationTreeNode(operation, id, partId, clusterId, depth + 1)
  );
  const lockedReason = mod.lifecycle?.lockedReason;
  const coordinationStatus = resolveCoordinationStatus(
    mod.coordination?.status
  );
  return {
    id,
    label: mod.title,
    status: coordinationStatus ?? (lockedReason
      ? "blocked"
      : resolveReadinessStatus(mod.readiness, "todo")),
    title: lockedReason ?? mod.coordination?.lockedReason,
    visualDepth: depth,
    clearTarget: buildDevelopmentTreeClearTarget(
      mod.workflowPath,
      mod.codeWorkspacePath
    ),
    nodeType: "module",
    readiness: mod.readiness,
    isCollapsible: Boolean(children?.length),
    children: children && children.length > 0 ? children : undefined,
    onSelect: () =>
      dispatchBranchSelected({
        kind: "module",
        nodeId: mod.id,
        label: mod.title,
        partId,
        clusterId: clusterId ?? undefined,
        artifacts: mod.artifacts,
        session: mod.session,
        workflowPath: mod.workflowPath,
        artifactWorkspacePath: mod.artifactWorkspacePath,
        codeWorkspacePath: mod.codeWorkspacePath,
      }),
  };
};

const buildClusterTreeNode = (
  cluster: DevelopmentTreeClusterNode,
  partId: string,
  depth: number
): TreeNode => {
  const id = `devtree:${partId}:${cluster.id}`;
  const children: TreeNode[] = [];
  for (const operation of cluster.operations ?? []) {
    children.push(
      buildOperationTreeNode(operation, id, partId, cluster.id, depth + 1)
    );
  }
  for (const mod of cluster.modules) {
    children.push(buildModuleTreeNode(mod, partId, cluster.id, depth + 1));
  }
  const lockedReason = cluster.lifecycle?.lockedReason;
  const coordinationStatus = resolveCoordinationStatus(
    cluster.coordination?.status
  );
  return {
    id,
    label: cluster.id,
    status: coordinationStatus ?? (lockedReason
      ? "blocked"
      : resolveReadinessStatus(cluster.readiness, "todo")),
    title: lockedReason ?? cluster.coordination?.lockedReason,
    visualDepth: depth,
    clearTarget: buildDevelopmentTreeClearTarget(cluster.workflowPath),
    nodeType: "cluster",
    readiness: cluster.readiness,
    isCollapsible: children.length > 0,
    children,
    onSelect: () =>
      dispatchBranchSelected({
        kind: "cluster",
        nodeId: cluster.id,
        label: cluster.id,
        partId,
        artifacts: cluster.artifacts,
        session: cluster.session,
        workflowPath: cluster.workflowPath,
      }),
  };
};

const buildPartTreeNode = (
  part: DevelopmentTreePartNode,
  depth: number,
  diagramProgress?: DiagramModulesProgressSnapshot | null
): TreeNode => {
  const partId = `devtree:${part.id}`;
  const children: TreeNode[] = [];
  for (const operation of part.operations ?? []) {
    children.push(
      buildOperationTreeNode(operation, partId, part.id, null, depth + 1)
    );
  }
  for (const cluster of part.clusters) {
    children.push(buildClusterTreeNode(cluster, part.id, depth + 1));
  }
  for (const mod of part.standaloneModules) {
    children.push(buildModuleTreeNode(mod, part.id, null, depth + 1));
  }
  const progressVisuals = resolvePartProgressVisuals(part, diagramProgress);
  const fallbackStatus = resolveReadinessStatus(
    part.readiness,
    part.status === "materialized" ? "draft" : "todo"
  );
  const lockedReason = part.lifecycle?.lockedReason;
  return {
    id: partId,
    label: part.id,
    status: lockedReason ? "blocked" : (progressVisuals.status ?? fallbackStatus),
    title: lockedReason ?? progressVisuals.title,
    visualDepth: depth,
    clearTarget: buildDevelopmentTreeClearTarget(part.workflowPath),
    nodeType: "product-part",
    readiness: progressVisuals.readiness ?? part.readiness,
    isCollapsible: children.length > 0,
    children: children.length > 0 ? children : undefined,
    onSelect: () =>
      dispatchBranchSelected({
        kind: "product-part",
        nodeId: part.id,
        label: part.id,
        partId: part.id,
        artifacts: part.artifacts,
        session: part.session,
        workflowPath: part.workflowPath,
      }),
  };
};

export interface DevelopmentTreeInitialExpansion {
  readonly clusterId: string | null;
  readonly partId: string | null;
}

export const resolveInitialDevelopmentTreeExpansion = (
  nodes: readonly TreeNode[]
): DevelopmentTreeInitialExpansion => {
  const part = nodes.find(
    (node) => node.nodeType === "product-part" && node.isCollapsible
  );
  const cluster = part?.children?.find(
    (node) => node.nodeType === "cluster" && node.isCollapsible
  );
  return {
    partId: part?.id ?? null,
    clusterId: cluster?.id ?? null,
  };
};

export const buildDevelopmentTreeNodes = (
  tree: WorkflowStateSnapshot["developmentTree"],
  baseDepth: number,
  diagramProgress?: DiagramModulesProgressSnapshot | null
): readonly TreeNode[] => {
  if (!tree?.parts.length) return [];
  return tree.parts.map((part) =>
    buildPartTreeNode(part, baseDepth, diagramProgress)
  );
};

export const buildDevelopmentTreeLockedNodes = (
  workflowState: WorkflowStateSnapshot | null,
  baseDepth: number
): readonly TreeNode[] => {
  if (!workflowState || workflowState.developmentTree?.parts.length) {
    return [];
  }
  if (workflowState.stages.quality_gates === "completed") {
    return [];
  }
  return [
    {
      id: "devtree:locked",
      label: "Locked until Diagram\nModules\nis accepted",
      status: "blocked",
      title:
        "Development Tree sessions stay disabled until Diagram Modules is accepted.",
      visualDepth: baseDepth,
    },
  ];
};

export const buildDiagramModulesBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly diagramModulesArtifactAvailable: boolean;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly selectArtifact: (artifactPath: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
  readonly clearArtifactWithTool: (activeTool: string) => void;
}): readonly TreeNode[] => {
  const workflowState = options.workflowState;
  const workspaceSlug = options.workspaceSlug;
  const workspacePath = options.workspacePath;

  if (!(workflowState && workspaceSlug && workspacePath)) {
    return [];
  }

  const nodes: TreeNode[] = [];
  const dmArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;
  const nodeVisuals = resolveDiagramNodeVisuals(workflowState, "diagram_modules");

  const chain = resolveLatestDiagramChain(
    workflowState.continuity.chains,
    "diagram_modules"
  );
  const last = chain?.segments.at(-1) ?? null;

  if (options.diagramModulesArtifactAvailable) {
    nodes.push({
      id: "workflow:diagram_modules:artifact",
      label: "Module Graph",
      title: nodeVisuals.title
        ? `${dmArtifactPath}\n${nodeVisuals.title}`
        : dmArtifactPath,
      status: nodeVisuals.status,
      visualDepth: 2,
      onSelect: () => {
        dispatchStageActivated("diagram_modules");
        options.selectArtifact(dmArtifactPath, "Module Graph");
        if (last) {
          options.dispatchDialogOpenIntent(
            buildSessionIntent({
              last,
              workspacePath,
              workspaceSlug,
              stage: "diagram_modules",
            })
          );
        }
      },
    });
  }

  if (!(chain && last)) {
    return nodes;
  }

  const providerTitle = resolveProviderTitle(last.providerId);
  nodes.push({
    id: `workflow:diagram_modules:session:${chain.rootSessionId}`,
    label: `Diagram Modules ${providerTitle}`,
    status: nodeVisuals.status,
    title: nodeVisuals.title,
    visualDepth: 2,
    onSelect: () => {
      dispatchStageActivated("diagram_modules");
      options.dispatchDialogOpenIntent(
        buildSessionIntent({
          last,
          workspacePath,
          workspaceSlug,
          stage: "diagram_modules",
        })
      );
      if (options.diagramModulesArtifactAvailable) {
        options.selectArtifact(dmArtifactPath, "Module Graph");
      } else {
        options.clearArtifactWithTool("Diagram Modules");
      }
    },
  });

  const devTreeNodes = buildDevelopmentTreeNodes(
    workflowState.developmentTree,
    2,
    workflowState.diagramModulesProgress
  );
  for (const node of devTreeNodes) {
    nodes.push(node);
  }

  return nodes;
};
