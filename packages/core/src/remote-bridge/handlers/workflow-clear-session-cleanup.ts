import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const PROVIDER_NATIVE_SESSION_EXTENSIONS = new Set([".json", ".jsonl"]);

export interface WorkflowProviderNativeSessionRef {
  readonly providerId: string;
  readonly providerSessionId: string;
}

export interface WorkflowRuntimeSessionCleanupResult {
  readonly deletedProviderNativeSessionPaths: readonly string[];
  readonly deletedUnifiedSessionPaths: readonly string[];
}

const collectFiles = async (root: string): Promise<readonly string[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
};

const providerHomeRoot = (params: {
  readonly providerId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "runtime",
    "providers",
    params.providerId,
    "home"
  );

const isProviderNativeSessionPath = (params: {
  readonly filePath: string;
  readonly providerId: string;
}): boolean => {
  const normalized = params.filePath.replace(/\\/gu, "/");
  if (params.providerId === "codex") {
    return normalized.includes("/sessions/");
  }
  if (params.providerId === "claude") {
    return normalized.includes("/.claude/projects/");
  }
  return false;
};

const collectSessionMatchIds = (params: {
  readonly deletedSessionIds: readonly string[];
  readonly providerNativeSessions: readonly WorkflowProviderNativeSessionRef[];
}): ReadonlySet<string> =>
  new Set([
    ...params.deletedSessionIds,
    ...params.providerNativeSessions.map(
      (session) => session.providerSessionId
    ),
  ]);

const pruneProviderNativeSessions = async (params: {
  readonly providerNativeSessions: readonly WorkflowProviderNativeSessionRef[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const removedPaths: string[] = [];
  const uniqueSessions = new Map<string, WorkflowProviderNativeSessionRef>();
  for (const session of params.providerNativeSessions) {
    uniqueSessions.set(
      `${session.providerId}:${session.providerSessionId}`,
      session
    );
  }

  for (const session of uniqueSessions.values()) {
    const homeRoot = providerHomeRoot({
      providerId: session.providerId,
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    });
    for (const filePath of await collectFiles(homeRoot)) {
      if (
        PROVIDER_NATIVE_SESSION_EXTENSIONS.has(path.extname(filePath)) &&
        isProviderNativeSessionPath({
          filePath,
          providerId: session.providerId,
        }) &&
        path.basename(filePath).includes(session.providerSessionId)
      ) {
        await rm(filePath, { force: true });
        removedPaths.push(path.relative(params.workspacePath, filePath));
      }
    }
  }
  return removedPaths;
};

const unifiedSessionFileMatches = (params: {
  readonly filePath: string;
  readonly matchIds: ReadonlySet<string>;
}): boolean => {
  const fileName = path.basename(params.filePath);
  for (const id of params.matchIds) {
    if (fileName.includes(id)) {
      return true;
    }
  }
  return false;
};

const pruneUnifiedSessionFiles = async (params: {
  readonly deletedSessionIds: readonly string[];
  readonly providerNativeSessions: readonly WorkflowProviderNativeSessionRef[];
  readonly unifiedSessionFileNameFragments?: readonly string[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const matchIds = collectSessionMatchIds(params);
  if (matchIds.size === 0) {
    return [];
  }
  const sessionsRoot = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "runtime",
    "sessions"
  );
  const deletedPaths: string[] = [];
  for (const filePath of await collectFiles(sessionsRoot)) {
    if (
      unifiedSessionFileMatches({
        filePath,
        matchIds,
      })
    ) {
      await rm(filePath, { force: true });
      deletedPaths.push(path.relative(params.workspacePath, filePath));
    }
  }
  return deletedPaths;
};

export const pruneWorkflowRuntimeSessionFiles = async (params: {
  readonly deletedSessionIds: readonly string[];
  readonly providerNativeSessions: readonly WorkflowProviderNativeSessionRef[];
  readonly unifiedSessionFileNameFragments?: readonly string[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowRuntimeSessionCleanupResult> => ({
  deletedProviderNativeSessionPaths: await pruneProviderNativeSessions(params),
  deletedUnifiedSessionPaths: await pruneUnifiedSessionFiles(params),
});
