import type {
  EntityOrigin,
  EntityStatus,
  ModuleKind,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type {
  ClusterLayoutParams,
  ProductPartLayoutParams,
} from "../diagram-editor-layout-params";

export type DiagramFlowPosition = {
  readonly x: number;
  readonly y: number;
};

export type DiagramFlowStage = "diagram_modules";

export type DiagramFlowNodeType = "productPart";

export type DiagramFlowNodeStyle = Readonly<Record<string, number | string>>;

// -- Nested data types (rendered by CSS Grid inside ProductPartNode) --

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

export type ClusterFlowNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "cluster";
  readonly clusterId: string;
  readonly productPartId: string;
  readonly title: string;
  readonly purpose: string;
  readonly moduleIds: readonly string[];
  readonly modules: readonly ModuleFlowNodeData[];
  readonly layoutParams: ClusterLayoutParams;
};

export type ProductPartFlowNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "productPart";
  readonly productPartId: string;
  readonly title: string;
  readonly purpose: string;
  readonly clusterIds: readonly string[];
  readonly standaloneModuleIds: readonly string[];
  readonly clusters: readonly ClusterFlowNodeData[];
  readonly standaloneModules: readonly ModuleFlowNodeData[];
  readonly layoutParams: ProductPartLayoutParams;
};

export type DiagramFlowNodeData = ProductPartFlowNodeData;

export type DiagramFlowNode = {
  readonly id: string;
  readonly type: DiagramFlowNodeType;
  readonly position: DiagramFlowPosition;
  readonly style?: DiagramFlowNodeStyle;
  readonly data: DiagramFlowNodeData;
};

export type DiagramFlowProjection = {
  readonly stage: DiagramFlowStage;
  readonly revision: string;
  readonly nodes: readonly DiagramFlowNode[];
};
