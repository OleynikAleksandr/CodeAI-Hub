import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { DiagramFlowProjection } from "./domain-model-to-react-flow.types";
import { buildModuleStageNodes, type LayoutOverrides } from "./module-stage-react-flow";

export const domainModelToReactFlow = (
  model: ModuleMapModel,
  overrides?: LayoutOverrides,
): DiagramFlowProjection => ({
  stage: model.stage,
  revision: model.revision,
  nodes: buildModuleStageNodes(model, overrides),
});
