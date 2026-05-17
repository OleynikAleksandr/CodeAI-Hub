import type React from "react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  ClusterProjectionNodeData,
  DiagramProjectionNode,
  ModuleProjectionNodeData,
  ProductPartProjectionNodeData,
} from "./adapters/domain-model-to-projection.types";
import type { ContextMenuTarget } from "./diagram-editor-context-menu";
import {
  resolveClusterModuleColumns,
  resolveProductPartColumns,
  resolveRowAwareModuleColumns,
  type SlotDescriptor,
} from "./diagram-editor-layout-params";

type DiagramEditorFacadeProps = {
  readonly nodes: readonly DiagramProjectionNode[];
  readonly onContextMenu?: (target: ContextMenuTarget, position: { x: number; y: number }) => void;
  readonly title: string;
  readonly subtitle?: string;
};

type ContextMenuCallback = (target: ContextMenuTarget, position: { x: number; y: number }) => void;
const ContextMenuContext = createContext<ContextMenuCallback | null>(null);

// -- Module card styles --
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

// -- ProductPart card styles --
const productPartCardStyle: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid rgba(92, 134, 190, 0.35)",
  background:
    "linear-gradient(180deg, rgba(19, 30, 48, 0.92), rgba(13, 20, 32, 0.88))",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
  padding: "18px 18px 22px",
};

// -- Cluster card styles --
const clusterCardStyle: React.CSSProperties = {
  borderRadius: 22,
  border: "1px dashed rgba(66, 201, 162, 0.48)",
  background:
    "linear-gradient(180deg, rgba(11, 41, 36, 0.18), rgba(9, 20, 24, 0.1))",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
  padding: "14px 14px 18px",
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

// -- Sub-components (plain React components rendered inside CSS Grid cells) --

const ModuleCard = ({ data }: { readonly data: ModuleProjectionNodeData }) => (
  <div style={nodeCardStyle}>
    <div style={nodeCaptionStyle}>Module</div>
    <strong style={{ display: "block", fontSize: 14, marginTop: 4, color: "var(--pm-accent-strong)" }}>
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
  </div>
);

const ClusterCard = ({
  data,
  resolvedModuleColumns,
}: {
  readonly data: ClusterProjectionNodeData;
  readonly resolvedModuleColumns?: number;
}) => {
  const onContextMenuCb = useContext(ContextMenuContext);
  const moduleCols =
    resolvedModuleColumns
    ?? resolveClusterModuleColumns(data.modules.length, data.layoutParams);
  return (
    <div
      style={clusterCardStyle}
      onContextMenu={(e) => {
        if (!onContextMenuCb) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenuCb(
          { kind: "cluster", clusterId: data.clusterId, currentModuleColumns: data.layoutParams.moduleColumns },
          { x: e.clientX, y: e.clientY },
        );
      }}
    >
      <div style={{ display: "grid", gap: 4, alignContent: "start" }}>
        <div style={nodeCaptionStyle}>Cluster</div>
        <strong style={{ fontSize: 13, color: "var(--pm-accent-strong)" }}>{data.title}</strong>
        <div style={{ fontSize: 11, color: "var(--pm-text-muted)" }}>
          Modules: {data.modules.length}
        </div>
        <div style={purposeTextStyle}>{data.purpose}</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${moduleCols}, 1fr)`,
          gap: 12,
          marginTop: 12,
        }}
      >
        {data.modules.map((m) => (
          <ModuleCard data={m} key={m.moduleId} />
        ))}
      </div>
    </div>
  );
};

const ProductPartNode = ({
  data,
}: {
  readonly id: string;
  readonly data: ProductPartProjectionNodeData;
}) => {
  const onContextMenuCb = useContext(ContextMenuContext);

  const slots: SlotDescriptor[] = [
    ...data.clusters.map((c) => ({
      kind: "cluster" as const,
      moduleCount: c.modules.length,
      moduleColumns: c.layoutParams.moduleColumns,
    })),
    ...data.standaloneModules.map(() => ({
      kind: "standaloneModule" as const,
    })),
  ];
  const columns = resolveProductPartColumns(slots, data.layoutParams);
  const rowAwareModuleColumns =
    data.layoutParams.columns === "auto"
      ? resolveRowAwareModuleColumns(slots, columns)
      : [];

  return (
    <div
      style={productPartCardStyle}
      onContextMenu={(e) => {
        if (!onContextMenuCb) return;
        e.preventDefault();
        onContextMenuCb(
          {
            kind: "productPart",
            productPartId: data.productPartId,
            currentColumns: data.layoutParams.columns,
            currentAspectRatio: data.layoutParams.targetAspectRatio,
          },
          { x: e.clientX, y: e.clientY },
        );
      }}
    >
      <div style={productPartHeaderStyle}>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <div style={nodeCaptionStyle}>Product Part</div>
          <strong style={{ fontSize: 15, color: "var(--pm-accent-strong)" }}>{data.title}</strong>
          <div style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
            Clusters: {data.clusters.length} | Standalone Modules:{" "}
            {data.standaloneModules.length}
          </div>
        </div>
        <div style={purposePanelStyle}>
          <div style={nodeCaptionStyle}>Purpose</div>
          <div style={purposeTextStyle}>{data.purpose}</div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 12,
          marginTop: 12,
        }}
      >
        {data.clusters.map((c, index) => (
          <ClusterCard
            data={c}
            key={c.clusterId}
            resolvedModuleColumns={rowAwareModuleColumns[index]}
          />
        ))}
        {data.standaloneModules.map((m) => (
          <ModuleCard data={m} key={m.moduleId} />
        ))}
      </div>
    </div>
  );
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.01;
// Floor for the auto-fit scale so extremely narrow panels don't collapse the
// composition into an unreadable sliver; below this threshold we allow
// horizontal overflow (container.overflow-x: auto) as a last resort.
const AUTO_FIT_MIN = 0.25;

export const DiagramEditorFacade: React.FC<DiagramEditorFacadeProps> = ({
  nodes,
  onContextMenu,
  title,
  subtitle,
}) => {
  // userZoom: manual Cmd/Ctrl+scroll overlay applied on top of the auto-fit base.
  // autoFitScale: horizontal fit factor computed from container width vs natural
  // content width (<=1). Effective render scale = autoFitScale * userZoom.
  const [userZoom, setUserZoom] = useState(1);
  const [autoFitScale, setAutoFitScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const effectiveZoom = autoFitScale * userZoom;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!(container && content)) return;

    const measure = () => {
      const containerWidth = container.clientWidth;
      const naturalWidth = content.scrollWidth;
      if (naturalWidth <= 0 || containerWidth <= 0) return;
      const fit = Math.min(1, containerWidth / naturalWidth);
      setAutoFitScale(Math.max(AUTO_FIT_MIN, fit));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [nodes]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("pm:diagram:zoom", { detail: { zoom: effectiveZoom } })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("pm:diagram:zoom", { detail: { zoom: 1 } })
      );
    };
  }, [effectiveZoom]);

  useEffect(() => {
    const handler = () => setUserZoom(1);
    window.addEventListener("pm:diagram:zoom:reset", handler);
    return () => window.removeEventListener("pm:diagram:zoom:reset", handler);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    setUserZoom((current) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + delta));
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "0") {
      e.preventDefault();
      setUserZoom(1);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 420,
        // Horizontal scrollbar only appears when auto-fit floor is hit or user
        // manually zooms past 1.0; the normal case (effectiveZoom <= 1) fits.
        overflow: "auto",
        background: "var(--pm-bg-surface)",
        border: "1px solid var(--pm-border-color)",
        borderRadius: 16,
        boxShadow: "var(--pm-shadow-soft)",
      }}
      tabIndex={0}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <ContextMenuContext.Provider value={onContextMenu ?? null}>
        <div
          ref={contentRef}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 18,
            padding: 18,
            alignContent: "start",
            transformOrigin: "top left",
            transform: `scale(${effectiveZoom})`,
            // Keep natural grid sizing: when child content overflows the grid
            // track, scrollWidth on this element already reports the overflow-
            // inclusive natural width, which the auto-fit measurer consumes.
            // Do not add an explicit intrinsic-sizing keyword on width here:
            // prose (purpose text, long titles) would expand into a single
            // unwrappable line and push the natural width beyond any
            // reasonable viewport, collapsing every render to the auto-fit
            // floor.
          }}
        >
          {nodes.map((node) => (
            <ProductPartNode data={node.data} id={node.id} key={node.id} />
          ))}
        </div>
      </ContextMenuContext.Provider>
    </div>
  );
};
