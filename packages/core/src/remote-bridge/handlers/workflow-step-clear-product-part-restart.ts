import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { Session, SessionManager } from "../../session-manager";
import { bootstrapDevelopmentTreeProductPartAgents } from "./development-tree-product-part-agent-bootstrap";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";

const PRODUCT_PART_ROOT_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([a-z0-9]+(?:-[a-z0-9]+)*)$/u;
const PRODUCT_PART_ROOT_DRAFT_FILES = [
  "AgentResearch.draft.json",
  "DevelopmentOrderPlan.draft.json",
  "DevelopmentOrderPlan.draft.md",
  "ProductPartDevelopmentBrief.draft.md",
] as const;

export interface ProductPartClearTarget {
  readonly codeWorkspacePath?: string | null;
  readonly kind: "development_tree_node";
  readonly workflowPath: string;
}

export interface ProductPartClearRequest {
  readonly target: ProductPartClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export interface ProductPartClearDeps {
  readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly sessionManager: SessionManager;
}

export interface ProductPartClearRestartResult {
  readonly bootstrapSessionIds: readonly string[];
  readonly deletedContinuityPaths: readonly string[];
  readonly deletedManagedPaths: readonly string[];
  readonly deletedProductPartPlanPaths: readonly string[];
  readonly deletedUnifiedSessionPaths: readonly string[];
  readonly partId: string;
  readonly recreatedDraftPaths: readonly string[];
  readonly recreatedProductPartPlanPaths: readonly string[];
}

interface ProviderNativeSessionRef {
  readonly providerId: string;
  readonly providerSessionId: string;
}

interface ClearedProductPartSessions {
  readonly deletedSessionIds: readonly string[];
  readonly providerNativeSessions: readonly ProviderNativeSessionRef[];
  readonly restartProviderId: string | null;
}

interface RemovedProductPartArtifacts {
  readonly deletedManagedPaths: readonly string[];
  readonly deletedProductPartPlanPaths: readonly string[];
}

const parseProductPartRootStage = (workflowPath: string): string | null =>
  workflowPath.match(PRODUCT_PART_ROOT_STAGE_RE)?.[1] ?? null;

export const isProductPartRootClear = (target: {
  readonly kind?: unknown;
  readonly workflowPath?: unknown;
}): target is ProductPartClearTarget =>
  target.kind === "development_tree_node" &&
  typeof target.workflowPath === "string" &&
  parseProductPartRootStage(target.workflowPath) !== null;

const isProductPartSessionInTarget = (
  request: ProductPartClearRequest,
  session: Session
): boolean =>
  session.workspacePath === request.workspacePath &&
  session.initiativeSlug === request.workspaceSlug &&
  session.stage === request.target.workflowPath;

const clearProductPartRuntimeSessions = (
  request: ProductPartClearRequest,
  deps: ProductPartClearDeps
): ClearedProductPartSessions => {
  const deletedSessionIds: string[] = [];
  const providerNativeSessions: ProviderNativeSessionRef[] = [];
  let restartProviderId: string | null = null;
  for (const session of deps.sessionManager.getSessionsByWorkspacePath(
    request.workspacePath
  )) {
    if (!isProductPartSessionInTarget(request, session)) {
      continue;
    }
    restartProviderId ??= session.providerId;
    if (session.providerSessionId) {
      providerNativeSessions.push({
        providerId: session.providerId,
        providerSessionId: session.providerSessionId,
      });
    }
    if (deps.sessionManager.deleteSession(session.id)) {
      deletedSessionIds.push(session.id);
    }
  }
  return { deletedSessionIds, providerNativeSessions, restartProviderId };
};

const removePathIfPresent = async (params: {
  readonly absolutePath: string;
  readonly workspacePath: string;
}): Promise<string> => {
  await rm(params.absolutePath, { force: true, recursive: true });
  return path.relative(params.workspacePath, params.absolutePath);
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

const pruneProviderNativeSessions = async (params: {
  readonly sessions: readonly ProviderNativeSessionRef[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const removedPaths: string[] = [];
  const uniqueSessions = new Map<string, ProviderNativeSessionRef>();
  for (const session of params.sessions) {
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

const pruneUnifiedSessionFiles = async (params: {
  readonly deletedSessionIds: readonly string[];
  readonly providerNativeSessions: readonly ProviderNativeSessionRef[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const ids = new Set([
    ...params.deletedSessionIds,
    ...params.providerNativeSessions.map(
      (session) => session.providerSessionId
    ),
  ]);
  if (ids.size === 0) {
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
    const fileName = path.basename(filePath);
    if ([...ids].some((id) => fileName.includes(id))) {
      await rm(filePath, { force: true });
      deletedPaths.push(path.relative(params.workspacePath, filePath));
    }
  }
  return deletedPaths;
};

const removeContinuityIndexEntries = async (params: {
  readonly stage: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const indexPath = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "continuity",
    "index.json"
  );
  const raw = await readFile(indexPath, "utf8").catch(() => null);
  if (!raw) {
    return;
  }
  const parsed = JSON.parse(raw) as {
    readonly entries?: readonly Record<string, unknown>[];
    readonly updatedAt?: string;
    readonly version?: number;
    readonly workspaceSlug?: string;
  };
  const entries = (parsed.entries ?? []).filter(
    (entry) => entry.stage !== params.stage
  );
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(
    indexPath,
    `${JSON.stringify(
      {
        ...parsed,
        entries,
        updatedAt: new Date().toISOString(),
        version: 1,
        workspaceSlug: params.workspaceSlug,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

const clearProductPartContinuity = async (params: {
  readonly stage: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const stageRoot = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "continuity",
    params.stage
  );
  const deletedPath = await removePathIfPresent({
    absolutePath: stageRoot,
    workspacePath: params.workspacePath,
  });
  await removeContinuityIndexEntries(params);
  return [deletedPath];
};

const removeProductPartArtifacts = async (params: {
  readonly partId: string;
  readonly stage: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<RemovedProductPartArtifacts> => {
  const deletedManagedPaths: string[] = [];
  const deletedProductPartPlanPaths: string[] = [];
  const planRoot = path.join(
    params.workspacePath,
    "doc",
    "TODO",
    "stages",
    "development-tree",
    "product-parts",
    params.partId
  );
  deletedProductPartPlanPaths.push(
    await removePathIfPresent({
      absolutePath: planRoot,
      workspacePath: params.workspacePath,
    })
  );
  const nodeRoot = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    params.stage
  );
  for (const fileName of PRODUCT_PART_ROOT_DRAFT_FILES) {
    deletedManagedPaths.push(
      await removePathIfPresent({
        absolutePath: path.join(nodeRoot, fileName),
        workspacePath: params.workspacePath,
      })
    );
  }
  deletedManagedPaths.push(
    await removePathIfPresent({
      absolutePath: path.join(
        params.workspacePath,
        ".codeai-hub",
        params.workspaceSlug,
        "workflow",
        "managed",
        "development-tree-product-parts",
        `${params.partId}.json`
      ),
      workspacePath: params.workspacePath,
    })
  );
  return {
    deletedManagedPaths,
    deletedProductPartPlanPaths,
  };
};

const resolveProductPartRestartProviderId = (
  clearedSessions: ClearedProductPartSessions
): string | null =>
  clearedSessions.restartProviderId ??
  clearedSessions.providerNativeSessions[0]?.providerId ??
  null;

export const clearAndRestartProductPart = async (
  request: ProductPartClearRequest,
  deps: ProductPartClearDeps
): Promise<{
  readonly clearedSessions: ClearedProductPartSessions;
  readonly deletedProviderNativeSessionPaths: readonly string[];
  readonly restart: ProductPartClearRestartResult;
}> => {
  const partId = parseProductPartRootStage(request.target.workflowPath);
  if (!partId) {
    throw new Error("Product Part clear requires a Product Part root node");
  }
  const clearedSessions = clearProductPartRuntimeSessions(request, deps);
  const deletedUnifiedSessionPaths = await pruneUnifiedSessionFiles({
    deletedSessionIds: clearedSessions.deletedSessionIds,
    providerNativeSessions: clearedSessions.providerNativeSessions,
    workspacePath: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const deletedProviderNativeSessionPaths = await pruneProviderNativeSessions({
    sessions: clearedSessions.providerNativeSessions,
    workspacePath: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const deletedContinuityPaths = await clearProductPartContinuity({
    stage: request.target.workflowPath,
    workspacePath: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const removedArtifacts = await removeProductPartArtifacts({
    partId,
    stage: request.target.workflowPath,
    workspacePath: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const progress = await readDiagramModulesProgressSnapshot({
    workspaceRoot: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  const bootstrap = await bootstrapDevelopmentTreeProductPartAgents({
    agentGateway: deps.developmentTreeAgentGateway,
    providerId: resolveProductPartRestartProviderId(clearedSessions),
    leadProductPartId: progress?.leadProductPartId ?? null,
    productPartLeadershipOrder: progress?.productPartLeadershipOrder?.length
      ? progress.productPartLeadershipOrder
      : progress?.plannedPartIds,
    targetProductPartIds: [partId],
    workspaceRoot: request.workspacePath,
    workspaceSlug: request.workspaceSlug,
  });
  return {
    clearedSessions,
    deletedProviderNativeSessionPaths,
    restart: {
      partId,
      bootstrapSessionIds: bootstrap.agentSessions
        .map((session) => session.sessionId)
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
      deletedContinuityPaths,
      deletedManagedPaths: removedArtifacts.deletedManagedPaths,
      deletedProductPartPlanPaths: removedArtifacts.deletedProductPartPlanPaths,
      deletedUnifiedSessionPaths,
      recreatedDraftPaths: bootstrap.writtenDrafts
        .filter((draft) => draft.action !== "unchanged")
        .map((draft) => draft.relativePath),
      recreatedProductPartPlanPaths: bootstrap.writtenProductPartPlans
        .filter((plan) => plan.action !== "unchanged")
        .map((plan) => plan.relativePath),
    },
  };
};
