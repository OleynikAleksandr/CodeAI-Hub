import type {
  Criticality,
  EntityOrigin,
  EntityStatus,
  FacadeMapModel,
  FacadePort,
  FacadeVisibility,
  ModuleKind,
  ModuleMapModel,
  RelationType,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export type DiagramFlowPosition = {
  readonly x: number;
  readonly y: number;
};

export type DiagramFlowStage = ModuleMapModel["stage"] | FacadeMapModel["stage"];

export type DiagramFlowNodeType = "cluster" | "module" | "facade";

export type DiagramFlowEdgeType = "relation";

export type ClusterFlowNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "cluster";
  readonly clusterId: string;
  readonly title: string;
  readonly moduleIds: readonly string[];
};

export type ModuleFlowNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "module";
  readonly moduleId: string;
  readonly title: string;
  readonly kind: ModuleKind;
  readonly responsibility: string;
  readonly status: EntityStatus;
  readonly origin: EntityOrigin;
  readonly cluster?: string;
  readonly inputCount: number;
  readonly outputCount: number;
};

export type FacadeFlowNodeData = {
  readonly stage: "diagram_facades";
  readonly nodeKind: "facade";
  readonly facadeId: string;
  readonly moduleId: string;
  readonly visibility: FacadeVisibility;
  readonly methodCount: number;
  readonly methods: readonly string[];
  readonly ports: readonly FacadePort[];
  readonly status: EntityStatus;
  readonly origin: EntityOrigin;
};

export type DiagramFlowNodeData =
  | ClusterFlowNodeData
  | ModuleFlowNodeData
  | FacadeFlowNodeData;

export type DiagramFlowNode = {
  readonly id: string;
  readonly type: DiagramFlowNodeType;
  readonly position: DiagramFlowPosition;
  readonly parentId?: string;
  readonly extent?: "parent";
  readonly data: DiagramFlowNodeData;
};

export type DiagramFlowEdgeData = {
  readonly stage: DiagramFlowStage;
  readonly edgeKind: "relation";
  readonly relationId: string;
  readonly relationType: RelationType;
  readonly criticality?: Criticality;
  readonly label?: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
};

export type DiagramFlowEdge = {
  readonly id: string;
  readonly type: DiagramFlowEdgeType;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly data: DiagramFlowEdgeData;
};

export type DiagramFlowProjection = {
  readonly stage: DiagramFlowStage;
  readonly revision: string;
  readonly nodes: readonly DiagramFlowNode[];
  readonly edges: readonly DiagramFlowEdge[];
};
