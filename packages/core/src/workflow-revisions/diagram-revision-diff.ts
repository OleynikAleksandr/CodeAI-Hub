import type {
  ClusterEntity,
  ModuleEntity,
  ModuleMapModel,
  ProductPartEntity,
} from "../workflow/diagram-dsl/diagram-dsl-types";

export type DiagramRevisionChangeKind =
  | "cluster"
  | "facade_boundary"
  | "module"
  | "product_part";

export type DiagramRevisionChangeAction =
  | "added"
  | "changed"
  | "removed"
  | "renamed";

export interface DiagramRevisionChange {
  readonly action: DiagramRevisionChangeAction;
  readonly changedFields: readonly string[];
  readonly fromId?: string;
  readonly id: string;
  readonly kind: DiagramRevisionChangeKind;
  readonly parentId?: string;
  readonly summary: string;
  readonly title: string;
}

interface DiagramRevisionEntity {
  readonly comparable: Record<string, unknown>;
  readonly id: string;
  readonly kind: DiagramRevisionChangeKind;
  readonly parentId?: string;
  readonly renameFingerprint: string;
  readonly title: string;
}

export interface DiagramRevisionDiff {
  readonly baselineRevision: string;
  readonly changes: readonly DiagramRevisionChange[];
  readonly currentRevision: string;
}

export const diffDiagramModuleRevisions = (
  baseline: ModuleMapModel,
  current: ModuleMapModel
): DiagramRevisionDiff => {
  const baselineEntities = collectEntities(baseline);
  const currentEntities = collectEntities(current);
  return {
    baselineRevision: baseline.revision,
    currentRevision: current.revision,
    changes: diffEntities(baselineEntities, currentEntities),
  };
};

const collectEntities = (
  model: ModuleMapModel
): readonly DiagramRevisionEntity[] => [
  ...(model.productParts ?? []).map(toProductPartEntity),
  ...(model.clusters ?? []).map(toClusterEntity),
  ...model.modules.map(toModuleEntity),
  ...(model.clusters ?? []).map(toClusterFacadeBoundary),
  ...model.modules.map(toModuleFacadeBoundary),
];

const toProductPartEntity = (
  entity: ProductPartEntity
): DiagramRevisionEntity => ({
  id: entity.id,
  kind: "product_part",
  title: entity.title,
  comparable: {
    clusterIds: entity.clusterIds,
    notes: entity.notes,
    purpose: entity.purpose,
    standaloneModuleIds: entity.standaloneModuleIds,
    title: entity.title,
  },
  renameFingerprint: stableJson({
    clusterIds: entity.clusterIds,
    purpose: entity.purpose,
    standaloneModuleIds: entity.standaloneModuleIds,
  }),
});

const toClusterEntity = (entity: ClusterEntity): DiagramRevisionEntity => ({
  id: entity.id,
  kind: "cluster",
  parentId: entity.productPart,
  title: entity.title,
  comparable: {
    moduleIds: entity.moduleIds,
    notes: entity.notes,
    productPart: entity.productPart,
    purpose: entity.purpose,
    title: entity.title,
  },
  renameFingerprint: stableJson({
    moduleIds: entity.moduleIds,
    productPart: entity.productPart,
    purpose: entity.purpose,
  }),
});

const toModuleEntity = (entity: ModuleEntity): DiagramRevisionEntity => ({
  id: entity.id,
  kind: "module",
  parentId: entity.cluster ?? entity.productPart,
  title: entity.title,
  comparable: {
    cluster: entity.cluster,
    codeTargets: entity.codeTargets,
    contractTargets: entity.contractTargets,
    inputs: entity.inputs,
    outputs: entity.outputs,
    productPart: entity.productPart,
    responsibility: entity.responsibility,
    specTarget: entity.specTarget,
    status: entity.status,
    title: entity.title,
  },
  renameFingerprint: stableJson({
    cluster: entity.cluster,
    outputs: entity.outputs,
    productPart: entity.productPart,
    responsibility: entity.responsibility,
  }),
});

const toClusterFacadeBoundary = (
  entity: ClusterEntity
): DiagramRevisionEntity => ({
  id: `cluster:${entity.id}:facade`,
  kind: "facade_boundary",
  parentId: entity.id,
  title: `${entity.title} Facade`,
  comparable: {
    boundaryOwner: entity.id,
    boundaryOwnerKind: "cluster",
    moduleIds: entity.moduleIds,
    purpose: entity.purpose,
  },
  renameFingerprint: stableJson({
    boundaryOwnerKind: "cluster",
    moduleIds: entity.moduleIds,
    purpose: entity.purpose,
  }),
});

const toModuleFacadeBoundary = (
  entity: ModuleEntity
): DiagramRevisionEntity => ({
  id: `module:${entity.id}:facade`,
  kind: "facade_boundary",
  parentId: entity.id,
  title: `${entity.title} Facade`,
  comparable: {
    boundaryOwner: entity.id,
    boundaryOwnerKind: "module",
    contractTargets: entity.contractTargets,
    responsibility: entity.responsibility,
  },
  renameFingerprint: stableJson({
    boundaryOwnerKind: "module",
    contractTargets: entity.contractTargets,
    responsibility: entity.responsibility,
  }),
});

const diffEntities = (
  baseline: readonly DiagramRevisionEntity[],
  current: readonly DiagramRevisionEntity[]
): readonly DiagramRevisionChange[] => {
  const baselineByKey = toEntityMap(baseline);
  const changes: DiagramRevisionChange[] = [];
  const handledBaselineKeys = new Set<string>();
  const handledCurrentKeys = new Set<string>();

  for (const currentEntity of current) {
    const key = entityKey(currentEntity);
    const baselineEntity = baselineByKey.get(key);
    if (!baselineEntity) {
      continue;
    }
    handledBaselineKeys.add(key);
    handledCurrentKeys.add(key);
    const changedFields = getChangedFields(
      baselineEntity.comparable,
      currentEntity.comparable
    );
    if (changedFields.length === 0) {
      continue;
    }
    changes.push(createChange("changed", currentEntity, changedFields));
  }

  const removed = baseline.filter(
    (entity) => !handledBaselineKeys.has(entityKey(entity))
  );
  const added = current.filter(
    (entity) => !handledCurrentKeys.has(entityKey(entity))
  );
  const renamedAddedKeys = new Set<string>();

  for (const removedEntity of removed) {
    const renamed = added.find(
      (entity) =>
        !renamedAddedKeys.has(entityKey(entity)) &&
        entity.kind === removedEntity.kind &&
        hasCompatibleRenameParent(removedEntity, entity) &&
        entity.renameFingerprint === removedEntity.renameFingerprint
    );
    if (!renamed) {
      changes.push(createChange("removed", removedEntity, []));
      continue;
    }
    renamedAddedKeys.add(entityKey(renamed));
    changes.push({
      ...createChange("renamed", renamed, ["id"]),
      fromId: removedEntity.id,
      summary: `${labelForKind(renamed.kind)} renamed: ${removedEntity.id} -> ${renamed.id}`,
    });
  }

  for (const addedEntity of added) {
    if (!renamedAddedKeys.has(entityKey(addedEntity))) {
      changes.push(createChange("added", addedEntity, []));
    }
  }

  return changes;
};

const toEntityMap = (
  entities: readonly DiagramRevisionEntity[]
): ReadonlyMap<string, DiagramRevisionEntity> =>
  new Map(entities.map((entity) => [entityKey(entity), entity]));

const hasCompatibleRenameParent = (
  removed: DiagramRevisionEntity,
  added: DiagramRevisionEntity
): boolean =>
  removed.kind === "facade_boundary" || removed.parentId === added.parentId;

const entityKey = (entity: DiagramRevisionEntity): string =>
  `${entity.kind}:${entity.id}`;

const getChangedFields = (
  baseline: Record<string, unknown>,
  current: Record<string, unknown>
): readonly string[] => {
  const fields = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  return [...fields].filter(
    (field) => stableJson(baseline[field]) !== stableJson(current[field])
  );
};

const createChange = (
  action: DiagramRevisionChangeAction,
  entity: DiagramRevisionEntity,
  changedFields: readonly string[]
): DiagramRevisionChange => ({
  action,
  changedFields,
  id: entity.id,
  kind: entity.kind,
  parentId: entity.parentId,
  summary: `${labelForKind(entity.kind)} ${action}: ${entity.id}`,
  title: entity.title,
});

const labelForKind = (kind: DiagramRevisionChangeKind): string =>
  kind
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");

const stableJson = (value: unknown): string => JSON.stringify(value);
