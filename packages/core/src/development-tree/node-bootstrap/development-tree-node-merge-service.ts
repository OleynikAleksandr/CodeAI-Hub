import { execFile } from "node:child_process";
import { mkdir, realpath, writeFile } from "node:fs/promises";
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
  readonly boundaryCommitHash: string;
  readonly boundaryPath: string;
  readonly copiedPaths: readonly string[];
  readonly sourceHead: string;
  readonly targetWorkspaceRoot: string;
}

const createBoundaryPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-clusters/${params.partId}/${params.clusterId}.boundary-accepted.json`;

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

  async recordAcceptedClusterBoundary(
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
    await assertClean(this.git, request.sourceWorkspaceRoot);
    await assertClean(this.git, targetWorkspaceRoot);
    const boundaryPath = createBoundaryPath(request);
    await this.writeBoundaryAccepted({
      ...request,
      boundaryPath,
      sourceHead,
      targetWorkspaceRoot,
    });
    const boundaryCommit = await this.git.commit({
      commitMessage: `docs: record ${request.clusterId} boundary acceptance`,
      paths: [boundaryPath],
      workspaceRoot: targetWorkspaceRoot,
    });
    return {
      boundaryCommitHash: boundaryCommit.hash,
      boundaryPath,
      copiedPaths: [],
      sourceHead,
      targetWorkspaceRoot,
    };
  }

  private async writeBoundaryAccepted(
    request: ClusterContractMergeRequest & {
      readonly boundaryPath: string;
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
          schema: "codeai-development-tree-node-boundary-accepted-v1",
          acceptedAt: new Date().toISOString(),
          clusterId: request.clusterId,
          copiedPaths: [],
          nodeId: `cluster:${request.partId}/${request.clusterId}`,
          partId: request.partId,
          sourceHead: request.sourceHead,
          sourceWorkspaceRoot: request.sourceWorkspaceRoot,
          targetWorkspaceRoot: request.targetWorkspaceRoot,
          worktreeRemainsActive: true,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }
}
