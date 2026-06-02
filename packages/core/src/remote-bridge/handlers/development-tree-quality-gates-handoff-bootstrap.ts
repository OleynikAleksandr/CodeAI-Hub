import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import { DevelopmentTreeFilesystemStructuratorFacade } from "../../development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade";
import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { SessionManager } from "../../session-manager";
import { bootstrapDevelopmentTreeProductPartAgents } from "./development-tree-product-part-agent-bootstrap";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";

const execFileAsync = promisify(execFile);

const uniquePaths = (paths: readonly string[]): readonly string[] => [
  ...new Set(paths.filter((entry) => entry.trim().length > 0)),
];

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

export class DevelopmentTreeQualityGatesHandoffBootstrap {
  async bootstrap(params: {
    readonly agentGateway?: DevelopmentTreeAgentSessionGateway;
    readonly sessionId: string;
    readonly sessionManager: Pick<SessionManager, "getSession">;
    readonly stagePlan: Pick<
      QualityGatesStagePlanController,
      "commitDevelopmentTreeBootstrap"
    >;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const session = params.sessionManager.getSession(params.sessionId);
    const progress = await readDiagramModulesProgressSnapshot({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (!(session && progress?.leadProductPartId)) {
      return;
    }
    const productPartLeadershipOrder = progress.productPartLeadershipOrder
      ?.length
      ? progress.productPartLeadershipOrder
      : progress.plannedPartIds;
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
      providerId: session.providerId,
      leadProductPartId: progress.leadProductPartId,
      productPartLeadershipOrder,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    await forceStageRelativePaths({
      workspaceRoot: params.workspaceRoot,
      paths: bootstrap.writtenProductPartPlans.map((plan) => plan.relativePath),
    });
    await params.stagePlan.commitDevelopmentTreeBootstrap({
      workspaceRoot: params.workspaceRoot,
      managedPaths: await filterExistingRelativePaths({
        workspaceRoot: params.workspaceRoot,
        paths: uniquePaths([
          ...bootstrap.writtenDrafts.map((draft) => draft.relativePath),
          ...bootstrap.writtenProductPartPlans.map((plan) => plan.relativePath),
          "doc/TODO/stages/development-tree/",
          `.codeai-hub/${params.workspaceSlug}/continuity/`,
          `.codeai-hub/${params.workspaceSlug}/runtime/sessions/`,
        ]),
      }),
    });
  }
}
