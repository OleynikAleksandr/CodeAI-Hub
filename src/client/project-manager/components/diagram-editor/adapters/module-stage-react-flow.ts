import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { DiagramFlowNode } from "./domain-model-to-react-flow.types";

type ModuleEntity = ModuleMapModel["modules"][number];
type ClusterEntity = NonNullable<ModuleMapModel["clusters"]>[number];
type ProductPartEntity = NonNullable<ModuleMapModel["productParts"]>[number];

const PRODUCT_PART_PADDING_X = 24, PRODUCT_PART_PADDING_BOTTOM = 28, PRODUCT_PART_HEADER_MIN_HEIGHT = 72;
const PRODUCT_PART_SECTION_GAP = 36, PRODUCT_PART_ROW_GAP = 48, PRODUCT_PART_FALLBACK_STANDALONE_COLUMNS = 3, PRODUCT_PART_EXTERNAL_GAP = 72;
const CLUSTER_X_STEP = 320, CLUSTER_MIN_HEIGHT = 168, CLUSTER_PADDING_X = 24, CLUSTER_HEADER_MIN_HEIGHT = 72, CLUSTER_BOTTOM_PADDING = 16;
const MODULE_X_OFFSET = 24, MODULE_CARD_WIDTH = 240, MODULE_CARD_MIN_HEIGHT = 132, MODULE_CARD_GAP = 12, TITLE_LINE_HEIGHT = 18, BODY_LINE_HEIGHT = 16;
const STANDALONE_X_STEP = CLUSTER_X_STEP - CLUSTER_PADDING_X * 2, DEFAULT_PRODUCT_PART_ID = "default-product-part";

const toProductPartNodeId = (productPartId: string): string => `product-part:${productPartId}`;
const toClusterNodeId = (clusterId: string): string => `cluster:${clusterId}`;
const compareById = <T extends { readonly id: string }>(left: T, right: T): number => left.id.localeCompare(right.id);
const humanizeIdentifier = (value: string): string =>
  value.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
const estimateTextLines = (text: string, charsPerLine: number): number =>
  text.split(/\r?\n/u).map((line) => Math.max(1, Math.ceil(line.trim().length / charsPerLine))).reduce((sum, count) => sum + count, 0);
const getExtraLines = (text: string, charsPerLine: number, includedLines = 1): number =>
  Math.max(0, estimateTextLines(text, charsPerLine) - includedLines);
const getModuleCardHeight = (module: ModuleEntity): number =>
  MODULE_CARD_MIN_HEIGHT + getExtraLines(module.title, 24) * TITLE_LINE_HEIGHT + getExtraLines(module.responsibility, 32, 2) * BODY_LINE_HEIGHT;
const getClusterHeaderHeight = (cluster: Pick<ClusterEntity, "title" | "purpose">): number =>
  CLUSTER_HEADER_MIN_HEIGHT + getExtraLines(cluster.title, 24) * TITLE_LINE_HEIGHT + getExtraLines(cluster.purpose, 34, 2) * BODY_LINE_HEIGHT;
const getProductPartHeaderHeight = (productPart: Pick<ProductPartEntity, "title" | "purpose">): number =>
  PRODUCT_PART_HEADER_MIN_HEIGHT + getExtraLines(productPart.title, 26) * TITLE_LINE_HEIGHT + getExtraLines(productPart.purpose, 30, 2) * BODY_LINE_HEIGHT;

const buildModuleNode = ({
  module,
  position,
  productPart,
  cluster,
  parentId,
  height,
}: {
  readonly module: ModuleEntity;
  readonly position: { readonly x: number; readonly y: number };
  readonly productPart: string;
  readonly cluster?: string;
  readonly parentId?: string;
  readonly height: number;
}): DiagramFlowNode => ({
  id: module.id,
  type: "module",
  position,
  parentId,
  extent: parentId ? ("parent" as const) : undefined,
  style: { width: MODULE_CARD_WIDTH, minHeight: height },
  data: {
    stage: "diagram_modules",
    nodeKind: "module",
    moduleId: module.id,
    title: module.title,
    kind: module.kind,
    responsibility: module.responsibility,
    status: module.status,
    origin: module.origin,
    productPart,
    cluster,
    inputCount: module.inputs.length,
    outputCount: module.outputs.length,
  },
});

const buildFallbackClusters = (
  model: ModuleMapModel
): ReadonlyMap<string, { readonly moduleIds: readonly string[]; readonly title: string }> =>
  new Map(
    [...new Set(model.modules.flatMap((module) => (module.cluster ? [module.cluster] : [])))]
      .sort((left, right) => left.localeCompare(right))
      .map((clusterId) => [clusterId, {
        moduleIds: model.modules.filter((module) => module.cluster === clusterId).map((module) => module.id),
        title: humanizeIdentifier(clusterId),
      }])
  );

const getClusterIds = (
  productPart: ProductPartEntity,
  model: ModuleMapModel,
  clustersById: ReadonlyMap<string, ClusterEntity>
): readonly string[] =>
  (productPart.clusterIds.length > 0
    ? productPart.clusterIds
    : [...new Set(model.modules.flatMap((module) =>
        module.cluster && (module.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id ? [module.cluster] : []
      ))]).filter((clusterId) => clustersById.has(clusterId));

const getStandaloneModuleIds = (
  productPart: ProductPartEntity,
  model: ModuleMapModel,
  modulesById: ReadonlyMap<string, ModuleEntity>
): readonly string[] =>
  (productPart.standaloneModuleIds.length > 0
    ? productPart.standaloneModuleIds
    : model.modules
        .filter((module) => !module.cluster && (module.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id)
        .map((module) => module.id)).filter((moduleId) => modulesById.has(moduleId));

export const buildModuleStageNodes = (model: ModuleMapModel): readonly DiagramFlowNode[] => {
  const modulesById = new Map(model.modules.map((module) => [module.id, module]));
  const fallbackClusters = buildFallbackClusters(model);
  const clustersById = new Map([...(model.clusters ?? [])].sort(compareById).map((cluster) => [cluster.id, cluster] as const));
  for (const [clusterId, cluster] of fallbackClusters.entries()) {
    if (!clustersById.has(clusterId)) {
      clustersById.set(clusterId, { id: clusterId, title: cluster.title, purpose: `Fallback cluster for ${clusterId}`, productPart: DEFAULT_PRODUCT_PART_ID, moduleIds: cluster.moduleIds });
    }
  }

  const productParts = [
    ...(model.productParts ?? [{
      id: DEFAULT_PRODUCT_PART_ID,
      title: humanizeIdentifier(DEFAULT_PRODUCT_PART_ID),
      purpose: "Fallback product part derived in the React Flow adapter",
      clusterIds: [...fallbackClusters.keys()],
      standaloneModuleIds: model.modules.filter((module) => !module.cluster).map((module) => module.id),
    }]),
  ].sort(compareById);

  const nodes: DiagramFlowNode[] = [];
  let productPartY = 0;
  for (const productPart of productParts) {
    const clusterIds = getClusterIds(productPart, model, clustersById);
    const standaloneModuleIds = getStandaloneModuleIds(productPart, model, modulesById);
    const externalStandaloneModuleIds = standaloneModuleIds.filter((moduleId) => modulesById.get(moduleId)?.kind === "external");
    const internalStandaloneModuleIds = standaloneModuleIds.filter((moduleId) => !externalStandaloneModuleIds.includes(moduleId));
    const productPartHeaderHeight = getProductPartHeaderHeight(productPart);
    const standaloneColumnCount = Math.max(
      1,
      clusterIds.length > 0 ? clusterIds.length : Math.min(PRODUCT_PART_FALLBACK_STANDALONE_COLUMNS, Math.max(internalStandaloneModuleIds.length, 1))
    );
    const productPartWidth = Math.max(
      720,
      PRODUCT_PART_PADDING_X * 2 +
        (clusterIds.length > 0
          ? Math.max(clusterIds.length * CLUSTER_X_STEP, MODULE_CARD_WIDTH)
          : MODULE_CARD_WIDTH + Math.max(standaloneColumnCount - 1, 0) * STANDALONE_X_STEP)
    );

    const clusterNodes: DiagramFlowNode[] = [];
    const clusteredModuleNodes: DiagramFlowNode[] = [];
    const clusterHeights: number[] = [];
    for (const [clusterIndex, clusterId] of clusterIds.entries()) {
      const cluster = clustersById.get(clusterId);
      if (!cluster) {
        continue;
      }
      const headerHeight = getClusterHeaderHeight(cluster);
      let moduleY = headerHeight;
      for (const moduleId of cluster.moduleIds) {
        const module = modulesById.get(moduleId);
        if (!module) {
          continue;
        }
        const height = getModuleCardHeight(module);
        clusteredModuleNodes.push(buildModuleNode({
          module,
          position: { x: MODULE_X_OFFSET, y: moduleY },
          parentId: toClusterNodeId(clusterId),
          productPart: productPart.id,
          cluster: clusterId,
          height,
        }));
        moduleY += height + MODULE_CARD_GAP;
      }
      const clusterHeight = Math.max(CLUSTER_MIN_HEIGHT, moduleY > headerHeight ? moduleY - MODULE_CARD_GAP + CLUSTER_BOTTOM_PADDING : headerHeight + CLUSTER_BOTTOM_PADDING);
      clusterHeights.push(clusterHeight);
      clusterNodes.push({
        id: toClusterNodeId(clusterId),
        type: "cluster",
        position: { x: PRODUCT_PART_PADDING_X + clusterIndex * CLUSTER_X_STEP, y: productPartHeaderHeight },
        parentId: toProductPartNodeId(productPart.id),
        extent: "parent",
        style: { width: MODULE_CARD_WIDTH + CLUSTER_PADDING_X * 2, height: clusterHeight },
        data: {
          stage: "diagram_modules",
          nodeKind: "cluster",
          clusterId,
          productPartId: productPart.id,
          title: cluster.title,
          purpose: cluster.purpose,
          moduleIds: cluster.moduleIds,
        },
      });
    }

    const clusterSectionHeight = Math.max(0, ...clusterHeights);
    const standaloneY = productPartHeaderHeight + (clusterIds.length > 0 ? clusterSectionHeight + PRODUCT_PART_SECTION_GAP : 0);
    const standaloneNodes: DiagramFlowNode[] = [];
    let internalSectionHeight = 0;
    for (let index = 0, rowY = standaloneY; index < internalStandaloneModuleIds.length; ) {
      const rowIds = internalStandaloneModuleIds.slice(index, index + standaloneColumnCount);
      const rowHeight = Math.max(...rowIds.map((moduleId) => getModuleCardHeight(modulesById.get(moduleId)!)));
      rowIds.forEach((moduleId, columnIndex) => {
        const module = modulesById.get(moduleId);
        if (!module) {
          return;
        }
        standaloneNodes.push(buildModuleNode({
          module,
          position: { x: PRODUCT_PART_PADDING_X + columnIndex * STANDALONE_X_STEP, y: rowY },
          parentId: toProductPartNodeId(productPart.id),
          productPart: productPart.id,
          height: getModuleCardHeight(module),
        }));
      });
      internalSectionHeight = rowY + rowHeight - standaloneY;
      rowY += rowHeight + MODULE_CARD_GAP;
      index += standaloneColumnCount;
    }

    const externalNodes: DiagramFlowNode[] = [];
    let externalSectionHeight = 0;
    for (const [externalIndex, moduleId] of externalStandaloneModuleIds.entries()) {
      const module = modulesById.get(moduleId);
      if (!module) {
        continue;
      }
      const height = getModuleCardHeight(module);
      const offsetY = standaloneY + externalSectionHeight + (externalIndex > 0 ? MODULE_CARD_GAP : 0);
      externalNodes.push(buildModuleNode({
        module,
        position: { x: productPartWidth + PRODUCT_PART_EXTERNAL_GAP, y: productPartY + offsetY },
        productPart: productPart.id,
        height,
      }));
      externalSectionHeight = offsetY + height - standaloneY;
    }

    const productPartHeight = Math.max(
      260,
      Math.max(productPartHeaderHeight, productPartHeaderHeight + clusterSectionHeight, standaloneY + internalSectionHeight) + PRODUCT_PART_PADDING_BOTTOM
    );
    nodes.push(
      {
        id: toProductPartNodeId(productPart.id),
        type: "cluster",
        position: { x: 0, y: productPartY },
        style: { width: productPartWidth, height: productPartHeight },
        data: {
          stage: "diagram_modules",
          nodeKind: "productPart",
          productPartId: productPart.id,
          title: productPart.title,
          purpose: productPart.purpose,
          clusterIds,
          standaloneModuleIds,
        },
      },
      ...clusterNodes,
      ...clusteredModuleNodes,
      ...standaloneNodes,
      ...externalNodes
    );
    productPartY += Math.max(productPartHeight, standaloneY + externalSectionHeight) + PRODUCT_PART_ROW_GAP;
  }
  return nodes;
};
