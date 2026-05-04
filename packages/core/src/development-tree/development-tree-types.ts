export interface DevelopmentTreeModuleNode {
  readonly id: string;
  readonly title: string;
}

export interface DevelopmentTreeClusterNode {
  readonly id: string;
  readonly modules: readonly DevelopmentTreeModuleNode[];
}

export interface DevelopmentTreePartNode {
  readonly clusters: readonly DevelopmentTreeClusterNode[];
  readonly id: string;
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
