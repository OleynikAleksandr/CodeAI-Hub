import type {
  FacadeEntity,
  FacadeMapModel,
  FacadeRelation,
  ModuleEntity,
  ModuleMapModel,
  ModuleRelation,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type {
  DiagramFlowEdge,
  DiagramFlowNode,
  DiagramFlowProjection,
} from "./domain-model-to-react-flow.types";

const CLUSTER_X_STEP = 420;
const CLUSTER_Y = 0;
const MODULE_X_OFFSET = 32;
const MODULE_Y_OFFSET = 72;
const MODULE_Y_STEP = 132;
const UNGROUPED_X = 0;

const toClusterNodeId = (clusterId: string): string => `cluster:${clusterId}`;

const compareById = <T extends { readonly id: string }>(
  left: T,
  right: T
): number => left.id.localeCompare(right.id);

const compareText = (left: string, right: string): number =>
  left.localeCompare(right);

const buildClusterNodes = (
  modules: readonly ModuleEntity[]
): readonly DiagramFlowNode[] => {
  const clusters = new Map<string, string[]>();
  for (const module of modules) {
    if (!module.cluster) {
      continue;
    }
    const moduleIds = clusters.get(module.cluster) ?? [];
    moduleIds.push(module.id);
    clusters.set(module.cluster, moduleIds);
  }

  return Array.from(clusters.entries())
    .sort(([left], [right]) => compareText(left, right))
    .map(([clusterId, moduleIds], index) => ({
      id: toClusterNodeId(clusterId),
      type: "cluster",
      position: {
        x: index * CLUSTER_X_STEP,
        y: CLUSTER_Y,
      },
      data: {
        stage: "diagram_modules",
        nodeKind: "cluster",
        clusterId,
        title: clusterId,
        moduleIds: [...moduleIds].sort(compareText),
      },
    }));
};

const buildModuleNode = (
  module: ModuleEntity,
  options: {
    readonly clusterIndex: number | null;
    readonly indexWithinBucket: number;
  }
): DiagramFlowNode => {
  const hasCluster = typeof options.clusterIndex === "number" && Boolean(module.cluster);
  const x = hasCluster
    ? options.clusterIndex * CLUSTER_X_STEP + MODULE_X_OFFSET
    : options.indexWithinBucket * CLUSTER_X_STEP + UNGROUPED_X;
  const y = MODULE_Y_OFFSET + options.indexWithinBucket * MODULE_Y_STEP;

  return {
    id: module.id,
    type: "module",
    position: { x, y },
    data: {
      stage: "diagram_modules",
      nodeKind: "module",
      moduleId: module.id,
      title: module.title,
      kind: module.kind,
      responsibility: module.responsibility,
      status: module.status,
      origin: module.origin,
      cluster: module.cluster,
      inputCount: module.inputs.length,
      outputCount: module.outputs.length,
    },
  };
};

const buildModuleNodes = (
  modules: readonly ModuleEntity[]
): readonly DiagramFlowNode[] => {
  const clusteredModules = new Map<string, ModuleEntity[]>();
  const ungroupedModules: ModuleEntity[] = [];

  for (const module of [...modules].sort(compareById)) {
    if (!module.cluster) {
      ungroupedModules.push(module);
      continue;
    }
    const items = clusteredModules.get(module.cluster) ?? [];
    items.push(module);
    clusteredModules.set(module.cluster, items);
  }

  const clusteredNodes = Array.from(clusteredModules.entries())
    .sort(([left], [right]) => compareText(left, right))
    .flatMap(([_, items], clusterIndex) =>
      items.map((module, indexWithinBucket) =>
        buildModuleNode(module, { clusterIndex, indexWithinBucket })
      )
    );

  const ungroupedNodes = ungroupedModules.map((module, indexWithinBucket) =>
    buildModuleNode(module, { clusterIndex: null, indexWithinBucket })
  );

  return [...clusteredNodes, ...ungroupedNodes];
};

const buildRelationEdge = (relation: ModuleRelation): DiagramFlowEdge => ({
  id: relation.id,
  type: "relation",
  source: relation.from,
  target: relation.to,
  label: relation.label,
  data: {
    stage: "diagram_modules",
    edgeKind: "relation",
    relationId: relation.id,
    relationType: relation.type,
    criticality: relation.criticality,
    label: relation.label,
    origin: relation.origin,
    status: relation.status,
  },
});

const buildFacadeNode = (
  facade: FacadeEntity,
  options: {
    readonly moduleIndex: number;
    readonly indexWithinModule: number;
  }
): DiagramFlowNode => ({
  id: facade.id,
  type: "facade",
  position: {
    x: options.moduleIndex * CLUSTER_X_STEP,
    y: MODULE_Y_OFFSET + options.indexWithinModule * MODULE_Y_STEP,
  },
  data: {
    stage: "diagram_facades",
    nodeKind: "facade",
    facadeId: facade.id,
    moduleId: facade.module,
    visibility: facade.visibility,
    methodCount: facade.methods.length,
    methods: facade.methods,
    ports: facade.ports,
    status: facade.status,
    origin: facade.origin,
  },
});

const buildFacadeNodes = (
  facades: readonly FacadeEntity[]
): readonly DiagramFlowNode[] => {
  const facadesByModule = new Map<string, FacadeEntity[]>();

  for (const facade of [...facades].sort(compareById)) {
    const items = facadesByModule.get(facade.module) ?? [];
    items.push(facade);
    facadesByModule.set(facade.module, items);
  }

  return Array.from(facadesByModule.entries())
    .sort(([left], [right]) => compareText(left, right))
    .flatMap(([_, items], moduleIndex) =>
      items.map((facade, indexWithinModule) =>
        buildFacadeNode(facade, { moduleIndex, indexWithinModule })
      )
    );
};

const buildFacadeRelationEdge = (relation: FacadeRelation): DiagramFlowEdge => ({
  id: relation.id,
  type: "relation",
  source: relation.from,
  target: relation.to,
  label: relation.label,
  data: {
    stage: "diagram_facades",
    edgeKind: "relation",
    relationId: relation.id,
    relationType: relation.type,
    criticality: undefined,
    label: relation.label,
    origin: relation.origin,
    status: relation.status,
  },
});

export const domainModelToReactFlow = (
  model: ModuleMapModel | FacadeMapModel
): DiagramFlowProjection => {
  if (model.stage === "diagram_facades") {
    return {
      stage: model.stage,
      revision: model.revision,
      nodes: buildFacadeNodes(model.facades),
      edges: [...model.relations].sort(compareById).map(buildFacadeRelationEdge),
    };
  }

  const clusterNodes = buildClusterNodes(model.modules);
  const moduleNodes = buildModuleNodes(model.modules);
  const edges = [...model.relations].sort(compareById).map(buildRelationEdge);

  return {
    stage: model.stage,
    revision: model.revision,
    nodes: [...clusterNodes, ...moduleNodes],
    edges,
  };
};
