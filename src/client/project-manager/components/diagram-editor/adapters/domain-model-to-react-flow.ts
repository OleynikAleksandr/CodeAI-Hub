import type {
  FacadeEntity,
  FacadeMapModel,
  FacadeRelation,
  ModuleMapModel,
  ModuleRelation,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type {
  DiagramFlowEdge,
  DiagramFlowNode,
  DiagramFlowProjection,
} from "./domain-model-to-react-flow.types";
import { buildModuleStageNodes } from "./module-stage-react-flow";

const CLUSTER_X_STEP = 320;
const MODULE_Y_OFFSET = 72;
const MODULE_Y_STEP = 132;

const compareById = <T extends { readonly id: string }>(
  left: T,
  right: T
): number => left.id.localeCompare(right.id);

const compareText = (left: string, right: string): number =>
  left.localeCompare(right);

const buildRelationEdge = (
  stage: "diagram_facades" | "diagram_modules",
  relation: FacadeRelation | ModuleRelation
): DiagramFlowEdge => ({
  id: relation.id,
  type: "relation",
  source: relation.from,
  target: relation.to,
  label: relation.label,
  data: {
    stage,
    edgeKind: "relation",
    relationId: relation.id,
    relationType: relation.type,
    criticality:
      stage === "diagram_modules" && "criticality" in relation
        ? relation.criticality
        : undefined,
    label: relation.label,
    origin: relation.origin,
    status: relation.status,
  },
});

const buildFacadeNodes = (
  facades: readonly FacadeEntity[]
): readonly DiagramFlowNode[] => {
  const facadesByModule = new Map<string, FacadeEntity[]>();

  for (const facade of [...facades].sort(compareById)) {
    const items = facadesByModule.get(facade.module) ?? [];
    items.push(facade);
    facadesByModule.set(facade.module, items);
  }

  return Array.from(facadesByModule.entries())
    .sort(([left], [right]) => compareText(left, right))
    .flatMap(([_, items], moduleIndex) =>
      items.map(
        (facade, indexWithinModule) =>
          ({
            id: facade.id,
            type: "facade",
            position: {
              x: moduleIndex * CLUSTER_X_STEP,
              y: MODULE_Y_OFFSET + indexWithinModule * MODULE_Y_STEP,
            },
            data: {
              stage: "diagram_facades",
              nodeKind: "facade",
              facadeId: facade.id,
              moduleId: facade.module,
              visibility: facade.visibility,
              methodCount: facade.methods.length,
              methods: facade.methods,
              ports: facade.ports,
              status: facade.status,
              origin: facade.origin,
            },
          }) satisfies DiagramFlowNode
      )
    );
};

export const domainModelToReactFlow = (
  model: ModuleMapModel | FacadeMapModel
): DiagramFlowProjection => {
  if (model.stage === "diagram_facades") {
    return {
      stage: model.stage,
      revision: model.revision,
      nodes: buildFacadeNodes(model.facades),
      edges: [...model.relations]
        .sort(compareById)
        .map((relation) => buildRelationEdge("diagram_facades", relation)),
    };
  }

  return {
    stage: model.stage,
    revision: model.revision,
    nodes: buildModuleStageNodes(model),
    edges: [...model.relations]
      .sort(compareById)
      .map((relation) => buildRelationEdge("diagram_modules", relation)),
  };
};
