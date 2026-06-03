import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { WorkflowBoundaryFacade } from "../../workflow/boundary/workflow-boundary-facade";
import { isStageAtOrAfter } from "../../workflow/boundary/workflow-boundary-model";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_IMPLEMENTED = 501;
const DEVELOPMENT_TREE_CLEAR_PENDING_CODE =
  "workflow_clear_development_tree_boundary_pending";
const DEVELOPMENT_TREE_CLEAR_PENDING_ERROR =
  "Development Tree node clear is unavailable until node-level Git boundary rollback is implemented";
const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];
const WORKSPACE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PROVIDER_NATIVE_SESSION_EXTENSIONS = new Set([".json", ".jsonl"]);

type ClearTarget =
  | { readonly kind: "workflow_stage"; readonly stage: WorkflowStageId }
  | {
      readonly codeWorkspacePath?: string | null;
      readonly kind: "development_tree_node";
      readonly workflowPath: string;
    };

export interface WorkflowStepClearDeps {
  readonly logger: Logger;
  readonly resetWorkflowState: (workspaceSlug: string) => void;
  readonly sessionManager: SessionManager;
  readonly workflowBoundaryFacade?: Pick<
    WorkflowBoundaryFacade,
    "restoreBoundary"
  >;
}

interface ParsedClearRequest {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

interface ProviderNativeSessionRef {
  readonly providerId: string;
  readonly providerSessionId: string;
}

interface ClearedRuntimeSessions {
  readonly deletedSessionIds: readonly string[];
  readonly providerNativeSessions: readonly ProviderNativeSessionRef[];
}

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isWorkflowStageId = (value: string): value is WorkflowStageId =>
  WORKFLOW_STAGES.includes(value as WorkflowStageId);

const isSafeWorkspaceSlug = (value: string): boolean =>
  WORKSPACE_SLUG_RE.test(value);

const isSafeRelativePath = (value: string): boolean => {
  const normalized = path.posix.normalize(value.replace(/\\/gu, "/"));
  return (
    normalized === value &&
    !normalized.startsWith("../") &&
    !path.isAbsolute(normalized)
  );
};

const parseTarget = (value: unknown): ClearTarget | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.kind === "workflow_stage") {
    const stage = readString(record.stage);
    return stage && isWorkflowStageId(stage)
      ? { kind: "workflow_stage", stage }
      : null;
  }
  if (record.kind !== "development_tree_node") {
    return null;
  }
  const workflowPath = readString(record.workflowPath);
  if (
    !(
      workflowPath?.startsWith("development_tree/") &&
      isSafeRelativePath(workflowPath)
    )
  ) {
    return null;
  }
  return {
    kind: "development_tree_node",
    workflowPath,
    codeWorkspacePath: readString(record.codeWorkspacePath),
  };
};

const parseClearRequest = (body: unknown): ParsedClearRequest | null => {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;
  const workspacePath = readString(record.workspacePath);
  const workspaceSlug = readString(record.workspaceSlug);
  const target = parseTarget(record.target);
  if (
    !(
      workspacePath &&
      path.isAbsolute(workspacePath) &&
      workspaceSlug &&
      isSafeWorkspaceSlug(workspaceSlug) &&
      target
    )
  ) {
    return null;
  }
  return { workspacePath, workspaceSlug, target };
};

const clearRuntimeSessions = (
  parsed: ParsedClearRequest,
  deps: WorkflowStepClearDeps
): ClearedRuntimeSessions => {
  if (parsed.target.kind !== "workflow_stage") {
    return { deletedSessionIds: [], providerNativeSessions: [] };
  }
  const deletedSessionIds: string[] = [];
  const providerNativeSessions: ProviderNativeSessionRef[] = [];
  for (const session of deps.sessionManager.getSessionsByWorkspacePath(
    parsed.workspacePath
  )) {
    if (
      session.initiativeSlug === parsed.workspaceSlug &&
      session.stage &&
      isWorkflowStageId(session.stage) &&
      isStageAtOrAfter(session.stage, parsed.target.stage)
    ) {
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
  }
  return { deletedSessionIds, providerNativeSessions };
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

const walkProviderSessionFiles = async (
  root: string
): Promise<readonly string[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkProviderSessionFiles(absolutePath)));
      continue;
    }
    if (
      entry.isFile() &&
      PROVIDER_NATIVE_SESSION_EXTENSIONS.has(path.extname(entry.name))
    ) {
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

const pruneProviderNativeWorkflowSessions = async (params: {
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
    for (const filePath of await walkProviderSessionFiles(homeRoot)) {
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

export const handleWorkflowStepClear = async (
  req: Request,
  res: Response,
  deps: WorkflowStepClearDeps
): Promise<void> => {
  const parsed = parseClearRequest(req.body);
  if (!parsed) {
    res
      .status(HTTP_BAD_REQUEST)
      .json({ error: "Invalid workflow clear request" });
    return;
  }
  if (parsed.target.kind === "development_tree_node") {
    res.status(HTTP_NOT_IMPLEMENTED).json({
      code: DEVELOPMENT_TREE_CLEAR_PENDING_CODE,
      error: DEVELOPMENT_TREE_CLEAR_PENDING_ERROR,
      target: parsed.target,
    });
    return;
  }

  try {
    const clearedSessions = clearRuntimeSessions(parsed, deps);
    const restore = await (
      deps.workflowBoundaryFacade ?? new WorkflowBoundaryFacade()
    ).restoreBoundary({
      stage: parsed.target.stage,
      workspaceRoot: parsed.workspacePath,
      workspaceSlug: parsed.workspaceSlug,
    });
    const deletedProviderNativeSessionPaths =
      await pruneProviderNativeWorkflowSessions({
        sessions: clearedSessions.providerNativeSessions,
        workspacePath: parsed.workspacePath,
        workspaceSlug: parsed.workspaceSlug,
      });
    deps.resetWorkflowState(parsed.workspaceSlug);
    res.json({
      cleared: true,
      deletedProviderNativeSessionPaths,
      deletedSessionIds: clearedSessions.deletedSessionIds,
      restore,
      target: parsed.target,
      workspaceSlug: parsed.workspaceSlug,
    });
  } catch (error) {
    deps.logger.error(
      "Failed to clear workflow step from Git boundary",
      error as Error,
      {
        stage: parsed.target.stage,
        workspacePath: parsed.workspacePath,
        workspaceSlug: parsed.workspaceSlug,
      }
    );
    res.status(HTTP_INTERNAL_ERROR).json({
      error: "Unable to clear workflow step from Git boundary",
    });
  }
};
