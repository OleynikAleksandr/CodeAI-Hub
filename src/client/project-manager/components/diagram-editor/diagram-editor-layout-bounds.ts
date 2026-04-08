import type {
  ContainerConstraints,
  DiagramFlowNode,
  DiagramFlowNodeData,
  DiagramFlowNodeStyle,
} from "./adapters/domain-model-to-react-flow.types";

const DEFAULT_NODE_WIDTH = 240;
const DEFAULT_NODE_HEIGHT = 100;
const MODULE_CARD_SHADOW_Y = 10;
const MODULE_CARD_SHADOW_BLUR = 24;
// React Flow measured height stops at the border-box; reserve the visible shadow tail explicitly.
const MODULE_VISUAL_BOTTOM_OVERFLOW =
  MODULE_CARD_SHADOW_Y + Math.ceil(MODULE_CARD_SHADOW_BLUR / 2);

export const getContainerConstraints = (
  data: DiagramFlowNodeData
): ContainerConstraints | undefined =>
  data.nodeKind === "productPart" || data.nodeKind === "cluster"
    ? data.containerConstraints
    : undefined;

const getNumericStyleMetric = (
  style: DiagramFlowNodeStyle | undefined,
  key: "width" | "height" | "minHeight"
): number | undefined => {
  const value = style?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

export const getNodeBaseWidth = (node: DiagramFlowNode): number =>
  getNumericStyleMetric(node.style, "width")
  ?? node.measured?.width
  ?? node.width
  ?? DEFAULT_NODE_WIDTH;

const getNodeBaseHeight = (node: DiagramFlowNode): number =>
  node.data.nodeKind === "module"
    ? node.measured?.height
      ?? getNumericStyleMetric(node.style, "height")
      ?? node.height
      ?? getNumericStyleMetric(node.style, "minHeight")
      ?? DEFAULT_NODE_HEIGHT
    : getNumericStyleMetric(node.style, "height")
      ?? node.measured?.height
      ?? node.height
      ?? getNumericStyleMetric(node.style, "minHeight")
      ?? DEFAULT_NODE_HEIGHT;

const getNodeVisualBottomOverflow = (node: DiagramFlowNode): number =>
  node.data.nodeKind === "module" ? MODULE_VISUAL_BOTTOM_OVERFLOW : 0;

export const getNodeVisualHeight = (node: DiagramFlowNode): number =>
  getNodeBaseHeight(node) + getNodeVisualBottomOverflow(node);

export const getNodeVisualBottom = (node: DiagramFlowNode): number =>
  node.position.y + getNodeVisualHeight(node);

export const getContainerBodyStartY = (
  node: DiagramFlowNode,
  constraints: ContainerConstraints
): number => node.measured?.bodyStartY ?? constraints.childMinY;
