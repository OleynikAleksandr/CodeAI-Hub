import path from "node:path";
import type { Request, Response } from "express";
import type { Logger } from "../../telemetry/logger";
import { WorkflowBoundaryFacade } from "../../workflow/boundary/workflow-boundary-facade";
import { isStageAtOrAfter } from "../../workflow/boundary/workflow-boundary-model";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import {
  pruneWorkflowRuntimeSessionFiles,
  type WorkflowProviderNativeSessionRef,
} from "./workflow-clear-session-cleanup";
import { clearDevelopmentTreeNode } from "./workflow-step-clear-development-tree-node";
import {
  clearAndRestartProductPart,
  isProductPartRootClear,
  type ProductPartClearDeps,
} from "./workflow-step-clear-product-part-restart";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];
const WORKSPACE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

type ClearTarget =
  | { readonly kind: "workflow_stage"; readonly stage: WorkflowStageId }
  | {
      readonly codeWorkspacePath?: string | null;
      readonly kind: "development_tree_node";
      readonly workflowPath: string;
    };

export interface WorkflowStepClearDeps extends ProductPartClearDeps {
  readonly logger: Logger;
  readonly resetWorkflowState: (workspaceSlug: string) => void;
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

interface ClearedRuntimeSessions {
  readonly deletedSessionIds: readonly string[];
  readonly providerNativeSessions: readonly WorkflowProviderNativeSessionRef[];
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
  const providerNativeSessions: WorkflowProviderNativeSessionRef[] = [];
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

const createWorkflowStageCleanupFragments = (
  stage: WorkflowStageId
): readonly string[] => {
  const stageIndex = WORKFLOW_STAGES.indexOf(stage);
  return stageIndex >= 0 ? WORKFLOW_STAGES.slice(stageIndex) : [stage];
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
    if (isProductPartRootClear(parsed.target)) {
      try {
        const result = await clearAndRestartProductPart(
          { ...parsed, target: parsed.target },
          deps
        );
        deps.resetWorkflowState(parsed.workspaceSlug);
        res.json({
          cleared: true,
          deletedProviderNativeSessionPaths:
            result.deletedProviderNativeSessionPaths,
          deletedSessionIds: result.clearedSessions.deletedSessionIds,
          productPartRestart: result.restart,
          restore: {
            boundaryHash: "development-tree-product-part-restart",
            clearCommitHash: "development-tree-product-part-restart",
            prunedStages: [parsed.target.workflowPath],
            registryPath: "",
            stage: parsed.target.workflowPath,
          },
          target: parsed.target,
          workspaceSlug: parsed.workspaceSlug,
        });
      } catch (error) {
        deps.logger.error(
          "Failed to clear and restart Product Part Development Tree node",
          error as Error,
          {
            target: parsed.target,
            workspacePath: parsed.workspacePath,
            workspaceSlug: parsed.workspaceSlug,
          }
        );
        res.status(HTTP_INTERNAL_ERROR).json({
          error:
            "Unable to clear and restart Product Part Development Tree node",
        });
      }
      return;
    }
    try {
      const result = await clearDevelopmentTreeNode(
        { ...parsed, target: parsed.target },
        deps
      );
      deps.resetWorkflowState(parsed.workspaceSlug);
      res.json({
        cleared: true,
        deletedContinuityPaths: result.deletedContinuityPaths,
        deletedSessionIds: result.deletedSessionIds,
        deletedWorktreePaths: result.deletedWorktreePaths,
        restore: {
          boundaryHash: result.clearCommitHash,
          clearCommitHash: result.clearCommitHash,
          prunedStages: [parsed.target.workflowPath],
          registryPath: "",
          stage: parsed.target.workflowPath,
        },
        target: parsed.target,
        workspaceSlug: parsed.workspaceSlug,
      });
    } catch (error) {
      deps.logger.error(
        "Failed to clear downstream Development Tree node",
        error as Error,
        {
          target: parsed.target,
          workspacePath: parsed.workspacePath,
          workspaceSlug: parsed.workspaceSlug,
        }
      );
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to clear downstream Development Tree node",
      });
    }
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
    const runtimeCleanup = await pruneWorkflowRuntimeSessionFiles({
      deletedSessionIds: clearedSessions.deletedSessionIds,
      providerNativeSessions: clearedSessions.providerNativeSessions,
      unifiedSessionFileNameFragments: createWorkflowStageCleanupFragments(
        parsed.target.stage
      ),
      workspacePath: parsed.workspacePath,
      workspaceSlug: parsed.workspaceSlug,
    });
    deps.resetWorkflowState(parsed.workspaceSlug);
    res.json({
      cleared: true,
      deletedProviderNativeSessionPaths:
        runtimeCleanup.deletedProviderNativeSessionPaths,
      deletedSessionIds: clearedSessions.deletedSessionIds,
      deletedUnifiedSessionPaths: runtimeCleanup.deletedUnifiedSessionPaths,
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
