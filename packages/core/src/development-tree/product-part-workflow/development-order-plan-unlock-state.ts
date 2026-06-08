type JsonRecord = Record<string, unknown>;

export interface DevelopmentOrderNodeModelBinding {
  readonly baseModelId?: string;
  readonly modelId: string;
  readonly providerId: string;
  readonly reasoningEffort?: string;
  readonly source?: string;
  readonly thinkingEnabled?: boolean;
  readonly thinkingLevel?: string;
}

export interface DevelopmentOrderUnlockStateRequest {
  readonly acceptedOrderPlanCommitHash: string;
  readonly partId: string;
  readonly plan: JsonRecord;
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentOrderUnlockNodeState {
  readonly branchName?: string;
  readonly clusterId?: string;
  readonly dependsOn: readonly string[];
  readonly id: string;
  readonly kind: string;
  readonly mergeCommitHash?: string;
  readonly mergedAt?: string;
  readonly modelBinding?: DevelopmentOrderNodeModelBinding;
  readonly moduleId?: string;
  readonly partId: string;
  readonly providerId?: string;
  readonly reason?: string;
  readonly sessionId?: string;
  readonly sessionStage?: string;
  readonly startedAt?: string;
  readonly status: "locked" | "merged" | "unlocked" | "waiting";
  readonly worktreePath?: string;
}

export interface DevelopmentOrderUnlockState {
  readonly acceptedOrderPlanCommitHash: string;
  readonly firstWaveId: string | null;
  readonly firstWaveUnlockNodeIds: readonly string[];
  readonly nodes: readonly DevelopmentOrderUnlockNodeState[];
  readonly partId: string;
  readonly schema: "codeai-development-order-unlock-state-v1";
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}

const asRecord = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const asStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === "string" && item.trim())
    ? value
    : [];

const readFirstWave = (
  plan: JsonRecord
): {
  readonly id: string | null;
  readonly unlockNodeIds: readonly string[];
} => {
  const firstWave = Array.isArray(plan.waves) ? asRecord(plan.waves[0]) : null;
  return {
    id: asString(firstWave?.id),
    unlockNodeIds: asStringArray(firstWave?.unlockNodeIds),
  };
};

const readLockedReasons = (plan: JsonRecord): ReadonlyMap<string, string> => {
  const reasons = new Map<string, string>();
  const lockedNodes = Array.isArray(plan.lockedNodes) ? plan.lockedNodes : [];
  for (const value of lockedNodes) {
    const locked = asRecord(value);
    const nodeId = asString(locked?.nodeId);
    const reason = asString(locked?.reason);
    if (nodeId && reason) {
      reasons.set(nodeId, reason);
    }
  }
  return reasons;
};

const resolveNodeStatus = (params: {
  readonly firstWaveUnlockNodeIds: ReadonlySet<string>;
  readonly id: string;
  readonly lockedReasons: ReadonlyMap<string, string>;
}): DevelopmentOrderUnlockNodeState["status"] => {
  if (params.lockedReasons.has(params.id)) {
    return "locked";
  }
  return params.firstWaveUnlockNodeIds.has(params.id) ? "unlocked" : "waiting";
};

const createNodeState = (params: {
  readonly firstWaveUnlockNodeIds: ReadonlySet<string>;
  readonly lockedReasons: ReadonlyMap<string, string>;
  readonly node: JsonRecord;
}): DevelopmentOrderUnlockNodeState | null => {
  const id = asString(params.node.id);
  const kind = asString(params.node.kind);
  const partId = asString(params.node.partId);
  if (!(id && kind && partId)) {
    return null;
  }
  const reason = params.lockedReasons.get(id);
  return {
    id,
    kind,
    partId,
    dependsOn: asStringArray(params.node.dependsOn),
    status: resolveNodeStatus({
      firstWaveUnlockNodeIds: params.firstWaveUnlockNodeIds,
      id,
      lockedReasons: params.lockedReasons,
    }),
    ...(asString(params.node.clusterId)
      ? { clusterId: asString(params.node.clusterId) ?? undefined }
      : {}),
    ...(asString(params.node.moduleId)
      ? { moduleId: asString(params.node.moduleId) ?? undefined }
      : {}),
    ...(reason ? { reason } : {}),
  };
};

export const createDevelopmentOrderUnlockStatePath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.unlock-state.json`;

export const createDevelopmentOrderUnlockState = (
  request: DevelopmentOrderUnlockStateRequest
): DevelopmentOrderUnlockState => {
  const firstWave = readFirstWave(request.plan);
  const firstWaveUnlockNodeIds = new Set(firstWave.unlockNodeIds);
  const lockedReasons = readLockedReasons(request.plan);
  const nodes = (Array.isArray(request.plan.nodes) ? request.plan.nodes : [])
    .flatMap((node) => {
      const record = asRecord(node);
      return record
        ? [
            createNodeState({
              firstWaveUnlockNodeIds,
              lockedReasons,
              node: record,
            }),
          ]
        : [];
    })
    .filter((node): node is DevelopmentOrderUnlockNodeState => Boolean(node));
  return {
    acceptedOrderPlanCommitHash: request.acceptedOrderPlanCommitHash,
    firstWaveId: firstWave.id,
    firstWaveUnlockNodeIds: firstWave.unlockNodeIds,
    nodes,
    partId: request.partId,
    schema: "codeai-development-order-unlock-state-v1",
    updatedAt: request.updatedAt,
    workspaceSlug: request.workspaceSlug,
  };
};

export const markDevelopmentOrderClusterMerged = (params: {
  readonly clusterId: string;
  readonly mergeCommitHash: string;
  readonly partId: string;
  readonly state: DevelopmentOrderUnlockState;
  readonly updatedAt: string;
}): DevelopmentOrderUnlockState => ({
  ...params.state,
  nodes: params.state.nodes.map((node) =>
    node.kind === "cluster" &&
    node.partId === params.partId &&
    node.clusterId === params.clusterId
      ? {
          ...node,
          mergeCommitHash: params.mergeCommitHash,
          mergedAt: params.updatedAt,
          status: "merged",
        }
      : node
  ),
  updatedAt: params.updatedAt,
});

export const markDevelopmentOrderClusterSessionStarted = (params: {
  readonly branchName: string;
  readonly clusterId: string;
  readonly modelBinding?: DevelopmentOrderNodeModelBinding | null;
  readonly partId: string;
  readonly providerId: string;
  readonly sessionId: string;
  readonly sessionStage: string;
  readonly state: DevelopmentOrderUnlockState;
  readonly updatedAt: string;
  readonly worktreePath: string;
}): DevelopmentOrderUnlockState => ({
  ...params.state,
  nodes: params.state.nodes.map((node) =>
    node.kind === "cluster" &&
    node.partId === params.partId &&
    node.clusterId === params.clusterId
      ? {
          ...node,
          branchName: params.branchName,
          modelBinding: params.modelBinding ?? undefined,
          providerId: params.providerId,
          sessionId: params.sessionId,
          sessionStage: params.sessionStage,
          startedAt: params.updatedAt,
          worktreePath: params.worktreePath,
        }
      : node
  ),
  updatedAt: params.updatedAt,
});
