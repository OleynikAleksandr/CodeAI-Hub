import type React from "react";
import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DiagramFlowNode,
  DiagramFlowProjection,
} from "./adapters/domain-model-to-react-flow.types";
import { DiagramEditorFacade } from "./diagram-editor-facade";
import {
  applyDiagramAutoLayout,
  DIAGRAM_LAYOUT_PROFILE_OPTIONS,
  type DiagramLayoutProfileId,
} from "./diagram-layout-facade";
import {
  SaveStatusIndicator,
  type DiagramSaveState,
} from "./save-status-indicator";

type DiagramEditorShellProps = {
  readonly projection: DiagramFlowProjection;
  readonly title: string;
  readonly subtitle?: string;
  readonly initialNodes?: readonly DiagramFlowNode[];
  readonly initialLayoutProfile?: DiagramLayoutProfileId;
  readonly saveState?: DiagramSaveState;
  readonly onNodesChange?: (
    nodes: readonly DiagramFlowNode[]
  ) => void | Promise<void>;
  readonly onFlowStateChange?: (payload: {
    readonly nodes: readonly DiagramFlowNode[];
    readonly revision: string;
    readonly layoutProfile?: DiagramLayoutProfileId;
  }) => void | Promise<void>;
};

const hasMeaningfulPositions = (nodes: readonly DiagramFlowNode[]): boolean =>
  nodes.some((node) => node.position.x !== 0 || node.position.y !== 0);

export const DiagramEditorShell: React.FC<DiagramEditorShellProps> = ({
  projection,
  title,
  subtitle,
  initialNodes,
  initialLayoutProfile,
  saveState = "idle",
  onNodesChange,
  onFlowStateChange,
}) => {
  const [nodes, setNodes] = useState<readonly DiagramFlowNode[]>(
    initialNodes ?? projection.nodes
  );
  const [isAutoLayoutPending, setIsAutoLayoutPending] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [layoutProfile, setLayoutProfile] =
    useState<DiagramLayoutProfileId>(initialLayoutProfile ?? "vertical");
  const [layoutViewport, setLayoutViewport] = useState<{
    readonly width: number;
    readonly height: number;
  } | null>(null);
  const [viewportRefreshToken, setViewportRefreshToken] = useState(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const initialLayoutDoneRef = useRef<string | null>(null);
  const effectiveSaveState =
    layoutError && saveState !== "conflict" ? "error" : saveState;
  const supportsLayoutProfiles = projection.stage === "diagram_modules";
  const resolvedLayoutProfile: DiagramLayoutProfileId = supportsLayoutProfiles
    ? layoutProfile
    : "vertical";

  const requestViewportRefresh = useCallback(() => {
    setViewportRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const container = shellRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setLayoutViewport({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setNodes(initialNodes ?? projection.nodes);
  }, [initialNodes, projection.nodes, projection.revision]);

  useEffect(() => {
    setLayoutProfile(initialLayoutProfile ?? "vertical");
  }, [initialLayoutProfile, projection.revision]);

  useEffect(() => {
    setLayoutError(null);
  }, [projection.revision]);

  const persistFlowState = useCallback(
    async (
      nextNodes: readonly DiagramFlowNode[],
      nextLayoutProfile: DiagramLayoutProfileId
    ): Promise<void> => {
      if (onFlowStateChange) {
        await onFlowStateChange({
          nodes: nextNodes,
          revision: projection.revision,
          layoutProfile: nextLayoutProfile,
        });
        return;
      }
      await onNodesChange?.(nextNodes);
    },
    [onFlowStateChange, onNodesChange, projection.revision]
  );

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
      profile: resolvedLayoutProfile,
      viewport: layoutViewport ?? undefined,
    })
      .then(async (nextNodes) => {
        if (cancelled) {
          return;
        }
        setNodes(nextNodes);
        requestViewportRefresh();
        await persistFlowState(nextNodes, resolvedLayoutProfile);
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
    persistFlowState,
    projection.edges,
    projection.nodes,
    projection.revision,
    requestViewportRefresh,
    resolvedLayoutProfile,
    layoutViewport,
  ]);

  const handleAutoLayout = async (): Promise<void> => {
    setIsAutoLayoutPending(true);
    setLayoutError(null);
    try {
      const nextNodes = await applyDiagramAutoLayout({
        nodes,
        edges: projection.edges,
        profile: resolvedLayoutProfile,
        viewport: layoutViewport ?? undefined,
      });
      setNodes(nextNodes);
      requestViewportRefresh();
      await persistFlowState(nextNodes, resolvedLayoutProfile);
    } catch (error) {
      setLayoutError(
        error instanceof Error ? error.message : "Auto-layout failed"
      );
    } finally {
      setIsAutoLayoutPending(false);
    }
  };

  const handleLayoutProfileChange = async (
    nextProfile: DiagramLayoutProfileId
  ): Promise<void> => {
    if (nextProfile === layoutProfile) {
      return;
    }
    setLayoutProfile(nextProfile);
    setIsAutoLayoutPending(true);
    setLayoutError(null);
    try {
      const nextNodes = await applyDiagramAutoLayout({
        nodes,
        edges: projection.edges,
        profile: nextProfile,
        viewport: layoutViewport ?? undefined,
      });
      setNodes(nextNodes);
      requestViewportRefresh();
      await persistFlowState(nextNodes, nextProfile);
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
        void persistFlowState(nextNodesSnapshot, resolvedLayoutProfile);
      }
    },
    [persistFlowState, resolvedLayoutProfile]
  );

  return (
    <div
      ref={shellRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
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
      <div style={{ display: "flex", flex: "1 1 auto", minHeight: 420 }}>
        <DiagramEditorFacade
          edges={projection.edges}
          nodes={nodes}
          onAutoLayout={handleAutoLayout}
          layoutProfile={supportsLayoutProfiles ? layoutProfile : undefined}
          layoutProfileOptions={
            supportsLayoutProfiles ? DIAGRAM_LAYOUT_PROFILE_OPTIONS : undefined
          }
          onLayoutProfileChange={
            supportsLayoutProfiles ? handleLayoutProfileChange : undefined
          }
          onNodesChange={handleFlowNodesChange}
          subtitle={subtitle}
          title={title}
          viewportRefreshToken={viewportRefreshToken}
        />
      </div>
    </div>
  );
};
