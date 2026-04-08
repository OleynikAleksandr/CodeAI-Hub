import type { DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";
import {
  getContainerBodyStartY,
  getContainerConstraints,
  getNodeBaseWidth,
  getNodeVisualBottom,
  getNodeVisualHeight,
} from "./diagram-editor-layout-bounds";

const INITIAL_AUTOLAYOUT_TOP_LEVEL_GAP = 24;
const MAX_SETTLE_ITERATIONS = 6;

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

const rangesOverlapWithGap = (
  startA: number,
  sizeA: number,
  startB: number,
  sizeB: number,
  gap: number
): boolean =>
  !(startA + sizeA + gap <= startB || startB + sizeB + gap <= startA);

const packContainerColumns = (
  result: DiagramFlowNode[],
  containerNode: DiagramFlowNode,
  childIndices: readonly number[],
  gap: number
): void => {
  const constraints = getContainerConstraints(containerNode.data);
  if (!constraints) {
    return;
  }

  const bodyStartY = getContainerBodyStartY(containerNode, constraints);
  const columns = new Map<number, number[]>();
  for (const childIndex of childIndices) {
    const child = result[childIndex]!;
    const columnX = Math.max(constraints.childMinX, child.position.x);
    const indices = columns.get(columnX) ?? [];
    indices.push(childIndex);
    columns.set(columnX, indices);
  }

  for (const [columnX, indices] of [...columns.entries()].sort((left, right) => left[0] - right[0])) {
    let nextY = bodyStartY;
    const ordered = [...indices].sort((leftIndex, rightIndex) =>
      compareNodeOrder(result[leftIndex]!, result[rightIndex]!)
    );
    for (const childIndex of ordered) {
      const child = result[childIndex]!;
      result[childIndex] = repositionNode(child, columnX, nextY);
      nextY += getNodeVisualHeight(result[childIndex]!) + gap;
    }
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

  result[containerIndex] = resizeNode(
    containerNode,
    Math.max(constraints.minWidth, maxRight + constraints.paddingRight),
    Math.max(constraints.minHeight, maxBottom + constraints.paddingBottom)
  );
};

const normalizeTopLevelNodes = (
  result: DiagramFlowNode[],
  indices: readonly number[]
): void => {
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
          INITIAL_AUTOLAYOUT_TOP_LEVEL_GAP
        )
      ) {
        continue;
      }
      nextY = Math.max(
        nextY,
        sibling.position.y
          + getNodeVisualHeight(sibling)
          + INITIAL_AUTOLAYOUT_TOP_LEVEL_GAP
      );
    }

    result[nodeIndex] = repositionNode(node, node.position.x, nextY);
    placed.push(nodeIndex);
  }
};

const buildLayoutSignature = (nodes: readonly DiagramFlowNode[]): string =>
  nodes
    .map((node) =>
      [
        node.id,
        node.position.x,
        node.position.y,
        node.style?.width ?? "",
        node.style?.height ?? "",
      ].join(":")
    )
    .join("|");

const settleOnce = (
  result: DiagramFlowNode[],
  gap: number
): void => {
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
    packContainerColumns(result, node, childIndices, gap);
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
    packContainerColumns(result, node, childIndices, gap);
    resizeContainer(result, index, childIndices);
  }

  normalizeTopLevelNodes(result, topLevelIndices);
};

export const settleInitialAutolayoutFromMeasurements = (
  allNodes: readonly DiagramFlowNode[],
  gap: number
): readonly DiagramFlowNode[] => {
  const result = allNodes.map((node) => cloneNode(node));
  let previousSignature = "";

  for (let iteration = 0; iteration < MAX_SETTLE_ITERATIONS; iteration += 1) {
    settleOnce(result, gap);
    const nextSignature = buildLayoutSignature(result);
    if (nextSignature === previousSignature) {
      break;
    }
    previousSignature = nextSignature;
  }

  return result;
};
