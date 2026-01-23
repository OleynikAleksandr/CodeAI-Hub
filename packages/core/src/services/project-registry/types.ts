export type WorkspaceProject = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly path: string;
  readonly lastUsed: string;
  readonly icon?: string;
};

export type ProjectRegistrySchema = {
  readonly workspaces: WorkspaceProject[];
  readonly lastActiveWorkspaceId?: string;
};
