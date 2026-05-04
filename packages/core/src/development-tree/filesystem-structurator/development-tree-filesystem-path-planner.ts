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
          directories.push(
            createDevelopmentTreeDirectoryPlan({
              rootAbsolutePath: root.absolutePath,
              rootRelativePath: root.relativePath,
              kind: "module",
              partId: part.id,
              clusterId: cluster.id,
              moduleId: module.id,
              segments: createClusterModuleSegments({
                partId: part.id,
                clusterId: cluster.id,
                moduleId: module.id,
              }),
            })
          );
        }
      }

      for (const module of part.standaloneModules) {
        directories.push(
          createDevelopmentTreeDirectoryPlan({
            rootAbsolutePath: root.absolutePath,
            rootRelativePath: root.relativePath,
            kind: "module",
            partId: part.id,
            moduleId: module.id,
            segments: createStandaloneModuleSegments({
              partId: part.id,
              moduleId: module.id,
            }),
          })
        );
      }
    }

    return {
      rootAbsolutePath: root.absolutePath,
      rootRelativePath: root.relativePath,
      directories,
    };
  }
}
