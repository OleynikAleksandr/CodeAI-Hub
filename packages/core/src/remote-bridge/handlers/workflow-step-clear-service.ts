import path from "node:path";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_IMPLEMENTED = 501;
const WORKFLOW_CLEAR_PENDING_CODE = "workflow_clear_git_boundary_pending";
const WORKFLOW_CLEAR_PENDING_ERROR =
  "Workflow step clear is unavailable until Core-owned Git boundary rollback is implemented";
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

export interface WorkflowStepClearDeps {
  readonly logger: Logger;
  readonly resetWorkflowState: (workspaceSlug: string) => void;
  readonly sessionManager: SessionManager;
}

interface ParsedClearRequest {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
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

export const handleWorkflowStepClear = (
  req: Request,
  res: Response,
  _deps: WorkflowStepClearDeps
): void => {
  const parsed = parseClearRequest(req.body);
  if (!parsed) {
    res
      .status(HTTP_BAD_REQUEST)
      .json({ error: "Invalid workflow clear request" });
    return;
  }
  res.status(HTTP_NOT_IMPLEMENTED).json({
    code: WORKFLOW_CLEAR_PENDING_CODE,
    error: WORKFLOW_CLEAR_PENDING_ERROR,
    target: parsed.target,
  });
};
