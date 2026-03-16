import type { ModuleMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { applyModuleDomainPatch } from "./apply-module-domain-patch";
import { applyModuleRelationPatch } from "./apply-module-relation-patch";
import type { ModuleDomainPatch } from "./module-domain-patches";
import type { ModuleRelationPatch } from "./module-relation-patches";

export type ModuleSemanticPatch = ModuleDomainPatch | ModuleRelationPatch;

export const mergeModuleConflicts = (params: {
  readonly incoming: ModuleMapModel;
  readonly patches: readonly ModuleSemanticPatch[];
}): {
  readonly model: ModuleMapModel;
  readonly conflicts: readonly string[];
} => {
  let current = params.incoming;
  const conflicts: string[] = [];

  for (const patch of params.patches) {
    try {
      current =
        patch.type === "add-module" ||
        patch.type === "update-module" ||
        patch.type === "delete-module"
          ? applyModuleDomainPatch(current, patch)
          : applyModuleRelationPatch(current, patch);
    } catch (error) {
      conflicts.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    model: current,
    conflicts,
  };
};
