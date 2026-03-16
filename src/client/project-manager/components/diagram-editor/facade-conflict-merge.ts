import {
  buildFacadeMapChangeSummary,
} from "../../../../../packages/core/src/workflow/diagram-dsl/baseline-diff-service";
import type { FacadeMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { applyFacadeDomainPatch } from "./apply-facade-domain-patch";
import { applyFacadeRelationPatch } from "./apply-facade-relation-patch";
import type { FacadeDomainPatch } from "./facade-domain-patches";
import type { FacadeRelationPatch } from "./facade-relation-patches";

export type FacadeSemanticPatch = FacadeDomainPatch | FacadeRelationPatch;

export const mergeFacadeConflicts = (params: {
  readonly incoming: FacadeMapModel;
  readonly patches: readonly FacadeSemanticPatch[];
}): {
  readonly model: FacadeMapModel;
  readonly conflicts: readonly string[];
} => {
  let current = params.incoming;
  const conflicts: string[] = [];

  for (const patch of params.patches) {
    try {
      current =
        patch.type === "add-facade" ||
        patch.type === "update-facade" ||
        patch.type === "delete-facade"
          ? applyFacadeDomainPatch(current, patch)
          : applyFacadeRelationPatch(current, patch);
    } catch (error) {
      conflicts.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (conflicts.length > 0) {
    const summary = buildFacadeMapChangeSummary(current, params.incoming);
    conflicts.push(
      ...summary.changes
        .slice(0, 3)
        .map((change) => `Preserved local edit: ${change.summary}`)
    );
  }

  return {
    model: current,
    conflicts,
  };
};
