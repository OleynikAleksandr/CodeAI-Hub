import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import {
  createDevelopmentTreeDirectoryPlan,
  createDevelopmentTreeMaterializedRoot,
  type DevelopmentTreeFilesystemDirectoryPlan,
  type DevelopmentTreeFilesystemPathPlan,
} from "./development-tree-filesystem-paths";

export interface DevelopmentTreeFilesystemPathPlannerRequest {
  readonly snapshot: DevelopmentTreeSnapshot;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const createProductPartSegments = (partId: string): readonly string[] => [
  "product-parts",
  partId,
];

const createClusterSegments = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): readonly string[] => [
  ...createProductPartSegments(params.partId),
  "clusters",
  params.clusterId,
];

const createClusterModuleSegments = (params: {
  readonly clusterId: string;
  readonly moduleId: string;
  readonly partId: string;
}): readonly string[] => [
  ...createClusterSegments(params),
  "modules",
  params.moduleId,
];

const createStandaloneModuleSegments = (params: {
  readonly moduleId: string;
  readonly partId: string;
}): readonly string[] => [
  ...createProductPartSegments(params.partId),
  "modules",
  params.moduleId,
];

const createModuleOperationSegments = (
  moduleSegments: readonly string[],
  operation: "integration" | "workers"
): readonly string[] => [...moduleSegments, operation];

const pushModuleDirectoryPlans = (params: {
  readonly clusterId?: string;
  readonly directories: DevelopmentTreeFilesystemDirectoryPlan[];
  readonly moduleId: string;
  readonly moduleSegments: readonly string[];
  readonly partId: string;
  readonly rootAbsolutePath: string;
  readonly rootRelativePath: string;
}): void => {
  const base = {
    rootAbsolutePath: params.rootAbsolutePath,
    rootRelativePath: params.rootRelativePath,
    partId: params.partId,
    ...(params.clusterId ? { clusterId: params.clusterId } : {}),
    moduleId: params.moduleId,
  };
  params.directories.push(
    createDevelopmentTreeDirectoryPlan({
      ...base,
      kind: "module",
      segments: params.moduleSegments,
    }),
    createDevelopmentTreeDirectoryPlan({
      ...base,
      kind: "workers",
      segments: createModuleOperationSegments(params.moduleSegments, "workers"),
    }),
    createDevelopmentTreeDirectoryPlan({
      ...base,
      kind: "integration",
      segments: createModuleOperationSegments(
        params.moduleSegments,
        "integration"
      ),
    })
  );
};

export class DevelopmentTreeFilesystemPathPlanner {
  plan(
    params: DevelopmentTreeFilesystemPathPlannerRequest
  ): DevelopmentTreeFilesystemPathPlan {
    const root = createDevelopmentTreeMaterializedRoot({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const directories: DevelopmentTreeFilesystemDirectoryPlan[] = [];

    for (const part of params.snapshot.parts) {
      if (part.status !== "materialized") {
        continue;
      }
      directories.push(
        createDevelopmentTreeDirectoryPlan({
          rootAbsolutePath: root.absolutePath,
          rootRelativePath: root.relativePath,
          kind: "product_part",
          partId: part.id,
          segments: createProductPartSegments(part.id),
        })
      );

      for (const cluster of part.clusters) {
        directories.push(
          createDevelopmentTreeDirectoryPlan({
            rootAbsolutePath: root.absolutePath,
            rootRelativePath: root.relativePath,
            kind: "cluster",
            partId: part.id,
            clusterId: cluster.id,
            segments: createClusterSegments({
              partId: part.id,
              clusterId: cluster.id,
            }),
          })
        );

        for (const module of cluster.modules) {
          pushModuleDirectoryPlans({
            directories,
            rootAbsolutePath: root.absolutePath,
            rootRelativePath: root.relativePath,
            partId: part.id,
            clusterId: cluster.id,
            moduleId: module.id,
            moduleSegments: createClusterModuleSegments({
              partId: part.id,
              clusterId: cluster.id,
              moduleId: module.id,
            }),
          });
        }
      }

      for (const module of part.standaloneModules) {
        pushModuleDirectoryPlans({
          directories,
          rootAbsolutePath: root.absolutePath,
          rootRelativePath: root.relativePath,
          partId: part.id,
          moduleId: module.id,
          moduleSegments: createStandaloneModuleSegments({
            partId: part.id,
            moduleId: module.id,
          }),
        });
      }
    }

    return {
      rootAbsolutePath: root.absolutePath,
      rootRelativePath: root.relativePath,
      directories,
    };
  }
}
