import { promises as fs } from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { Logger } from "../../telemetry/logger";
import {
  buildDescriptionBranchSnapshot,
  DescriptionStepStore,
} from "../../workflow/description/description-step-store";
import { WorkflowLastActiveStore } from "../../workflow/state/workflow-last-active-store";
import type { SessionRequestHandler } from "./session-request-handler";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const WORKSPACE_ROOT_DIR = ".codeai-hub";

interface WorkspaceActivatePayload {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const parseWorkspaceActivatePayload = (
  payload: unknown
):
  | { readonly ok: true; readonly value: WorkspaceActivatePayload }
  | { readonly ok: false; readonly error: string } => {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid payload" };
  }

  const workspacePath = readNonEmptyString(payload.workspacePath);
  if (!workspacePath) {
    return { ok: false, error: "Missing workspacePath" };
  }
  if (!path.isAbsolute(workspacePath)) {
    return { ok: false, error: "workspacePath must be absolute" };
  }

  const workspaceSlug = readNonEmptyString(payload.workspaceSlug);
  if (!workspaceSlug) {
    return { ok: false, error: "Missing workspaceSlug" };
  }

  return { ok: true, value: { workspacePath, workspaceSlug } };
};

export const handleWorkspaceActivate = async (params: {
  readonly req: Request;
  readonly res: Response;
  readonly logger: Logger;
  readonly sessionHandler: SessionRequestHandler;
  readonly onWorkspaceActivated?: (
    workspacePath: string,
    workspaceSlug: string
  ) => Promise<void> | void;
}): Promise<void> => {
  const parsed = parseWorkspaceActivatePayload(params.req.body as unknown);
  if (!parsed.ok) {
    params.res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
    return;
  }

  const { workspacePath, workspaceSlug } = parsed.value;

  try {
    await fs.mkdir(
      path.join(workspacePath, WORKSPACE_ROOT_DIR, workspaceSlug),
      {
        recursive: true,
      }
    );
    await Promise.resolve(
      params.onWorkspaceActivated?.(workspacePath, workspaceSlug)
    );

    const lastActiveStore = new WorkflowLastActiveStore();
    const lastActive = await lastActiveStore.read(workspacePath, workspaceSlug);

    const descriptionStepStore = new DescriptionStepStore();
    const descriptionSnapshot = await descriptionStepStore.read(
      workspacePath,
      workspaceSlug
    );

    if (descriptionSnapshot) {
      // Description works in single-session collector mode.
      const collector = descriptionSnapshot.primarySession;

      if (collector) {
        await params.sessionHandler.handleCreate(
          collector.providerId,
          workspacePath,
          {
            initiativeSlug: workspaceSlug,
            stage: "description",
            runSlug: null,
            providerSessionId: collector.providerSessionId,
          }
        );
      }
    }

    params.res.json({
      workspaceSlug,
      lastActive,
      description: descriptionSnapshot
        ? buildDescriptionBranchSnapshot(descriptionSnapshot)
        : null,
    });
  } catch (error) {
    params.logger.error("Failed to activate workspace", error as Error, {
      workspacePath,
      workspaceSlug,
    });
    params.res
      .status(HTTP_INTERNAL_ERROR)
      .json({ error: "Unable to activate workspace" });
  }
};
