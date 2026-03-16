import type {
  FacadeEntity,
  FacadeMapModel,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import {
  parseFacadeMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-parser";
import {
  serializeFacadeMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer";
import type { FacadeDomainPatch } from "./facade-domain-patches";

const normalizeText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const materializeModel = (model: FacadeMapModel): FacadeMapModel => {
  const serialized = serializeFacadeMapDsl(model);
  const parsed = parseFacadeMapDsl(serialized);
  if (!parsed.ok || parsed.value.stage !== "diagram_facades") {
    throw new Error("Unable to materialize facade map after patch.");
  }
  return parsed.value;
};

const createFacadeEntity = (
  draft: Extract<FacadeDomainPatch, { readonly type: "add-facade" }>["facade"]
): FacadeEntity => ({
  id: draft.id.trim(),
  module: draft.module.trim(),
  kind: "class",
  visibility: draft.visibility,
  methods: [...draft.methods],
  ports: draft.ports.map((port) => ({
    direction: port.direction,
    type: port.type.trim(),
    target: port.target.trim(),
  })),
  contractTargets: [...draft.contractTargets],
  codeTargets: [...draft.codeTargets],
  origin: "user",
  status: draft.status ?? "accepted",
  notes: normalizeText(draft.notes),
  rationale: normalizeText(draft.rationale),
});

const updateTimestamp = (model: FacadeMapModel): FacadeMapModel => ({
  ...model,
  updated: new Date().toISOString(),
});

export const applyFacadeDomainPatch = (
  model: FacadeMapModel,
  patch: FacadeDomainPatch
): FacadeMapModel => {
  if (patch.type === "add-facade") {
    if (model.facades.some((entity) => entity.id === patch.facade.id.trim())) {
      throw new Error(`Facade ${patch.facade.id} already exists.`);
    }
    return materializeModel(
      updateTimestamp({
        ...model,
        facades: [...model.facades, createFacadeEntity(patch.facade)],
      })
    );
  }

  const target = model.facades.find((entity) => entity.id === patch.facadeId);
  if (!target) {
    throw new Error(`Facade ${patch.facadeId} not found.`);
  }

  if (patch.type === "delete-facade") {
    return materializeModel(
      updateTimestamp({
        ...model,
        facades: model.facades.filter((entity) => entity.id !== patch.facadeId),
        relations: model.relations.filter(
          (relation) =>
            relation.from !== patch.facadeId && relation.to !== patch.facadeId
        ),
      })
    );
  }

  const nextFacade: FacadeEntity = {
    ...target,
    ...patch.changes,
    module: patch.changes.module?.trim() ?? target.module,
    methods: patch.changes.methods ? [...patch.changes.methods] : target.methods,
    ports: patch.changes.ports
      ? patch.changes.ports.map((port) => ({
          direction: port.direction,
          type: port.type.trim(),
          target: port.target.trim(),
        }))
      : target.ports,
    notes:
      "notes" in patch.changes
        ? normalizeText(patch.changes.notes)
        : target.notes,
    rationale:
      "rationale" in patch.changes
        ? normalizeText(patch.changes.rationale)
        : target.rationale,
  };

  return materializeModel(
    updateTimestamp({
      ...model,
      facades: model.facades.map((entity) =>
        entity.id === patch.facadeId ? nextFacade : entity
      ),
    })
  );
};
