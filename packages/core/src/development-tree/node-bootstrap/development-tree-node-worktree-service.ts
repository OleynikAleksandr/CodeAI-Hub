import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface DevelopmentTreeClusterWorktreeRequest {
  readonly baseRef?: string;
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentTreeClusterWorktreeResult {
  readonly branchName: string;
  readonly nodeId: string;
  readonly worktreePath: string;
}

const sanitizeSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

const createBranchName = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  [
    "codex",
    "development-tree",
    sanitizeSegment(params.workspaceSlug),
    "product-parts",
    sanitizeSegment(params.partId),
    "clusters",
    sanitizeSegment(params.clusterId),
    "contract",
  ].join("/");

const createWorktreePath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    path.dirname(params.workspaceRoot),
    `${path.basename(params.workspaceRoot)}.worktrees`,
    sanitizeSegment(params.workspaceSlug),
    "product-parts",
    sanitizeSegment(params.partId),
    "clusters",
    sanitizeSegment(params.clusterId),
    "contract"
  );

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<void> => {
  await execFileAsync("git", [...args], { cwd: workspaceRoot });
};

export class DevelopmentTreeNodeWorktreeService {
  async createClusterContractWorktree(
    request: DevelopmentTreeClusterWorktreeRequest
  ): Promise<DevelopmentTreeClusterWorktreeResult> {
    const branchName = createBranchName(request);
    const worktreePath = createWorktreePath(request);
    await mkdir(path.dirname(worktreePath), { recursive: true });
    await runGit(request.workspaceRoot, [
      "worktree",
      "add",
      "-B",
      branchName,
      worktreePath,
      request.baseRef ?? "HEAD",
    ]);
    return {
      branchName,
      nodeId: `cluster:${request.partId}/${request.clusterId}`,
      worktreePath,
    };
  }
}
