export interface WorkspaceProject {
  readonly icon?: string;
  readonly id: string;
  readonly lastUsed: string;
  readonly name: string;
  readonly path: string;
  readonly slug: string;
}

export interface ProjectRegistrySchema {
  readonly lastActiveWorkspaceId?: string;
  readonly workspaces: WorkspaceProject[];
}
