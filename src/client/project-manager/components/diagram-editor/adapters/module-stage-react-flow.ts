import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { DiagramFlowNode } from "./domain-model-to-react-flow.types";

const PRODUCT_PART_X_STEP = 980;
const PRODUCT_PART_PADDING_X = 24;
const PRODUCT_PART_PADDING_TOP = 72;
const PRODUCT_PART_PADDING_BOTTOM = 28;
const PRODUCT_PART_SECTION_GAP = 36;
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

const toProductPartNodeId = (productPartId: string): string =>
  `product-part:${productPartId}`;

const toClusterNodeId = (clusterId: string): string => `cluster:${clusterId}`;

const compareById = <T extends { readonly id: string }>(
  left: T,
  right: T
): number => left.id.localeCompare(right.id);

const compareText = (left: string, right: string): number =>
  left.localeCompare(right);

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

const buildFallbackClusters = (
  model: ModuleMapModel
): ReadonlyMap<
  string,
  { readonly moduleIds: readonly string[]; readonly title: string }
> =>
  new Map(
    [...new Set(model.modules.flatMap((module) => (module.cluster ? [module.cluster] : [])))]
      .sort(compareText)
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
        role: "application" as const,
        title: humanizeIdentifier(DEFAULT_PRODUCT_PART_ID),
        purpose: "Fallback product part derived in the React Flow adapter",
        clusterIds: [...fallbackClusters.keys()],
        standaloneModuleIds: model.modules
          .filter((module) => !module.cluster)
          .map((module) => module.id),
      },
    ]),
  ].sort(compareById);

  return productParts.flatMap((productPart, productPartIndex) => {
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
    const clusterHeights = clusterIds.map((clusterId) =>
      getClusterHeight(clustersById.get(clusterId)?.moduleIds.length ?? 0)
    );
    const clusterSectionHeight = Math.max(0, ...clusterHeights);
    const standaloneY =
      PRODUCT_PART_PADDING_TOP +
      (clusterIds.length > 0 ? clusterSectionHeight + PRODUCT_PART_SECTION_GAP : 0);
    const productPartNode: DiagramFlowNode = {
      id: toProductPartNodeId(productPart.id),
      type: "cluster",
      position: { x: productPartIndex * PRODUCT_PART_X_STEP, y: 0 },
      style: {
        width: Math.max(
          720,
          PRODUCT_PART_PADDING_X * 2 +
            Math.max(
              clusterIds.length * CLUSTER_X_STEP,
              standaloneModuleIds.length * CLUSTER_X_STEP,
              MODULE_CARD_WIDTH
            )
        ),
        height: Math.max(
          260,
          standaloneY +
            (standaloneModuleIds.length > 0 ? MODULE_CARD_HEIGHT : 0) +
            PRODUCT_PART_PADDING_BOTTOM
        ),
      },
      data: {
        stage: "diagram_modules",
        nodeKind: "productPart",
        productPartId: productPart.id,
        title: productPart.title,
        role: productPart.role,
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
              {
                id: module.id,
                type: "module",
                position: {
                  x: MODULE_X_OFFSET,
                  y: MODULE_Y_OFFSET + moduleIndex * MODULE_Y_STEP,
                },
                parentId: toClusterNodeId(clusterId),
                extent: "parent" as const,
                data: {
                  stage: "diagram_modules",
                  nodeKind: "module",
                  moduleId: module.id,
                  title: module.title,
                  kind: module.kind,
                  responsibility: module.responsibility,
                  status: module.status,
                  origin: module.origin,
                  productPart: productPart.id,
                  cluster: clusterId,
                  inputCount: module.inputs.length,
                  outputCount: module.outputs.length,
                },
              } satisfies DiagramFlowNode,
            ]
          : [];
      })
    );
    const standaloneNodes = standaloneModuleIds.flatMap((moduleId, moduleIndex) => {
      const module = modulesById.get(moduleId);
      return module
        ? [
            {
              id: module.id,
              type: "module",
              position: {
                x: PRODUCT_PART_PADDING_X + moduleIndex * CLUSTER_X_STEP,
                y: standaloneY,
              },
              parentId: toProductPartNodeId(productPart.id),
              extent: "parent" as const,
              data: {
                stage: "diagram_modules",
                nodeKind: "module",
                moduleId: module.id,
                title: module.title,
                kind: module.kind,
                responsibility: module.responsibility,
                status: module.status,
                origin: module.origin,
                productPart: productPart.id,
                cluster: undefined,
                inputCount: module.inputs.length,
                outputCount: module.outputs.length,
              },
            } satisfies DiagramFlowNode,
          ]
        : [];
    });
    return [productPartNode, ...clusterNodes, ...clusteredModules, ...standaloneNodes];
  });
};
