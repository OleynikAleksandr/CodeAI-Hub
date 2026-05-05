import { stat } from "node:fs/promises";
import path from "node:path";
import type { DevelopmentTreeSnapshot } from "../../development-tree/development-tree-types";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";

const collectArtifactPaths = (
  artifacts: readonly { readonly path: string }[] | undefined,
  paths: string[]
): void => {
  for (const artifact of artifacts ?? []) {
    paths.push(artifact.path);
  }
};

const collectModuleArtifactPaths = (
  modules: readonly {
    readonly artifacts?: readonly { readonly path: string }[];
  }[],
  paths: string[]
): void => {
  for (const module of modules) {
    collectArtifactPaths(module.artifacts, paths);
  }
};

const collectClusterArtifactPaths = (
  clusters: readonly {
    readonly artifacts?: readonly { readonly path: string }[];
    readonly modules: readonly {
      readonly artifacts?: readonly { readonly path: string }[];
    }[];
  }[],
  paths: string[]
): void => {
  for (const cluster of clusters) {
    collectArtifactPaths(cluster.artifacts, paths);
    collectModuleArtifactPaths(cluster.modules, paths);
  }
};

const collectDevelopmentTreeArtifactPaths = (
  developmentTree: DevelopmentTreeSnapshot
): readonly string[] => {
  const paths: string[] = [];
  for (const part of developmentTree.parts) {
    collectArtifactPaths(part.artifacts, paths);
    collectClusterArtifactPaths(part.clusters, paths);
    collectModuleArtifactPaths(part.standaloneModules, paths);
  }
  return paths;
};

export const applyDevelopmentTreeFreshnessToState = async (params: {
  readonly developmentTree: DevelopmentTreeSnapshot;
  readonly state: WorkflowState;
  readonly workspaceRoot: string;
}): Promise<WorkflowState> => {
  let updatedAt = params.state.updatedAt;
  for (const artifactPath of collectDevelopmentTreeArtifactPaths(
    params.developmentTree
  )) {
    const artifactStat = await stat(
      path.join(params.workspaceRoot, artifactPath)
    ).catch(() => null);
    const artifactUpdatedAt = artifactStat?.isFile()
      ? artifactStat.mtime.toISOString()
      : null;
    if (artifactUpdatedAt && artifactUpdatedAt.localeCompare(updatedAt) > 0) {
      updatedAt = artifactUpdatedAt;
    }
  }
  return updatedAt === params.state.updatedAt
    ? params.state
    : { ...params.state, updatedAt };
};
