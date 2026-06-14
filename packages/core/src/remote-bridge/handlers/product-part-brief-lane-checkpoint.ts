import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

interface LaneCheckpointDecision {
  readonly providerId?: string | null;
  readonly sessionId?: string | null;
  readonly sessionStage?: string | null;
  readonly [key: string]: unknown;
}

const WORKTREES_SUFFIX = ".worktrees";

const readJsonRecord = async (
  workspaceRoot: string,
  relativePath: string
): Promise<Record<string, unknown> | null> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!((await stat(absolutePath).catch(() => null))?.isFile() ?? false)) {
    return null;
  }
  const parsed = JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
};

const readText = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createBriefPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/ProductPartDevelopmentBrief.draft.md`;

const createOrderPlanPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/DevelopmentOrderPlan.draft.md`;

const createOrderPlanJsonPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/DevelopmentOrderPlan.draft.json`;

const createManagedDecisionPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createPlanPath = (partId: string): string =>
  `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;

const createUnlockStatePath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.unlock-state.json`;

const resolveMainWorkspaceRoot = (laneWorkspaceRoot: string): string | null => {
  const resolved = path.resolve(laneWorkspaceRoot);
  const segments = resolved.split(path.sep);
  const worktreesIndex = segments.findIndex((segment) =>
    segment.endsWith(WORKTREES_SUFFIX)
  );
  if (worktreesIndex < 0) {
    return null;
  }
  const worktreesSegment = segments[worktreesIndex];
  const mainSegment = worktreesSegment.slice(0, -WORKTREES_SUFFIX.length);
  if (!mainSegment) {
    return null;
  }
  return path.join(path.sep, ...segments.slice(1, worktreesIndex), mainSegment);
};

export const checkpointAcceptedProductPartBriefFromLane = async (params: {
  readonly acceptedCommitHash: string;
  readonly acceptedCommitMessage: string;
  readonly laneWorkspaceRoot: string;
  readonly partId: string;
  readonly sessionId: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly checkpointCommitHash: string | null;
  readonly checkpointed: boolean;
  readonly workspaceRoot: string;
}> => {
  const mainWorkspaceRoot = resolveMainWorkspaceRoot(params.laneWorkspaceRoot);
  if (!mainWorkspaceRoot) {
    return {
      checkpointCommitHash: null,
      checkpointed: false,
      workspaceRoot: params.laneWorkspaceRoot,
    };
  }
  const briefPath = createBriefPath(params);
  const decisionPath = createManagedDecisionPath(params);
  const [briefContent, laneDecision, mainDecision] = await Promise.all([
    readText(params.laneWorkspaceRoot, briefPath),
    readJsonRecord(params.laneWorkspaceRoot, decisionPath),
    readJsonRecord(mainWorkspaceRoot, decisionPath),
  ]);
  const decision = {
    ...(mainDecision ?? {}),
    ...((laneDecision ?? {}) as LaneCheckpointDecision),
    acceptedCommitHash: params.acceptedCommitHash,
    acceptedCommitMessage: params.acceptedCommitMessage,
    acceptedLaneCommitHash: params.acceptedCommitHash,
    checkpointState: "accepted_checkpoint",
    partId: params.partId,
    reviewState: "accepted",
    schema: "codeai-product-part-development-brief-managed-v1",
    sessionId:
      typeof laneDecision?.sessionId === "string"
        ? laneDecision.sessionId
        : params.sessionId,
    updatedAt: new Date().toISOString(),
    worktreePath:
      typeof mainDecision?.worktreePath === "string"
        ? mainDecision.worktreePath
        : params.laneWorkspaceRoot,
  };
  await writeText(mainWorkspaceRoot, briefPath, briefContent);
  await writeText(
    mainWorkspaceRoot,
    decisionPath,
    `${JSON.stringify(decision, null, 2)}\n`
  );
  const commit = await new WorkflowBoundaryGit().commit({
    commitMessage: params.acceptedCommitMessage,
    paths: [briefPath, decisionPath],
    workspaceRoot: mainWorkspaceRoot,
  });
  return {
    checkpointCommitHash: commit.noStagedChanges ? null : commit.hash,
    checkpointed: !commit.noStagedChanges,
    workspaceRoot: mainWorkspaceRoot,
  };
};

export const checkpointAcceptedProductPartOrderPlanFromLane = async (params: {
  readonly acceptedCommitHash: string;
  readonly acceptedCommitMessage: string;
  readonly laneWorkspaceRoot: string;
  readonly partId: string;
  readonly sessionId: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly checkpointCommitHash: string | null;
  readonly checkpointed: boolean;
  readonly workspaceRoot: string;
}> => {
  const mainWorkspaceRoot = resolveMainWorkspaceRoot(params.laneWorkspaceRoot);
  if (!mainWorkspaceRoot) {
    return {
      checkpointCommitHash: null,
      checkpointed: false,
      workspaceRoot: params.laneWorkspaceRoot,
    };
  }
  const orderPlanPath = createOrderPlanPath(params);
  const orderPlanJsonPath = createOrderPlanJsonPath(params);
  const decisionPath = createManagedDecisionPath(params);
  const planPath = createPlanPath(params.partId);
  const unlockStatePath = createUnlockStatePath(params);
  const [
    orderPlan,
    orderPlanJson,
    planText,
    unlockState,
    laneDecision,
    mainDecision,
  ] = await Promise.all([
    readText(params.laneWorkspaceRoot, orderPlanPath),
    readText(params.laneWorkspaceRoot, orderPlanJsonPath),
    readText(params.laneWorkspaceRoot, planPath),
    readText(params.laneWorkspaceRoot, unlockStatePath),
    readJsonRecord(params.laneWorkspaceRoot, decisionPath),
    readJsonRecord(mainWorkspaceRoot, decisionPath),
  ]);
  const decision = {
    ...(mainDecision ?? {}),
    ...((laneDecision ?? {}) as LaneCheckpointDecision),
    acceptedCommitHash: params.acceptedCommitHash,
    acceptedCommitMessage: params.acceptedCommitMessage,
    acceptedLaneCommitHash: params.acceptedCommitHash,
    checkpointState: "accepted_order_plan_checkpoint",
    orderPlanCommitHash: params.acceptedCommitHash,
    partId: params.partId,
    reviewState: "order_plan_accepted",
    schema: "codeai-development-order-plan-managed-v1",
    sessionId:
      typeof laneDecision?.sessionId === "string"
        ? laneDecision.sessionId
        : params.sessionId,
    updatedAt: new Date().toISOString(),
    worktreePath:
      typeof mainDecision?.worktreePath === "string"
        ? mainDecision.worktreePath
        : params.laneWorkspaceRoot,
  };
  await writeText(mainWorkspaceRoot, orderPlanPath, orderPlan);
  await writeText(mainWorkspaceRoot, orderPlanJsonPath, orderPlanJson);
  await writeText(mainWorkspaceRoot, planPath, planText);
  await writeText(mainWorkspaceRoot, unlockStatePath, unlockState);
  await writeText(
    mainWorkspaceRoot,
    decisionPath,
    `${JSON.stringify(decision, null, 2)}\n`
  );
  const commit = await new WorkflowBoundaryGit().commit({
    commitMessage: params.acceptedCommitMessage,
    paths: [
      orderPlanPath,
      orderPlanJsonPath,
      planPath,
      unlockStatePath,
      decisionPath,
    ],
    workspaceRoot: mainWorkspaceRoot,
  });
  return {
    checkpointCommitHash: commit.noStagedChanges ? null : commit.hash,
    checkpointed: !commit.noStagedChanges,
    workspaceRoot: mainWorkspaceRoot,
  };
};
