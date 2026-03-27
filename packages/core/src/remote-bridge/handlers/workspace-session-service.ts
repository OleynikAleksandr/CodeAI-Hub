import { promises as fs } from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const WORKSPACE_ROOT_DIR = ".codeai-hub";

interface WorkspaceSessionPayload {
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

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
      stage: readOptionalString(payload.stage),
    },
  };
};

export const handleWorkspaceSessionCreate = (params: {
  readonly req: Request;
  readonly res: Response;
  readonly sessionManager: SessionManager;
  readonly logger: Logger;
  readonly onWorkspaceSessionCreated?: (
    workspacePath: string,
    workspaceSlug: string
  ) => Promise<void> | void;
}): void => {
  const parsed = parseWorkspaceSessionPayload(params.req.body as unknown);
  if (!parsed.ok) {
    params.res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
    return;
  }

  try {
    const session = params.sessionManager.createSession(
      "projectManager",
      parsed.value.workspacePath,
      undefined,
      {
        initiativeSlug: parsed.value.initiativeSlug,
        stage: parsed.value.stage,
      }
    );

    if (parsed.value.initiativeSlug) {
      fs.mkdir(
        path.join(
          parsed.value.workspacePath,
          WORKSPACE_ROOT_DIR,
          parsed.value.initiativeSlug
        ),
        { recursive: true }
      ).catch(() => {
        /* best effort */
      });
      Promise.resolve(
        params.onWorkspaceSessionCreated?.(
          parsed.value.workspacePath,
          parsed.value.initiativeSlug
        )
      ).catch(() => {
        /* best effort */
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
