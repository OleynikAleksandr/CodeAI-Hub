import { useEffect, useRef } from "react";
import { useNodesInitialized, useReactFlow } from "@xyflow/react";
import type {
  DiagramFlowEdge,
  DiagramFlowNode,
} from "./adapters/domain-model-to-react-flow.types";

type DiagramEditorMeasuredLayoutBridgeProps = {
  readonly nodes: readonly DiagramFlowNode[];
  readonly measurementRevision?: string;
  readonly onMeasuredNodes?: (
    nodes: readonly DiagramFlowNode[]
  ) => void | Promise<void>;
};

const buildMeasurementSignature = (nodes: readonly DiagramFlowNode[]): string =>
  nodes
    .map((node) =>
      [
        node.id,
        node.position.x,
        node.position.y,
        node.measured?.width ?? node.width ?? 0,
        node.measured?.height ?? node.height ?? 0,
        node.measured?.bodyStartY ?? 0,
      ].join(":")
    )
    .join("|");

const getContainerHeaderElements = (): ReadonlyMap<string, HTMLElement> =>
  new Map(
    Array.from(
      document.querySelectorAll<HTMLElement>("[data-diagram-container-header-id]")
    )
      .map((element) => [element.dataset.diagramContainerHeaderId, element] as const)
      .filter((entry): entry is readonly [string, HTMLElement] => Boolean(entry[0]))
  );

export const DiagramEditorMeasuredLayoutBridge = ({
  nodes,
  measurementRevision,
  onMeasuredNodes,
}: DiagramEditorMeasuredLayoutBridgeProps) => {
  const reactFlow = useReactFlow<DiagramFlowNode, DiagramFlowEdge>();
  const nodesInitialized = useNodesInitialized();
  const lastMeasurementSignatureRef = useRef<string>("");

  useEffect(() => {
    lastMeasurementSignatureRef.current = "";
  }, [measurementRevision]);

  useEffect(() => {
    if (!nodesInitialized || !onMeasuredNodes) {
      return;
    }

    const containerHeaderElements = getContainerHeaderElements();
    const measuredNodes = nodes.map((node) => {
      const internalNode = reactFlow.getInternalNode(node.id);
      const measuredWidth = internalNode?.measured.width;
      const measuredHeight = internalNode?.measured.height;
      const containerHeaderElement = containerHeaderElements.get(node.id);
      const bodyStartOffset = Number(
        containerHeaderElement?.dataset.diagramBodyStartOffset ?? 0
      );
      const bodyStartY = containerHeaderElement
        ? Math.ceil(containerHeaderElement.getBoundingClientRect().height) + bodyStartOffset
        : undefined;

      if (
        measuredWidth === undefined
        && measuredHeight === undefined
        && bodyStartY === undefined
      ) {
        return node;
      }

      return {
        ...node,
        width: measuredWidth ?? node.width,
        height: measuredHeight ?? node.height,
        measured: {
          width: measuredWidth ?? node.measured?.width ?? node.width,
          height: measuredHeight ?? node.measured?.height ?? node.height,
          bodyStartY: bodyStartY ?? node.measured?.bodyStartY,
        },
      };
    });

    const measurementSignature = buildMeasurementSignature(measuredNodes);
    if (measurementSignature === lastMeasurementSignatureRef.current) {
      return;
    }

    lastMeasurementSignatureRef.current = measurementSignature;
    void onMeasuredNodes(measuredNodes);
  }, [nodes, nodesInitialized, onMeasuredNodes, reactFlow]);

  return null;
};
