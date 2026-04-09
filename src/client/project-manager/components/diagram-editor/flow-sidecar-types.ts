import type {
  ClusterLayoutParams,
  ProductPartLayoutParams,
} from "./diagram-editor-layout-params";
import type { DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";

export const FLOW_SIDECAR_LAYOUT_METRIC_VERSION = 4;

export type FlowSidecarViewport = {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
};

/**
 * Sidecar v2 layoutParams section: declarative CSS Grid layout overrides
 * that survive diagram reload. Keyed by productPartId / clusterId; missing
 * entries fall back to `defaultProductPartLayout()` / `defaultClusterLayout()`.
 */
export type FlowSidecarLayoutParams = {
  readonly productParts: Readonly<Record<string, ProductPartLayoutParams>>;
  readonly clusters: Readonly<Record<string, ClusterLayoutParams>>;
};

export type FlowSidecarDocument = {
  readonly version: 1 | 2;
  readonly revision: string;
  readonly layoutMetricVersion?: number;
  readonly updated: string;
  readonly nodes: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  readonly layoutParams?: FlowSidecarLayoutParams;
  readonly viewport?: FlowSidecarViewport;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseFlowSidecar = (
  content: string
): FlowSidecarDocument | null => {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    if (parsed.version !== 1 || typeof parsed.revision !== "string") {
      return null;
    }
    if (typeof parsed.updated !== "string" || !isRecord(parsed.nodes)) {
      return null;
    }

    const nodes = Object.fromEntries(
      Object.entries(parsed.nodes).flatMap(([nodeId, position]) => {
        if (!isRecord(position)) {
          return [];
        }
        const { x, y } = position;
        if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
          return [];
        }
        return [[nodeId, { x, y }] as const];
      })
    );

    const viewport = isRecord(parsed.viewport)
      && isFiniteNumber(parsed.viewport.x)
      && isFiniteNumber(parsed.viewport.y)
      && isFiniteNumber(parsed.viewport.zoom)
      ? {
          x: parsed.viewport.x,
          y: parsed.viewport.y,
          zoom: parsed.viewport.zoom,
        }
      : undefined;

    return {
      version: 1,
      revision: parsed.revision,
      layoutMetricVersion: isFiniteNumber(parsed.layoutMetricVersion)
        ? parsed.layoutMetricVersion
        : undefined,
      updated: parsed.updated,
      nodes,
      viewport,
    };
  } catch {
    return null;
  }
};

export const serializeFlowSidecar = (document: FlowSidecarDocument): string =>
  `${JSON.stringify(document, null, 2)}\n`;

export const buildFlowSidecarDocument = (params: {
  readonly revision: string;
  readonly nodes: readonly DiagramFlowNode[];
  readonly viewport?: FlowSidecarViewport;
}): FlowSidecarDocument => ({
  version: 1,
  revision: params.revision,
  layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
  updated: new Date().toISOString(),
  nodes: Object.fromEntries(
    params.nodes.map((node) => [node.id, { x: 0, y: 0 }])
  ),
  viewport: params.viewport,
});

/**
 * With CSS Grid layout, positions are managed by the browser.
 * This function is a no-op pass-through kept for sidecar v2 compatibility.
 */
export const applyFlowSidecarPositions = (params: {
  readonly nodes: readonly DiagramFlowNode[];
  readonly document: FlowSidecarDocument | null;
  readonly revision: string;
}): readonly DiagramFlowNode[] => params.nodes;
