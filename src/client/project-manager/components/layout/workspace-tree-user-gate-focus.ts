import { useEffect, useRef } from "react";
import type { TreeNode } from "./workspace-tree-model";

type UserGateCursorView = {
  readonly activeUserGate?: { readonly nodeId?: string } | null;
  readonly queuedUserGates?: readonly { readonly nodeId?: string }[];
};

interface UserGateNodeTargets {
  readonly activeGateNodeId: string | null;
  readonly queuedGateNodeIds: ReadonlySet<string>;
}

interface WorkspaceTreeUserGateFocusInput {
  readonly activeGateNodeId: string | null;
  readonly devTreeLockedNodes: readonly TreeNode[];
  readonly devTreeNodes: readonly TreeNode[];
  readonly trunkNodes: readonly TreeNode[];
}

const CLUSTER_USER_GATE_NODE_ID_RE = /^cluster:([^/]+)\/(.+)$/u;

const normalizeUserGateNodeId = (nodeId?: string): string | null => {
  const clusterMatch =
    typeof nodeId === "string" ? nodeId.match(CLUSTER_USER_GATE_NODE_ID_RE) : null;
  return typeof nodeId !== "string"
    ? null
    : clusterMatch
      ? `devtree:${clusterMatch[1]}:${clusterMatch[2]}`
      : nodeId.startsWith("product-part:")
        ? `devtree:${nodeId.slice("product-part:".length)}`
        : nodeId;
};

const findTreeNodeById = (
  nodes: readonly TreeNode[],
  nodeId: string
): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const child = node.children ? findTreeNodeById(node.children, nodeId) : null;
    if (child) {
      return child;
    }
  }
  return null;
};

export const resolveUserGateNodeTargets = (
  cursor?: UserGateCursorView | null
): UserGateNodeTargets => ({
  activeGateNodeId: normalizeUserGateNodeId(cursor?.activeUserGate?.nodeId),
  queuedGateNodeIds: new Set(
    (cursor?.queuedUserGates ?? [])
      .map((gate) => normalizeUserGateNodeId(gate.nodeId))
      .filter((nodeId): nodeId is string => Boolean(nodeId))
  ),
});

export const useWorkspaceTreeUserGateFocus = ({
  activeGateNodeId,
  devTreeLockedNodes,
  devTreeNodes,
  trunkNodes,
}: WorkspaceTreeUserGateFocusInput): void => {
  const lastFocusedGateNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeGateNodeId) {
      lastFocusedGateNodeIdRef.current = null;
      return;
    }
    if (lastFocusedGateNodeIdRef.current === activeGateNodeId) {
      return;
    }
    const activeNode =
      findTreeNodeById(trunkNodes, activeGateNodeId) ??
      findTreeNodeById(devTreeLockedNodes, activeGateNodeId) ??
      findTreeNodeById(devTreeNodes, activeGateNodeId);
    if (!activeNode?.onSelect) {
      return;
    }
    lastFocusedGateNodeIdRef.current = activeGateNodeId;
    activeNode.onSelect();
  }, [activeGateNodeId, devTreeLockedNodes, devTreeNodes, trunkNodes]);
};
