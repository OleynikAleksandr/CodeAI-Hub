import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import type { DevelopmentTreeSnapshot } from "../../development-tree/development-tree-types";
import { DevelopmentTreeFilesystemStructuratorFacade } from "../../development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade";
import { DevelopmentTreeNodeWorktreeService } from "../../development-tree/node-bootstrap/development-tree-node-worktree-service";
import type {
  DevelopmentTreeAgentSessionGateway,
  NodeAgentSessionBootstrapResult,
} from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";
import { bootstrapDevelopmentTreeProductPartAgents } from "./development-tree-product-part-agent-bootstrap";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";

interface DevelopmentTreeProductPartPrecodeCommitter {
  readonly commitDevelopmentTreeBootstrap: (params: {
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }) => Promise<void>;
}

export interface DevelopmentTreeProductPartPrecodeBootstrapRequest {
  readonly agentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly committer: DevelopmentTreeProductPartPrecodeCommitter;
  readonly providerId?: string | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentTreeProductPartPrecodeBootstrapResult {
  readonly expectedProductPartIds: readonly string[];
  readonly managedPaths: readonly string[];
  readonly skipped: boolean;
  readonly startedProductPartIds: readonly string[];
}

const uniquePaths = (paths: readonly string[]): readonly string[] => [
  ...new Set(paths.filter((entry) => entry.trim().length > 0)),
];

const uniqueIds = (ids: readonly (string | null | undefined)[]): string[] => [
  ...new Set(
    ids.map((entry) => entry?.trim() ?? "").filter((entry) => entry.length > 0)
  ),
];

const resolveProductPartLeadershipOrder = (params: {
  readonly leadProductPartId: string;
  readonly plannedPartIds: readonly string[];
  readonly productPartLeadershipOrder?: readonly string[];
}): readonly string[] =>
  uniqueIds([
    params.leadProductPartId,
    ...(params.productPartLeadershipOrder?.length
      ? params.productPartLeadershipOrder
      : params.plannedPartIds),
    ...params.plannedPartIds,
  ]);

const collectStartedProductPartIds = (
  sessions: readonly NodeAgentSessionBootstrapResult[]
): readonly string[] =>
  uniqueIds(
    sessions
      .filter(
        (session) =>
          session.node.kind === "product_part" &&
          session.firstMessageSent &&
          Boolean(session.sessionId)
      )
      .map((session) => session.node.partId)
  );

const findMissingProductPartSessions = (params: {
  readonly expectedPartIds: readonly string[];
  readonly sessions: readonly NodeAgentSessionBootstrapResult[];
}): readonly string[] => {
  const started = new Set(collectStartedProductPartIds(params.sessions));
  return params.expectedPartIds.filter((partId) => !started.has(partId));
};

const findProductPartSession = (params: {
  readonly partId: string;
  readonly sessions: readonly NodeAgentSessionBootstrapResult[];
}): NodeAgentSessionBootstrapResult | null =>
  params.sessions.find(
    (session) =>
      session.node.kind === "product_part" &&
      session.node.partId === params.partId &&
      Boolean(session.sessionId)
  ) ?? null;

const filterExistingRelativePaths = async (params: {
  readonly paths: readonly string[];
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const existingPaths: string[] = [];
  for (const relativePath of params.paths) {
    const absolutePath = path.join(params.workspaceRoot, relativePath);
    if (await stat(absolutePath).catch(() => null)) {
      existingPaths.push(relativePath);
    }
  }
  return existingPaths;
};

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createProductPartManagedStatePath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createLaneStartedState = (params: {
  readonly branchName: string;
  readonly partId: string;
  readonly providerId?: string | null;
  readonly session: NodeAgentSessionBootstrapResult | null;
  readonly worktreePath: string;
}): string =>
  `${JSON.stringify(
    {
      branchName: params.branchName,
      partId: params.partId,
      providerId: params.providerId ?? null,
      reviewState: "lane_started",
      schema: "codeai-product-part-development-brief-managed-v1",
      sessionId: params.session?.sessionId ?? null,
      sessionStage: params.session?.stage ?? null,
      updatedAt: new Date().toISOString(),
      worktreePath: params.worktreePath,
    },
    null,
    2
  )}\n`;

const commitLaneBootstrapChanges = async (params: {
  readonly partId: string;
  readonly paths: readonly string[];
  readonly worktreePath: string;
}): Promise<void> => {
  const paths = await filterExistingRelativePaths({
    paths: params.paths,
    workspaceRoot: params.worktreePath,
  });
  if (paths.length === 0) {
    return;
  }
  await new WorkflowBoundaryGit().commit({
    commitMessage: `chore: bootstrap ${params.partId} product part lane`,
    paths,
    workspaceRoot: params.worktreePath,
  });
};

export class DevelopmentTreeProductPartPrecodeBootstrap {
  private readonly filesystem =
    new DevelopmentTreeFilesystemStructuratorFacade();
  private readonly worktrees = new DevelopmentTreeNodeWorktreeService();

  async bootstrap(
    params: DevelopmentTreeProductPartPrecodeBootstrapRequest
  ): Promise<DevelopmentTreeProductPartPrecodeBootstrapResult> {
    const progress = await readDiagramModulesProgressSnapshot({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (!progress?.leadProductPartId) {
      return {
        expectedProductPartIds: [],
        managedPaths: [],
        skipped: true,
        startedProductPartIds: [],
      };
    }
    const productPartLeadershipOrder = resolveProductPartLeadershipOrder({
      leadProductPartId: progress.leadProductPartId,
      plannedPartIds: progress.plannedPartIds,
      productPartLeadershipOrder: progress.productPartLeadershipOrder,
    });
    const snapshot = await new DevelopmentTreeStateFacade().currentSnapshot({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
      plannedPartIds: progress.plannedPartIds,
      generatedPartIds: progress.generatedPartIds,
      leadProductPartId: progress.leadProductPartId,
      productPartLeadershipOrder,
    });
    const agentSessions: NodeAgentSessionBootstrapResult[] = [];
    const mainManagedStatePaths: string[] = [];
    for (const partId of productPartLeadershipOrder) {
      const result = await this.bootstrapProductPartLane({
        ...params,
        leadProductPartId: progress.leadProductPartId,
        partId,
        productPartLeadershipOrder,
        snapshot,
      });
      agentSessions.push(...result.agentSessions);
      mainManagedStatePaths.push(result.managedStatePath);
    }
    const stillMissingProductPartIds = findMissingProductPartSessions({
      expectedPartIds: productPartLeadershipOrder,
      sessions: agentSessions,
    });
    if (stillMissingProductPartIds.length > 0) {
      throw new Error(
        `Development Tree Product Part bootstrap did not start agent sessions for: ${stillMissingProductPartIds.join(", ")}`
      );
    }
    const managedPaths = await filterExistingRelativePaths({
      workspaceRoot: params.workspaceRoot,
      paths: uniquePaths(mainManagedStatePaths),
    });
    await this.commitBootstrapChanges({
      committer: params.committer,
      managedPaths,
      workspaceRoot: params.workspaceRoot,
    });
    return {
      expectedProductPartIds: productPartLeadershipOrder,
      managedPaths,
      skipped: false,
      startedProductPartIds: collectStartedProductPartIds(agentSessions),
    };
  }

  private async bootstrapProductPartLane(
    params: DevelopmentTreeProductPartPrecodeBootstrapRequest & {
      readonly leadProductPartId: string;
      readonly partId: string;
      readonly productPartLeadershipOrder: readonly string[];
      readonly snapshot: DevelopmentTreeSnapshot;
    }
  ): Promise<{
    readonly agentSessions: readonly NodeAgentSessionBootstrapResult[];
    readonly managedStatePath: string;
  }> {
    const worktree = await this.worktrees.createProductPartPrecodeWorktree({
      partId: params.partId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    await this.filesystem.materialize({
      snapshot: params.snapshot,
      workspaceRoot: worktree.worktreePath,
      workspaceSlug: params.workspaceSlug,
    });
    const bootstrap = await bootstrapDevelopmentTreeProductPartAgents({
      agentGateway: params.agentGateway,
      providerId: params.providerId,
      leadProductPartId: params.leadProductPartId,
      productPartLeadershipOrder: params.productPartLeadershipOrder,
      targetProductPartIds: [params.partId],
      workspaceRoot: worktree.worktreePath,
      workspaceSlug: params.workspaceSlug,
    });
    await commitLaneBootstrapChanges({
      partId: params.partId,
      paths: [
        ...bootstrap.writtenDrafts.map((draft) => draft.relativePath),
        ...bootstrap.writtenProductPartPlans.map((plan) => plan.relativePath),
      ],
      worktreePath: worktree.worktreePath,
    });
    const managedStatePath = createProductPartManagedStatePath({
      partId: params.partId,
      workspaceSlug: params.workspaceSlug,
    });
    await writeText(
      params.workspaceRoot,
      managedStatePath,
      createLaneStartedState({
        branchName: worktree.branchName,
        partId: params.partId,
        providerId: params.providerId,
        session: findProductPartSession({
          partId: params.partId,
          sessions: bootstrap.agentSessions,
        }),
        worktreePath: worktree.worktreePath,
      })
    );
    return {
      agentSessions: bootstrap.agentSessions,
      managedStatePath,
    };
  }

  private async commitBootstrapChanges(params: {
    readonly committer: DevelopmentTreeProductPartPrecodeCommitter;
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }): Promise<void> {
    await params.committer.commitDevelopmentTreeBootstrap({
      managedPaths: params.managedPaths,
      workspaceRoot: params.workspaceRoot,
    });
  }
}
