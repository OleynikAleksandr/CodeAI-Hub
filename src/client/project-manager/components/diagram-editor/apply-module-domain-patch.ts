import type {
  ModuleEntity,
  ModuleMapModel,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import {
  parseModuleMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-parser";
import {
  serializeModuleMapDsl,
} from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer";
import type { ModuleDomainPatch } from "./module-domain-patches";

const normalizeText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const materializeModel = (model: ModuleMapModel): ModuleMapModel => {
  const serialized = serializeModuleMapDsl(model);
  const parsed = parseModuleMapDsl(serialized);
  if (!parsed.ok || parsed.value.stage !== "diagram_modules") {
    throw new Error("Unable to materialize module map after patch.");
  }
  return parsed.value;
};

const createModuleEntity = (
  draft: Extract<ModuleDomainPatch, { readonly type: "add-module" }>["module"]
): ModuleEntity => ({
  id: draft.id.trim(),
  kind: draft.kind,
  title: draft.title.trim(),
  responsibility: draft.responsibility.trim(),
  cluster: normalizeText(draft.cluster),
  inputs: [...draft.inputs],
  outputs: [...draft.outputs],
  specTarget: normalizeText(draft.specTarget),
  contractTargets: [...draft.contractTargets],
  codeTargets: [...draft.codeTargets],
  origin: "user",
  status: draft.status ?? "accepted",
  notes: normalizeText(draft.notes),
  rationale: normalizeText(draft.rationale),
});

const updateTimestamp = (model: ModuleMapModel): ModuleMapModel => ({
  ...model,
  updated: new Date().toISOString(),
});

export const applyModuleDomainPatch = (
  model: ModuleMapModel,
  patch: ModuleDomainPatch
): ModuleMapModel => {
  if (patch.type === "add-module") {
    if (model.modules.some((entity) => entity.id === patch.module.id.trim())) {
      throw new Error(`Module ${patch.module.id} already exists.`);
    }
    return materializeModel(
      updateTimestamp({
        ...model,
        modules: [...model.modules, createModuleEntity(patch.module)],
      })
    );
  }

  const target = model.modules.find((entity) => entity.id === patch.moduleId);
  if (!target) {
    throw new Error(`Module ${patch.moduleId} not found.`);
  }

  if (patch.type === "delete-module") {
    return materializeModel(
      updateTimestamp({
        ...model,
        modules: model.modules.filter((entity) => entity.id !== patch.moduleId),
        relations: model.relations.filter(
          (relation) =>
            relation.from !== patch.moduleId && relation.to !== patch.moduleId
        ),
      })
    );
  }

  const nextModule: ModuleEntity = {
    ...target,
    ...patch.changes,
    cluster:
      "cluster" in patch.changes
        ? normalizeText(patch.changes.cluster)
        : target.cluster,
    specTarget:
      "specTarget" in patch.changes
        ? normalizeText(patch.changes.specTarget)
        : target.specTarget,
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
      modules: model.modules.map((entity) =>
        entity.id === patch.moduleId ? nextModule : entity
      ),
    })
  );
};
