import type {
  DiagramFlowNode,
} from "./adapters/domain-model-to-react-flow.types";
import {
  getContainerBodyStartY,
  getContainerConstraints,
  getNodeBaseWidth,
  getNodeVisualBottom,
  getNodeVisualHeight,
} from "./diagram-editor-layout-bounds";

const SIBLING_GAP = 12;

type Rect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

const getNodeRect = (node: DiagramFlowNode): Rect => ({
  x: node.position.x,
  y: node.position.y,
  w: getNodeBaseWidth(node),
  h: getNodeVisualHeight(node),
});

const collisionPush = (moved: Rect, staticNode: Rect): { dx: number; dy: number } | null => {
  if (
    moved.x + moved.w + SIBLING_GAP <= staticNode.x
    || staticNode.x + staticNode.w + SIBLING_GAP <= moved.x
    || moved.y + moved.h + SIBLING_GAP <= staticNode.y
    || staticNode.y + staticNode.h + SIBLING_GAP <= moved.y
  ) {
    return null;
  }

  const pushes = [
    { dx: staticNode.x - SIBLING_GAP - (moved.x + moved.w), dy: 0 },
    { dx: staticNode.x + staticNode.w + SIBLING_GAP - moved.x, dy: 0 },
    { dx: 0, dy: staticNode.y - SIBLING_GAP - (moved.y + moved.h) },
    { dx: 0, dy: staticNode.y + staticNode.h + SIBLING_GAP - moved.y },
  ];

  let best = pushes[0]!;
  let bestAbs = Math.abs(best.dx) + Math.abs(best.dy);
  for (let index = 1; index < pushes.length; index += 1) {
    const candidate = pushes[index]!;
    const nextAbs = Math.abs(candidate.dx) + Math.abs(candidate.dy);
    if (nextAbs < bestAbs) {
      best = candidate;
      bestAbs = nextAbs;
    }
  }
  return best;
};

const separateSiblings = (
  result: DiagramFlowNode[],
  siblings: readonly number[],
  movedIds: ReadonlySet<string>
): void => {
  for (const movedIndex of siblings) {
    if (!movedIds.has(result[movedIndex]!.id)) {
      continue;
    }
    for (const staticIndex of siblings) {
      if (staticIndex === movedIndex) {
        continue;
      }
      const push = collisionPush(
        getNodeRect(result[movedIndex]!),
        getNodeRect(result[staticIndex]!)
      );
      if (!push) {
        continue;
      }
      const node = result[movedIndex]!;
      result[movedIndex] = {
        ...node,
        position: {
          x: node.position.x + push.dx,
          y: node.position.y + push.dy,
        },
      };
    }
  }
};

const clampChildren = (
  result: DiagramFlowNode[],
  containerNode: DiagramFlowNode,
  indices: readonly number[]
): void => {
  const constraints = getContainerConstraints(containerNode.data);
  if (!constraints) {
    return;
  }
  const bodyStartY = getContainerBodyStartY(containerNode, constraints);

  for (const childIndex of indices) {
    const child = result[childIndex]!;
    const nextX = Math.max(constraints.childMinX, child.position.x);
    const nextY = Math.max(bodyStartY, child.position.y);
    if (nextX === child.position.x && nextY === child.position.y) {
      continue;
    }
    result[childIndex] = {
      ...child,
      position: { x: nextX, y: nextY },
    };
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
  const nextHeight = Math.max(constraints.minHeight, maxBottom + constraints.paddingBottom);
  const currentWidth =
    typeof containerNode.style?.width === "number" && Number.isFinite(containerNode.style.width)
      ? containerNode.style.width
      : undefined;
  const currentHeight =
    typeof containerNode.style?.height === "number" && Number.isFinite(containerNode.style.height)
      ? containerNode.style.height
      : undefined;

  if (currentWidth === nextWidth && currentHeight === nextHeight) {
    return;
  }

  result[containerIndex] = {
    ...containerNode,
    style: {
      ...(containerNode.style ?? {}),
      width: nextWidth,
      height: nextHeight,
    },
  };
};

const processContainer = (
  result: DiagramFlowNode[],
  containerIndex: number,
  childIndicesByParent: ReadonlyMap<string, number[]>,
  movedIds: ReadonlySet<string>
): void => {
  const containerNode = result[containerIndex]!;
  const childIndices = childIndicesByParent.get(containerNode.id);
  if (!childIndices || childIndices.length === 0) {
    return;
  }
  clampChildren(result, containerNode, childIndices);
  separateSiblings(result, childIndices, movedIds);
  clampChildren(result, containerNode, childIndices);
  resizeContainer(result, containerIndex, childIndices);
};

export const normalizeManualDiagramLayout = (
  allNodes: readonly DiagramFlowNode[],
  movedIds: ReadonlySet<string>
): DiagramFlowNode[] => {
  const result = allNodes.map((node) => ({ ...node }));
  const childIndicesByParent = new Map<string, number[]>();
  const topLevelIndices: number[] = [];

  for (let index = 0; index < result.length; index += 1) {
    const parentId = result[index]!.parentId;
    if (parentId) {
      const siblings = childIndicesByParent.get(parentId) ?? [];
      siblings.push(index);
      childIndicesByParent.set(parentId, siblings);
      continue;
    }
    topLevelIndices.push(index);
  }

  for (let index = 0; index < result.length; index += 1) {
    if (result[index]!.data.nodeKind === "cluster") {
      processContainer(result, index, childIndicesByParent, movedIds);
    }
  }
  for (let index = 0; index < result.length; index += 1) {
    if (result[index]!.data.nodeKind === "productPart") {
      processContainer(result, index, childIndicesByParent, movedIds);
    }
  }
  separateSiblings(result, topLevelIndices, movedIds);

  return result;
};
