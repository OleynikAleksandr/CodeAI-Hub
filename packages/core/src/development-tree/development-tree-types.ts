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
  readonly startable: boolean;
  readonly startState: DevelopmentTreeNodeStartState;
}

export interface DevelopmentTreeModuleNode {
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly id: string;
  readonly lifecycle?: DevelopmentTreeNodeLifecycle;
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly session?: DevelopmentTreeNodeSession;
  readonly title: string;
  readonly workflowPath?: string;
}

export interface DevelopmentTreeClusterNode {
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly id: string;
  readonly lifecycle?: DevelopmentTreeNodeLifecycle;
  readonly modules: readonly DevelopmentTreeModuleNode[];
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly session?: DevelopmentTreeNodeSession;
  readonly workflowPath?: string;
}

export interface DevelopmentTreePartNode {
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly clusters: readonly DevelopmentTreeClusterNode[];
  readonly id: string;
  readonly lifecycle?: DevelopmentTreeNodeLifecycle;
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly session?: DevelopmentTreeNodeSession;
  readonly standaloneModules: readonly DevelopmentTreeModuleNode[];
  readonly status: "skeleton" | "materialized";
  readonly workflowPath?: string;
}

export interface DevelopmentTreeSnapshot {
  readonly parts: readonly DevelopmentTreePartNode[];
}

export interface DevelopmentTreeSnapshotRequest {
  readonly generatedPartIds: readonly string[];
  readonly plannedPartIds: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}
