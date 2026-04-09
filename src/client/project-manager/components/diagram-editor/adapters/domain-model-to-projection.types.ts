import type {
  EntityOrigin,
  EntityStatus,
  ModuleKind,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type {
  ClusterLayoutParams,
  ProductPartLayoutParams,
} from "../diagram-editor-layout-params";

export type DiagramProjectionStage = "diagram_modules";

export type DiagramProjectionNodeType = "productPart";

// -- Nested data types (rendered by CSS Grid inside ProductPartNode) --

export type ModuleProjectionNodeData = {
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

export type ClusterProjectionNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "cluster";
  readonly clusterId: string;
  readonly productPartId: string;
  readonly title: string;
  readonly purpose: string;
  readonly moduleIds: readonly string[];
  readonly modules: readonly ModuleProjectionNodeData[];
  readonly layoutParams: ClusterLayoutParams;
};

export type ProductPartProjectionNodeData = {
  readonly stage: "diagram_modules";
  readonly nodeKind: "productPart";
  readonly productPartId: string;
  readonly title: string;
  readonly purpose: string;
  readonly clusterIds: readonly string[];
  readonly standaloneModuleIds: readonly string[];
  readonly clusters: readonly ClusterProjectionNodeData[];
  readonly standaloneModules: readonly ModuleProjectionNodeData[];
  readonly layoutParams: ProductPartLayoutParams;
};

export type DiagramProjectionNodeData = ProductPartProjectionNodeData;

export type DiagramProjectionNode = {
  readonly id: string;
  readonly type: DiagramProjectionNodeType;
  readonly data: DiagramProjectionNodeData;
};

export type DiagramProjection = {
  readonly stage: DiagramProjectionStage;
  readonly revision: string;
  readonly nodes: readonly DiagramProjectionNode[];
};
