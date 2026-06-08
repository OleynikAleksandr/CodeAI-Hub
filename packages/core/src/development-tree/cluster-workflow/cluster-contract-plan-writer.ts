import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ClusterContractPlanWriterRequest {
  readonly branchName: string;
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
  readonly worktreeRoot: string;
}

export interface ClusterContractPlanWriterResult {
  readonly absolutePath: string;
  readonly action: "created" | "unchanged";
  readonly relativePath: string;
}

const PLAN_STATE_END = "<!-- codeai-plan-state:end -->";
const PLAN_STATE_START = "<!-- codeai-plan-state:start -->";

const readExistingFile = async (absolutePath: string): Promise<string | null> =>
  readFile(absolutePath, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  });

const createTaskPrefix = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string =>
  `development-tree.cluster-contract.${params.partId}.${params.clusterId}`;

const createPlanPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly worktreeRoot: string;
}): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = path.posix.join(
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
  return {
    absolutePath: path.join(params.worktreeRoot, relativePath),
    relativePath,
  };
};

const createArtifactPath = (params: {
  readonly clusterId: string;
  readonly fileName: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/clusters/${params.clusterId}/${params.fileName}`;

const createPlanState = (params: ClusterContractPlanWriterRequest): string => {
  const taskPrefix = createTaskPrefix(params);
  return JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: `development-tree-cluster-contract-${params.partId}-${params.clusterId}`,
      branch: params.branchName,
      baseHead: "TBD",
      lastRecordedCommit: "TBD",
      planningSource: `cluster:${params.partId}/${params.clusterId}`,
      currentTaskId: `${taskPrefix}.phase1.contract-draft.task1`,
      expectedCommitMessage: `docs: draft ${params.clusterId} cluster contract`,
      debt: null,
    },
    null,
    2
  );
};

const renderPlan = (params: ClusterContractPlanWriterRequest): string => {
  const taskPrefix = createTaskPrefix(params);
  const specMd = createArtifactPath({
    ...params,
    fileName: "ClusterSpecification.draft.md",
  });
  const specJson = createArtifactPath({
    ...params,
    fileName: "ClusterSpecification.draft.json",
  });
  const facadeMd = createArtifactPath({
    ...params,
    fileName: "ClusterFacadeContract.draft.md",
  });
  const facadeJson = createArtifactPath({
    ...params,
    fileName: "ClusterFacadeContract.draft.json",
  });
  return [
    "# Cluster Contract Managed TODO Plan",
    "",
    PLAN_STATE_START,
    "```json",
    createPlanState(params),
    "```",
    PLAN_STATE_END,
    "",
    "## Managed Context",
    "",
    `- Product Part: ${params.partId}.`,
    `- Cluster: ${params.clusterId}.`,
    `- Worktree branch: ${params.branchName}.`,
    "- Core owns Git worktree creation, validation, commit, and merge.",
    "",
    "## Phase 1 - Cluster Contract Draft",
    "",
    "### Stream: Cluster Contract Sub-Agent Work",
    "",
    `1. [IN_PROGRESS] \`${taskPrefix}.phase1.contract-draft.task1\` Cluster sub-agent drafts specification and facade contract artifacts (scope: \`${specMd}, ${facadeMd}, ${specJson}, ${facadeJson}\`; expected commit: \`docs: draft ${params.clusterId} cluster contract\`).`,
    `2. [TODO] Git Commit: \`docs: draft ${params.clusterId} cluster contract\` (hash: TBD)`,
    "",
    "## Phase 2 - Cluster Contract Review",
    "",
    "### Stream: Lead Product Part Review",
    "",
    `3. [TODO] \`${taskPrefix}.phase2.contract-review.task1\` User or lead Product Part reviews accepted cluster contract artifacts before merge-ready handoff (scope: user/lead workflow; expected commit: \`docs: accept ${params.clusterId} cluster contract\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${params.clusterId} cluster contract\` (hash: TBD)`,
    "",
    "## Phase 3 - Merge Ready Handoff",
    "",
    "### Stream: Core Merge Boundary",
    "",
    `5. [TODO] \`${taskPrefix}.phase3.merge-ready.task1\` Core records the accepted cluster contract as merge-ready for lead Product Part coordination (scope: downstream workflow; expected commit: none).`,
    "",
    "## Phase Return - User Return And Revisions",
    "",
    "### Stream: User Return And Revisions",
    "",
    `6. [TODO] \`${taskPrefix}.phase-return.user-return.task1\` Cluster contract workflow is paused in an accepted or revision-ready state; user may return later with corrections (scope: user workflow; expected commit: none).`,
    "",
  ].join("\n");
};

export class ClusterContractPlanWriter {
  async writePlan(
    request: ClusterContractPlanWriterRequest
  ): Promise<ClusterContractPlanWriterResult> {
    const paths = createPlanPath(request);
    if ((await readExistingFile(paths.absolutePath)) !== null) {
      return { ...paths, action: "unchanged" };
    }
    await mkdir(path.dirname(paths.absolutePath), { recursive: true });
    await writeFile(paths.absolutePath, renderPlan(request), "utf8");
    return { ...paths, action: "created" };
  }
}
