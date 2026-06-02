import path from "node:path";

export type DevelopmentTreeFilesystemNodeKind =
  | "cluster"
  | "contract_graph"
  | "cross_part_contracts"
  | "execution_waves"
  | "lead_orchestration"
  | "module"
  | "product_part"
  | "shared_interfaces";

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

const DEVELOPMENT_TREE_TODO_STAGE_ROOT_SEGMENTS = [
  "doc",
  "TODO",
  "stages",
  "development-tree",
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

export const createDevelopmentTreeTodoStageRoot = (params: {
  readonly workspaceRoot: string;
}): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = path.posix.join(
    ...DEVELOPMENT_TREE_TODO_STAGE_ROOT_SEGMENTS
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
