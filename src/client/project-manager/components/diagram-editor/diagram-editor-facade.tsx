import type React from "react";
import {
  Background,
  Controls,
  type NodeChange,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import { useEffect } from "react";
import type {
  DiagramFlowEdge,
  DiagramFlowNode,
} from "./adapters/domain-model-to-react-flow.types";

type DiagramEditorFacadeProps = {
  readonly nodes: readonly DiagramFlowNode[];
  readonly edges: readonly DiagramFlowEdge[];
  readonly onAutoLayout?: () => void | Promise<void>;
  readonly onNodesChange?: (changes: readonly NodeChange[]) => void;
  readonly title: string;
  readonly subtitle?: string;
  readonly viewportRefreshToken?: number;
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 12px",
  borderBottom: "1px solid var(--pm-border-color)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
};

const canvasStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const miniMapStyle: React.CSSProperties = {
  width: 144,
  height: 88,
  background: "rgba(15, 23, 34, 0.92)",
  border: "1px solid var(--pm-border-color)",
  borderRadius: 12,
};

const FIT_VIEW_OPTIONS = {
  duration: 240,
  padding: 0.16,
} as const;

const DiagramViewportSync: React.FC<{
  readonly viewportRefreshToken: number;
}> = ({ viewportRefreshToken }) => {
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (viewportRefreshToken === 0 || !nodesInitialized) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void fitView(FIT_VIEW_OPTIONS);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [fitView, nodesInitialized, viewportRefreshToken]);

  return null;
};

export const DiagramEditorFacade: React.FC<DiagramEditorFacadeProps> = ({
  nodes,
  edges,
  onAutoLayout,
  onNodesChange,
  title,
  subtitle,
  viewportRefreshToken = 0,
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateRows: "auto 1fr",
      width: "100%",
      height: "100%",
      minHeight: 420,
      background: "var(--pm-bg-surface)",
      border: "1px solid var(--pm-border-color)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "var(--pm-shadow-soft)",
    }}
  >
    <div style={toolbarStyle}>
      <div style={{ display: "grid", gap: 4 }}>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        {subtitle ? (
          <span style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
            {subtitle}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => {
          void onAutoLayout?.();
        }}
        style={{
          height: 32,
          padding: "0 12px",
          borderRadius: 999,
          border: "1px solid var(--pm-border-strong)",
          background: "rgba(66, 201, 162, 0.12)",
          color: "var(--pm-accent-strong)",
          cursor: onAutoLayout ? "pointer" : "default",
          opacity: onAutoLayout ? 1 : 0.6,
        }}
      >
        Auto-layout
      </button>
    </div>
    <div style={{ position: "relative", minHeight: 0 }}>
      <ReactFlowProvider>
        <ReactFlow
          fitView
          edges={edges as never}
          nodes={nodes as never}
          onNodesChange={onNodesChange as never}
          nodesDraggable={Boolean(onNodesChange)}
          nodesConnectable={false}
          elementsSelectable={Boolean(onNodesChange)}
          panOnDrag
          zoomOnDoubleClick={false}
          style={canvasStyle}
        >
          <DiagramViewportSync viewportRefreshToken={viewportRefreshToken} />
          <Background gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable style={miniMapStyle} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  </div>
);
