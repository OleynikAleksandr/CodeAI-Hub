import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
  DevelopmentTreeSnapshotRequest,
  DevelopmentTreeUserGate,
} from "./development-tree-types";

interface ProductPartPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
}

const BRIEF_FILE_NAME = "ProductPartDevelopmentBrief.draft.md";
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const INPUT_LOCK_REASON = "Another user gate is active.";
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

const createPlanPath = (params: {
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

const createBriefArtifactPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${BRIEF_FILE_NAME}`;

const parsePlanState = (content: string): ProductPartPlanState | null => {
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

const readPlanState = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
}): Promise<ProductPartPlanState | null> => {
  const content = await readExistingFile(createPlanPath(params));
  return content ? parsePlanState(content) : null;
};

const hasPendingBriefReview = (
  state: ProductPartPlanState | null,
  partId: string
): state is ProductPartPlanState =>
  state?.currentTaskId === createBriefReviewTaskId(partId) &&
  state.expectedCommitMessage === createBriefReviewCommitMessage(partId);

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

const createGate = (params: {
  readonly isActive: boolean;
  readonly part: DevelopmentTreePartNode;
  readonly state: ProductPartPlanState;
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

const readPendingBriefReviewGates = async (
  snapshot: DevelopmentTreeSnapshot,
  params: DevelopmentTreeSnapshotRequest
): Promise<readonly DevelopmentTreeUserGate[]> => {
  const orderedParts = createReviewOrder(
    snapshot.parts,
    snapshot.leadProductPartId ?? params.leadProductPartId
  );
  const gates: DevelopmentTreeUserGate[] = [];
  for (const part of orderedParts) {
    const state = await readPlanState({
      partId: part.id,
      workspaceRoot: params.workspaceRoot,
    });
    if (!hasPendingBriefReview(state, part.id)) {
      continue;
    }
    gates.push(
      createGate({
        isActive: gates.length === 0,
        part,
        state,
        workspaceSlug: params.workspaceSlug,
      })
    );
  }
  return gates;
};

const attachPartGates = (
  parts: readonly DevelopmentTreePartNode[],
  gates: readonly DevelopmentTreeUserGate[]
): readonly DevelopmentTreePartNode[] => {
  const gatesByPartId = new Map(gates.map((gate) => [gate.partId, gate]));
  return parts.map((part) => {
    const userGate = gatesByPartId.get(part.id);
    return userGate ? { ...part, userGate } : part;
  });
};

export const applyDevelopmentTreeUserGateCursor = async (
  snapshot: DevelopmentTreeSnapshot,
  params: DevelopmentTreeSnapshotRequest
): Promise<DevelopmentTreeSnapshot> => {
  const gates = await readPendingBriefReviewGates(snapshot, params);
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
