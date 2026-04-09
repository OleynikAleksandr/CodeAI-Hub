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

const sortObjectByKey = <T>(
  entries: Readonly<Record<string, T>>
): Readonly<Record<string, T>> =>
  Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );

const collectLayoutParamsFromNodes = (
  nodes: readonly DiagramFlowNode[]
): FlowSidecarLayoutParams => {
  const productParts: Record<string, ProductPartLayoutParams> = {};
  const clusters: Record<string, ClusterLayoutParams> = {};
  for (const node of nodes) {
    const data = node.data;
    productParts[data.productPartId] = { ...data.layoutParams };
    for (const cluster of data.clusters) {
      clusters[cluster.clusterId] = { ...cluster.layoutParams };
    }
  }
  return {
    productParts: sortObjectByKey(productParts),
    clusters: sortObjectByKey(clusters),
  };
};

export const serializeFlowSidecar = (document: FlowSidecarDocument): string =>
  `${JSON.stringify(document, null, 2)}\n`;

export const buildFlowSidecarDocument = (params: {
  readonly revision: string;
  readonly nodes: readonly DiagramFlowNode[];
  readonly viewport?: FlowSidecarViewport;
}): FlowSidecarDocument => ({
  version: 2,
  revision: params.revision,
  layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
  updated: new Date().toISOString(),
  nodes: sortObjectByKey(
    Object.fromEntries(
      params.nodes.map((node) => [node.id, { x: 0, y: 0 }])
    )
  ),
  layoutParams: collectLayoutParamsFromNodes(params.nodes),
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

/**
 * Merge sidecar-persisted layoutParams (v2) back onto projection nodes.
 * ProductPart params override the ProductPart node layoutParams; cluster
 * params override the matching nested cluster layoutParams inside each
 * ProductPart's `data.clusters`. Missing entries fall back to whatever
 * defaults the adapter already put on the node. Returns a new array only
 * when at least one node actually changes — otherwise the original array
 * reference is returned so downstream `useEffect` dependencies stay stable.
 */
export const applyFlowSidecarLayoutParams = (params: {
  readonly nodes: readonly DiagramFlowNode[];
  readonly document: FlowSidecarDocument | null;
}): readonly DiagramFlowNode[] => {
  const layoutParams = params.document?.layoutParams;
  if (!layoutParams) {
    return params.nodes;
  }

  let changed = false;
  const next = params.nodes.map((node) => {
    const data = node.data;
    const productPartOverride =
      layoutParams.productParts[data.productPartId];

    let clustersChanged = false;
    const nextClusters = data.clusters.map((cluster) => {
      const override = layoutParams.clusters[cluster.clusterId];
      if (!override) {
        return cluster;
      }
      clustersChanged = true;
      return {
        ...cluster,
        layoutParams: { ...cluster.layoutParams, ...override },
      };
    });

    if (!(productPartOverride || clustersChanged)) {
      return node;
    }

    changed = true;
    return {
      ...node,
      data: {
        ...data,
        layoutParams: productPartOverride
          ? { ...data.layoutParams, ...productPartOverride }
          : data.layoutParams,
        clusters: clustersChanged ? nextClusters : data.clusters,
      },
    };
  });

  return changed ? next : params.nodes;
};
