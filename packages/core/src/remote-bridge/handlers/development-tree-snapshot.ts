import path from "node:path";
import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeModuleNode,
  DevelopmentTreeNodeLifecycle,
  DevelopmentTreeNodeSession,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
  DevelopmentTreeSnapshotRequest,
} from "../../development-tree/development-tree-types";
import { applyDevelopmentTreeUserGateCursor } from "../../development-tree/development-tree-user-gate-cursor";
import {
  type DevelopmentTreeCodeWorkspacePathEntry,
  readDevelopmentTreeCodeWorkspacePathIndex,
} from "../../development-tree/filesystem-structurator/development-tree-production-path-applier";
import {
  type CoordinationStatus,
  createProductPartProjectedSession,
  createProjectedSession,
  readJsonRecord,
  readUnlockNodes,
  type UnlockStateNode,
} from "./development-tree-session-projection";

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

interface CoordinationState {
  readonly branchName?: string;
  readonly lockedReason?: string;
  readonly mergeCommitHash?: string;
  readonly nodeId: string;
  readonly reviewCommitHash?: string;
  readonly sourceHead?: string;
  readonly status: CoordinationStatus;
  readonly worktreePath?: string;
}

const sanitizeSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

const createClusterNodeId = (partId: string, clusterId: string): string =>
  `cluster:${partId}/${clusterId}`;

const createClusterModuleNodeId = (params: {
  readonly clusterId: string;
  readonly moduleId: string;
  readonly partId: string;
}): string => `module:${params.partId}/${params.clusterId}/${params.moduleId}`;

const createStandaloneModuleNodeId = (params: {
  readonly moduleId: string;
  readonly partId: string;
}): string => `standalone-module:${params.partId}/${params.moduleId}`;

const createClusterBranchName = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  [
    "codex",
    "development-tree",
    sanitizeSegment(params.workspaceSlug),
    "product-parts",
    sanitizeSegment(params.partId),
    "clusters",
    sanitizeSegment(params.clusterId),
    "contract",
  ].join("/");

const createClusterWorktreePath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    path.dirname(params.workspaceRoot),
    `${path.basename(params.workspaceRoot)}.worktrees`,
    sanitizeSegment(params.workspaceSlug),
    "product-parts",
    sanitizeSegment(params.partId),
    "cluster-contracts",
    sanitizeSegment(params.clusterId)
  );

const createReviewResultPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-clusters/${params.partId}/${params.clusterId}.review-result.json`;

const createMergeBoundaryPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-clusters/${params.partId}/${params.clusterId}.merge-boundary.json`;

const attachCoordination = <T extends object>(
  node: T,
  coordination: CoordinationState | null
): T => (coordination ? ({ ...node, coordination } as T) : node);

const createStartedLifecycle = (
  lifecycle: DevelopmentTreeNodeLifecycle | undefined
): DevelopmentTreeNodeLifecycle => ({
  ...(lifecycle?.lockedReason ? { lockedReason: lifecycle.lockedReason } : {}),
  startable: false,
  startState: "started",
});

const attachProjectedSession = <
  T extends {
    readonly lifecycle?: DevelopmentTreeNodeLifecycle;
    readonly session?: DevelopmentTreeNodeSession;
  },
>(
  node: T,
  session: DevelopmentTreeNodeSession | undefined
): T =>
  session
    ? ({
        ...node,
        lifecycle: createStartedLifecycle(node.lifecycle),
        session,
      } as T)
    : node;

const withCodeWorkspacePaths = (
  snapshot: DevelopmentTreeSnapshot,
  entries: readonly DevelopmentTreeCodeWorkspacePathEntry[]
): DevelopmentTreeSnapshot => ({
  ...snapshot,
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

const readClusterCoordination = async (params: {
  readonly clusterId: string;
  readonly nodes: ReadonlyMap<string, UnlockStateNode>;
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<CoordinationState | null> => {
  const nodeId = createClusterNodeId(params.partId, params.clusterId);
  const node = params.nodes.get(nodeId);
  const reviewResultPath = createReviewResultPath(params);
  const mergeBoundaryPath = createMergeBoundaryPath(params);
  const reviewResult = await readJsonRecord(
    params.workspaceRoot,
    reviewResultPath
  );
  const mergeBoundary = await readJsonRecord(
    params.workspaceRoot,
    mergeBoundaryPath
  );
  const reviewState =
    reviewResult?.reviewState === "merge_ready" ? "merge_ready" : null;
  const boundaryStatus = mergeBoundary ? "merged" : null;
  const status = boundaryStatus ?? reviewState ?? node?.status;
  if (!status) {
    return null;
  }
  return {
    nodeId,
    branchName: node?.branchName ?? createClusterBranchName(params),
    lockedReason: node?.reason,
    mergeCommitHash: node?.mergeCommitHash,
    reviewCommitHash:
      typeof reviewResult?.reviewCommitHash === "string"
        ? reviewResult.reviewCommitHash
        : undefined,
    sourceHead:
      typeof mergeBoundary?.sourceHead === "string"
        ? mergeBoundary.sourceHead
        : undefined,
    status,
    worktreePath:
      typeof mergeBoundary?.sourceWorkspaceRoot === "string"
        ? mergeBoundary.sourceWorkspaceRoot
        : (node?.worktreePath ?? createClusterWorktreePath(params)),
  };
};

const createModuleCoordination = (params: {
  readonly clusterId?: string;
  readonly moduleId: string;
  readonly nodes: ReadonlyMap<string, UnlockStateNode>;
  readonly partId: string;
}): CoordinationState | null => {
  const nodeId = params.clusterId
    ? createClusterModuleNodeId({
        clusterId: params.clusterId,
        moduleId: params.moduleId,
        partId: params.partId,
      })
    : createStandaloneModuleNodeId({
        moduleId: params.moduleId,
        partId: params.partId,
      });
  const node = params.nodes.get(nodeId);
  return node?.status
    ? {
        nodeId,
        lockedReason: node.reason,
        mergeCommitHash: node.mergeCommitHash,
        status: node.status,
      }
    : null;
};

const withCoordinationState = async (
  snapshot: DevelopmentTreeSnapshot,
  params: DevelopmentTreeSnapshotRequest
): Promise<DevelopmentTreeSnapshot> => ({
  ...snapshot,
  parts: await Promise.all(
    snapshot.parts.map(async (part): Promise<DevelopmentTreePartNode> => {
      const nodes = await readUnlockNodes({
        partId: part.id,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      const projectedPart = attachProjectedSession(
        part,
        await createProductPartProjectedSession({
          partId: part.id,
          workspaceRoot: params.workspaceRoot,
          workspaceSlug: params.workspaceSlug,
        })
      );
      return {
        ...projectedPart,
        clusters: await Promise.all(
          part.clusters.map(
            async (cluster): Promise<DevelopmentTreeClusterNode> => {
              const node = nodes.get(createClusterNodeId(part.id, cluster.id));
              const coordinatedCluster = attachCoordination(
                cluster,
                await readClusterCoordination({
                  clusterId: cluster.id,
                  nodes,
                  partId: part.id,
                  workspaceRoot: params.workspaceRoot,
                  workspaceSlug: params.workspaceSlug,
                })
              );
              return {
                ...attachProjectedSession(
                  coordinatedCluster,
                  await createProjectedSession({
                    node,
                    workspaceSlug: params.workspaceSlug,
                  })
                ),
                modules: cluster.modules.map(
                  (module): DevelopmentTreeModuleNode =>
                    attachCoordination(
                      module,
                      createModuleCoordination({
                        clusterId: cluster.id,
                        moduleId: module.id,
                        nodes,
                        partId: part.id,
                      })
                    )
                ),
              };
            }
          )
        ),
        standaloneModules: part.standaloneModules.map(
          (module): DevelopmentTreeModuleNode =>
            attachCoordination(
              module,
              createModuleCoordination({
                moduleId: module.id,
                nodes,
                partId: part.id,
              })
            )
        ),
      };
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
  const pathAwareSnapshot = codePathIndex
    ? withCodeWorkspacePaths(snapshot, codePathIndex.entries)
    : snapshot;
  const coordinatedSnapshot = await withCoordinationState(
    pathAwareSnapshot,
    params
  );
  return await applyDevelopmentTreeUserGateCursor(coordinatedSnapshot, params);
};
