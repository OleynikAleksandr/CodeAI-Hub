import path from "node:path";

export type DevelopmentTreeFilesystemNodeKind =
  | "cluster"
  | "integration"
  | "module"
  | "product_part"
  | "workers";

export interface DevelopmentTreeFilesystemDirectoryPlan {
  readonly absolutePath: string;
  readonly clusterId?: string;
  readonly kind: DevelopmentTreeFilesystemNodeKind;
  readonly moduleId?: string;
  readonly partId: string;
  readonly relativePath: string;
}

export interface DevelopmentTreeFilesystemPathPlan {
  readonly directories: readonly DevelopmentTreeFilesystemDirectoryPlan[];
  readonly rootAbsolutePath: string;
  readonly rootRelativePath: string;
}

const DEVELOPMENT_TREE_MATERIALIZED_ROOT_SEGMENTS = [
  "development_tree",
  "materialized",
] as const;

export const createDevelopmentTreeMaterializedRoot = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = path.posix.join(
    ".codeai-hub",
    params.workspaceSlug,
    ...DEVELOPMENT_TREE_MATERIALIZED_ROOT_SEGMENTS
  );
  return {
    relativePath,
    absolutePath: path.join(params.workspaceRoot, relativePath),
  };
};

export const createDevelopmentTreeDirectoryPlan = (params: {
  readonly clusterId?: string;
  readonly kind: DevelopmentTreeFilesystemNodeKind;
  readonly moduleId?: string;
  readonly partId: string;
  readonly rootAbsolutePath: string;
  readonly rootRelativePath: string;
  readonly segments: readonly string[];
}): DevelopmentTreeFilesystemDirectoryPlan => {
  const relativePath = path.posix.join(
    params.rootRelativePath,
    ...params.segments
  );
  return {
    relativePath,
    absolutePath: path.join(params.rootAbsolutePath, ...params.segments),
    kind: params.kind,
    partId: params.partId,
    ...(params.clusterId ? { clusterId: params.clusterId } : {}),
    ...(params.moduleId ? { moduleId: params.moduleId } : {}),
  };
};
