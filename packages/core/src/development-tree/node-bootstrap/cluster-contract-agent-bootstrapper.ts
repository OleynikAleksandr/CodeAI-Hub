import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ClusterContractPlanWriter,
  type ClusterContractPlanWriterResult,
} from "../cluster-workflow/cluster-contract-plan-writer";
import { createDevelopmentOrderUnlockStatePath } from "../product-part-workflow/development-order-plan-unlock-state";
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
    readonly providerId: string;
    readonly workspacePath: string;
  }) => Promise<{ readonly id: string } | null>;
}

export interface ClusterContractAgentBootstrapperOptions {
  readonly gateway: ClusterContractAgentSessionGateway;
  readonly providerId: string;
}

export interface ClusterContractAgentBootstrapRequest {
  readonly baseRef?: string;
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ClusterContractAgentBootstrapResult {
  readonly branchName: string;
  readonly clusterId: string;
  readonly plan: ClusterContractPlanWriterResult;
  readonly sessionId: string | null;
  readonly stage: string;
  readonly worktreePath: string;
}

interface UnlockStateNode {
  readonly clusterId?: string;
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

const createStage = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string =>
  `development_tree/materialized/product-parts/${params.partId}/clusters/${params.clusterId}`;

const readUnlockState = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<UnlockStateFile> => {
  const content = await readFile(
    path.join(
      params.workspaceRoot,
      createDevelopmentOrderUnlockStatePath(params)
    ),
    "utf8"
  );
  return JSON.parse(content) as UnlockStateFile;
};

const selectUnlockedClusterNodes = (
  state: UnlockStateFile,
  partId: string
): readonly Required<Pick<UnlockStateNode, "clusterId" | "partId">>[] =>
  (state.nodes ?? []).flatMap((node) =>
    node.kind === "cluster" &&
    node.status === "unlocked" &&
    node.partId === partId &&
    node.clusterId
      ? [{ clusterId: node.clusterId, partId: node.partId }]
      : []
  );

export class ClusterContractAgentBootstrapper {
  private readonly options: ClusterContractAgentBootstrapperOptions;
  private readonly planWriter: ClusterPlanWriter;
  private readonly worktreeCreator: ClusterWorktreeCreator;

  constructor(
    options: ClusterContractAgentBootstrapperOptions,
    dependencies: {
      readonly planWriter?: ClusterPlanWriter;
      readonly worktreeCreator?: ClusterWorktreeCreator;
    } = {}
  ) {
    this.options = options;
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
        })
      );
    }
    return results;
  }

  private async bootstrapCluster(
    request: ClusterContractAgentBootstrapRequest & {
      readonly clusterId: string;
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
    const stage = createStage(request);
    const session = await this.options.gateway.createSessionForWorkflow({
      context: {
        initiativeSlug: request.workspaceSlug,
        stage,
      },
      providerId: this.options.providerId,
      workspacePath: worktree.worktreePath,
    });
    return {
      branchName: worktree.branchName,
      clusterId: request.clusterId,
      plan,
      sessionId: session?.id ?? null,
      stage,
      worktreePath: worktree.worktreePath,
    };
  }
}
