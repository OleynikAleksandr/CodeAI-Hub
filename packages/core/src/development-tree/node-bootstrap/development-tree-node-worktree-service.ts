import { execFile } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
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
    "cluster-contracts",
    sanitizeSegment(params.clusterId)
  );

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<void> => {
  await execFileAsync("git", [...args], { cwd: workspaceRoot });
};

const readGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout;
};

const listGitWorktreePaths = async (
  workspaceRoot: string
): Promise<readonly string[]> =>
  (await readGit(workspaceRoot, ["worktree", "list", "--porcelain"]))
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length).trim())
    .filter(Boolean);

const pathExists = async (absolutePath: string): Promise<boolean> =>
  Boolean(await stat(absolutePath).catch(() => null));

const collectRelativeFiles = async (
  root: string,
  current: string = root
): Promise<readonly string[]> => {
  const entries = await readdir(current, { withFileTypes: true }).catch(
    () => []
  );
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRelativeFiles(root, absolutePath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(path.relative(root, absolutePath));
    }
  }
  return files;
};

const isRuntimeOnlyStalePath = async (
  worktreePath: string
): Promise<boolean> => {
  const files = await collectRelativeFiles(worktreePath);
  return files.every((file) => {
    const normalized = file.replace(/\\/gu, "/");
    return (
      normalized === ".DS_Store" || normalized.startsWith(".codeai-hub/state/")
    );
  });
};

export class DevelopmentTreeNodeWorktreeService {
  async createClusterContractWorktree(
    request: DevelopmentTreeClusterWorktreeRequest
  ): Promise<DevelopmentTreeClusterWorktreeResult> {
    const branchName = createBranchName(request);
    const worktreePath = createWorktreePath(request);
    await mkdir(path.dirname(worktreePath), { recursive: true });
    await runGit(request.workspaceRoot, ["worktree", "prune"]);
    const registeredWorktree = (
      await listGitWorktreePaths(request.workspaceRoot)
    )
      .map((entry) => path.resolve(entry))
      .includes(path.resolve(worktreePath));
    if (registeredWorktree) {
      return {
        branchName,
        nodeId: `cluster:${request.partId}/${request.clusterId}`,
        worktreePath,
      };
    }
    if (await pathExists(worktreePath)) {
      if (!(await isRuntimeOnlyStalePath(worktreePath))) {
        throw new Error(
          `Development Tree worktree path already exists and is not runtime-only: ${worktreePath}`
        );
      }
      await rm(worktreePath, { force: true, recursive: true });
    }
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
