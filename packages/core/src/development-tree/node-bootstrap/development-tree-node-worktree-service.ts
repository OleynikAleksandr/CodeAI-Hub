import { execFile } from "node:child_process";
import { mkdir, readdir, realpath, rm, stat } from "node:fs/promises";
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

export interface DevelopmentTreeProductPartWorktreeRequest {
  readonly baseRef?: string;
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentTreeProductPartWorktreeResult {
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

const createProductPartBranchName = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  [
    "codex",
    "development-tree",
    sanitizeSegment(params.workspaceSlug),
    "product-parts",
    sanitizeSegment(params.partId),
    "precode",
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

const createProductPartWorktreePath = (params: {
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
    "precode"
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

const canonicalizePath = async (absolutePath: string): Promise<string> =>
  path.resolve(await realpath(absolutePath).catch(() => absolutePath));

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

const createRegisteredWorktree = async (params: {
  readonly baseRef?: string;
  readonly branchName: string;
  readonly nodeId: string;
  readonly workspaceRoot: string;
  readonly worktreePath: string;
}): Promise<{
  readonly branchName: string;
  readonly nodeId: string;
  readonly worktreePath: string;
}> => {
  await mkdir(path.dirname(params.worktreePath), { recursive: true });
  await runGit(params.workspaceRoot, ["worktree", "prune"]);
  const expectedWorktreePath = await canonicalizePath(params.worktreePath);
  const registeredWorktreePaths = await Promise.all(
    (await listGitWorktreePaths(params.workspaceRoot)).map(canonicalizePath)
  );
  const registeredWorktree =
    registeredWorktreePaths.includes(expectedWorktreePath);
  if (registeredWorktree) {
    return {
      branchName: params.branchName,
      nodeId: params.nodeId,
      worktreePath: params.worktreePath,
    };
  }
  if (await pathExists(params.worktreePath)) {
    if (!(await isRuntimeOnlyStalePath(params.worktreePath))) {
      throw new Error(
        `Development Tree worktree path already exists and is not runtime-only: ${params.worktreePath}`
      );
    }
    await rm(params.worktreePath, { force: true, recursive: true });
  }
  await runGit(params.workspaceRoot, [
    "worktree",
    "add",
    "-B",
    params.branchName,
    params.worktreePath,
    params.baseRef ?? "HEAD",
  ]);
  return {
    branchName: params.branchName,
    nodeId: params.nodeId,
    worktreePath: params.worktreePath,
  };
};

export class DevelopmentTreeNodeWorktreeService {
  async createClusterContractWorktree(
    request: DevelopmentTreeClusterWorktreeRequest
  ): Promise<DevelopmentTreeClusterWorktreeResult> {
    const branchName = createBranchName(request);
    const worktreePath = createWorktreePath(request);
    return await createRegisteredWorktree({
      baseRef: request.baseRef,
      branchName,
      nodeId: `cluster:${request.partId}/${request.clusterId}`,
      workspaceRoot: request.workspaceRoot,
      worktreePath,
    });
  }

  async createProductPartPrecodeWorktree(
    request: DevelopmentTreeProductPartWorktreeRequest
  ): Promise<DevelopmentTreeProductPartWorktreeResult> {
    const branchName = createProductPartBranchName(request);
    const worktreePath = createProductPartWorktreePath(request);
    return await createRegisteredWorktree({
      baseRef: request.baseRef,
      branchName,
      nodeId: `product-part:${request.partId}`,
      workspaceRoot: request.workspaceRoot,
      worktreePath,
    });
  }
}
