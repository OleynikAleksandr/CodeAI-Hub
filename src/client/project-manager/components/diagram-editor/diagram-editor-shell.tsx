import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type {
  DiagramFlowNode,
  DiagramFlowProjection,
  ProductPartFlowNodeData,
} from "./adapters/domain-model-to-react-flow.types";
import {
  DiagramEditorContextMenu,
  type ContextMenuTarget,
} from "./diagram-editor-context-menu";
import { DiagramEditorFacade } from "./diagram-editor-facade";
import type {
  ClusterModuleColumns,
  ProductPartLayoutColumns,
  TargetAspectRatio,
} from "./diagram-editor-layout-params";

type ContextMenuState = {
  readonly target: ContextMenuTarget;
  readonly position: { readonly x: number; readonly y: number };
} | null;

type DiagramEditorShellProps = {
  readonly projection: DiagramFlowProjection;
  readonly title: string;
  readonly subtitle?: string;
  readonly initialNodes?: readonly DiagramFlowNode[];
  readonly onNodesChange?: (
    nodes: readonly DiagramFlowNode[]
  ) => void | Promise<void>;
};

const resolveEmptyStateMessage = (title: string): string =>
  title === "Diagram Modules"
    ? "Staged shell is ready. After `product-parts.index.md` is parsed, Product Part skeleton nodes appear here and expand as runtime materializes each `product-parts/<part-id>.md`."
    : "The diagram has no renderable nodes yet. Review the stage artifact or rerun the step if this state persists.";

const updateNodeLayoutParam = (
  nodes: readonly DiagramFlowNode[],
  productPartId: string,
  patch: Partial<{ columns: ProductPartLayoutColumns; targetAspectRatio: TargetAspectRatio }>,
): DiagramFlowNode[] =>
  nodes.map((node) => {
    const data = node.data as ProductPartFlowNodeData;
    if (data.productPartId !== productPartId) return node as DiagramFlowNode;
    return {
      ...node,
      data: { ...data, layoutParams: { ...data.layoutParams, ...patch } },
    } as DiagramFlowNode;
  });

const updateClusterLayoutParam = (
  nodes: readonly DiagramFlowNode[],
  clusterId: string,
  moduleColumns: ClusterModuleColumns,
): DiagramFlowNode[] =>
  nodes.map((node) => {
    const data = node.data as ProductPartFlowNodeData;
    const clusterIndex = data.clusters.findIndex((c) => c.clusterId === clusterId);
    if (clusterIndex === -1) return node as DiagramFlowNode;
    const clusters = [...data.clusters];
    clusters[clusterIndex] = {
      ...clusters[clusterIndex]!,
      layoutParams: { ...clusters[clusterIndex]!.layoutParams, moduleColumns },
    };
    return { ...node, data: { ...data, clusters } } as DiagramFlowNode;
  });

export const DiagramEditorShell: React.FC<DiagramEditorShellProps> = ({
  projection,
  title,
  subtitle,
  initialNodes,
  onNodesChange,
}) => {
  const [nodes, setNodes] = useState<readonly DiagramFlowNode[]>(
    initialNodes ?? projection.nodes
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  useEffect(() => {
    setNodes(initialNodes ?? projection.nodes);
  }, [initialNodes, projection.nodes, projection.revision]);

  const handleContextMenu = useCallback(
    (target: ContextMenuTarget, position: { x: number; y: number }) => {
      setContextMenu({ target, position });
    },
    [],
  );

  const handleProductPartColumnsChange = useCallback(
    (productPartId: string, columns: ProductPartLayoutColumns) => {
      const next = updateNodeLayoutParam(nodes, productPartId, { columns });
      setNodes(next);
      void onNodesChange?.(next);
    },
    [nodes, onNodesChange],
  );

  const handleProductPartAspectRatioChange = useCallback(
    (productPartId: string, targetAspectRatio: TargetAspectRatio) => {
      const next = updateNodeLayoutParam(nodes, productPartId, {
        targetAspectRatio,
      });
      setNodes(next);
      void onNodesChange?.(next);
    },
    [nodes, onNodesChange],
  );

  const handleClusterModuleColumnsChange = useCallback(
    (clusterId: string, moduleColumns: ClusterModuleColumns) => {
      const next = updateClusterLayoutParam(nodes, clusterId, moduleColumns);
      setNodes(next);
      void onNodesChange?.(next);
    },
    [nodes, onNodesChange],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      {projection.nodes.length === 0 ? (
        <div className="pm-placeholder">{resolveEmptyStateMessage(title)}</div>
      ) : null}
      <div style={{ display: "flex", flex: "1 1 auto", minHeight: 420 }}>
        <DiagramEditorFacade
          nodes={nodes}
          onContextMenu={handleContextMenu}
          subtitle={subtitle}
          title={title}
        />
      </div>
      {contextMenu ? (
        <DiagramEditorContextMenu
          onClose={() => setContextMenu(null)}
          onClusterModuleColumnsChange={handleClusterModuleColumnsChange}
          onProductPartAspectRatioChange={handleProductPartAspectRatioChange}
          onProductPartColumnsChange={handleProductPartColumnsChange}
          position={contextMenu.position}
          target={contextMenu.target}
        />
      ) : null}
    </div>
  );
};
