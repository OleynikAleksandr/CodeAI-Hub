import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DevelopmentTreeClusterNode,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
  DevelopmentTreeSnapshotRequest,
  DevelopmentTreeUserGate,
} from "./development-tree-types";

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
}

const BRIEF_FILE_NAME = "ProductPartDevelopmentBrief.draft.md";
const CLUSTER_CONTRACT_FILE_NAMES = [
  "ClusterSpecification.draft.md",
  "ClusterSpecification.draft.json",
  "ClusterFacadeContract.draft.md",
  "ClusterFacadeContract.draft.json",
] as const;
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const INPUT_LOCK_REASON = "Another user gate is active.";
const ORDER_PLAN_FILE_NAME = "DevelopmentOrderPlan.draft.md";
const ORDER_PLAN_JSON_FILE_NAME = "DevelopmentOrderPlan.draft.json";
const PLAN_STATE_END = "<!-- codeai-plan-state:end -->";
const PLAN_STATE_START = "<!-- codeai-plan-state:start -->";

const readExistingFile = async (absolutePath: string): Promise<string | null> =>
  readFile(absolutePath, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  });

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const createBriefReviewTaskId = (partId: string): string =>
  `development-tree.product-part.${partId}.phase2.brief-review.task1`;

const createBriefReviewCommitMessage = (partId: string): string =>
  `docs: accept ${partId} product part development brief`;

const createOrderPlanReviewTaskId = (partId: string): string =>
  `development-tree.product-part.${partId}.phase4.order-plan-review.task1`;

const createClusterReviewTaskId = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string =>
  `development-tree.cluster-contract.${params.partId}.${params.clusterId}.phase2.contract-review.task1`;

const createClusterReviewCommitMessage = (clusterId: string): string =>
  `docs: accept ${clusterId} cluster contract`;

const createProductPartPlanPath = (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
}): string =>
  path.join(
    params.workspaceRoot,
    "doc",
    "TODO",
    "stages",
    "development-tree",
    "product-parts",
    params.partId,
    "todo-plan.md"
  );

const createClusterPlanPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceRoot: string;
}): string =>
  path.join(
    params.workspaceRoot,
    "doc",
    "TODO",
    "stages",
    "development-tree",
    "product-parts",
    params.partId,
    "clusters",
    params.clusterId,
    "todo-plan.md"
  );

const createBriefArtifactPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${BRIEF_FILE_NAME}`;

const createProductPartArtifactPath = (params: {
  readonly fileName: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${params.fileName}`;

const createClusterArtifactPath = (params: {
  readonly clusterId: string;
  readonly fileName: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/clusters/${params.clusterId}/${params.fileName}`;

const parsePlanState = (content: string): ManagedPlanState | null => {
  const rawBlock = content.split(PLAN_STATE_START)[1]?.split(PLAN_STATE_END)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return null;
  }
  const parsed = JSON.parse(json) as unknown;
  if (!(parsed && typeof parsed === "object" && !Array.isArray(parsed))) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  return {
    currentTaskId: readNonEmptyString(record.currentTaskId),
    expectedCommitMessage: readNonEmptyString(record.expectedCommitMessage),
  };
};

const readPlanState = async (
  absolutePlanPath: string
): Promise<ManagedPlanState | null> => {
  const content = await readExistingFile(absolutePlanPath);
  return content ? parsePlanState(content) : null;
};

const hasPendingBriefReview = (
  state: ManagedPlanState | null,
  partId: string
): state is ManagedPlanState =>
  state?.currentTaskId === createBriefReviewTaskId(partId) &&
  state.expectedCommitMessage === createBriefReviewCommitMessage(partId);

const hasPendingOrderPlanReview = (
  state: ManagedPlanState | null,
  partId: string
): state is ManagedPlanState =>
  state?.currentTaskId === createOrderPlanReviewTaskId(partId) &&
  state.expectedCommitMessage === "docs: accept lead development order plan";

const hasPendingClusterContractReview = (
  state: ManagedPlanState | null,
  params: { readonly clusterId: string; readonly partId: string }
): state is ManagedPlanState =>
  state?.currentTaskId === createClusterReviewTaskId(params) &&
  state.expectedCommitMessage ===
    createClusterReviewCommitMessage(params.clusterId);

const createReviewOrder = (
  parts: readonly DevelopmentTreePartNode[],
  leadProductPartId?: string | null
): readonly DevelopmentTreePartNode[] => {
  if (!leadProductPartId) {
    return parts;
  }
  const leadPart = parts.find((part) => part.id === leadProductPartId);
  const secondaryParts = parts.filter((part) => part.id !== leadProductPartId);
  return leadPart ? [...secondaryParts, leadPart] : parts;
};

const createBriefGate = (params: {
  readonly isActive: boolean;
  readonly part: DevelopmentTreePartNode;
  readonly state: ManagedPlanState;
  readonly workspaceSlug: string;
}): DevelopmentTreeUserGate => ({
  artifactPaths: [
    createBriefArtifactPath({
      partId: params.part.id,
      workspaceSlug: params.workspaceSlug,
    }),
  ],
  currentTaskId: params.state.currentTaskId ?? undefined,
  expectedCommitMessage: params.state.expectedCommitMessage ?? undefined,
  id: `product-part:${params.part.id}/brief-review`,
  inputLocked: !params.isActive,
  inputLockReason: params.isActive ? undefined : INPUT_LOCK_REASON,
  nodeId: `product-part:${params.part.id}`,
  nodeKind: "product_part",
  partId: params.part.id,
  reason: params.isActive
    ? "product_part_brief_review_required"
    : "waiting_for_user_gate_cursor",
  session: params.part.session,
  status: params.isActive ? "active" : "queued",
  workflowPath: params.part.workflowPath,
});

const createOrderPlanGate = (params: {
  readonly isActive: boolean;
  readonly part: DevelopmentTreePartNode;
  readonly state: ManagedPlanState;
  readonly workspaceSlug: string;
}): DevelopmentTreeUserGate => ({
  artifactPaths: [
    createProductPartArtifactPath({
      fileName: ORDER_PLAN_FILE_NAME,
      partId: params.part.id,
      workspaceSlug: params.workspaceSlug,
    }),
    createProductPartArtifactPath({
      fileName: ORDER_PLAN_JSON_FILE_NAME,
      partId: params.part.id,
      workspaceSlug: params.workspaceSlug,
    }),
  ],
  currentTaskId: params.state.currentTaskId ?? undefined,
  expectedCommitMessage: params.state.expectedCommitMessage ?? undefined,
  id: `product-part:${params.part.id}/order-plan-review`,
  inputLocked: !params.isActive,
  inputLockReason: params.isActive ? undefined : INPUT_LOCK_REASON,
  nodeId: `product-part:${params.part.id}`,
  nodeKind: "product_part",
  partId: params.part.id,
  reason: params.isActive
    ? "product_part_order_plan_review_required"
    : "waiting_for_user_gate_cursor",
  session: params.part.session,
  status: params.isActive ? "active" : "queued",
  workflowPath: params.part.workflowPath,
});

const createClusterGate = (params: {
  readonly cluster: DevelopmentTreeClusterNode;
  readonly isActive: boolean;
  readonly partId: string;
  readonly state: ManagedPlanState;
  readonly workspaceSlug: string;
}): DevelopmentTreeUserGate => ({
  artifactPaths: CLUSTER_CONTRACT_FILE_NAMES.map((fileName) =>
    createClusterArtifactPath({
      clusterId: params.cluster.id,
      fileName,
      partId: params.partId,
      workspaceSlug: params.workspaceSlug,
    })
  ),
  clusterId: params.cluster.id,
  currentTaskId: params.state.currentTaskId ?? undefined,
  expectedCommitMessage: params.state.expectedCommitMessage ?? undefined,
  id: `cluster:${params.partId}/${params.cluster.id}/contract-review`,
  inputLocked: !params.isActive,
  inputLockReason: params.isActive ? undefined : INPUT_LOCK_REASON,
  nodeId: `cluster:${params.partId}/${params.cluster.id}`,
  nodeKind: "cluster",
  partId: params.partId,
  reason: params.isActive
    ? "cluster_contract_review_required"
    : "waiting_for_user_gate_cursor",
  session: params.cluster.session,
  status: params.isActive ? "active" : "queued",
  workflowPath: params.cluster.workflowPath,
});

const readPendingReviewGates = async (
  snapshot: DevelopmentTreeSnapshot,
  params: DevelopmentTreeSnapshotRequest
): Promise<readonly DevelopmentTreeUserGate[]> => {
  const orderedParts = createReviewOrder(
    snapshot.parts,
    snapshot.leadProductPartId ?? params.leadProductPartId
  );
  const gates: DevelopmentTreeUserGate[] = [];
  for (const part of orderedParts) {
    const state = await readPlanState(
      createProductPartPlanPath({
        partId: part.id,
        workspaceRoot: params.workspaceRoot,
      })
    );
    if (!hasPendingBriefReview(state, part.id)) {
      continue;
    }
    gates.push(
      createBriefGate({
        isActive: gates.length === 0,
        part,
        state,
        workspaceSlug: params.workspaceSlug,
      })
    );
  }
  for (const part of orderedParts) {
    const state = await readPlanState(
      createProductPartPlanPath({
        partId: part.id,
        workspaceRoot: params.workspaceRoot,
      })
    );
    if (!hasPendingOrderPlanReview(state, part.id)) {
      continue;
    }
    gates.push(
      createOrderPlanGate({
        isActive: gates.length === 0,
        part,
        state,
        workspaceSlug: params.workspaceSlug,
      })
    );
  }
  for (const part of snapshot.parts) {
    for (const cluster of part.clusters) {
      const state = await readPlanState(
        createClusterPlanPath({
          clusterId: cluster.id,
          partId: part.id,
          workspaceRoot: params.workspaceRoot,
        })
      );
      if (
        !hasPendingClusterContractReview(state, {
          clusterId: cluster.id,
          partId: part.id,
        })
      ) {
        continue;
      }
      gates.push(
        createClusterGate({
          cluster,
          isActive: gates.length === 0,
          partId: part.id,
          state,
          workspaceSlug: params.workspaceSlug,
        })
      );
    }
  }
  return gates;
};

const attachPartGates = (
  parts: readonly DevelopmentTreePartNode[],
  gates: readonly DevelopmentTreeUserGate[]
): readonly DevelopmentTreePartNode[] => {
  const gatesByPartId = new Map(
    gates
      .filter((gate) => gate.nodeKind === "product_part")
      .map((gate) => [gate.partId, gate])
  );
  return parts.map((part) => {
    const userGate = gatesByPartId.get(part.id);
    return userGate ? { ...part, userGate } : part;
  });
};

export const applyDevelopmentTreeUserGateCursor = async (
  snapshot: DevelopmentTreeSnapshot,
  params: DevelopmentTreeSnapshotRequest
): Promise<DevelopmentTreeSnapshot> => {
  const gates = await readPendingReviewGates(snapshot, params);
  if (gates.length === 0) {
    return snapshot;
  }
  const [activeUserGate, ...queuedUserGates] = gates;
  return {
    ...snapshot,
    activeUserGate,
    parts: attachPartGates(snapshot.parts, gates),
    queuedUserGates,
  };
};
