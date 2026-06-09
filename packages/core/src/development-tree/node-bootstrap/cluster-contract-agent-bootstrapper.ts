import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionModelBinding } from "../../session-model-binding";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";
import {
  ClusterContractPlanWriter,
  type ClusterContractPlanWriterResult,
} from "../cluster-workflow/cluster-contract-plan-writer";
import { ClusterContractPromptBuilder } from "../cluster-workflow/cluster-contract-prompt-builder";
import {
  createDevelopmentOrderUnlockStatePath,
  type DevelopmentOrderContractSeed,
  type DevelopmentOrderUnlockState,
  markDevelopmentOrderClusterSessionStarted,
} from "../product-part-workflow/development-order-plan-unlock-state";
import {
  type DevelopmentTreeClusterWorktreeRequest,
  type DevelopmentTreeClusterWorktreeResult,
  DevelopmentTreeNodeWorktreeService,
} from "./development-tree-node-worktree-service";

export interface ClusterContractAgentSessionGateway {
  readonly createSessionForWorkflow: (options: {
    readonly context: {
      readonly initiativeSlug: string;
      readonly stage: string;
    };
    readonly inheritedModelBinding?: SessionModelBinding | null;
    readonly providerId: string;
    readonly workspacePath: string;
  }) => Promise<{ readonly id: string } | null>;
  readonly handleMessage?: (
    sessionId: string,
    content: string
  ) => Promise<void>;
}

export interface ClusterContractAgentBootstrapperOptions {
  readonly gateway: ClusterContractAgentSessionGateway;
  readonly providerId: string;
}

export interface ClusterContractAgentBootstrapRequest {
  readonly baseRef?: string;
  readonly inheritedModelBinding?: SessionModelBinding | null;
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ClusterContractAgentBootstrapResult {
  readonly branchName: string;
  readonly clusterId: string;
  readonly firstMessageSent: boolean;
  readonly plan: ClusterContractPlanWriterResult;
  readonly sessionId: string | null;
  readonly stage: string;
  readonly worktreePath: string;
}

interface UnlockStateNode {
  readonly clusterId?: string;
  readonly contractSeed?: DevelopmentOrderContractSeed;
  readonly kind?: string;
  readonly partId?: string;
  readonly status?: string;
}

interface UnlockStateFile {
  readonly acceptedOrderPlanCommitHash?: string;
  readonly nodes?: readonly UnlockStateNode[];
}

interface ClusterWorktreeCreator {
  readonly createClusterContractWorktree: (
    request: DevelopmentTreeClusterWorktreeRequest
  ) => Promise<DevelopmentTreeClusterWorktreeResult>;
}

interface ClusterPlanWriter {
  readonly writePlan: (request: {
    readonly branchName: string;
    readonly clusterId: string;
    readonly partId: string;
    readonly worktreeRoot: string;
    readonly workspaceSlug: string;
  }) => Promise<ClusterContractPlanWriterResult>;
}

interface ClusterPlanCommitter {
  readonly commit: (request: {
    readonly commitMessage: string;
    readonly paths: readonly string[];
    readonly workspaceRoot: string;
  }) => Promise<unknown>;
}

const createStage = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string =>
  `development_tree/materialized/product-parts/${params.partId}/clusters/${params.clusterId}`;

const createProductPartArtifactPath = (params: {
  readonly fileName: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${params.fileName}`;

const readOptionalText = (
  workspaceRoot: string,
  relativePath: string
): Promise<string | null> =>
  readFile(path.join(workspaceRoot, relativePath), "utf8").catch(() => null);

const readUnlockState = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DevelopmentOrderUnlockState & UnlockStateFile> => {
  const content = await readFile(
    path.join(
      params.workspaceRoot,
      createDevelopmentOrderUnlockStatePath(params)
    ),
    "utf8"
  );
  return JSON.parse(content) as DevelopmentOrderUnlockState & UnlockStateFile;
};

const writeUnlockState = async (params: {
  readonly partId: string;
  readonly state: DevelopmentOrderUnlockState;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await writeFile(
    path.join(
      params.workspaceRoot,
      createDevelopmentOrderUnlockStatePath(params)
    ),
    `${JSON.stringify(params.state, null, 2)}\n`,
    "utf8"
  );
};

const selectUnlockedClusterNodes = (
  state: UnlockStateFile,
  partId: string
): readonly (Required<Pick<UnlockStateNode, "clusterId" | "partId">> & {
  readonly contractSeed?: DevelopmentOrderContractSeed;
})[] =>
  (state.nodes ?? []).flatMap((node) =>
    node.kind === "cluster" &&
    node.status === "unlocked" &&
    node.partId === partId &&
    node.clusterId
      ? [
          {
            clusterId: node.clusterId,
            contractSeed: node.contractSeed,
            partId: node.partId,
          },
        ]
      : []
  );

export class ClusterContractAgentBootstrapper {
  private readonly planCommitter: ClusterPlanCommitter;
  private readonly options: ClusterContractAgentBootstrapperOptions;
  private readonly planWriter: ClusterPlanWriter;
  private readonly promptBuilder = new ClusterContractPromptBuilder();
  private readonly worktreeCreator: ClusterWorktreeCreator;

  constructor(
    options: ClusterContractAgentBootstrapperOptions,
    dependencies: {
      readonly planCommitter?: ClusterPlanCommitter;
      readonly planWriter?: ClusterPlanWriter;
      readonly worktreeCreator?: ClusterWorktreeCreator;
    } = {}
  ) {
    this.options = options;
    this.planCommitter =
      dependencies.planCommitter ?? new WorkflowBoundaryGit();
    this.planWriter =
      dependencies.planWriter ?? new ClusterContractPlanWriter();
    this.worktreeCreator =
      dependencies.worktreeCreator ?? new DevelopmentTreeNodeWorktreeService();
  }

  async bootstrapFirstWave(
    request: ClusterContractAgentBootstrapRequest
  ): Promise<readonly ClusterContractAgentBootstrapResult[]> {
    const unlockState = await readUnlockState(request);
    const clusters = selectUnlockedClusterNodes(unlockState, request.partId);
    const results: ClusterContractAgentBootstrapResult[] = [];
    for (const cluster of clusters) {
      results.push(
        await this.bootstrapCluster({
          ...request,
          baseRef:
            request.baseRef ??
            unlockState.acceptedOrderPlanCommitHash ??
            "HEAD",
          clusterId: cluster.clusterId,
          contractSeed: cluster.contractSeed,
        })
      );
    }
    return results;
  }

  private async bootstrapCluster(
    request: ClusterContractAgentBootstrapRequest & {
      readonly clusterId: string;
      readonly contractSeed?: DevelopmentOrderContractSeed;
    }
  ): Promise<ClusterContractAgentBootstrapResult> {
    const worktree =
      await this.worktreeCreator.createClusterContractWorktree(request);
    const plan = await this.planWriter.writePlan({
      branchName: worktree.branchName,
      clusterId: request.clusterId,
      partId: request.partId,
      worktreeRoot: worktree.worktreePath,
      workspaceSlug: request.workspaceSlug,
    });
    await this.commitInitialPlanIfCreated({
      clusterId: request.clusterId,
      plan,
      worktreePath: worktree.worktreePath,
    });
    const stage = createStage(request);
    const session = await this.options.gateway.createSessionForWorkflow({
      context: {
        initiativeSlug: request.workspaceSlug,
        stage,
      },
      inheritedModelBinding: request.inheritedModelBinding ?? null,
      providerId: this.options.providerId,
      workspacePath: worktree.worktreePath,
    });
    if (session?.id) {
      const unlockState = await readUnlockState(request);
      await writeUnlockState({
        ...request,
        state: markDevelopmentOrderClusterSessionStarted({
          branchName: worktree.branchName,
          clusterId: request.clusterId,
          modelBinding: request.inheritedModelBinding ?? null,
          partId: request.partId,
          providerId: this.options.providerId,
          sessionId: session.id,
          sessionStage: stage,
          state: unlockState,
          updatedAt: new Date().toISOString(),
          worktreePath: worktree.worktreePath,
        }),
      });
      await this.commitStartedSessionState(request);
    }
    const firstMessageSent = await this.sendFirstMessageIfPossible({
      clusterId: request.clusterId,
      contractSeed: request.contractSeed,
      partId: request.partId,
      sessionId: session?.id ?? null,
      worktreePath: worktree.worktreePath,
      workspaceSlug: request.workspaceSlug,
    });
    return {
      branchName: worktree.branchName,
      clusterId: request.clusterId,
      firstMessageSent,
      plan,
      sessionId: session?.id ?? null,
      stage,
      worktreePath: worktree.worktreePath,
    };
  }

  private async commitInitialPlanIfCreated(params: {
    readonly clusterId: string;
    readonly plan: ClusterContractPlanWriterResult;
    readonly worktreePath: string;
  }): Promise<void> {
    if (params.plan.action !== "created") {
      return;
    }
    await this.planCommitter.commit({
      commitMessage: `chore: initialize ${params.clusterId} cluster contract workflow`,
      paths: [params.plan.relativePath],
      workspaceRoot: params.worktreePath,
    });
  }

  private async commitStartedSessionState(
    request: ClusterContractAgentBootstrapRequest & {
      readonly clusterId: string;
    }
  ): Promise<void> {
    await this.planCommitter.commit({
      commitMessage: `chore: record ${request.clusterId} cluster contract session`,
      paths: [createDevelopmentOrderUnlockStatePath(request)],
      workspaceRoot: request.workspaceRoot,
    });
  }

  private async sendFirstMessageIfPossible(params: {
    readonly clusterId: string;
    readonly contractSeed?: DevelopmentOrderContractSeed;
    readonly partId: string;
    readonly sessionId: string | null;
    readonly worktreePath: string;
    readonly workspaceSlug: string;
  }): Promise<boolean> {
    if (!(params.sessionId && this.options.gateway.handleMessage)) {
      return false;
    }
    const prompt = this.promptBuilder.buildPrompt({
      applicationSkeletonMap: await readOptionalText(
        params.worktreePath,
        `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json`
      ),
      clusterId: params.clusterId,
      contractSeed: params.contractSeed,
      orderPlanJson:
        (await readOptionalText(
          params.worktreePath,
          createProductPartArtifactPath({
            fileName: "DevelopmentOrderPlan.draft.json",
            partId: params.partId,
            workspaceSlug: params.workspaceSlug,
          })
        )) ?? "{}",
      orderPlanMarkdown:
        (await readOptionalText(
          params.worktreePath,
          createProductPartArtifactPath({
            fileName: "DevelopmentOrderPlan.draft.md",
            partId: params.partId,
            workspaceSlug: params.workspaceSlug,
          })
        )) ?? "",
      partId: params.partId,
      productPartBrief:
        (await readOptionalText(
          params.worktreePath,
          createProductPartArtifactPath({
            fileName: "ProductPartDevelopmentBrief.draft.md",
            partId: params.partId,
            workspaceSlug: params.workspaceSlug,
          })
        )) ?? "",
      qualityGatesContract: await readOptionalText(
        params.worktreePath,
        `.codeai-hub/${params.workspaceSlug}/quality_gates/quality-gates.json`
      ),
      workspaceSlug: params.workspaceSlug,
    });
    await this.options.gateway.handleMessage(params.sessionId, prompt);
    return true;
  }
}
