import type {
  ContainerConstraints,
  DiagramFlowNode,
  DiagramFlowNodeData,
  DiagramFlowNodeStyle,
} from "./adapters/domain-model-to-react-flow.types";

export const MEASURED_LAYOUT_MIN_SAFE_GAP = 4;
const TOP_LEVEL_ROW_GAP = 24;
const DEFAULT_NODE_WIDTH = 240;
const DEFAULT_NODE_HEIGHT = 100;

const getConstraints = (
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

const getNodeWidth = (node: DiagramFlowNode): number =>
  getNumericStyleMetric(node.style, "width")
  ?? node.measured?.width
  ?? node.width
  ?? DEFAULT_NODE_WIDTH;

const getNodeHeight = (node: DiagramFlowNode): number =>
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

const rangesOverlapWithGap = (
  startA: number,
  sizeA: number,
  startB: number,
  sizeB: number,
  gap: number
): boolean =>
  !(startA + sizeA + gap <= startB || startB + sizeB + gap <= startA);

const compareNodeOrder = (
  left: DiagramFlowNode,
  right: DiagramFlowNode
): number =>
  left.position.y - right.position.y
  || left.position.x - right.position.x
  || left.id.localeCompare(right.id);

const cloneNode = (node: DiagramFlowNode): DiagramFlowNode => ({
  ...node,
  position: { ...node.position },
  measured: node.measured ? { ...node.measured } : undefined,
  style: node.style ? { ...node.style } : undefined,
});

const repositionNode = (
  node: DiagramFlowNode,
  x: number,
  y: number
): DiagramFlowNode =>
  x === node.position.x && y === node.position.y
    ? node
    : {
        ...node,
        position: { x, y },
      };

const resizeNode = (
  node: DiagramFlowNode,
  width: number,
  height: number
): DiagramFlowNode => {
  const currentWidth = getNumericStyleMetric(node.style, "width");
  const currentHeight = getNumericStyleMetric(node.style, "height");
  if (currentWidth === width && currentHeight === height) {
    return node;
  }
  return {
    ...node,
    style: {
      ...(node.style ?? {}),
      width,
      height,
    },
  };
};

const getBodyStartY = (
  node: DiagramFlowNode,
  constraints: ContainerConstraints
): number => node.measured?.bodyStartY ?? constraints.childMinY;

const reflowContainerChildren = (
  result: DiagramFlowNode[],
  containerNode: DiagramFlowNode,
  childIndices: readonly number[],
  constraints: ContainerConstraints,
  gap: number
): void => {
  const ordered = [...childIndices]
    .sort((leftIndex, rightIndex) =>
      result[leftIndex]!.position.x - result[rightIndex]!.position.x
      || compareNodeOrder(result[leftIndex]!, result[rightIndex]!)
    );
  const bodyStartY = getBodyStartY(containerNode, constraints);
  const nextYByColumn = new Map<number, number>();

  for (const childIndex of ordered) {
    const child = result[childIndex]!;
    const nextX = Math.max(constraints.childMinX, child.position.x);
    const nextSeedY = nextYByColumn.get(nextX) ?? bodyStartY;
    const nextY = Math.max(bodyStartY, nextSeedY, child.position.y);
    result[childIndex] = repositionNode(child, nextX, nextY);
    nextYByColumn.set(nextX, nextY + getNodeHeight(child) + gap);
  }
};

const resizeContainer = (
  result: DiagramFlowNode[],
  containerIndex: number,
  childIndices: readonly number[],
  constraints: ContainerConstraints
): void => {
  let maxRight = 0;
  let maxBottom = 0;

  for (const childIndex of childIndices) {
    const child = result[childIndex]!;
    maxRight = Math.max(maxRight, child.position.x + getNodeWidth(child));
    maxBottom = Math.max(maxBottom, child.position.y + getNodeHeight(child));
  }

  const nextWidth = Math.max(constraints.minWidth, maxRight + constraints.paddingRight);
  const nextHeight = Math.max(
    constraints.minHeight,
    maxBottom + constraints.paddingBottom
  );

  result[containerIndex] = resizeNode(result[containerIndex]!, nextWidth, nextHeight);
};

const normalizeTopLevelNodes = (result: DiagramFlowNode[], indices: readonly number[]): void => {
  const ordered = [...indices].sort((leftIndex, rightIndex) =>
    compareNodeOrder(result[leftIndex]!, result[rightIndex]!)
  );
  const placed: number[] = [];

  for (const nodeIndex of ordered) {
    const node = result[nodeIndex]!;
    let nextY = node.position.y;

    for (const placedIndex of placed) {
      const sibling = result[placedIndex]!;
      if (
        !rangesOverlapWithGap(
          node.position.x,
          getNodeWidth(node),
          sibling.position.x,
          getNodeWidth(sibling),
          TOP_LEVEL_ROW_GAP
        )
      ) {
        continue;
      }
      nextY = Math.max(nextY, sibling.position.y + getNodeHeight(sibling) + TOP_LEVEL_ROW_GAP);
    }

    result[nodeIndex] = repositionNode(node, node.position.x, nextY);
    placed.push(nodeIndex);
  }
};

export const normalizeMeasuredDiagramLayout = (
  allNodes: readonly DiagramFlowNode[]
): readonly DiagramFlowNode[] => {
  const result = allNodes.map((node) => cloneNode(node));
  const childIndicesByParent = new Map<string, number[]>();
  const topLevelIndices: number[] = [];

  for (const [index, node] of result.entries()) {
    if (node.parentId) {
      const siblings = childIndicesByParent.get(node.parentId) ?? [];
      siblings.push(index);
      childIndicesByParent.set(node.parentId, siblings);
      continue;
    }
    topLevelIndices.push(index);
  }

  for (const [index, node] of result.entries()) {
    if (node.data.nodeKind !== "cluster") {
      continue;
    }
    const constraints = getConstraints(node.data);
    const childIndices = childIndicesByParent.get(node.id);
    if (!constraints || !childIndices || childIndices.length === 0) {
      continue;
    }
    reflowContainerChildren(
      result,
      node,
      childIndices,
      constraints,
      MEASURED_LAYOUT_MIN_SAFE_GAP
    );
    resizeContainer(result, index, childIndices, constraints);
  }

  for (const [index, node] of result.entries()) {
    if (node.data.nodeKind !== "productPart") {
      continue;
    }
    const constraints = getConstraints(node.data);
    const childIndices = childIndicesByParent.get(node.id);
    if (!constraints || !childIndices || childIndices.length === 0) {
      continue;
    }
    reflowContainerChildren(
      result,
      node,
      childIndices,
      constraints,
      MEASURED_LAYOUT_MIN_SAFE_GAP
    );
    resizeContainer(result, index, childIndices, constraints);
  }

  normalizeTopLevelNodes(result, topLevelIndices);
  return result;
};
