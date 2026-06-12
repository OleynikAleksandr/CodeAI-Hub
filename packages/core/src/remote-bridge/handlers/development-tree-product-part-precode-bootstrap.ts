import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import { DevelopmentTreeFilesystemStructuratorFacade } from "../../development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade";
import type {
  DevelopmentTreeAgentSessionGateway,
  NodeAgentSessionBootstrapResult,
} from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import { bootstrapDevelopmentTreeProductPartAgents } from "./development-tree-product-part-agent-bootstrap";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";

const execFileAsync = promisify(execFile);

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

const forceStageRelativePaths = async (params: {
  readonly paths: readonly string[];
  readonly workspaceRoot: string;
}): Promise<void> => {
  const paths = await filterExistingRelativePaths(params);
  if (paths.length === 0) {
    return;
  }
  await execFileAsync("git", ["add", "-f", "--", ...paths], {
    cwd: params.workspaceRoot,
  });
};

export class DevelopmentTreeProductPartPrecodeBootstrap {
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
    await new DevelopmentTreeFilesystemStructuratorFacade().materialize({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
      snapshot,
    });
    const bootstrap = await bootstrapDevelopmentTreeProductPartAgents({
      agentGateway: params.agentGateway,
      providerId: params.providerId,
      leadProductPartId: progress.leadProductPartId,
      productPartLeadershipOrder,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const agentSessions = [...bootstrap.agentSessions];
    const writtenDrafts = [...bootstrap.writtenDrafts];
    const writtenProductPartPlans = [...bootstrap.writtenProductPartPlans];
    const missingProductPartIds = findMissingProductPartSessions({
      expectedPartIds: productPartLeadershipOrder,
      sessions: agentSessions,
    });
    if (missingProductPartIds.length > 0) {
      const recovery = await bootstrapDevelopmentTreeProductPartAgents({
        agentGateway: params.agentGateway,
        providerId: params.providerId,
        leadProductPartId: progress.leadProductPartId,
        productPartLeadershipOrder,
        targetProductPartIds: missingProductPartIds,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      agentSessions.push(...recovery.agentSessions);
      writtenDrafts.push(...recovery.writtenDrafts);
      writtenProductPartPlans.push(...recovery.writtenProductPartPlans);
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
    await forceStageRelativePaths({
      workspaceRoot: params.workspaceRoot,
      paths: writtenProductPartPlans.map((plan) => plan.relativePath),
    });
    const managedPaths = await filterExistingRelativePaths({
      workspaceRoot: params.workspaceRoot,
      paths: uniquePaths([
        ...writtenDrafts.map((draft) => draft.relativePath),
        ...writtenProductPartPlans.map((plan) => plan.relativePath),
        "doc/TODO/stages/development-tree/",
        `.codeai-hub/${params.workspaceSlug}/continuity/`,
        `.codeai-hub/${params.workspaceSlug}/runtime/sessions/`,
      ]),
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
