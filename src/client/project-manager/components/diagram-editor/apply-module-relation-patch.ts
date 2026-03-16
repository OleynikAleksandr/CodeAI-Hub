import type {
  ModuleMapModel,
  ModuleRelation,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import {
  parseModuleMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-parser";
import {
  serializeModuleMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer";
import type { ModuleRelationPatch } from "./module-relation-patches";

const normalizeText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const materializeModel = (model: ModuleMapModel): ModuleMapModel => {
  const serialized = serializeModuleMapDsl(model);
  const parsed = parseModuleMapDsl(serialized);
  if (!parsed.ok || parsed.value.stage !== "diagram_modules") {
    throw new Error("Unable to materialize module relation patch.");
  }
  return parsed.value;
};

const ensureModuleExists = (model: ModuleMapModel, moduleId: string): void => {
  if (!model.modules.some((entity) => entity.id === moduleId)) {
    throw new Error(`Module ${moduleId} not found for relation patch.`);
  }
};

const updateTimestamp = (model: ModuleMapModel): ModuleMapModel => ({
  ...model,
  updated: new Date().toISOString(),
});

export const applyModuleRelationPatch = (
  model: ModuleMapModel,
  patch: ModuleRelationPatch
): ModuleMapModel => {
  if (patch.type === "add-relation") {
    if (model.relations.some((relation) => relation.id === patch.relation.id.trim())) {
      throw new Error(`Relation ${patch.relation.id} already exists.`);
    }
    ensureModuleExists(model, patch.relation.from);
    ensureModuleExists(model, patch.relation.to);
    const relation: ModuleRelation = {
      id: patch.relation.id.trim(),
      from: patch.relation.from.trim(),
      to: patch.relation.to.trim(),
      type: patch.relation.type,
      label: normalizeText(patch.relation.label),
      criticality: patch.relation.criticality,
      notes: normalizeText(patch.relation.notes),
      origin: "user",
      status: patch.relation.status ?? "accepted",
    };
    return materializeModel(
      updateTimestamp({
        ...model,
        relations: [...model.relations, relation],
      })
    );
  }

  const target = model.relations.find((relation) => relation.id === patch.relationId);
  if (!target) {
    throw new Error(`Relation ${patch.relationId} not found.`);
  }

  if (patch.type === "delete-relation") {
    return materializeModel(
      updateTimestamp({
        ...model,
        relations: model.relations.filter(
          (relation) => relation.id !== patch.relationId
        ),
      })
    );
  }

  if (patch.changes.from) {
    ensureModuleExists(model, patch.changes.from);
  }
  if (patch.changes.to) {
    ensureModuleExists(model, patch.changes.to);
  }

  const nextRelation: ModuleRelation = {
    ...target,
    ...patch.changes,
    from: patch.changes.from?.trim() ?? target.from,
    to: patch.changes.to?.trim() ?? target.to,
    label:
      "label" in patch.changes ? normalizeText(patch.changes.label) : target.label,
    notes:
      "notes" in patch.changes ? normalizeText(patch.changes.notes) : target.notes,
  };

  return materializeModel(
    updateTimestamp({
      ...model,
      relations: model.relations.map((relation) =>
        relation.id === patch.relationId ? nextRelation : relation
      ),
    })
  );
};
