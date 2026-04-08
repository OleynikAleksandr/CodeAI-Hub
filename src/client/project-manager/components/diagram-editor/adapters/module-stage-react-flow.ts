import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import {
  defaultClusterLayout,
  defaultProductPartLayout,
  type ClusterLayoutParams,
  type ProductPartLayoutParams,
} from "../diagram-editor-layout-params";
import type {
  ClusterFlowNodeData,
  DiagramFlowNode,
  ModuleFlowNodeData,
} from "./domain-model-to-react-flow.types";

type ModuleEntity = ModuleMapModel["modules"][number];
type ClusterEntity = NonNullable<ModuleMapModel["clusters"]>[number];
type ProductPartEntity = NonNullable<ModuleMapModel["productParts"]>[number];

const DEFAULT_PRODUCT_PART_ID = "default-product-part";

const toProductPartNodeId = (productPartId: string): string =>
  `product-part:${productPartId}`;

const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const compareById = <T extends { readonly id: string }>(
  left: T,
  right: T,
): number => left.id.localeCompare(right.id);

export type LayoutOverrides = {
  readonly productParts?: Readonly<Record<string, Partial<ProductPartLayoutParams>>>;
  readonly clusters?: Readonly<Record<string, Partial<ClusterLayoutParams>>>;
};

const buildModuleData = (
  module: ModuleEntity,
  productPart: string,
  cluster?: string,
): ModuleFlowNodeData => ({
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
});

const buildClusterData = (
  cluster: ClusterEntity,
  modules: readonly ModuleFlowNodeData[],
  layoutParams: ClusterLayoutParams,
): ClusterFlowNodeData => ({
  stage: "diagram_modules",
  nodeKind: "cluster",
  clusterId: cluster.id,
  productPartId: cluster.productPart,
  title: cluster.title,
  purpose: cluster.purpose,
  moduleIds: cluster.moduleIds,
  modules,
  layoutParams,
});

const buildFallbackClusters = (
  model: ModuleMapModel,
): ReadonlyMap<string, ClusterEntity> =>
  new Map(
    [
      ...new Set(
        model.modules.flatMap((m) => (m.cluster ? [m.cluster] : [])),
      ),
    ]
      .sort()
      .map((clusterId) => [
        clusterId,
        {
          id: clusterId,
          title: humanizeIdentifier(clusterId),
          purpose: `Fallback cluster for ${clusterId}`,
          productPart: DEFAULT_PRODUCT_PART_ID,
          moduleIds: model.modules
            .filter((m) => m.cluster === clusterId)
            .map((m) => m.id),
        },
      ]),
  );

const getClusterIds = (
  productPart: ProductPartEntity,
  model: ModuleMapModel,
  clustersById: ReadonlyMap<string, ClusterEntity>,
): readonly string[] =>
  (productPart.clusterIds.length > 0
    ? productPart.clusterIds
    : [
        ...new Set(
          model.modules.flatMap((m) =>
            m.cluster
            && (m.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id
              ? [m.cluster]
              : [],
          ),
        ),
      ]
  ).filter((id) => clustersById.has(id));

const getStandaloneModuleIds = (
  productPart: ProductPartEntity,
  model: ModuleMapModel,
  modulesById: ReadonlyMap<string, ModuleEntity>,
): readonly string[] =>
  (productPart.standaloneModuleIds.length > 0
    ? productPart.standaloneModuleIds
    : model.modules
        .filter(
          (m) =>
            !m.cluster
            && (m.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id,
        )
        .map((m) => m.id)
  ).filter((id) => modulesById.has(id));

/**
 * Build one React Flow node per ProductPart. Clusters and Modules
 * are nested inside ProductPart data — they are NOT separate RF nodes.
 * CSS Grid inside ProductPartNode handles all internal layout.
 */
export const buildModuleStageNodes = (
  model: ModuleMapModel,
  overrides?: LayoutOverrides,
): readonly DiagramFlowNode[] => {
  const modulesById = new Map(
    model.modules.map((m) => [m.id, m]),
  );
  const fallbackClusters = buildFallbackClusters(model);
  const clustersById = new Map(
    [...(model.clusters ?? [])].sort(compareById).map((c) => [c.id, c]),
  );
  for (const [id, cluster] of fallbackClusters) {
    if (!clustersById.has(id)) {
      clustersById.set(id, cluster);
    }
  }

  const productParts = model.productParts ?? [
    {
      id: DEFAULT_PRODUCT_PART_ID,
      title: humanizeIdentifier(DEFAULT_PRODUCT_PART_ID),
      purpose: "Fallback product part derived in the React Flow adapter",
      clusterIds: [...fallbackClusters.keys()],
      standaloneModuleIds: model.modules
        .filter((m) => !m.cluster)
        .map((m) => m.id),
    },
  ];

  const nodes: DiagramFlowNode[] = [];

  for (const productPart of productParts) {
    const clusterIds = getClusterIds(productPart, model, clustersById);
    const standaloneModuleIds = getStandaloneModuleIds(
      productPart,
      model,
      modulesById,
    );

    const ppOverride = overrides?.productParts?.[productPart.id];
    const ppLayout: ProductPartLayoutParams = {
      ...defaultProductPartLayout(),
      ...ppOverride,
    };

    const clusters: ClusterFlowNodeData[] = [];
    for (const clusterId of clusterIds) {
      const cluster = clustersById.get(clusterId);
      if (!cluster) continue;

      const clOverride = overrides?.clusters?.[clusterId];
      const clLayout: ClusterLayoutParams = {
        ...defaultClusterLayout(),
        ...clOverride,
      };

      const modules = cluster.moduleIds
        .map((moduleId) => modulesById.get(moduleId))
        .filter((m): m is ModuleEntity => m !== undefined)
        .map((m) => buildModuleData(m, productPart.id, clusterId));

      clusters.push(buildClusterData(cluster, modules, clLayout));
    }

    const standaloneModules = standaloneModuleIds
      .map((moduleId) => modulesById.get(moduleId))
      .filter((m): m is ModuleEntity => m !== undefined)
      .map((m) => buildModuleData(m, productPart.id));

    nodes.push({
      id: toProductPartNodeId(productPart.id),
      type: "productPart",
      data: {
        stage: "diagram_modules",
        nodeKind: "productPart",
        productPartId: productPart.id,
        title: productPart.title,
        purpose: productPart.purpose,
        clusterIds,
        standaloneModuleIds,
        clusters,
        standaloneModules,
        layoutParams: ppLayout,
      },
    });
  }

  return nodes;
};
