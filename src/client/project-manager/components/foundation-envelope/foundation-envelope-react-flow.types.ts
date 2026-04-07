import type { ContainerConstraints } from "../diagram-editor/adapters/domain-model-to-react-flow.types";
import type {
  FoundationEnvelopeDecisionStatus,
} from "../../../../../packages/core/src/workflow/foundation-envelope/foundation-envelope-model";
import type {
  EntityOrigin,
  EntityStatus,
  ModuleKind,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export type FoundationEnvelopeFlowPosition = {
  readonly x: number;
  readonly y: number;
};

export type FoundationEnvelopeFlowNodeType = "cluster" | "module";

export type FoundationEnvelopeBadgeTone = "neutral" | "accent" | "warning";

export type FoundationEnvelopeBadge = {
  readonly label: string;
  readonly tone: FoundationEnvelopeBadgeTone;
};

export type FoundationEnvelopeApplicationRootNodeData = {
  readonly stage: "foundation_envelope";
  readonly nodeKind: "productPart";
  readonly productPartId: "application-root";
  readonly title: string;
  readonly purpose: string;
  readonly clusterIds: readonly string[];
  readonly standaloneModuleIds: readonly string[];
  readonly summary: string;
  readonly shape: string | null;
  readonly containerConstraints: ContainerConstraints;
};

export type FoundationEnvelopeSharedZoneNodeData = {
  readonly stage: "foundation_envelope";
  readonly nodeKind: "cluster";
  readonly clusterId: string;
  readonly productPartId: "application-root";
  readonly title: string;
  readonly purpose: string;
  readonly moduleIds: readonly string[];
  readonly primaryOwner: string | null;
  readonly sharedWith: readonly string[];
  readonly containerConstraints?: ContainerConstraints;
};

export type FoundationEnvelopeProductPartNodeData = {
  readonly stage: "foundation_envelope";
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
  readonly runtimePlatform: string | null;
  readonly technology: string | null;
  readonly decisionStatus: FoundationEnvelopeDecisionStatus | null;
  readonly badges: readonly FoundationEnvelopeBadge[];
};

export type FoundationEnvelopeFlowNodeData =
  | FoundationEnvelopeApplicationRootNodeData
  | FoundationEnvelopeSharedZoneNodeData
  | FoundationEnvelopeProductPartNodeData;

export type FoundationEnvelopeFlowNode = {
  readonly id: string;
  readonly type: FoundationEnvelopeFlowNodeType;
  readonly position: FoundationEnvelopeFlowPosition;
  readonly parentId?: string;
  readonly extent?: "parent";
  readonly style?: Readonly<Record<string, number | string>>;
  readonly data: FoundationEnvelopeFlowNodeData;
};

export type FoundationEnvelopeFlowEdgeData = {
  readonly stage: "foundation_envelope";
  readonly edgeKind: "integrationSeam";
  readonly seamId: string;
  readonly title: string;
  readonly kind: string | null;
  readonly whyItMatters: string;
};

export type FoundationEnvelopeFlowEdge = {
  readonly id: string;
  readonly type: "relation";
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly data: FoundationEnvelopeFlowEdgeData;
};

export type FoundationEnvelopeFlowProjection = {
  readonly stage: "foundation_envelope";
  readonly revision: string;
  readonly nodes: readonly FoundationEnvelopeFlowNode[];
  readonly edges: readonly FoundationEnvelopeFlowEdge[];
};
