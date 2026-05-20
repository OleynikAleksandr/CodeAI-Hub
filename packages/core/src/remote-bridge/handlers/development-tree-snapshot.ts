import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeModuleNode,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
  DevelopmentTreeSnapshotRequest,
} from "../../development-tree/development-tree-types";
import {
  type DevelopmentTreeCodeWorkspacePathEntry,
  readDevelopmentTreeCodeWorkspacePathIndex,
} from "../../development-tree/filesystem-structurator/development-tree-production-path-applier";

export type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeDraftReadiness,
  DevelopmentTreeModuleNode,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
} from "../../development-tree/development-tree-types";

const findCodeWorkspacePath = (
  entries: readonly DevelopmentTreeCodeWorkspacePathEntry[],
  match: Omit<DevelopmentTreeCodeWorkspacePathEntry, "codeWorkspacePath">
): string | undefined =>
  entries.find(
    (entry) =>
      entry.kind === match.kind &&
      entry.partId === match.partId &&
      entry.clusterId === match.clusterId &&
      entry.moduleId === match.moduleId
  )?.codeWorkspacePath;

const withCodeWorkspacePaths = (
  snapshot: DevelopmentTreeSnapshot,
  entries: readonly DevelopmentTreeCodeWorkspacePathEntry[]
): DevelopmentTreeSnapshot => ({
  parts: snapshot.parts.map(
    (part): DevelopmentTreePartNode => ({
      ...part,
      codeWorkspacePath: findCodeWorkspacePath(entries, {
        kind: "product_part",
        partId: part.id,
      }),
      clusters: part.clusters.map(
        (cluster): DevelopmentTreeClusterNode => ({
          ...cluster,
          codeWorkspacePath: findCodeWorkspacePath(entries, {
            kind: "cluster",
            partId: part.id,
            clusterId: cluster.id,
          }),
          modules: cluster.modules.map(
            (module): DevelopmentTreeModuleNode => ({
              ...module,
              codeWorkspacePath: findCodeWorkspacePath(entries, {
                kind: "module",
                partId: part.id,
                clusterId: cluster.id,
                moduleId: module.id,
              }),
            })
          ),
        })
      ),
      standaloneModules: part.standaloneModules.map(
        (module): DevelopmentTreeModuleNode => ({
          ...module,
          codeWorkspacePath: findCodeWorkspacePath(entries, {
            kind: "module",
            partId: part.id,
            moduleId: module.id,
          }),
        })
      ),
    })
  ),
});

export const readDevelopmentTreeSnapshot = async (
  params: DevelopmentTreeSnapshotRequest
): Promise<DevelopmentTreeSnapshot> => {
  const snapshot = await new DevelopmentTreeStateFacade().currentSnapshot(
    params
  );
  const codePathIndex = await readDevelopmentTreeCodeWorkspacePathIndex(params);
  return codePathIndex
    ? withCodeWorkspacePaths(snapshot, codePathIndex.entries)
    : snapshot;
};
