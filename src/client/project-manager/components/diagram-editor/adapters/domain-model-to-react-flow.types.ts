import type {
  Criticality,
  EntityOrigin,
  EntityStatus,
  ModuleKind,
  RelationType,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export type DiagramFlowPosition = {
  readonly x: number;
  readonly y: number;
};

export type DiagramFlowStage = "diagram_modules";

export type DiagramFlowNodeType = "cluster" | "module";

export type DiagramFlowNodeStyle = Readonly<Record<string, number | string>>;
export type DiagramFlowNodeMeasuredSize = {
  readonly width?: number;
  readonly height?: number;
  readonly bodyStartY?: number;
};

export type DiagramFlowEdgeType = "relation";

export type ContainerConstraints = {
  readonly childMinX: number;
  readonly childMinY: number;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly paddingRight: number;
  readonly paddingBottom: number;
};

export type ProductPartFlowNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "productPart";
  readonly productPartId: string;
  readonly title: string;
  readonly purpose: string;
  readonly clusterIds: readonly string[];
  readonly standaloneModuleIds: readonly string[];
  readonly containerConstraints?: ContainerConstraints;
};

export type ClusterFlowNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "cluster";
  readonly clusterId: string;
  readonly productPartId: string;
  readonly title: string;
  readonly purpose: string;
  readonly moduleIds: readonly string[];
  readonly containerConstraints?: ContainerConstraints;
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
  readonly productPart: string;
  readonly cluster?: string;
  readonly inputCount: number;
  readonly outputCount: number;
};

export type DiagramFlowNodeData =
  | ProductPartFlowNodeData
  | ClusterFlowNodeData
  | ModuleFlowNodeData;

export type DiagramFlowNode = {
  readonly id: string;
  readonly type: DiagramFlowNodeType;
  readonly position: DiagramFlowPosition;
  readonly parentId?: string;
  readonly extent?: "parent";
  readonly width?: number;
  readonly height?: number;
  readonly measured?: DiagramFlowNodeMeasuredSize;
  readonly style?: DiagramFlowNodeStyle;
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
