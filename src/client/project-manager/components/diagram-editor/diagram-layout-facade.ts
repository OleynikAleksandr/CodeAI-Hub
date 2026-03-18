import ELK from "elkjs/lib/elk.bundled.js";
import type {
  DiagramFlowEdge,
  DiagramFlowNode,
} from "./adapters/domain-model-to-react-flow.types";

const elk = new ELK();

const DEFAULT_NODE_WIDTH = 260;
const DEFAULT_NODE_HEIGHT = 96;
const DEFAULT_LAYOUT_PADDING = 48;

export type DiagramLayoutDirection = "DOWN" | "RIGHT";
export type DiagramLayoutProfileId =
  | "vertical"
  | "horizontal"
  | "compact"
  | "fill_space";

export type DiagramLayoutProfileOption = {
  readonly id: DiagramLayoutProfileId;
  readonly label: string;
};

export const DIAGRAM_LAYOUT_PROFILE_OPTIONS: readonly DiagramLayoutProfileOption[] =
  [
    { id: "vertical", label: "Vertical" },
    { id: "horizontal", label: "Horizontal" },
    { id: "compact", label: "Compact" },
    { id: "fill_space", label: "Fill space" },
  ] as const;

type DiagramLayoutViewport = {
  readonly width: number;
  readonly height: number;
};

const getLayoutDirection = (direction: DiagramLayoutDirection): "DOWN" | "RIGHT" =>
  direction;

const buildLayeredLayoutOptions = (
  profile: DiagramLayoutProfileId
): Record<string, string> => {
  if (profile === "horizontal") {
    return {
      "elk.algorithm": "layered",
      "elk.direction": getLayoutDirection("RIGHT"),
      "elk.spacing.nodeNode": "72",
      "elk.layered.spacing.nodeNodeBetweenLayers": "140",
      "elk.edgeRouting": "ORTHOGONAL",
    };
  }

  if (profile === "compact") {
    return {
      "elk.algorithm": "layered",
      "elk.direction": getLayoutDirection("DOWN"),
      "elk.spacing.nodeNode": "36",
      "elk.layered.spacing.nodeNodeBetweenLayers": "56",
      "elk.edgeRouting": "ORTHOGONAL",
    };
  }

  return {
    "elk.algorithm": "layered",
    "elk.direction": getLayoutDirection("DOWN"),
    "elk.spacing.nodeNode": "72",
    "elk.layered.spacing.nodeNodeBetweenLayers": "132",
    "elk.edgeRouting": "ORTHOGONAL",
  };
};

const buildForceLayoutOptions = (
  viewport?: DiagramLayoutViewport
): Record<string, string> => ({
  "elk.algorithm": "org.eclipse.elk.force",
  "elk.aspectRatio":
    viewport && viewport.width > 0 && viewport.height > 0
      ? String(viewport.width / viewport.height)
      : "1.6",
  "elk.nodeSpacing": "120",
  "elk.separateConnectedComponents": "true",
});

const spreadNodesToViewport = (
  nodes: readonly DiagramFlowNode[],
  viewport?: DiagramLayoutViewport
): readonly DiagramFlowNode[] => {
  if (!viewport || nodes.length <= 1) {
    return nodes;
  }

  const positions = nodes.map((node) => node.position);
  const minX = Math.min(...positions.map((position) => position.x));
  const maxX = Math.max(...positions.map((position) => position.x));
  const minY = Math.min(...positions.map((position) => position.y));
  const maxY = Math.max(...positions.map((position) => position.y));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const availableWidth = Math.max(
    viewport.width - DEFAULT_NODE_WIDTH - DEFAULT_LAYOUT_PADDING * 2,
    1
  );
  const availableHeight = Math.max(
    viewport.height - DEFAULT_NODE_HEIGHT - DEFAULT_LAYOUT_PADDING * 2,
    1
  );
  const scaleX = availableWidth / spanX;
  const scaleY = availableHeight / spanY;

  return nodes.map((node) => ({
    ...node,
    position: {
      x:
        DEFAULT_LAYOUT_PADDING +
        (node.position.x - minX) * scaleX,
      y:
        DEFAULT_LAYOUT_PADDING +
        (node.position.y - minY) * scaleY,
    },
  }));
};

export const applyDiagramAutoLayout = async (params: {
  readonly nodes: readonly DiagramFlowNode[];
  readonly edges: readonly DiagramFlowEdge[];
  readonly direction?: DiagramLayoutDirection;
  readonly profile?: DiagramLayoutProfileId;
  readonly viewport?: DiagramLayoutViewport;
}): Promise<readonly DiagramFlowNode[]> => {
  const profile =
    params.profile ??
    (params.direction === "RIGHT" ? "horizontal" : "vertical");
  const graph = {
    id: "diagram-root",
    layoutOptions:
      profile === "fill_space"
        ? buildForceLayoutOptions(params.viewport)
        : buildLayeredLayoutOptions(profile),
    children: params.nodes.map((node) => ({
      id: node.id,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    })),
    edges: params.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(graph);
  const positions = new Map(
    (layout.children ?? []).map((node) => [
      node.id,
      { x: node.x ?? 0, y: node.y ?? 0 },
    ])
  );

  const nextNodes = params.nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));

  return profile === "fill_space"
    ? spreadNodesToViewport(nextNodes, params.viewport)
    : nextNodes;
};
