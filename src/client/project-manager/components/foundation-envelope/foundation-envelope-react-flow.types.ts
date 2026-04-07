import type { ContainerConstraints } from "../diagram-editor/adapters/domain-model-to-react-flow.types";
import type {
  FoundationEnvelopeDecisionStatus,
} from "../../../../../packages/core/src/workflow/foundation-envelope/foundation-envelope-model";

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
  readonly nodeKind: "applicationRoot";
  readonly rootId: "application-root";
  readonly title: string;
  readonly summary: string;
  readonly shape: string | null;
  readonly productPartIds: readonly string[];
  readonly sharedZoneIds: readonly string[];
  readonly containerConstraints: ContainerConstraints;
};

export type FoundationEnvelopeSharedZoneNodeData = {
  readonly stage: "foundation_envelope";
  readonly nodeKind: "sharedZone";
  readonly zoneId: string;
  readonly title: string;
  readonly purpose: string;
  readonly primaryOwner: string | null;
  readonly sharedWith: readonly string[];
  readonly containerConstraints?: ContainerConstraints;
};

export type FoundationEnvelopeProductPartNodeData = {
  readonly stage: "foundation_envelope";
  readonly nodeKind: "productPart";
  readonly partId: string;
  readonly title: string;
  readonly purpose: string;
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
