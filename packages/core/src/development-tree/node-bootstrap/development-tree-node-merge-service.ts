import { execFile } from "node:child_process";
import { copyFile, mkdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

const execFileAsync = promisify(execFile);
const WORKTREE_BLOCK_RE = /\n\s*\n/u;

interface WorktreeEntry {
  readonly branch: string | null;
  readonly worktree: string;
}

export interface ClusterContractMergeRequest {
  readonly clusterId: string;
  readonly partId: string;
  readonly sourceWorkspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ClusterContractMergeResult {
  readonly boundaryPath: string;
  readonly copiedPaths: readonly string[];
  readonly mergeCommitHash: string;
  readonly sourceHead: string;
  readonly targetWorkspaceRoot: string;
}

const createArtifactPath = (params: {
  readonly clusterId: string;
  readonly fileName: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/clusters/${params.clusterId}/${params.fileName}`;

const createReviewResultPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-clusters/${params.partId}/${params.clusterId}.review-result.json`;

const createBoundaryPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-clusters/${params.partId}/${params.clusterId}.merge-boundary.json`;

const requiredCopyPaths = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): readonly string[] => [
  createArtifactPath({ ...params, fileName: "ClusterSpecification.draft.md" }),
  createArtifactPath({
    ...params,
    fileName: "ClusterSpecification.draft.json",
  }),
  createArtifactPath({ ...params, fileName: "ClusterFacadeContract.draft.md" }),
  createArtifactPath({
    ...params,
    fileName: "ClusterFacadeContract.draft.json",
  }),
  createReviewResultPath(params),
];

const parseWorktreeEntries = (output: string): readonly WorktreeEntry[] =>
  output
    .split(WORKTREE_BLOCK_RE)
    .map((block) => {
      const lines = block.split("\n");
      const worktree = lines
        .find((line) => line.startsWith("worktree "))
        ?.slice("worktree ".length);
      if (!worktree) {
        return null;
      }
      const branch =
        lines
          .find((line) => line.startsWith("branch "))
          ?.slice("branch ".length) ?? null;
      return { branch, worktree };
    })
    .filter((entry): entry is WorktreeEntry => Boolean(entry));

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const assertClean = async (
  git: WorkflowBoundaryGit,
  workspaceRoot: string
): Promise<void> => {
  const status = await git.statusPorcelain(workspaceRoot);
  if (status.length > 0) {
    throw new Error(
      [
        "Development Tree node merge requires a clean Git worktree.",
        `Workspace: ${workspaceRoot}`,
        ...status.map((line) => `- ${line}`),
      ].join("\n")
    );
  }
};

const pathExists = async (absolutePath: string): Promise<boolean> =>
  Boolean(await stat(absolutePath).catch(() => null));

const canonicalPath = async (value: string): Promise<string> =>
  await realpath(value).catch(() => path.resolve(value));

const resolveTargetWorkspaceRoot = async (
  sourceWorkspaceRoot: string
): Promise<string> => {
  const entries = parseWorktreeEntries(
    await runGit(sourceWorkspaceRoot, ["worktree", "list", "--porcelain"])
  );
  const sourceRoot = await canonicalPath(sourceWorkspaceRoot);
  let fallbackTarget: string | null = null;
  for (const entry of entries) {
    if ((await canonicalPath(entry.worktree)) === sourceRoot) {
      continue;
    }
    if (entry.branch === "refs/heads/main") {
      return entry.worktree;
    }
    fallbackTarget ??= entry.worktree;
  }
  return fallbackTarget ?? sourceWorkspaceRoot;
};

export class DevelopmentTreeNodeMergeService {
  private readonly git = new WorkflowBoundaryGit();

  async mergeAcceptedClusterContract(
    request: ClusterContractMergeRequest
  ): Promise<ClusterContractMergeResult> {
    const targetWorkspaceRoot = await resolveTargetWorkspaceRoot(
      request.sourceWorkspaceRoot
    );
    const sourceHead = await runGit(request.sourceWorkspaceRoot, [
      "rev-parse",
      "--short",
      "HEAD",
    ]);
    const sourceRoot = await canonicalPath(request.sourceWorkspaceRoot);
    const targetRoot = await canonicalPath(targetWorkspaceRoot);
    await assertClean(this.git, request.sourceWorkspaceRoot);
    await assertClean(this.git, targetWorkspaceRoot);
    const copiedPaths =
      sourceRoot === targetRoot
        ? []
        : await this.copyManagedNodeFiles(request, targetWorkspaceRoot);
    const boundaryPath = createBoundaryPath(request);
    await this.writeMergeBoundary({
      ...request,
      boundaryPath,
      copiedPaths,
      sourceHead,
      targetWorkspaceRoot,
    });
    const mergeCommit = await this.git.commit({
      commitMessage: `docs: merge ${request.clusterId} cluster contract`,
      paths: [...copiedPaths, boundaryPath],
      workspaceRoot: targetWorkspaceRoot,
    });
    return {
      boundaryPath,
      copiedPaths,
      mergeCommitHash: mergeCommit.hash,
      sourceHead,
      targetWorkspaceRoot,
    };
  }

  private async copyManagedNodeFiles(
    request: ClusterContractMergeRequest,
    targetWorkspaceRoot: string
  ): Promise<readonly string[]> {
    const paths = requiredCopyPaths(request);
    for (const relativePath of paths) {
      const sourcePath = path.join(request.sourceWorkspaceRoot, relativePath);
      if (!(await pathExists(sourcePath))) {
        throw new Error(
          `Development Tree node merge missing source artifact: ${relativePath}`
        );
      }
      const targetPath = path.join(targetWorkspaceRoot, relativePath);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
    return paths;
  }

  private async writeMergeBoundary(
    request: ClusterContractMergeRequest & {
      readonly boundaryPath: string;
      readonly copiedPaths: readonly string[];
      readonly sourceHead: string;
      readonly targetWorkspaceRoot: string;
    }
  ): Promise<void> {
    const absolutePath = path.join(
      request.targetWorkspaceRoot,
      request.boundaryPath
    );
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(
      absolutePath,
      `${JSON.stringify(
        {
          schema: "codeai-development-tree-node-merge-boundary-v1",
          clusterId: request.clusterId,
          copiedPaths: request.copiedPaths,
          mergedAt: new Date().toISOString(),
          nodeId: `cluster:${request.partId}/${request.clusterId}`,
          partId: request.partId,
          sourceHead: request.sourceHead,
          sourceWorkspaceRoot: request.sourceWorkspaceRoot,
          targetWorkspaceRoot: request.targetWorkspaceRoot,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }
}
