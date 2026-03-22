import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { DiagramFlowNode } from "./domain-model-to-react-flow.types";

const PRODUCT_PART_PADDING_X = 24;
const PRODUCT_PART_PADDING_TOP = 72;
const PRODUCT_PART_PADDING_BOTTOM = 28;
const PRODUCT_PART_SECTION_GAP = 36;
const PRODUCT_PART_ROW_GAP = 48;
const PRODUCT_PART_FALLBACK_STANDALONE_COLUMNS = 3;
const PRODUCT_PART_EXTERNAL_GAP = 72;
const CLUSTER_X_STEP = 320;
const CLUSTER_MIN_HEIGHT = 168;
const CLUSTER_PADDING_X = 24;
const CLUSTER_PADDING_TOP = 60;
const CLUSTER_PADDING_BOTTOM = 28;
const MODULE_X_OFFSET = 24;
const MODULE_Y_OFFSET = 72;
const MODULE_Y_STEP = 132;
const MODULE_CARD_WIDTH = 240;
const MODULE_CARD_HEIGHT = 120;
const DEFAULT_PRODUCT_PART_ID = "default-product-part";

const toProductPartNodeId = (productPartId: string): string => `product-part:${productPartId}`;
const toClusterNodeId = (clusterId: string): string => `cluster:${clusterId}`;
const compareById = <T extends { readonly id: string }>(left: T, right: T): number =>
  left.id.localeCompare(right.id);

const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const getClusterHeight = (moduleCount: number): number =>
  Math.max(
    CLUSTER_MIN_HEIGHT,
    CLUSTER_PADDING_TOP + moduleCount * MODULE_Y_STEP + CLUSTER_PADDING_BOTTOM
  );

const buildModuleNode = ({
  module,
  position,
  productPart,
  cluster,
  parentId,
}: {
  readonly module: ModuleMapModel["modules"][number];
  readonly position: { readonly x: number; readonly y: number };
  readonly productPart: string;
  readonly cluster?: string;
  readonly parentId?: string;
}): DiagramFlowNode => ({
  id: module.id,
  type: "module",
  position,
  parentId,
  extent: parentId ? ("parent" as const) : undefined,
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
): ReadonlyMap<
  string,
  { readonly moduleIds: readonly string[]; readonly title: string }
> =>
  new Map(
    [...new Set(model.modules.flatMap((module) => (module.cluster ? [module.cluster] : [])))]
      .sort((left, right) => left.localeCompare(right))
      .map((clusterId) => [
        clusterId,
        {
          moduleIds: model.modules
            .filter((module) => module.cluster === clusterId)
            .map((module) => module.id),
          title: humanizeIdentifier(clusterId),
        },
      ])
  );

export const buildModuleStageNodes = (
  model: ModuleMapModel
): readonly DiagramFlowNode[] => {
  const modulesById = new Map(model.modules.map((module) => [module.id, module]));
  const fallbackClusters = buildFallbackClusters(model);
  const clustersById = new Map(
    [...(model.clusters ?? [])]
      .sort(compareById)
      .map((cluster) => [cluster.id, cluster] as const)
  );
  for (const [clusterId, cluster] of fallbackClusters.entries()) {
    if (!clustersById.has(clusterId)) {
      clustersById.set(clusterId, {
        id: clusterId,
        title: cluster.title,
        purpose: `Fallback cluster for ${clusterId}`,
        productPart: DEFAULT_PRODUCT_PART_ID,
        moduleIds: cluster.moduleIds,
      });
    }
  }
  const productParts = [
    ...(model.productParts ?? [
      {
        id: DEFAULT_PRODUCT_PART_ID,
        title: humanizeIdentifier(DEFAULT_PRODUCT_PART_ID),
        purpose: "Fallback product part derived in the React Flow adapter",
        clusterIds: [...fallbackClusters.keys()],
        standaloneModuleIds: model.modules
          .filter((module) => !module.cluster)
          .map((module) => module.id),
      },
    ]),
  ].sort(compareById);

  let productPartY = 0;

  return productParts.flatMap((productPart) => {
    const clusterIds = (
      productPart.clusterIds.length > 0
        ? productPart.clusterIds
        : [
            ...new Set(
              model.modules.flatMap((module) =>
                module.cluster &&
                (module.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id
                  ? [module.cluster]
                  : []
              )
            ),
          ]
    ).filter((clusterId) => clustersById.has(clusterId));
    const standaloneModuleIds = (
      productPart.standaloneModuleIds.length > 0
        ? productPart.standaloneModuleIds
        : model.modules
            .filter(
              (module) =>
                !module.cluster &&
                (module.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id
            )
            .map((module) => module.id)
    ).filter((moduleId) => modulesById.has(moduleId));
    const externalStandaloneModuleIds = standaloneModuleIds.filter(
      (moduleId) => modulesById.get(moduleId)?.kind === "external"
    );
    const internalStandaloneModuleIds = standaloneModuleIds.filter(
      (moduleId) => !externalStandaloneModuleIds.includes(moduleId)
    );
    const clusterHeights = clusterIds.map((clusterId) =>
      getClusterHeight(clustersById.get(clusterId)?.moduleIds.length ?? 0)
    );
    const clusterSectionHeight = Math.max(0, ...clusterHeights);
    const standaloneY =
      PRODUCT_PART_PADDING_TOP +
      (clusterIds.length > 0 ? clusterSectionHeight + PRODUCT_PART_SECTION_GAP : 0);
    const standaloneColumnCount = Math.max(
      1,
      clusterIds.length > 0
        ? clusterIds.length
        : Math.min(
            PRODUCT_PART_FALLBACK_STANDALONE_COLUMNS,
            Math.max(internalStandaloneModuleIds.length, 1)
          )
    );
    const standaloneRowCount =
      internalStandaloneModuleIds.length > 0
        ? Math.ceil(internalStandaloneModuleIds.length / standaloneColumnCount)
        : 0;
    const standaloneSectionHeight =
      standaloneRowCount > 0
        ? MODULE_CARD_HEIGHT + (standaloneRowCount - 1) * MODULE_Y_STEP
        : 0;
    const externalSectionHeight =
      externalStandaloneModuleIds.length > 0
        ? MODULE_CARD_HEIGHT +
          (externalStandaloneModuleIds.length - 1) * MODULE_Y_STEP
        : 0;
    const productPartColumnCount = Math.max(clusterIds.length, standaloneColumnCount, 1);
    const productPartWidth = Math.max(720, PRODUCT_PART_PADDING_X * 2 + Math.max(productPartColumnCount * CLUSTER_X_STEP, MODULE_CARD_WIDTH));
    const productPartHeight = Math.max(260, standaloneY + standaloneSectionHeight + PRODUCT_PART_PADDING_BOTTOM);
    const productPartRowHeight = Math.max(productPartHeight, standaloneY + externalSectionHeight);
    const productPartNode: DiagramFlowNode = {
      id: toProductPartNodeId(productPart.id),
      type: "cluster",
      position: { x: 0, y: productPartY },
      style: { width: productPartWidth, height: productPartHeight },
      data: {
        stage: "diagram_modules",
        nodeKind: "productPart",
        productPartId: productPart.id,
        title: productPart.title,
        clusterIds,
        standaloneModuleIds,
      },
    };
    const clusterNodes = clusterIds.map((clusterId, clusterIndex) => {
      const cluster = clustersById.get(clusterId);
      return {
        id: toClusterNodeId(clusterId),
        type: "cluster",
        position: {
          x: PRODUCT_PART_PADDING_X + clusterIndex * CLUSTER_X_STEP,
          y: PRODUCT_PART_PADDING_TOP,
        },
        parentId: toProductPartNodeId(productPart.id),
        extent: "parent" as const,
        style: {
          width: MODULE_CARD_WIDTH + CLUSTER_PADDING_X * 2,
          height: getClusterHeight(cluster?.moduleIds.length ?? 0),
        },
        data: {
          stage: "diagram_modules",
          nodeKind: "cluster",
          clusterId,
          productPartId: productPart.id,
          title: cluster?.title ?? humanizeIdentifier(clusterId),
          moduleIds: cluster?.moduleIds ?? [],
        },
      } satisfies DiagramFlowNode;
    });
    const clusteredModules = clusterIds.flatMap((clusterId) =>
      (clustersById.get(clusterId)?.moduleIds ?? []).flatMap((moduleId, moduleIndex) => {
        const module = modulesById.get(moduleId);
        return module
          ? [
              buildModuleNode({
                module,
                position: {
                  x: MODULE_X_OFFSET,
                  y: MODULE_Y_OFFSET + moduleIndex * MODULE_Y_STEP,
                },
                parentId: toClusterNodeId(clusterId),
                productPart: productPart.id,
                cluster: clusterId,
              }),
            ]
          : [];
      })
    );
    const standaloneNodes = internalStandaloneModuleIds.flatMap((moduleId, moduleIndex) => {
      const module = modulesById.get(moduleId);
      return module
        ? [
            buildModuleNode({
              module,
              position: {
                x:
                  PRODUCT_PART_PADDING_X +
                  (moduleIndex % standaloneColumnCount) * CLUSTER_X_STEP,
                y:
                  standaloneY +
                  Math.floor(moduleIndex / standaloneColumnCount) * MODULE_Y_STEP,
              },
              parentId: toProductPartNodeId(productPart.id),
              productPart: productPart.id,
            }),
          ]
        : [];
    });
    const externalNodes = externalStandaloneModuleIds.flatMap((moduleId, moduleIndex) => {
      const module = modulesById.get(moduleId);
      return module
        ? [
            buildModuleNode({
              module,
              position: {
                x: productPartWidth + PRODUCT_PART_EXTERNAL_GAP,
                y: productPartY + standaloneY + moduleIndex * MODULE_Y_STEP,
              },
              productPart: productPart.id,
            }),
          ]
        : [];
    });
    const nodes = [productPartNode, ...clusterNodes, ...clusteredModules, ...standaloneNodes, ...externalNodes];
    productPartY += productPartRowHeight + PRODUCT_PART_ROW_GAP;
    return nodes;
  });
};
