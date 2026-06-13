import { useEffect, useRef } from "react";
import type { TreeNode } from "./workspace-tree-model";

type UserGateCursorView = {
  readonly activeUserGate?: UserGateView | null;
  readonly queuedUserGates?: readonly { readonly nodeId?: string }[];
};

type UserGateView = {
  readonly currentTaskId?: string;
  readonly expectedCommitMessage?: string;
  readonly id?: string;
  readonly nodeId?: string;
};

interface UserGateNodeTargets {
  readonly activeGateFocusKey: string | null;
  readonly activeGateNodeId: string | null;
  readonly queuedGateNodeIds: ReadonlySet<string>;
}

interface WorkspaceTreeUserGateFocusInput {
  readonly activeGateFocusKey: string | null;
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

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const createUserGateFocusKey = (gate?: UserGateView | null): string | null => {
  const nodeId = normalizeUserGateNodeId(gate?.nodeId);
  if (!nodeId) {
    return null;
  }
  return [
    nodeId,
    readString(gate?.id),
    readString(gate?.currentTaskId),
    readString(gate?.expectedCommitMessage),
  ]
    .filter((value): value is string => Boolean(value))
    .join("|");
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
  activeGateFocusKey: createUserGateFocusKey(cursor?.activeUserGate),
  activeGateNodeId: normalizeUserGateNodeId(cursor?.activeUserGate?.nodeId),
  queuedGateNodeIds: new Set(
    (cursor?.queuedUserGates ?? [])
      .map((gate) => normalizeUserGateNodeId(gate.nodeId))
      .filter((nodeId): nodeId is string => Boolean(nodeId))
  ),
});

export const useWorkspaceTreeUserGateFocus = ({
  activeGateFocusKey,
  activeGateNodeId,
  devTreeLockedNodes,
  devTreeNodes,
  trunkNodes,
}: WorkspaceTreeUserGateFocusInput): void => {
  const lastFocusedGateKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeGateNodeId) {
      lastFocusedGateKeyRef.current = null;
      return;
    }
    const gateFocusKey = activeGateFocusKey ?? activeGateNodeId;
    if (lastFocusedGateKeyRef.current === gateFocusKey) {
      return;
    }
    const activeNode =
      findTreeNodeById(trunkNodes, activeGateNodeId) ??
      findTreeNodeById(devTreeLockedNodes, activeGateNodeId) ??
      findTreeNodeById(devTreeNodes, activeGateNodeId);
    if (!activeNode?.onSelect) {
      return;
    }
    lastFocusedGateKeyRef.current = gateFocusKey;
    activeNode.onSelect();
  }, [
    activeGateFocusKey,
    activeGateNodeId,
    devTreeLockedNodes,
    devTreeNodes,
    trunkNodes,
  ]);
};
