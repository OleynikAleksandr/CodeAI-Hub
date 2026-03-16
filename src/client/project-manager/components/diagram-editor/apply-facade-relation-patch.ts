import type {
  FacadeMapModel,
  FacadeRelation,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import {
  parseFacadeMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-parser";
import {
  serializeFacadeMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer";
import type { FacadeRelationPatch } from "./facade-relation-patches";

const normalizeText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const materializeModel = (model: FacadeMapModel): FacadeMapModel => {
  const serialized = serializeFacadeMapDsl(model);
  const parsed = parseFacadeMapDsl(serialized);
  if (!parsed.ok || parsed.value.stage !== "diagram_facades") {
    throw new Error("Unable to materialize facade relation patch.");
  }
  return parsed.value;
};

const ensureFacadeExists = (model: FacadeMapModel, facadeId: string): void => {
  const isKnownFacade = model.facades.some((entity) => entity.id === facadeId);
  const isKnownModule = model.facades.some((entity) => entity.module === facadeId);
  if (!(isKnownFacade || isKnownModule)) {
    throw new Error(`Facade ${facadeId} not found for relation patch.`);
  }
};

const updateTimestamp = (model: FacadeMapModel): FacadeMapModel => ({
  ...model,
  updated: new Date().toISOString(),
});

export const applyFacadeRelationPatch = (
  model: FacadeMapModel,
  patch: FacadeRelationPatch
): FacadeMapModel => {
  if (patch.type === "add-facade-relation") {
    if (model.relations.some((relation) => relation.id === patch.relation.id.trim())) {
      throw new Error(`Facade relation ${patch.relation.id} already exists.`);
    }
    ensureFacadeExists(model, patch.relation.from);
    ensureFacadeExists(model, patch.relation.to);
    const relation: FacadeRelation = {
      id: patch.relation.id.trim(),
      from: patch.relation.from.trim(),
      to: patch.relation.to.trim(),
      type: patch.relation.type,
      label: normalizeText(patch.relation.label),
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
    throw new Error(`Facade relation ${patch.relationId} not found.`);
  }

  if (patch.type === "delete-facade-relation") {
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
    ensureFacadeExists(model, patch.changes.from);
  }
  if (patch.changes.to) {
    ensureFacadeExists(model, patch.changes.to);
  }

  const nextRelation: FacadeRelation = {
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
