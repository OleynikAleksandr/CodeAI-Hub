export type DevelopmentTreeDraftReadiness = "idle" | "in_progress" | "ready";

export type DevelopmentTreeDraftReadinessKind =
  | "cluster"
  | "module"
  | "product_part";

export interface DevelopmentTreeDraftReadinessFile {
  readonly fileName: string;
  readonly filledAgentFillSections: number;
  readonly readiness: DevelopmentTreeDraftReadiness;
  readonly requiredAgentFillSections: number;
}

export interface DevelopmentTreeNodeArtifact {
  readonly fileName: string;
  readonly path: string;
}

export interface DevelopmentTreeNodeSession {
  readonly dialogId: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly rootSessionId: string;
  readonly sessionId: string;
  readonly updatedAt: string;
}

export type DevelopmentTreeNodeStartState = "not_started" | "started";

export interface DevelopmentTreeNodeLifecycle {
  readonly lockedReason?: string;
  readonly startable: boolean;
  readonly startState: DevelopmentTreeNodeStartState;
}

export type DevelopmentTreeOperationNodeKind =
  | "contract_graph"
  | "cross_part_contracts"
  | "execution_waves"
  | "implementation"
  | "integration"
  | "lead_orchestration"
  | "module_facade_specification"
  | "shared_interfaces"
  | "workers";

export interface DevelopmentTreeOperationNode {
  readonly artifactWorkspacePath: string;
  readonly children?: readonly DevelopmentTreeOperationNode[];
  readonly id: string;
  readonly kind: DevelopmentTreeOperationNodeKind;
  readonly title: string;
  readonly workflowPath: string;
}

export interface DevelopmentTreeModuleNode {
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly artifactWorkspacePath?: string;
  readonly codeWorkspacePath?: string;
  readonly id: string;
  readonly lifecycle?: DevelopmentTreeNodeLifecycle;
  readonly operations?: readonly DevelopmentTreeOperationNode[];
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly session?: DevelopmentTreeNodeSession;
  readonly title: string;
  readonly workflowPath?: string;
}

export interface DevelopmentTreeClusterNode {
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly artifactWorkspacePath?: string;
  readonly codeWorkspacePath?: string;
  readonly id: string;
  readonly lifecycle?: DevelopmentTreeNodeLifecycle;
  readonly modules: readonly DevelopmentTreeModuleNode[];
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly session?: DevelopmentTreeNodeSession;
  readonly workflowPath?: string;
}

export interface DevelopmentTreePartNode {
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly artifactWorkspacePath?: string;
  readonly clusters: readonly DevelopmentTreeClusterNode[];
  readonly codeWorkspacePath?: string;
  readonly id: string;
  readonly lifecycle?: DevelopmentTreeNodeLifecycle;
  readonly operations?: readonly DevelopmentTreeOperationNode[];
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly session?: DevelopmentTreeNodeSession;
  readonly standaloneModules: readonly DevelopmentTreeModuleNode[];
  readonly status: "skeleton" | "materialized";
  readonly workflowPath?: string;
}

export interface DevelopmentTreeSnapshot {
  readonly leadProductPartId?: string | null;
  readonly parts: readonly DevelopmentTreePartNode[];
  readonly productPartLeadershipOrder?: readonly string[];
}

export interface DevelopmentTreeSnapshotRequest {
  readonly generatedPartIds: readonly string[];
  readonly leadProductPartId?: string | null;
  readonly plannedPartIds: readonly string[];
  readonly productPartLeadershipOrder?: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export type DevelopmentTreeAgentResearchArtifactStatus =
  | "accepted"
  | "draft"
  | "rejected"
  | "review_required";

export type DevelopmentTreeAgentResearchSourceType =
  | "community"
  | "official"
  | "primary"
  | "secondary"
  | "unknown";

export interface DevelopmentTreeAgentResearchSource {
  readonly retrievedAt: string;
  readonly sourceType: DevelopmentTreeAgentResearchSourceType;
  readonly title: string;
  readonly url: string;
  readonly warning?: string;
  readonly whyRelevant: string;
}

export interface DevelopmentTreeAgentResearchRecommendation {
  readonly recommendation: string;
  readonly requiredChecks: readonly string[];
  readonly sourceUrls: readonly string[];
  readonly tradeoff: string;
  readonly userApprovalRequired: boolean;
}

export interface DevelopmentTreeAgentResearchArtifact {
  readonly artifactVersion: "development-tree-agent-research-v1";
  readonly recommendations: readonly DevelopmentTreeAgentResearchRecommendation[];
  readonly sources: readonly DevelopmentTreeAgentResearchSource[];
  readonly status: DevelopmentTreeAgentResearchArtifactStatus;
  readonly topic: string;
  readonly workflowPath: string;
}

export interface DevelopmentTreeAgentPromptPackContract {
  readonly artifactVersion: "development-tree-agent-prompt-pack-v1";
  readonly requiresResearchArtifactBeforeExternalRecommendations: boolean;
  readonly researchArtifactPath: string;
  readonly structuredOutputPolicy: "core_validator_required";
  readonly workflowPath: string;
}
