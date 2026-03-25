import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Background,
  ReactFlow,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import type {
  ClusterFlowNodeData,
  DiagramFlowEdge,
  DiagramFlowNode,
  ModuleFlowNodeData,
  ProductPartFlowNodeData,
} from "./adapters/domain-model-to-react-flow.types";

type DiagramEditorFacadeProps = {
  readonly nodes: readonly DiagramFlowNode[];
  readonly edges: readonly DiagramFlowEdge[];
  readonly onNodesChange?: (changes: readonly NodeChange[]) => void;
  readonly title: string;
  readonly subtitle?: string;
};

const canvasStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const nodeCardStyle: React.CSSProperties = {
  minWidth: 220,
  maxWidth: 260,
  borderRadius: 16,
  border: "1px solid var(--pm-border-color)",
  background:
    "linear-gradient(180deg, rgba(20, 28, 40, 0.98), rgba(11, 17, 27, 0.98))",
  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.24)",
  padding: "12px 14px",
};

const nodeCaptionStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--pm-text-muted)",
};

const productPartCardStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: 28,
  border: "1px solid rgba(92, 134, 190, 0.35)",
  background:
    "linear-gradient(180deg, rgba(19, 30, 48, 0.92), rgba(13, 20, 32, 0.88))",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
  padding: "18px 18px 22px",
};

const clusterCardStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: 22,
  border: "1px dashed rgba(66, 201, 162, 0.48)",
  background:
    "linear-gradient(180deg, rgba(11, 41, 36, 0.18), rgba(9, 20, 24, 0.1))",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
  padding: "14px 14px 18px",
};

const containerHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  alignContent: "start",
};

const containerSummaryStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const productPartHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(240px, 1fr)",
  gap: 14,
  alignItems: "start",
};

const purposePanelStyle: React.CSSProperties = {
  minWidth: 0,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(7, 13, 23, 0.32)",
  padding: "10px 14px",
};

const purposeTextStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  lineHeight: 1.4,
  color: "var(--pm-text-muted)",
};

const ContainerNode = ({
  data,
}: {
  readonly data: ClusterFlowNodeData | ProductPartFlowNodeData;
}) => {
  if (data.nodeKind === "productPart") {
    return (
      <div style={productPartCardStyle}>
        <div style={productPartHeaderStyle}>
          <div style={containerSummaryStyle}>
            <div style={nodeCaptionStyle}>Product Part</div>
            <strong style={{ fontSize: 15 }}>{data.title}</strong>
            <div style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
              Clusters: {data.clusterIds.length} | Standalone Modules:{" "}
              {data.standaloneModuleIds.length}
            </div>
          </div>
          <div style={purposePanelStyle}>
            <div style={nodeCaptionStyle}>Purpose</div>
            <div style={purposeTextStyle}>{data.purpose}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={clusterCardStyle}>
      <div style={containerHeaderStyle}>
        <div style={nodeCaptionStyle}>Cluster</div>
        <strong style={{ fontSize: 13 }}>{data.title}</strong>
        <div style={{ fontSize: 11, color: "var(--pm-text-muted)" }}>
          Modules: {data.moduleIds.length}
        </div>
        <div style={purposeTextStyle}>{data.purpose}</div>
      </div>
    </div>
  );
};

const ModuleNode = ({ data }: { readonly data: ModuleFlowNodeData }) => (
  <div style={nodeCardStyle}>
    <div style={nodeCaptionStyle}>Module</div>
    <strong style={{ display: "block", fontSize: 14, marginTop: 4 }}>
      {data.title}
    </strong>
    <div style={{ marginTop: 4, fontSize: 11, color: "var(--pm-accent-strong)" }}>
      Kind: {data.kind}
    </div>
    <div
      style={{
        marginTop: 6,
        fontSize: 12,
        lineHeight: 1.35,
        color: "var(--pm-text-muted)",
      }}
    >
      {data.responsibility}
    </div>
    {data.cluster ? (
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "var(--pm-accent-strong)",
        }}
      >
        {data.cluster}
      </div>
    ) : data.kind === "external" ? (
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "var(--pm-accent-strong)",
        }}
      >
        External to {data.productPart}
      </div>
    ) : (
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "var(--pm-text-muted)",
        }}
      >
        Standalone in {data.productPart}
      </div>
    )}
  </div>
);

const NODE_TYPES = {
  cluster: ContainerNode as React.ComponentType,
  module: ModuleNode as React.ComponentType,
} as unknown as NodeTypes;

const PAN_CLASS = "diagram-pan-mode";
const DRAG_CLASS = "diagram-drag-mode";

export const DiagramEditorFacade: React.FC<DiagramEditorFacadeProps> = ({
  nodes,
  edges,
  onNodesChange,
  title,
  subtitle,
}) => {
  const [ctrlHeld, setCtrlHeld] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Control" || event.key === "Meta") setCtrlHeld(true);
  }, []);
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === "Control" || event.key === "Meta") setCtrlHeld(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", () => setCtrlHeld(false));
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const draggable = ctrlHeld && Boolean(onNodesChange);

  return (
    <div
      className={draggable ? DRAG_CLASS : PAN_CLASS}
      style={{
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
      {!draggable && <style>{`.${PAN_CLASS} .react-flow__node{pointer-events:none}`}</style>}
      <ReactFlow
        fitView
        edges={edges as never}
        nodes={nodes as never}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange as never}
        nodesDraggable={draggable}
        nodesConnectable={false}
        elementsSelectable={draggable}
        panOnDrag
        zoomOnDoubleClick={false}
        style={canvasStyle}
      >
        <Background gap={24} size={1} />
      </ReactFlow>
    </div>
  );
};
