import type React from "react";
import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";
import type {
  ContainerConstraints,
  DiagramFlowNode,
  DiagramFlowNodeData,
  DiagramFlowProjection,
} from "./adapters/domain-model-to-react-flow.types";
import { DiagramEditorFacade } from "./diagram-editor-facade";

const DEFAULT_MODULE_WIDTH = 240;
const DEFAULT_CHILD_HEIGHT = 100;

const getConstraints = (data: DiagramFlowNodeData): ContainerConstraints | undefined =>
  (data.nodeKind === "productPart" || data.nodeKind === "cluster") ? data.containerConstraints : undefined;

const childSize = (node: DiagramFlowNode): { w: number; h: number } => ({
  w: Number(node.style?.width ?? DEFAULT_MODULE_WIDTH),
  h: Number(node.style?.height ?? node.style?.minHeight ?? DEFAULT_CHILD_HEIGHT),
});

/**
 * Clamp child positions within container header area and resize containers
 * to fit their children. Processes bottom-up: clusters first, then product parts.
 */
const resizeContainersToFit = (allNodes: readonly DiagramFlowNode[]): DiagramFlowNode[] => {
  const result: DiagramFlowNode[] = allNodes.map((n) => ({ ...n }));

  const childIndicesByParent = new Map<string, number[]>();
  for (let i = 0; i < result.length; i++) {
    const pid = result[i].parentId;
    if (pid) {
      const list = childIndicesByParent.get(pid) ?? [];
      list.push(i);
      childIndicesByParent.set(pid, list);
    }
  }

  const processContainer = (idx: number): void => {
    const container = result[idx];
    const c = getConstraints(container.data);
    if (!c) return;
    const indices = childIndicesByParent.get(container.id);
    if (!indices || indices.length === 0) return;

    // Clamp child positions (left/top only — right/bottom grow dynamically)
    for (const ci of indices) {
      const child = result[ci];
      const cx = Math.max(c.childMinX, child.position.x);
      const cy = Math.max(c.childMinY, child.position.y);
      if (cx !== child.position.x || cy !== child.position.y) {
        result[ci] = { ...child, position: { x: cx, y: cy } };
      }
    }

    // Bounding box of all children after clamp
    let maxRight = 0;
    let maxBottom = 0;
    for (const ci of indices) {
      const child = result[ci];
      const sz = childSize(child);
      maxRight = Math.max(maxRight, child.position.x + sz.w);
      maxBottom = Math.max(maxBottom, child.position.y + sz.h);
    }

    const newW = Math.max(c.minWidth, maxRight + c.paddingRight);
    const newH = Math.max(c.minHeight, maxBottom + c.paddingBottom);
    const curW = Number(container.style?.width ?? c.minWidth);
    const curH = Number(container.style?.height ?? c.minHeight);

    if (newW !== curW || newH !== curH) {
      result[idx] = { ...container, style: { ...container.style, width: newW, height: newH } };
    }
  };

  // Bottom-up: clusters first, then product parts
  for (let i = 0; i < result.length; i++) {
    if (result[i].data.nodeKind === "cluster") processContainer(i);
  }
  for (let i = 0; i < result.length; i++) {
    if (result[i].data.nodeKind === "productPart") processContainer(i);
  }

  return result;
};

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

  useEffect(() => {
    setNodes(initialNodes ?? projection.nodes);
  }, [initialNodes, projection.nodes, projection.revision]);

  const handleFlowNodesChange = useCallback(
    (changes: readonly NodeChange[]): void => {
      const shouldPersist = changes.some(
        (change) => change.type === "position" && change.dragging === false
      );
      let nextNodesSnapshot: readonly DiagramFlowNode[] | null = null;

      setNodes((current) => {
        const applied = applyNodeChanges(
          changes as NodeChange[],
          current as never
        ) as DiagramFlowNode[];
        const nextNodes = resizeContainersToFit(applied);
        if (shouldPersist) {
          nextNodesSnapshot = nextNodes;
        }
        return nextNodes;
      });

      if (nextNodesSnapshot) {
        void onNodesChange?.(nextNodesSnapshot);
      }
    },
    [onNodesChange]
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
          edges={projection.edges}
          nodes={nodes}
          onNodesChange={handleFlowNodesChange}
          subtitle={subtitle}
          title={title}
        />
      </div>
    </div>
  );
};
