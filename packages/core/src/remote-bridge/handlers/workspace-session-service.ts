import path from "node:path";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;

type WorkspaceSessionPayload = {
  readonly workspacePath: string;
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly runSlug?: string | null;
};

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
      runSlug: readOptionalString(payload.runSlug),
    },
  };
};

export const handleWorkspaceSessionCreate = (
  req: Request,
  res: Response,
  sessionManager: SessionManager,
  logger: Logger
): void => {
  const parsed = parseWorkspaceSessionPayload(req.body as unknown);
  if (!parsed.ok) {
    res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
    return;
  }

  try {
    const session = sessionManager.createSession(
      "projectManager",
      parsed.value.workspacePath,
      undefined,
      {
        initiativeSlug: parsed.value.initiativeSlug,
        stage: parsed.value.stage,
        runSlug: parsed.value.runSlug,
      }
    );
    res.json({ sessionId: session.id });
  } catch (error) {
    logger.error("Failed to create workspace session", error as Error, {
      workspacePath: parsed.value.workspacePath,
    });
    res.status(HTTP_INTERNAL_ERROR).json({ error: "Unable to create session" });
  }
};
