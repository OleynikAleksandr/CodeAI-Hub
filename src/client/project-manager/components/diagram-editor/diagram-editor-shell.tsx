import type React from "react";
import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";
import type {
  DiagramFlowNode,
  DiagramFlowProjection,
} from "./adapters/domain-model-to-react-flow.types";
import { normalizeManualDiagramLayout } from "./diagram-editor-manual-layout-normalizer";
import { normalizeMeasuredDiagramLayout } from "./diagram-editor-measured-layout-normalizer";
import { DiagramEditorFacade } from "./diagram-editor-facade";

const getNumericStyleMetric = (
  node: DiagramFlowNode,
  key: "width" | "height" | "minHeight"
): number | undefined => {
  const value = node.style?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const sameMeasuredNodeLayout = (
  left: DiagramFlowNode,
  right: DiagramFlowNode
): boolean =>
  left.id === right.id
  && left.parentId === right.parentId
  && left.position.x === right.position.x
  && left.position.y === right.position.y
  && left.width === right.width
  && left.height === right.height
  && left.measured?.width === right.measured?.width
  && left.measured?.height === right.measured?.height
  && left.measured?.bodyStartY === right.measured?.bodyStartY
  && getNumericStyleMetric(left, "width") === getNumericStyleMetric(right, "width")
  && getNumericStyleMetric(left, "height") === getNumericStyleMetric(right, "height")
  && getNumericStyleMetric(left, "minHeight") === getNumericStyleMetric(right, "minHeight");

const sameMeasuredLayoutSnapshot = (
  left: readonly DiagramFlowNode[],
  right: readonly DiagramFlowNode[]
): boolean =>
  left.length === right.length
  && left.every((node, index) => sameMeasuredNodeLayout(node, right[index]!));

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
        const nextNodes = normalizeManualDiagramLayout(applied, movedIds);
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

  const handleMeasuredNodes = useCallback(
    (measuredNodes: readonly DiagramFlowNode[]): void => {
      setNodes((current) => {
        const normalizedNodes = normalizeMeasuredDiagramLayout(
          measuredNodes,
          projection.layoutSource ?? "seed-autolayout"
        );
        return sameMeasuredLayoutSnapshot(current, normalizedNodes)
          ? current
          : normalizedNodes;
      });
    },
    [projection.layoutSource]
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
          measurementRevision={projection.revision}
          nodes={nodes}
          onMeasuredNodes={handleMeasuredNodes}
          onNodesChange={handleFlowNodesChange}
          subtitle={subtitle}
          title={title}
        />
      </div>
    </div>
  );
};
