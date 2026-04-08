import type {
  DiagramFlowNode,
  DiagramFlowProjectionLayoutSource,
} from "./adapters/domain-model-to-react-flow.types";
import {
  getContainerBodyStartY,
  getContainerConstraints,
  getNodeBaseWidth,
  getNodeVisualBottom,
  getNodeVisualHeight,
} from "./diagram-editor-layout-bounds";

export const MEASURED_LAYOUT_MIN_SAFE_GAP = 4;
const TOP_LEVEL_ROW_GAP = 24;

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
  const currentWidth =
    typeof node.style?.width === "number" && Number.isFinite(node.style.width)
      ? node.style.width
      : undefined;
  const currentHeight =
    typeof node.style?.height === "number" && Number.isFinite(node.style.height)
      ? node.style.height
      : undefined;
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

const reflowContainerChildren = (
  result: DiagramFlowNode[],
  containerNode: DiagramFlowNode,
  childIndices: readonly number[],
  gap: number
): void => {
  const constraints = getContainerConstraints(containerNode.data);
  if (!constraints) {
    return;
  }
  const ordered = [...childIndices]
    .sort((leftIndex, rightIndex) =>
      result[leftIndex]!.position.x - result[rightIndex]!.position.x
      || compareNodeOrder(result[leftIndex]!, result[rightIndex]!)
    );
  const bodyStartY = getContainerBodyStartY(containerNode, constraints);
  const nextYByColumn = new Map<number, number>();

  for (const childIndex of ordered) {
    const child = result[childIndex]!;
    const nextX = Math.max(constraints.childMinX, child.position.x);
    const nextSeedY = nextYByColumn.get(nextX) ?? bodyStartY;
    const nextY = Math.max(bodyStartY, nextSeedY, child.position.y);
    result[childIndex] = repositionNode(child, nextX, nextY);
    nextYByColumn.set(nextX, nextY + getNodeVisualHeight(result[childIndex]!) + gap);
  }
};

const resizeContainer = (
  result: DiagramFlowNode[],
  containerIndex: number,
  childIndices: readonly number[]
): void => {
  const containerNode = result[containerIndex]!;
  const constraints = getContainerConstraints(containerNode.data);
  if (!constraints) {
    return;
  }

  let maxRight = 0;
  let maxBottom = 0;

  for (const childIndex of childIndices) {
    const child = result[childIndex]!;
    maxRight = Math.max(maxRight, child.position.x + getNodeBaseWidth(child));
    maxBottom = Math.max(maxBottom, getNodeVisualBottom(child));
  }

  const nextWidth = Math.max(constraints.minWidth, maxRight + constraints.paddingRight);
  const nextHeight = Math.max(
    constraints.minHeight,
    maxBottom + constraints.paddingBottom
  );

  result[containerIndex] = resizeNode(containerNode, nextWidth, nextHeight);
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
          getNodeBaseWidth(node),
          sibling.position.x,
          getNodeBaseWidth(sibling),
          TOP_LEVEL_ROW_GAP
        )
      ) {
        continue;
      }
      nextY = Math.max(nextY, sibling.position.y + getNodeVisualHeight(sibling) + TOP_LEVEL_ROW_GAP);
    }

    result[nodeIndex] = repositionNode(node, node.position.x, nextY);
    placed.push(nodeIndex);
  }
};

const normalizePreservedMeasuredDiagramLayout = (
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
    const childIndices = childIndicesByParent.get(node.id);
    if (!childIndices || childIndices.length === 0) {
      continue;
    }
    reflowContainerChildren(
      result,
      node,
      childIndices,
      MEASURED_LAYOUT_MIN_SAFE_GAP
    );
    resizeContainer(result, index, childIndices);
  }

  for (const [index, node] of result.entries()) {
    if (node.data.nodeKind !== "productPart") {
      continue;
    }
    const childIndices = childIndicesByParent.get(node.id);
    if (!childIndices || childIndices.length === 0) {
      continue;
    }
    reflowContainerChildren(
      result,
      node,
      childIndices,
      MEASURED_LAYOUT_MIN_SAFE_GAP
    );
    resizeContainer(result, index, childIndices);
  }

  normalizeTopLevelNodes(result, topLevelIndices);
  return result;
};

export const normalizeMeasuredDiagramLayout = (
  allNodes: readonly DiagramFlowNode[],
  layoutSource: DiagramFlowProjectionLayoutSource = "seed-autolayout"
): readonly DiagramFlowNode[] =>
  layoutSource === "persisted-sidecar"
    ? normalizePreservedMeasuredDiagramLayout(allNodes)
    : normalizePreservedMeasuredDiagramLayout(allNodes);
