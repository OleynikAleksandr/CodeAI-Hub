import type { ChangeSummary, EntityChange } from "./change-summary-types";
import type {
  ModuleEntity,
  ModuleMapModel,
  ModuleRelation,
} from "./diagram-dsl-types";

const MISSING_BASELINE_REVISION = "missing-baseline";

const MODULE_FIELD_LABELS = new Map<keyof ModuleEntity, string>([
  ["kind", "Kind"],
  ["title", "Title"],
  ["responsibility", "Responsibility"],
  ["cluster", "Cluster"],
  ["inputs", "Inputs"],
  ["outputs", "Outputs"],
  ["specTarget", "Spec Target"],
  ["contractTargets", "Contract Targets"],
  ["codeTargets", "Code Targets"],
  ["origin", "Origin"],
  ["status", "Status"],
  ["notes", "Notes"],
  ["rationale", "Rationale"],
]);

const RELATION_FIELD_LABELS = new Map<keyof ModuleRelation, string>([
  ["from", "From"],
  ["to", "To"],
  ["type", "Type"],
  ["label", "Label"],
  ["criticality", "Criticality"],
  ["origin", "Origin"],
  ["status", "Status"],
  ["notes", "Notes"],
]);

const areEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const compareFields = <T extends { readonly id: string }>(
  current: T,
  baseline: T,
  labels: ReadonlyMap<keyof T, string>
): readonly string[] => {
  const modifiedFields: string[] = [];
  for (const [field, label] of labels) {
    if (!areEqual(current[field], baseline[field])) {
      modifiedFields.push(label);
    }
  }
  return modifiedFields;
};

const createAddedSummary = (params: {
  readonly entityType: "module" | "relation";
  readonly entity: ModuleEntity | ModuleRelation;
}): string =>
  params.entityType === "module"
    ? `Module: ${params.entity.id} (Kind: ${(params.entity as ModuleEntity).kind}, Title: ${(params.entity as ModuleEntity).title})`
    : `Relation: ${params.entity.id}`;

const createRemovedSummary = (params: {
  readonly entityType: "module" | "relation";
  readonly entity: ModuleEntity | ModuleRelation;
}): string => {
  if (params.entityType === "module") {
    return `Module: ${params.entity.id}`;
  }
  return `Relation: ${params.entity.id}`;
};

const createModifiedSummary = (params: {
  readonly entityType: "module" | "relation";
  readonly entityId: string;
  readonly modifiedFields: readonly string[];
}): string => {
  const entityLabel = params.entityType === "module" ? "Module" : "Relation";
  return `${entityLabel}: ${params.entityId} — fields changed: ${params.modifiedFields.join(", ")}`;
};

const diffEntitySet = <T extends { readonly id: string }>(params: {
  readonly baseline: readonly T[];
  readonly current: readonly T[];
  readonly entityType: "module" | "relation";
  readonly labels: ReadonlyMap<keyof T, string>;
  readonly createAddedSummary: (entity: T) => string;
  readonly createRemovedSummary: (entity: T) => string;
}): readonly EntityChange[] => {
  const baselineById = new Map(
    params.baseline.map((entity) => [entity.id, entity])
  );
  const currentById = new Map(
    params.current.map((entity) => [entity.id, entity])
  );
  const changes: EntityChange[] = [];

  for (const entity of params.current) {
    const baseline = baselineById.get(entity.id);
    if (!baseline) {
      changes.push({
        entityType: params.entityType,
        entityId: entity.id,
        action: "added",
        summary: params.createAddedSummary(entity),
      });
      continue;
    }
    const modifiedFields = compareFields(entity, baseline, params.labels);
    if (modifiedFields.length === 0) {
      continue;
    }
    changes.push({
      entityType: params.entityType,
      entityId: entity.id,
      action: "modified",
      modifiedFields,
      summary: createModifiedSummary({
        entityType: params.entityType,
        entityId: entity.id,
        modifiedFields,
      }),
    });
  }

  for (const entity of params.baseline) {
    if (currentById.has(entity.id)) {
      continue;
    }
    changes.push({
      entityType: params.entityType,
      entityId: entity.id,
      action: "removed",
      summary: params.createRemovedSummary(entity),
    });
  }

  return changes;
};

export const buildModuleMapChangeSummary = (
  current: ModuleMapModel,
  baseline: ModuleMapModel | null
): ChangeSummary => {
  if (!baseline) {
    return {
      baselineRevision: MISSING_BASELINE_REVISION,
      currentRevision: current.revision,
      changes: [
        ...current.modules.map<EntityChange>((entity) => ({
          entityType: "module",
          entityId: entity.id,
          action: "added",
          summary: createAddedSummary({ entityType: "module", entity }),
        })),
        ...current.relations.map<EntityChange>((entity) => ({
          entityType: "relation",
          entityId: entity.id,
          action: "added",
          summary: createAddedSummary({ entityType: "relation", entity }),
        })),
      ],
    };
  }

  return {
    baselineRevision: baseline.revision,
    currentRevision: current.revision,
    changes: [
      ...diffEntitySet({
        baseline: baseline.modules,
        current: current.modules,
        entityType: "module",
        labels: MODULE_FIELD_LABELS,
        createAddedSummary: (entity) =>
          createAddedSummary({ entityType: "module", entity }),
        createRemovedSummary: (entity) =>
          createRemovedSummary({ entityType: "module", entity }),
      }),
      ...diffEntitySet({
        baseline: baseline.relations,
        current: current.relations,
        entityType: "relation",
        labels: RELATION_FIELD_LABELS,
        createAddedSummary: (entity) =>
          createAddedSummary({ entityType: "relation", entity }),
        createRemovedSummary: (entity) =>
          createRemovedSummary({ entityType: "relation", entity }),
      }),
    ],
  };
};
