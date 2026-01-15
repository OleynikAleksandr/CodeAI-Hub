export type WorkspaceProject = {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly lastUsed: string;
  readonly icon?: string;
};

export type Initiative = {
  readonly id: string;
  readonly name: string;
};
