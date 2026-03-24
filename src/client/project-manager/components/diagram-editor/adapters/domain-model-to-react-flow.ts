import type {
  ModuleMapModel,
  ModuleRelation,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type {
  DiagramFlowEdge,
  DiagramFlowProjection,
} from "./domain-model-to-react-flow.types";
import { buildModuleStageNodes } from "./module-stage-react-flow";

const compareById = <T extends { readonly id: string }>(
  left: T,
  right: T
): number => left.id.localeCompare(right.id);

const buildRelationEdge = (
  relation: ModuleRelation
): DiagramFlowEdge => ({
  id: relation.id,
  type: "relation",
  source: relation.from,
  target: relation.to,
  label: relation.label,
  data: {
    stage: "diagram_modules",
    edgeKind: "relation",
    relationId: relation.id,
    relationType: relation.type,
    criticality: relation.criticality,
    label: relation.label,
    origin: relation.origin,
    status: relation.status,
  },
});

export const domainModelToReactFlow = (
  model: ModuleMapModel
): DiagramFlowProjection => ({
  stage: model.stage,
  revision: model.revision,
  nodes: buildModuleStageNodes(model),
  edges: [...model.relations]
    .sort(compareById)
    .map((relation) => buildRelationEdge(relation)),
});
