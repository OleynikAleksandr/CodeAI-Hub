import type React from "react";
import {
  Background,
  Controls,
  type NodeChange,
  type NodeTypes,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import { useEffect } from "react";
import type {
  ClusterFlowNodeData,
  DiagramFlowEdge,
  DiagramFlowNode,
  FacadeFlowNodeData,
  ModuleFlowNodeData,
} from "./adapters/domain-model-to-react-flow.types";
import type {
  DiagramLayoutProfileId,
  DiagramLayoutProfileOption,
} from "./diagram-layout-facade";

type DiagramEditorFacadeProps = {
  readonly nodes: readonly DiagramFlowNode[];
  readonly edges: readonly DiagramFlowEdge[];
  readonly onAutoLayout?: () => void | Promise<void>;
  readonly layoutProfile?: DiagramLayoutProfileId;
  readonly layoutProfileOptions?: readonly DiagramLayoutProfileOption[];
  readonly onLayoutProfileChange?: (profile: DiagramLayoutProfileId) => void;
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

const nodeCardStyle: React.CSSProperties = {
  minWidth: 220,
  maxWidth: 260,
  borderRadius: 16,
  border: "1px solid var(--pm-border-color)",
  background: "linear-gradient(180deg, rgba(20, 28, 40, 0.98), rgba(11, 17, 27, 0.98))",
  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.24)",
  padding: "12px 14px",
};

const nodeCaptionStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--pm-text-muted)",
};

const clusterCardStyle: React.CSSProperties = {
  minWidth: 150,
  borderRadius: 999,
  border: "1px dashed rgba(66, 201, 162, 0.45)",
  background: "rgba(66, 201, 162, 0.08)",
  color: "var(--pm-accent-strong)",
  padding: "8px 12px",
  boxShadow: "0 8px 18px rgba(0, 0, 0, 0.18)",
};

const layoutProfileGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: 4,
  borderRadius: 999,
  border: "1px solid var(--pm-border-strong)",
  background: "rgba(255, 255, 255, 0.04)",
  flexWrap: "wrap",
};

const getLayoutProfileButtonStyle = (
  isActive: boolean
): React.CSSProperties => ({
  height: 24,
  padding: "0 10px",
  borderRadius: 999,
  border: "none",
  background: isActive
    ? "rgba(66, 201, 162, 0.16)"
    : "transparent",
  color: isActive
    ? "var(--pm-accent-strong)"
    : "var(--pm-text-muted)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: isActive ? 600 : 500,
});

const FIT_VIEW_OPTIONS = { duration: 240, padding: 0.16 } as const;
const ClusterNode = ({ data }: { readonly data: ClusterFlowNodeData }) => (
  <div style={clusterCardStyle}><div style={nodeCaptionStyle}>Cluster</div><strong style={{ fontSize: 13 }}>{data.title}</strong></div>
);

const ModuleNode = ({ data }: { readonly data: ModuleFlowNodeData }) => (
  <div style={nodeCardStyle}>
    <div style={nodeCaptionStyle}>{data.kind}</div>
    <strong style={{ display: "block", fontSize: 14, marginTop: 4 }}>{data.title}</strong>
    <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.35, color: "var(--pm-text-muted)" }}>{data.responsibility}</div>
    {data.cluster ? (
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--pm-accent-strong)" }}>{data.cluster}</div>
    ) : null}
  </div>
);

const FacadeNode = ({ data }: { readonly data: FacadeFlowNodeData }) => (
  <div style={nodeCardStyle}>
    <div style={nodeCaptionStyle}>{data.visibility} facade</div>
    <strong style={{ display: "block", fontSize: 14, marginTop: 4 }}>{data.facadeId}</strong>
    <div style={{ marginTop: 6, fontSize: 12, color: "var(--pm-text-muted)" }}>Module: {data.moduleId}</div>
    <div style={{ marginTop: 8, fontSize: 11, color: "var(--pm-accent-strong)" }}>Methods: {data.methodCount}</div>
  </div>
);

const NODE_TYPES = {
  cluster: ClusterNode as React.ComponentType,
  module: ModuleNode as React.ComponentType,
  facade: FacadeNode as React.ComponentType,
} as unknown as NodeTypes;

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
  layoutProfile,
  layoutProfileOptions,
  onLayoutProfileChange,
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {layoutProfileOptions && layoutProfile ? (
          <div
            aria-label="Diagram layout profile"
            role="group"
            style={layoutProfileGroupStyle}
          >
            {layoutProfileOptions.map((option) => (
              <button
                aria-pressed={option.id === layoutProfile}
                key={option.id}
                onClick={() => {
                  onLayoutProfileChange?.(option.id);
                }}
                style={getLayoutProfileButtonStyle(
                  option.id === layoutProfile
                )}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
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
    </div>
    <div style={{ position: "relative", minHeight: 0 }}>
      <ReactFlowProvider>
        <ReactFlow
          fitView
          edges={edges as never}
          nodes={nodes as never}
          nodeTypes={NODE_TYPES}
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
