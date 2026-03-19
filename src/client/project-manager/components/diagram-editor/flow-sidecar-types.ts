import type { DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";
import type { DiagramLayoutProfileId } from "./diagram-layout-facade";

export type FlowSidecarViewport = {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
};

const FLOW_LAYOUT_PROFILE_IDS = [
  "vertical",
  "horizontal",
  "compact",
  "fill_space",
] as const satisfies readonly DiagramLayoutProfileId[];

export type FlowSidecarDocument = {
  readonly version: 1;
  readonly revision: string;
  readonly updated: string;
  readonly nodes: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  readonly viewport?: FlowSidecarViewport;
  readonly layoutProfile?: DiagramLayoutProfileId;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLayoutProfileId = (value: unknown): value is DiagramLayoutProfileId =>
  typeof value === "string"
  && FLOW_LAYOUT_PROFILE_IDS.includes(value as DiagramLayoutProfileId);

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
    const layoutProfile = isLayoutProfileId(parsed.layoutProfile)
      ? parsed.layoutProfile
      : undefined;

    return {
      version: 1,
      revision: parsed.revision,
      updated: parsed.updated,
      nodes,
      viewport,
      layoutProfile,
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
  readonly layoutProfile?: DiagramLayoutProfileId;
}): FlowSidecarDocument => ({
  version: 1,
  revision: params.revision,
  updated: new Date().toISOString(),
  nodes: Object.fromEntries(
    params.nodes.map((node) => [
      node.id,
      {
        x: node.position.x,
        y: node.position.y,
      },
    ])
  ),
  viewport: params.viewport,
  layoutProfile: params.layoutProfile,
});

export const applyFlowSidecarPositions = (params: {
  readonly nodes: readonly DiagramFlowNode[];
  readonly document: FlowSidecarDocument | null;
  readonly revision: string;
}): readonly DiagramFlowNode[] => {
  if (!params.document || params.document.revision !== params.revision) {
    return params.nodes;
  }

  return params.nodes.map((node) => {
    const position = params.document?.nodes[node.id];
    if (!position) {
      return node;
    }
    return {
      ...node,
      position,
    };
  });
};
