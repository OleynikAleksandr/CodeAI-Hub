import type React from "react";
import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DiagramFlowNode,
  DiagramFlowProjection,
} from "./adapters/domain-model-to-react-flow.types";
import { DiagramEditorFacade } from "./diagram-editor-facade";
import { applyDiagramAutoLayout } from "./diagram-layout-facade";
import {
  SaveStatusIndicator,
  type DiagramSaveState,
} from "./save-status-indicator";

type DiagramEditorShellProps = {
  readonly projection: DiagramFlowProjection;
  readonly title: string;
  readonly subtitle?: string;
  readonly initialNodes?: readonly DiagramFlowNode[];
  readonly saveState?: DiagramSaveState;
  readonly onNodesChange?: (
    nodes: readonly DiagramFlowNode[]
  ) => void | Promise<void>;
};

const hasMeaningfulPositions = (nodes: readonly DiagramFlowNode[]): boolean =>
  nodes.some((node) => node.position.x !== 0 || node.position.y !== 0);

export const DiagramEditorShell: React.FC<DiagramEditorShellProps> = ({
  projection,
  title,
  subtitle,
  initialNodes,
  saveState = "idle",
  onNodesChange,
}) => {
  const [nodes, setNodes] = useState<readonly DiagramFlowNode[]>(
    initialNodes ?? projection.nodes
  );
  const [isAutoLayoutPending, setIsAutoLayoutPending] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const initialLayoutDoneRef = useRef<string | null>(null);
  const effectiveSaveState =
    layoutError && saveState !== "conflict" ? "error" : saveState;

  useEffect(() => {
    setNodes(initialNodes ?? projection.nodes);
  }, [initialNodes, projection.nodes, projection.revision]);

  useEffect(() => {
    setLayoutError(null);
  }, [projection.revision]);

  useEffect(() => {
    if (initialLayoutDoneRef.current === projection.revision) {
      return;
    }
    if (initialNodes && hasMeaningfulPositions(initialNodes)) {
      initialLayoutDoneRef.current = projection.revision;
      return;
    }

    let cancelled = false;
    initialLayoutDoneRef.current = projection.revision;
    setIsAutoLayoutPending(true);

    applyDiagramAutoLayout({
      nodes: projection.nodes,
      edges: projection.edges,
    })
      .then(async (nextNodes) => {
        if (cancelled) {
          return;
        }
        setNodes(nextNodes);
        await onNodesChange?.(nextNodes);
      })
      .catch((error) => {
        if (!cancelled) {
          setLayoutError(
            error instanceof Error ? error.message : "Auto-layout failed"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAutoLayoutPending(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    initialNodes,
    onNodesChange,
    projection.edges,
    projection.nodes,
    projection.revision,
  ]);

  const handleAutoLayout = async (): Promise<void> => {
    setIsAutoLayoutPending(true);
    setLayoutError(null);
    try {
      const nextNodes = await applyDiagramAutoLayout({
        nodes,
        edges: projection.edges,
      });
      setNodes(nextNodes);
      await onNodesChange?.(nextNodes);
    } catch (error) {
      setLayoutError(
        error instanceof Error ? error.message : "Auto-layout failed"
      );
    } finally {
      setIsAutoLayoutPending(false);
    }
  };

  const handleFlowNodesChange = useCallback(
    (changes: readonly NodeChange[]): void => {
      const shouldPersist = changes.some(
        (change) => change.type === "position" && change.dragging === false
      );
      let nextNodesSnapshot: readonly DiagramFlowNode[] | null = null;

      setNodes((current) => {
        const nextNodes = applyNodeChanges(
          changes as NodeChange[],
          current as never
        ) as DiagramFlowNode[];
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
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SaveStatusIndicator
          detail={layoutError}
          state={isAutoLayoutPending ? "saving" : effectiveSaveState}
        />
      </div>
      {projection.nodes.length === 0 ? (
        <div className="pm-placeholder">
          Visual shell is ready, but the diagram is empty. Add semantic entities
          or rerun the stage to populate the graph.
        </div>
      ) : null}
      <DiagramEditorFacade
        edges={projection.edges}
        nodes={nodes}
        onAutoLayout={handleAutoLayout}
        onNodesChange={handleFlowNodesChange}
        subtitle={subtitle}
        title={title}
      />
    </div>
  );
};
