import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import { DevelopmentTreeFilesystemStructuratorFacade } from "../../development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade";
import type { DevelopmentTreeNodeBootstrapScanResult } from "../../development-tree/node-bootstrap/development-tree-node-bootstrap-facade";
import type {
  DevelopmentTreeAgentSessionGateway,
  NodeAgentSessionBootstrapResult,
} from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
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
  readonly targetProductPartIds?: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentTreeProductPartPrecodeBootstrapResult {
  readonly agentSessions: readonly NodeAgentSessionBootstrapResult[];
  readonly expectedProductPartIds: readonly string[];
  readonly managedPaths: readonly string[];
  readonly skipped: boolean;
  readonly startedProductPartIds: readonly string[];
  readonly writtenDrafts: DevelopmentTreeNodeBootstrapScanResult["writtenDrafts"];
  readonly writtenProductPartPlans: DevelopmentTreeNodeBootstrapScanResult["writtenProductPartPlans"];
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

const withoutInitialTurnWait = (
  gateway: DevelopmentTreeAgentSessionGateway | undefined
): DevelopmentTreeAgentSessionGateway | undefined => {
  if (!gateway) {
    return undefined;
  }
  const { waitForInitialTurnSettled: _wait, ...rest } = gateway;
  return rest;
};

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

const createDraftStartedState = (params: {
  readonly partId: string;
  readonly providerId?: string | null;
  readonly session: NodeAgentSessionBootstrapResult | null;
}): string =>
  `${JSON.stringify(
    {
      partId: params.partId,
      providerId: params.providerId ?? null,
      reviewState: "draft_started",
      schema: "codeai-product-part-development-brief-managed-v1",
      sessionId: params.session?.sessionId ?? null,
      sessionStage: params.session?.stage ?? null,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  )}\n`;

export class DevelopmentTreeProductPartPrecodeBootstrap {
  private readonly filesystem =
    new DevelopmentTreeFilesystemStructuratorFacade();

  async bootstrap(
    params: DevelopmentTreeProductPartPrecodeBootstrapRequest
  ): Promise<DevelopmentTreeProductPartPrecodeBootstrapResult> {
    const progress = await readDiagramModulesProgressSnapshot({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (!progress?.leadProductPartId) {
      return {
        agentSessions: [],
        expectedProductPartIds: [],
        managedPaths: [],
        skipped: true,
        startedProductPartIds: [],
        writtenDrafts: [],
        writtenProductPartPlans: [],
      };
    }
    const leadProductPartId = progress.leadProductPartId;
    const productPartLeadershipOrder = resolveProductPartLeadershipOrder({
      leadProductPartId,
      plannedPartIds: progress.plannedPartIds,
      productPartLeadershipOrder: progress.productPartLeadershipOrder,
    });
    const targetProductPartIds = new Set(
      params.targetProductPartIds?.filter((partId) =>
        productPartLeadershipOrder.includes(partId)
      ) ?? []
    );
    const scheduledProductPartIds =
      targetProductPartIds.size > 0
        ? productPartLeadershipOrder.filter((partId) =>
            targetProductPartIds.has(partId)
          )
        : productPartLeadershipOrder;
    const snapshot = await new DevelopmentTreeStateFacade().currentSnapshot({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
      plannedPartIds: progress.plannedPartIds,
      generatedPartIds: progress.generatedPartIds,
      leadProductPartId,
      productPartLeadershipOrder,
    });
    const agentSessions: NodeAgentSessionBootstrapResult[] = [];
    const writtenDrafts: DevelopmentTreeNodeBootstrapScanResult["writtenDrafts"][number][] =
      [];
    const writtenProductPartPlans: DevelopmentTreeNodeBootstrapScanResult["writtenProductPartPlans"][number][] =
      [];
    const mainManagedStatePaths: string[] = [];
    await this.filesystem.materialize({
      snapshot,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const startupGateway = withoutInitialTurnWait(params.agentGateway);
    const bootstrapResults = await Promise.all(
      scheduledProductPartIds.map((partId) =>
        this.bootstrapProductPartDocumentation({
          ...params,
          agentGateway: startupGateway,
          leadProductPartId,
          partId,
          productPartLeadershipOrder,
        })
      )
    );
    for (const result of bootstrapResults) {
      agentSessions.push(...result.agentSessions);
      writtenDrafts.push(...result.writtenDrafts);
      writtenProductPartPlans.push(...result.writtenProductPartPlans);
      mainManagedStatePaths.push(...result.managedPaths);
    }
    const stillMissingProductPartIds = findMissingProductPartSessions({
      expectedPartIds: scheduledProductPartIds,
      sessions: agentSessions,
    });
    if (stillMissingProductPartIds.length > 0) {
      throw new Error(
        `Development Tree Product Part bootstrap did not start agent sessions for: ${stillMissingProductPartIds.join(", ")}`
      );
    }
    const waitForInitialTurnSettled =
      params.agentGateway?.waitForInitialTurnSettled;
    if (waitForInitialTurnSettled) {
      await Promise.all(
        agentSessions.flatMap((session) =>
          session.firstMessageSent && session.sessionId
            ? [waitForInitialTurnSettled(session.sessionId)]
            : []
        )
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
      agentSessions,
      expectedProductPartIds: scheduledProductPartIds,
      managedPaths,
      skipped: false,
      startedProductPartIds: collectStartedProductPartIds(agentSessions),
      writtenDrafts,
      writtenProductPartPlans,
    };
  }

  private async bootstrapProductPartDocumentation(
    params: DevelopmentTreeProductPartPrecodeBootstrapRequest & {
      readonly leadProductPartId: string;
      readonly partId: string;
      readonly productPartLeadershipOrder: readonly string[];
    }
  ): Promise<{
    readonly agentSessions: readonly NodeAgentSessionBootstrapResult[];
    readonly managedPaths: readonly string[];
    readonly writtenDrafts: DevelopmentTreeNodeBootstrapScanResult["writtenDrafts"];
    readonly writtenProductPartPlans: DevelopmentTreeNodeBootstrapScanResult["writtenProductPartPlans"];
  }> {
    const bootstrap = await bootstrapDevelopmentTreeProductPartAgents({
      agentGateway: params.agentGateway,
      providerId: params.providerId,
      leadProductPartId: params.leadProductPartId,
      productPartLeadershipOrder: params.productPartLeadershipOrder,
      targetProductPartIds: [params.partId],
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const managedStatePath = createProductPartManagedStatePath({
      partId: params.partId,
      workspaceSlug: params.workspaceSlug,
    });
    await writeText(
      params.workspaceRoot,
      managedStatePath,
      createDraftStartedState({
        partId: params.partId,
        providerId: params.providerId,
        session: findProductPartSession({
          partId: params.partId,
          sessions: bootstrap.agentSessions,
        }),
      })
    );
    return {
      agentSessions: bootstrap.agentSessions,
      managedPaths: [
        managedStatePath,
        ...bootstrap.writtenDrafts.map((draft) => draft.relativePath),
        ...bootstrap.writtenProductPartPlans.map((plan) => plan.relativePath),
      ],
      writtenDrafts: bootstrap.writtenDrafts,
      writtenProductPartPlans: bootstrap.writtenProductPartPlans,
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
