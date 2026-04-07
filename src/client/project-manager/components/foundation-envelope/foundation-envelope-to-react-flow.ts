import type {
  FoundationEnvelopeIntegrationSeam,
  FoundationEnvelopeModel,
  FoundationEnvelopeProductPart,
  FoundationEnvelopeSharedZone,
} from "../../../../../packages/core/src/workflow/foundation-envelope/foundation-envelope-model";
import type {
  FoundationEnvelopeBadge,
  FoundationEnvelopeFlowEdge,
  FoundationEnvelopeFlowNode,
  FoundationEnvelopeFlowProjection,
} from "./foundation-envelope-react-flow.types";

const ROOT_ID = "application-root";
const ROOT_PADDING_X = 32;
const ROOT_PADDING_Y = 36;
const ZONE_HEIGHT = 132;
const ZONE_GAP = 16;
const PART_WIDTH = 260;
const PART_HEIGHT = 164;
const PART_GAP = 20;

const buildProductPartBadges = (
  part: FoundationEnvelopeProductPart
): readonly FoundationEnvelopeBadge[] => {
  const badges: FoundationEnvelopeBadge[] = [];
  if (part.runtimePlatform) {
    badges.push({ label: part.runtimePlatform, tone: "accent" });
  }
  if (part.technology) {
    badges.push({ label: part.technology, tone: "neutral" });
  }
  if (part.decisionStatus) {
    badges.push({
      label: part.decisionStatus,
      tone: part.decisionStatus === "open" ? "warning" : "neutral",
    });
  }
  return badges;
};

const buildSharedZoneNode = (
  zone: FoundationEnvelopeSharedZone,
  index: number,
  width: number
): FoundationEnvelopeFlowNode => ({
  id: `shared-zone:${zone.id}`,
  type: "cluster",
  parentId: ROOT_ID,
  extent: "parent",
  position: {
    x: ROOT_PADDING_X,
    y: ROOT_PADDING_Y + index * (ZONE_HEIGHT + ZONE_GAP),
  },
  style: {
    width,
    height: ZONE_HEIGHT,
  },
  data: {
    stage: "foundation_envelope",
    nodeKind: "cluster",
    clusterId: zone.id,
    productPartId: ROOT_ID,
    title: zone.title,
    purpose: zone.purpose,
    moduleIds: zone.sharedWith,
    primaryOwner: zone.primaryOwner,
    sharedWith: zone.sharedWith,
  },
});

const buildProductPartNode = (
  part: FoundationEnvelopeProductPart,
  index: number,
  startY: number
): FoundationEnvelopeFlowNode => ({
  id: `product-part:${part.id}`,
  type: "module",
  parentId: ROOT_ID,
  extent: "parent",
  position: {
    x: ROOT_PADDING_X + index * (PART_WIDTH + PART_GAP),
    y: startY,
  },
  style: {
    width: PART_WIDTH,
    minHeight: PART_HEIGHT,
  },
  data: {
    stage: "foundation_envelope",
    nodeKind: "module",
    moduleId: part.id,
    title: part.title,
    kind: "service",
    responsibility: part.purpose,
    status: "accepted",
    origin: "agent",
    productPart: "Application Root",
    cluster: part.runtimePlatform ?? part.technology ?? undefined,
    inputCount: 0,
    outputCount: 0,
    runtimePlatform: part.runtimePlatform,
    technology: part.technology,
    decisionStatus: part.decisionStatus,
    badges: buildProductPartBadges(part),
  },
});

const resolveSeamEndpoint = (
  value: string,
  zones: readonly FoundationEnvelopeSharedZone[],
  parts: readonly FoundationEnvelopeProductPart[]
): string => {
  if (value === ROOT_ID) {
    return ROOT_ID;
  }
  if (zones.some((zone) => zone.id === value)) {
    return `shared-zone:${value}`;
  }
  if (parts.some((part) => part.id === value)) {
    return `product-part:${value}`;
  }
  return ROOT_ID;
};

const buildSeamEdge = (
  seam: FoundationEnvelopeIntegrationSeam,
  zones: readonly FoundationEnvelopeSharedZone[],
  parts: readonly FoundationEnvelopeProductPart[]
): FoundationEnvelopeFlowEdge => ({
  id: seam.id,
  type: "relation",
  source: resolveSeamEndpoint(seam.from, zones, parts),
  target: resolveSeamEndpoint(seam.to, zones, parts),
  label: seam.title,
  data: {
    stage: "foundation_envelope",
    edgeKind: "integrationSeam",
    seamId: seam.id,
    title: seam.title,
    kind: seam.kind,
    whyItMatters: seam.whyItMatters,
  },
});

export const foundationEnvelopeToReactFlow = (
  model: FoundationEnvelopeModel
): FoundationEnvelopeFlowProjection => {
  const zoneWidth = Math.max(960, model.productParts.length * (PART_WIDTH + PART_GAP));
  const partsY =
    ROOT_PADDING_Y +
    model.sharedZones.length * (ZONE_HEIGHT + ZONE_GAP) +
    (model.sharedZones.length > 0 ? 12 : 0);
  const rootWidth = zoneWidth + ROOT_PADDING_X * 2;
  const rootHeight = Math.max(
    360,
    partsY + PART_HEIGHT + ROOT_PADDING_Y
  );

  const nodes: FoundationEnvelopeFlowNode[] = [
    {
      id: ROOT_ID,
      type: "cluster",
      position: { x: 0, y: 0 },
      style: {
        width: rootWidth,
        height: rootHeight,
      },
      data: {
        stage: "foundation_envelope",
        nodeKind: "productPart",
        productPartId: ROOT_ID,
        title: model.applicationRoot.title,
        purpose: model.applicationRoot.summary,
        clusterIds: model.sharedZones.map((zone) => zone.id),
        standaloneModuleIds: model.productParts.map((part) => part.id),
        summary: model.applicationRoot.summary,
        shape: model.applicationRoot.shape,
        containerConstraints: {
          childMinX: ROOT_PADDING_X,
          childMinY: ROOT_PADDING_Y,
          minWidth: rootWidth,
          minHeight: rootHeight,
          paddingRight: ROOT_PADDING_X,
          paddingBottom: ROOT_PADDING_Y,
        },
      },
    },
    ...model.sharedZones.map((zone, index) =>
      buildSharedZoneNode(zone, index, zoneWidth)
    ),
    ...model.productParts.map((part, index) =>
      buildProductPartNode(part, index, partsY)
    ),
  ];

  return {
    stage: "foundation_envelope",
    revision: model.revision,
    nodes,
    edges: model.integrationSeams.map((seam) =>
      buildSeamEdge(seam, model.sharedZones, model.productParts)
    ),
  };
};
