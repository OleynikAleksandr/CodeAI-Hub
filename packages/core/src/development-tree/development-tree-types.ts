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
