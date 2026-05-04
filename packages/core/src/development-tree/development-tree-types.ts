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

export interface DevelopmentTreeModuleNode {
  readonly id: string;
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly title: string;
}

export interface DevelopmentTreeClusterNode {
  readonly id: string;
  readonly modules: readonly DevelopmentTreeModuleNode[];
  readonly readiness?: DevelopmentTreeDraftReadiness;
}

export interface DevelopmentTreePartNode {
  readonly clusters: readonly DevelopmentTreeClusterNode[];
  readonly id: string;
  readonly readiness?: DevelopmentTreeDraftReadiness;
  readonly standaloneModules: readonly DevelopmentTreeModuleNode[];
  readonly status: "skeleton" | "materialized";
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
