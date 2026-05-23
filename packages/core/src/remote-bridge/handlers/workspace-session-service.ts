import { promises as fs } from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { WorkflowStepCheckpointFacade } from "../../workflow/step-checkpoint/workflow-step-checkpoint-facade";
import { captureWorkflowMutation } from "../../workflow/undo/workflow-mutation-journal-runtime";
import type { WorkflowUndoStageId } from "../../workflow/undo/workflow-step-undo-ledger";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const WORKSPACE_ROOT_DIR = ".codeai-hub";

interface WorkspaceSessionPayload {
  readonly initiativeSlug?: string | null;
  readonly runSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath: string;
}

const WORKFLOW_STAGE_DIRS = new Map<string, readonly string[]>([
  ["description", ["description"]],
  ["virtual_simulation", ["virtual_simulation"]],
  ["diagram_modules", ["diagram_modules", "diagram_modules/product-parts"]],
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const parseWorkspaceSessionPayload = (
  payload: unknown
):
  | { readonly ok: true; readonly value: WorkspaceSessionPayload }
  | { readonly ok: false; readonly error: string } => {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid payload" };
  }

  const workspacePath = readOptionalString(payload.workspacePath);
  if (!workspacePath) {
    return { ok: false, error: "Missing workspacePath" };
  }

  if (!path.isAbsolute(workspacePath)) {
    return { ok: false, error: "workspacePath must be absolute" };
  }

  return {
    ok: true,
    value: {
      workspacePath,
      initiativeSlug: readOptionalString(payload.initiativeSlug),
      runSlug: readOptionalString(payload.runSlug),
      stage: readOptionalString(payload.stage),
    },
  };
};

export const prepareWorkflowStageDirectories = async (params: {
  readonly initiativeSlug?: string | null;
  readonly runSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath: string;
}): Promise<void> => {
  if (!params.initiativeSlug) {
    return;
  }

  const workspaceRoot = path.join(
    params.workspacePath,
    WORKSPACE_ROOT_DIR,
    params.initiativeSlug
  );
  const stageDirs = WORKFLOW_STAGE_DIRS.get(params.stage ?? "") ?? [];
  await fs.mkdir(workspaceRoot, { recursive: true });
  for (const stageDir of stageDirs) {
    await fs.mkdir(path.join(workspaceRoot, stageDir), { recursive: true });
  }
  if (
    params.runSlug &&
    params.stage &&
    params.stage !== "description" &&
    WORKFLOW_STAGE_DIRS.has(params.stage)
  ) {
    await fs.mkdir(
      path.join(workspaceRoot, params.stage, "runs", params.runSlug),
      { recursive: true }
    );
  }
};

export const handleWorkspaceSessionCreate = async (params: {
  readonly req: Request;
  readonly res: Response;
  readonly sessionManager: SessionManager;
  readonly logger: Logger;
  readonly onWorkspaceSessionCreated?: (
    workspacePath: string,
    workspaceSlug: string
  ) => Promise<void> | void;
}): Promise<void> => {
  const parsed = parseWorkspaceSessionPayload(params.req.body as unknown);
  if (!parsed.ok) {
    params.res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
    return;
  }

  try {
    const createSession = async () => {
      if (parsed.value.initiativeSlug && parsed.value.stage) {
        await new WorkflowStepCheckpointFacade().ensureCheckpoint({
          stage: parsed.value.stage as WorkflowUndoStageId,
          workspaceRoot: parsed.value.workspacePath,
          workspaceSlug: parsed.value.initiativeSlug,
        });
      }
      await prepareWorkflowStageDirectories({
        initiativeSlug: parsed.value.initiativeSlug,
        runSlug: parsed.value.runSlug,
        stage: parsed.value.stage,
        workspacePath: parsed.value.workspacePath,
      });
      return params.sessionManager.createSession(
        "projectManager",
        parsed.value.workspacePath,
        undefined,
        {
          initiativeSlug: parsed.value.initiativeSlug,
          stage: parsed.value.stage,
        }
      );
    };
    const session =
      parsed.value.initiativeSlug && parsed.value.stage
        ? await captureWorkflowMutation(
            {
              source: "workspace_session_create_diff",
              stage: parsed.value.stage as WorkflowUndoStageId,
              workspaceRoot: parsed.value.workspacePath,
              workspaceSlug: parsed.value.initiativeSlug,
            },
            createSession
          )
        : await createSession();

    if (parsed.value.initiativeSlug) {
      Promise.resolve(
        params.onWorkspaceSessionCreated?.(
          parsed.value.workspacePath,
          parsed.value.initiativeSlug
        )
      ).catch((error: unknown) => {
        params.logger.warn("Failed to notify workspace session creation", {
          error: toErrorMessage(error),
          workspacePath: parsed.value.workspacePath,
          workspaceSlug: parsed.value.initiativeSlug,
        });
      });
    }

    params.res.json({ sessionId: session.id });
  } catch (error) {
    params.logger.error("Failed to create workspace session", error as Error, {
      workspacePath: parsed.value.workspacePath,
    });
    params.res
      .status(HTTP_INTERNAL_ERROR)
      .json({ error: "Unable to create session" });
  }
};
