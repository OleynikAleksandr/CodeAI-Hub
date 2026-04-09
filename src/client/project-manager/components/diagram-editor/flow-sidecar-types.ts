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

const PRODUCT_PART_COLUMNS_VALUES = new Set<ProductPartLayoutParams["columns"]>([
  "auto",
  2,
  3,
  4,
  5,
]);
const TARGET_ASPECT_RATIO_VALUES = new Set<
  ProductPartLayoutParams["targetAspectRatio"]
>(["landscape", "wide", "square"]);
const CLUSTER_MODULE_COLUMNS_VALUES = new Set<
  ClusterLayoutParams["moduleColumns"]
>(["auto", 1, 2, 3]);

const parseProductPartLayoutParams = (
  value: unknown
): ProductPartLayoutParams | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { columns, targetAspectRatio } = value;
  if (
    !PRODUCT_PART_COLUMNS_VALUES.has(
      columns as ProductPartLayoutParams["columns"]
    ) ||
    !TARGET_ASPECT_RATIO_VALUES.has(
      targetAspectRatio as ProductPartLayoutParams["targetAspectRatio"]
    )
  ) {
    return null;
  }
  return {
    columns: columns as ProductPartLayoutParams["columns"],
    targetAspectRatio:
      targetAspectRatio as ProductPartLayoutParams["targetAspectRatio"],
  };
};

const parseClusterLayoutParams = (
  value: unknown
): ClusterLayoutParams | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { moduleColumns } = value;
  if (
    !CLUSTER_MODULE_COLUMNS_VALUES.has(
      moduleColumns as ClusterLayoutParams["moduleColumns"]
    )
  ) {
    return null;
  }
  return {
    moduleColumns: moduleColumns as ClusterLayoutParams["moduleColumns"],
  };
};

const parseLayoutParamsSection = (
  value: unknown
): FlowSidecarLayoutParams | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const productPartsSource = isRecord(value.productParts)
    ? value.productParts
    : {};
  const clustersSource = isRecord(value.clusters) ? value.clusters : {};

  const productParts = Object.fromEntries(
    Object.entries(productPartsSource).flatMap(([id, raw]) => {
      const parsed = parseProductPartLayoutParams(raw);
      return parsed === null ? [] : ([[id, parsed]] as const);
    })
  );
  const clusters = Object.fromEntries(
    Object.entries(clustersSource).flatMap(([id, raw]) => {
      const parsed = parseClusterLayoutParams(raw);
      return parsed === null ? [] : ([[id, parsed]] as const);
    })
  );

  if (
    Object.keys(productParts).length === 0 &&
    Object.keys(clusters).length === 0
  ) {
    return undefined;
  }
  return { productParts, clusters };
};

export const parseFlowSidecar = (
  content: string
): FlowSidecarDocument | null => {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const version =
      parsed.version === 1 || parsed.version === 2
        ? (parsed.version as 1 | 2)
        : null;
    if (version === null || typeof parsed.revision !== "string") {
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

    const layoutParams = parseLayoutParamsSection(parsed.layoutParams);

    return {
      version,
      revision: parsed.revision,
      layoutMetricVersion: isFiniteNumber(parsed.layoutMetricVersion)
        ? parsed.layoutMetricVersion
        : undefined,
      updated: parsed.updated,
      nodes,
      layoutParams,
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
