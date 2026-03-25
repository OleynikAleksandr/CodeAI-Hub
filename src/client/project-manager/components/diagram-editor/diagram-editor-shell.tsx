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
const SIBLING_GAP = 12;

const getConstraints = (data: DiagramFlowNodeData): ContainerConstraints | undefined =>
  (data.nodeKind === "productPart" || data.nodeKind === "cluster") ? data.containerConstraints : undefined;

const nodeRect = (node: DiagramFlowNode) => {
  const w = Number(node.style?.width ?? DEFAULT_MODULE_WIDTH);
  const h = Number(node.style?.height ?? node.style?.minHeight ?? DEFAULT_CHILD_HEIGHT);
  return { x: node.position.x, y: node.position.y, w, h };
};

/** Minimum translation to keep SIBLING_GAP between moved and static, or null if no overlap. */
const collisionPush = (
  m: { x: number; y: number; w: number; h: number },
  s: { x: number; y: number; w: number; h: number }
): { dx: number; dy: number } | null => {
  if (m.x + m.w + SIBLING_GAP <= s.x || s.x + s.w + SIBLING_GAP <= m.x ||
      m.y + m.h + SIBLING_GAP <= s.y || s.y + s.h + SIBLING_GAP <= m.y) return null;
  const pushes = [
    { dx: s.x - SIBLING_GAP - (m.x + m.w), dy: 0 },
    { dx: s.x + s.w + SIBLING_GAP - m.x, dy: 0 },
    { dx: 0, dy: s.y - SIBLING_GAP - (m.y + m.h) },
    { dx: 0, dy: s.y + s.h + SIBLING_GAP - m.y },
  ];
  let best = pushes[0];
  let bestAbs = Math.abs(best.dx) + Math.abs(best.dy);
  for (let i = 1; i < pushes.length; i++) {
    const a = Math.abs(pushes[i].dx) + Math.abs(pushes[i].dy);
    if (a < bestAbs) { best = pushes[i]; bestAbs = a; }
  }
  return best;
};

/** Resolve sibling overlaps for moved nodes within a group of sibling indices. */
const separateSiblings = (result: DiagramFlowNode[], siblings: number[], movedIds: ReadonlySet<string>): void => {
  for (const mi of siblings) {
    if (!movedIds.has(result[mi].id)) continue;
    for (const si of siblings) {
      if (si === mi) continue;
      const push = collisionPush(nodeRect(result[mi]), nodeRect(result[si]));
      if (push) {
        const prev = result[mi];
        result[mi] = { ...prev, position: { x: prev.position.x + push.dx, y: prev.position.y + push.dy } };
      }
    }
  }
};

/**
 * Clamp child positions, resolve sibling collisions, and resize containers.
 * Processes bottom-up: clusters first, then product parts, then top-level PP collisions.
 */
const resizeContainersToFit = (allNodes: readonly DiagramFlowNode[], movedIds: ReadonlySet<string>): DiagramFlowNode[] => {
  const result: DiagramFlowNode[] = allNodes.map((n) => ({ ...n }));

  const childIndicesByParent = new Map<string, number[]>();
  const topLevelIndices: number[] = [];
  for (let i = 0; i < result.length; i++) {
    const pid = result[i].parentId;
    if (pid) {
      const list = childIndicesByParent.get(pid) ?? [];
      list.push(i);
      childIndicesByParent.set(pid, list);
    } else {
      topLevelIndices.push(i);
    }
  }

  const clampChildren = (indices: number[], c: ContainerConstraints): void => {
    for (const ci of indices) {
      const child = result[ci];
      const cx = Math.max(c.childMinX, child.position.x);
      const cy = Math.max(c.childMinY, child.position.y);
      if (cx !== child.position.x || cy !== child.position.y) {
        result[ci] = { ...child, position: { x: cx, y: cy } };
      }
    }
  };

  const resizeContainer = (idx: number, indices: number[], c: ContainerConstraints): void => {
    let maxRight = 0, maxBottom = 0;
    for (const ci of indices) {
      const r = nodeRect(result[ci]);
      maxRight = Math.max(maxRight, r.x + r.w);
      maxBottom = Math.max(maxBottom, r.y + r.h);
    }
    const newW = Math.max(c.minWidth, maxRight + c.paddingRight);
    const newH = Math.max(c.minHeight, maxBottom + c.paddingBottom);
    const container = result[idx];
    const curW = Number(container.style?.width ?? c.minWidth);
    const curH = Number(container.style?.height ?? c.minHeight);
    if (newW !== curW || newH !== curH) {
      result[idx] = { ...container, style: { ...container.style, width: newW, height: newH } };
    }
  };

  const processContainer = (idx: number): void => {
    const c = getConstraints(result[idx].data);
    if (!c) return;
    const indices = childIndicesByParent.get(result[idx].id);
    if (!indices || indices.length === 0) return;
    clampChildren(indices, c);
    separateSiblings(result, indices, movedIds);
    clampChildren(indices, c);
    resizeContainer(idx, indices, c);
  };

  // Bottom-up: clusters → product parts → top-level PP collisions
  for (let i = 0; i < result.length; i++) { if (result[i].data.nodeKind === "cluster") processContainer(i); }
  for (let i = 0; i < result.length; i++) { if (result[i].data.nodeKind === "productPart") processContainer(i); }
  separateSiblings(result, topLevelIndices, movedIds);

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

      const movedIds = new Set(changes.filter((c) => c.type === "position").map((c) => c.id));
      setNodes((current) => {
        const applied = applyNodeChanges(
          changes as NodeChange[],
          current as never
        ) as DiagramFlowNode[];
        const nextNodes = resizeContainersToFit(applied, movedIds);
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
