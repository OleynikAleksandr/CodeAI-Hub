import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Session } from "../../session-manager";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";
import { isWithinPath } from "./product-part-worktree-cleanup";
import type { ProductPartClearDeps } from "./workflow-step-clear-product-part-restart";

const execFileAsync = promisify(execFile);
const CLUSTER_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)\/clusters\/([^/]+)$/u;
const CLUSTER_MODULE_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)\/clusters\/([^/]+)\/modules\/([^/]+)$/u;
const STANDALONE_MODULE_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)\/modules\/([^/]+)$/u;

export interface DevelopmentTreeNodeClearTarget {
  readonly codeWorkspacePath?: string | null;
  readonly kind: "development_tree_node";
  readonly workflowPath: string;
}

export interface DevelopmentTreeNodeClearRequest {
  readonly target: DevelopmentTreeNodeClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentTreeNodeClearResult {
  readonly clearCommitHash: string;
  readonly deletedContinuityPaths: readonly string[];
  readonly deletedSessionIds: readonly string[];
  readonly deletedWorktreePaths: readonly string[];
  readonly nodeId: string;
}

interface ParsedDevelopmentTreeNode {
  readonly clusterId?: string;
  readonly moduleId?: string;
  readonly nodeId: string;
  readonly partId: string;
  readonly subtreePrefix: string;
}

interface UnlockStateNode {
  readonly branchName?: string;
  readonly clusterId?: string;
  readonly id?: string;
  readonly kind?: string;
  readonly mergeCommitHash?: string;
  readonly mergedAt?: string;
  readonly modelBinding?: unknown;
  readonly moduleId?: string;
  readonly partId?: string;
  readonly providerId?: string;
  readonly reason?: string;
  readonly sessionId?: string;
  readonly sessionStage?: string;
  readonly startedAt?: string;
  readonly status?: string;
  readonly worktreePath?: string;
  readonly [key: string]: unknown;
}

interface UnlockStateFile {
  readonly nodes?: readonly UnlockStateNode[];
  readonly [key: string]: unknown;
}

const parseDevelopmentTreeNode = (
  workflowPath: string
): ParsedDevelopmentTreeNode | null => {
  const clusterMatch = workflowPath.match(CLUSTER_STAGE_RE);
  if (clusterMatch?.[1] && clusterMatch[2]) {
    return {
      clusterId: clusterMatch[2],
      nodeId: `cluster:${clusterMatch[1]}/${clusterMatch[2]}`,
      partId: clusterMatch[1],
      subtreePrefix: `module:${clusterMatch[1]}/${clusterMatch[2]}/`,
    };
  }
  const clusterModuleMatch = workflowPath.match(CLUSTER_MODULE_STAGE_RE);
  if (
    clusterModuleMatch?.[1] &&
    clusterModuleMatch[2] &&
    clusterModuleMatch[3]
  ) {
    return {
      clusterId: clusterModuleMatch[2],
      moduleId: clusterModuleMatch[3],
      nodeId: `module:${clusterModuleMatch[1]}/${clusterModuleMatch[2]}/${clusterModuleMatch[3]}`,
      partId: clusterModuleMatch[1],
      subtreePrefix: "",
    };
  }
  const standaloneModuleMatch = workflowPath.match(STANDALONE_MODULE_STAGE_RE);
  if (standaloneModuleMatch?.[1] && standaloneModuleMatch[2]) {
    return {
      moduleId: standaloneModuleMatch[2],
      nodeId: `standalone-module:${standaloneModuleMatch[1]}/${standaloneModuleMatch[2]}`,
      partId: standaloneModuleMatch[1],
      subtreePrefix: "",
    };
  }
  return null;
};

const createWorktreesRoot = (workspacePath: string): string =>
  path.join(
    path.dirname(workspacePath),
    `${path.basename(workspacePath)}.worktrees`
  );

const createUnlockStatePath = (params: {
  readonly partId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "workflow",
    "managed",
    "development-tree-product-parts",
    `${params.partId}.unlock-state.json`
  );

const readUnlockState = async (filePath: string): Promise<UnlockStateFile> => {
  const raw = await readFile(filePath, "utf8").catch(() => null);
  return raw ? (JSON.parse(raw) as UnlockStateFile) : { nodes: [] };
};

const clearNodeProjection = (node: UnlockStateNode): UnlockStateNode => {
  const {
    branchName: _branchName,
    mergeCommitHash: _mergeCommitHash,
    mergedAt: _mergedAt,
    modelBinding: _modelBinding,
    providerId: _providerId,
    reason: _reason,
    sessionId: _sessionId,
    sessionStage: _sessionStage,
    startedAt: _startedAt,
    worktreePath: _worktreePath,
    ...rest
  } = node;
  return { ...rest, status: "waiting" };
};

const nodeMatchesTarget = (
  node: UnlockStateNode,
  target: ParsedDevelopmentTreeNode
): boolean =>
  node.id === target.nodeId ||
  Boolean(target.subtreePrefix && node.id?.startsWith(target.subtreePrefix));

const writeClearedUnlockState = async (params: {
  readonly parsedNode: ParsedDevelopmentTreeNode;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly relativePath: string;
  readonly worktreePaths: readonly string[];
}> => {
  const absolutePath = createUnlockStatePath({
    partId: params.parsedNode.partId,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  const state = await readUnlockState(absolutePath);
  const worktreePaths = (state.nodes ?? [])
    .filter((node) => nodeMatchesTarget(node, params.parsedNode))
    .map((node) => node.worktreePath)
    .filter((value): value is string => Boolean(value));
  const nodes = (state.nodes ?? []).map((node) =>
    nodeMatchesTarget(node, params.parsedNode)
      ? clearNodeProjection(node)
      : node
  );
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    `${JSON.stringify({ ...state, nodes }, null, 2)}\n`,
    "utf8"
  );
  return {
    relativePath: path.relative(params.workspacePath, absolutePath),
    worktreePaths,
  };
};

const listGitWorktreePaths = async (
  workspacePath: string
): Promise<readonly string[]> => {
  const result = await execFileAsync(
    "git",
    ["worktree", "list", "--porcelain"],
    { cwd: workspacePath }
  ).catch(() => ({ stdout: "" }));
  return result.stdout
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length).trim())
    .filter(Boolean);
};

const pathExists = async (absolutePath: string): Promise<boolean> => {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

const createFallbackWorktreePaths = (params: {
  readonly parsedNode: ParsedDevelopmentTreeNode;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): readonly string[] => {
  if (!params.parsedNode.clusterId) {
    return [];
  }
  const productPartRoot = path.join(
    createWorktreesRoot(params.workspacePath),
    params.workspaceSlug,
    "product-parts",
    params.parsedNode.partId
  );
  return [
    path.join(
      productPartRoot,
      "cluster-contracts",
      params.parsedNode.clusterId
    ),
    path.join(
      productPartRoot,
      "clusters",
      params.parsedNode.clusterId,
      "contract"
    ),
  ];
};

const removeEmptyParents = async (params: {
  readonly startPath: string;
  readonly stopPath: string;
}): Promise<void> => {
  let currentPath = params.startPath;
  const stopPath = path.resolve(params.stopPath);
  while (isWithinPath(stopPath, currentPath)) {
    if ((await readdir(currentPath).catch(() => [])).length > 0) {
      break;
    }
    await rmdir(currentPath).catch(() => null);
    if (path.resolve(currentPath) === stopPath) {
      break;
    }
    currentPath = path.dirname(currentPath);
  }
};

const runGitWorktreeRemove = async (params: {
  readonly registeredPath: string;
  readonly workspacePath: string;
}): Promise<void> => {
  try {
    await execFileAsync(
      "git",
      ["worktree", "remove", "--force", params.registeredPath],
      { cwd: params.workspacePath }
    );
    return;
  } catch {
    await execFileAsync(
      "git",
      ["worktree", "remove", "--force", "--force", params.registeredPath],
      { cwd: params.workspacePath }
    );
  }
};

const cleanupWorktreesRoot = async (params: {
  readonly workspacePath: string;
  readonly worktreesRoot: string;
}): Promise<void> => {
  await execFileAsync("git", ["worktree", "prune"], {
    cwd: params.workspacePath,
  }).catch(() => null);
  const hasRegisteredWorktree = (
    await listGitWorktreePaths(params.workspacePath)
  ).some((worktreePath) => isWithinPath(params.worktreesRoot, worktreePath));
  if (!hasRegisteredWorktree) {
    await rm(params.worktreesRoot, { force: true, recursive: true });
  }
};

const removeNodeWorktrees = async (params: {
  readonly parsedNode: ParsedDevelopmentTreeNode;
  readonly recordedWorktreePaths: readonly string[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const worktreesRoot = createWorktreesRoot(params.workspacePath);
  const candidates = new Set([
    ...params.recordedWorktreePaths,
    ...createFallbackWorktreePaths(params),
  ]);
  const registered = await listGitWorktreePaths(params.workspacePath);
  const removed: string[] = [];
  for (const candidate of candidates) {
    if (!isWithinPath(worktreesRoot, candidate)) {
      continue;
    }
    const registeredPath = registered.find(
      (worktreePath) => path.resolve(worktreePath) === path.resolve(candidate)
    );
    if (registeredPath) {
      await runGitWorktreeRemove({
        registeredPath,
        workspacePath: params.workspacePath,
      }).catch(async () => {
        await rm(registeredPath, { force: true, recursive: true });
      });
    } else if (await pathExists(candidate)) {
      await rm(candidate, { force: true, recursive: true });
    } else {
      continue;
    }
    removed.push(path.relative(params.workspacePath, candidate));
    await removeEmptyParents({
      startPath: path.dirname(candidate),
      stopPath: worktreesRoot,
    });
  }
  await cleanupWorktreesRoot({
    workspacePath: params.workspacePath,
    worktreesRoot,
  });
  return removed;
};

const sessionMatchesTarget = (
  session: Session,
  params: {
    readonly parsedNode: ParsedDevelopmentTreeNode;
    readonly target: DevelopmentTreeNodeClearTarget;
    readonly worktreePaths: readonly string[];
    readonly workspaceSlug: string;
  }
): boolean => {
  const stage = session.stage ?? "";
  return (
    session.initiativeSlug === params.workspaceSlug &&
    (stage === params.target.workflowPath ||
      stage.startsWith(`${params.target.workflowPath}/`) ||
      params.worktreePaths.some((worktreePath) =>
        isWithinPath(worktreePath, session.workspacePath)
      ))
  );
};

const clearRuntimeSessions = (
  request: DevelopmentTreeNodeClearRequest,
  parsedNode: ParsedDevelopmentTreeNode,
  worktreePaths: readonly string[],
  deps: ProductPartClearDeps
): readonly string[] => {
  const deletedSessionIds: string[] = [];
  for (const session of deps.sessionManager.listSessions()) {
    if (
      sessionMatchesTarget(session, {
        parsedNode,
        target: request.target,
        worktreePaths,
        workspaceSlug: request.workspaceSlug,
      }) &&
      deps.sessionManager.deleteSession(session.id)
    ) {
      deletedSessionIds.push(session.id);
    }
  }
  return deletedSessionIds;
};

const clearContinuity = async (params: {
  readonly target: DevelopmentTreeNodeClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const continuityRoot = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "continuity"
  );
  const targetRoot = path.join(continuityRoot, params.target.workflowPath);
  await rm(targetRoot, { force: true, recursive: true });
  await mkdir(continuityRoot, { recursive: true });
  const indexPath = path.join(continuityRoot, "index.json");
  const raw = await readFile(indexPath, "utf8").catch(() => null);
  if (raw) {
    const parsed = JSON.parse(raw) as {
      readonly entries?: readonly Record<string, unknown>[];
      readonly [key: string]: unknown;
    };
    const entries = (parsed.entries ?? []).filter((entry) => {
      const stage = typeof entry.stage === "string" ? entry.stage : "";
      return !(
        stage === params.target.workflowPath ||
        stage.startsWith(`${params.target.workflowPath}/`)
      );
    });
    await writeFile(
      indexPath,
      `${JSON.stringify({ ...parsed, entries }, null, 2)}\n`,
      "utf8"
    );
  }
  return [path.relative(params.workspacePath, targetRoot)];
};

export const clearDevelopmentTreeNode = async (
  request: DevelopmentTreeNodeClearRequest,
  deps: ProductPartClearDeps
): Promise<DevelopmentTreeNodeClearResult> => {
  const parsedNode = parseDevelopmentTreeNode(request.target.workflowPath);
  if (!parsedNode) {
    throw new Error("Unsupported Development Tree node clear target");
  }
  const stateUpdate = await writeClearedUnlockState({
    parsedNode,
    workspacePath: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const worktreePaths = [
    ...stateUpdate.worktreePaths,
    ...createFallbackWorktreePaths({
      parsedNode,
      workspacePath: request.workspacePath,
      workspaceSlug: request.workspaceSlug,
    }),
  ];
  const deletedSessionIds = clearRuntimeSessions(
    request,
    parsedNode,
    worktreePaths,
    deps
  );
  const deletedContinuityPaths = await clearContinuity({
    target: request.target,
    workspacePath: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const deletedWorktreePaths = await removeNodeWorktrees({
    parsedNode,
    recordedWorktreePaths: stateUpdate.worktreePaths,
    workspacePath: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const commit = await new WorkflowBoundaryGit().commit({
    allowEmpty: true,
    commitMessage: `chore: clear development tree node ${parsedNode.nodeId}`,
    paths: [
      stateUpdate.relativePath,
      path.join(".codeai-hub", request.workspaceSlug, "continuity"),
    ],
    workspaceRoot: request.workspacePath,
  });
  return {
    clearCommitHash: commit.hash,
    deletedContinuityPaths,
    deletedSessionIds,
    deletedWorktreePaths,
    nodeId: parsedNode.nodeId,
  };
};
