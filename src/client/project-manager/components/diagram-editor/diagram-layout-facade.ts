import ELK from "elkjs/lib/elk.bundled.js";
import type {
  DiagramFlowEdge,
  DiagramFlowNode,
} from "./adapters/domain-model-to-react-flow.types";

const elk = new ELK();

const DEFAULT_NODE_WIDTH = 260;
const DEFAULT_NODE_HEIGHT = 96;

export type DiagramLayoutDirection = "DOWN" | "RIGHT";

const getLayoutDirection = (direction: DiagramLayoutDirection): "DOWN" | "RIGHT" =>
  direction;

export const applyDiagramAutoLayout = async (params: {
  readonly nodes: readonly DiagramFlowNode[];
  readonly edges: readonly DiagramFlowEdge[];
  readonly direction?: DiagramLayoutDirection;
}): Promise<readonly DiagramFlowNode[]> => {
  const direction = getLayoutDirection(params.direction ?? "DOWN");
  const graph = {
    id: "diagram-root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": "56",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.edgeRouting": "ORTHOGONAL",
    },
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

  return params.nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
};
