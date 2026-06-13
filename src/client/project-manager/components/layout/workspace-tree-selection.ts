import { useEffect, useState } from "react";
import type { WorkflowStageId } from "../../services/workflow-state-client";

type BranchSelectedDetail = {
  readonly clusterId?: string;
  readonly kind?: string;
  readonly nodeId?: string;
  readonly partId?: string;
};

const resolveSelectedBranchNodeId = (
  detail: BranchSelectedDetail | undefined
): string | null => {
  if (!(detail?.kind && detail.nodeId && detail.partId)) {
    return null;
  }
  if (detail.kind === "product-part") {
    return `devtree:${detail.partId}`;
  }
  if (detail.kind === "cluster") {
    return `devtree:${detail.partId}:${detail.nodeId}`;
  }
  if (detail.kind !== "module") {
    return null;
  }
  return detail.clusterId
    ? `devtree:${detail.partId}:${detail.clusterId}:${detail.nodeId}`
    : `devtree:${detail.partId}:standalone:${detail.nodeId}`;
};

export const useWorkspaceTreeSelectionCursor = (params: {
  readonly activeStage: WorkflowStageId | null;
  readonly selectedWorkspaceId?: string;
}): {
  readonly selectedNodeId: string | null;
  readonly selectTreeNodeId: (nodeId: string | null) => void;
} => {
  const [selectedTreeNodeId, selectTreeNodeId] = useState<string | null>(null);
  useEffect(() => selectTreeNodeId(null), [params.selectedWorkspaceId]);
  useEffect(() => {
    const onStage = (event: Event) => {
      const stage = (event as CustomEvent<{ readonly stage?: string }>).detail?.stage;
      if (typeof stage === "string") {
        selectTreeNodeId(`workflow:${stage}`);
      }
    };
    const onBranch = (event: Event) => {
      const nodeId = resolveSelectedBranchNodeId(
        (event as CustomEvent<BranchSelectedDetail>).detail
      );
      if (nodeId) {
        selectTreeNodeId(nodeId);
      }
    };
    window.addEventListener("pm:stage:activated", onStage);
    window.addEventListener("pm:branch:selected", onBranch);
    return () => {
      window.removeEventListener("pm:stage:activated", onStage);
      window.removeEventListener("pm:branch:selected", onBranch);
    };
  }, []);
  return {
    selectedNodeId:
      selectedTreeNodeId ?? (params.activeStage ? `workflow:${params.activeStage}` : null),
    selectTreeNodeId,
  };
};
