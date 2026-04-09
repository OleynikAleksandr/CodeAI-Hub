import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { DiagramProjection } from "./domain-model-to-projection.types";
import { buildModuleStageNodes, type LayoutOverrides } from "./module-stage-projection";

export const domainModelToProjection = (
  model: ModuleMapModel,
  overrides?: LayoutOverrides,
): DiagramProjection => ({
  stage: model.stage,
  revision: model.revision,
  nodes: buildModuleStageNodes(model, overrides),
});
