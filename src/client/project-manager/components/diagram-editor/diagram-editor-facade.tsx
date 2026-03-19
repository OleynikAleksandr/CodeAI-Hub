import type React from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import type {
  ClusterFlowNodeData,
  DiagramFlowEdge,
  DiagramFlowNode,
  FacadeFlowNodeData,
  ModuleFlowNodeData,
} from "./adapters/domain-model-to-react-flow.types";

type DiagramEditorFacadeProps = {
  readonly nodes: readonly DiagramFlowNode[];
  readonly edges: readonly DiagramFlowEdge[];
  readonly onNodesChange?: (changes: readonly NodeChange[]) => void;
  readonly title: string;
  readonly subtitle?: string;
};

const toolbarStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "10px 12px",
  borderBottom: "1px solid var(--pm-border-color)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
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

const clusterCardStyle: React.CSSProperties = {
  minWidth: 150,
  borderRadius: 999,
  border: "1px dashed rgba(66, 201, 162, 0.45)",
  background: "rgba(66, 201, 162, 0.08)",
  color: "var(--pm-accent-strong)",
  padding: "8px 12px",
  boxShadow: "0 8px 18px rgba(0, 0, 0, 0.18)",
};

const ClusterNode = ({ data }: { readonly data: ClusterFlowNodeData }) => (
  <div style={clusterCardStyle}>
    <div style={nodeCaptionStyle}>Cluster</div>
    <strong style={{ fontSize: 13 }}>{data.title}</strong>
  </div>
);

const ModuleNode = ({ data }: { readonly data: ModuleFlowNodeData }) => (
  <div style={nodeCardStyle}>
    <div style={nodeCaptionStyle}>{data.kind}</div>
    <strong style={{ display: "block", fontSize: 14, marginTop: 4 }}>
      {data.title}
    </strong>
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
    ) : null}
  </div>
);

const FacadeNode = ({ data }: { readonly data: FacadeFlowNodeData }) => (
  <div style={nodeCardStyle}>
    <div style={nodeCaptionStyle}>{data.visibility} facade</div>
    <strong style={{ display: "block", fontSize: 14, marginTop: 4 }}>
      {data.facadeId}
    </strong>
    <div style={{ marginTop: 6, fontSize: 12, color: "var(--pm-text-muted)" }}>
      Module: {data.moduleId}
    </div>
    <div
      style={{
        marginTop: 8,
        fontSize: 11,
        color: "var(--pm-accent-strong)",
      }}
    >
      Methods: {data.methodCount}
    </div>
  </div>
);

const NODE_TYPES = {
  cluster: ClusterNode as React.ComponentType,
  module: ModuleNode as React.ComponentType,
  facade: FacadeNode as React.ComponentType,
} as unknown as NodeTypes;

export const DiagramEditorFacade: React.FC<DiagramEditorFacadeProps> = ({
  nodes,
  edges,
  onNodesChange,
  title,
  subtitle,
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
      <strong style={{ fontSize: 14 }}>{title}</strong>
      {subtitle ? (
        <span style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
          {subtitle}
        </span>
      ) : null}
    </div>
    <div style={{ position: "relative", minHeight: 0 }}>
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
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  </div>
);
