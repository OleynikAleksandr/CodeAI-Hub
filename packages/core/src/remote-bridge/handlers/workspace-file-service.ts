import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { isWorkspacePathAllowlisted } from "../../security/workspace-path-allowlist";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { readFileHead, resolveWorkspaceFilePath } from "./workspace-file-utils";

const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

const DEFAULT_MAX_BYTES = 300_000;
const MIN_MAX_BYTES = 1000;
const MAX_MAX_BYTES = 500_000;

interface WorkspaceFilePayload {
  readonly maxBytes?: number;
  readonly path: string;
  readonly sessionId: string;
}

interface WorkspaceFileWritePayload {
  readonly content: string;
  readonly path: string;
  readonly sessionId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readMaxBytes = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MAX_BYTES;
  }
  const rounded = Math.floor(value);
  return Math.max(MIN_MAX_BYTES, Math.min(MAX_MAX_BYTES, rounded));
};

const parseWorkspaceFilePayload = (
  payload: unknown
):
  | { readonly ok: true; readonly value: WorkspaceFilePayload }
  | {
      readonly ok: false;
      readonly error: string;
    } => {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid payload" };
  }
  const sessionId = readNonEmptyString(payload.sessionId);
  if (!sessionId) {
    return { ok: false, error: "Missing sessionId" };
  }
  const filePath = readNonEmptyString(payload.path);
  if (!filePath) {
    return { ok: false, error: "Missing path" };
  }
  return {
    ok: true,
    value: {
      sessionId,
      path: filePath,
      maxBytes: readMaxBytes(payload.maxBytes),
    },
  };
};

const parseWorkspaceFileWritePayload = (
  payload: unknown
):
  | { readonly ok: true; readonly value: WorkspaceFileWritePayload }
  | { readonly ok: false; readonly error: string } => {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid payload" };
  }
  const sessionId = readNonEmptyString(payload.sessionId);
  if (!sessionId) {
    return { ok: false, error: "Missing sessionId" };
  }
  const filePath = readNonEmptyString(payload.path);
  if (!filePath) {
    return { ok: false, error: "Missing path" };
  }
  if (typeof payload.content !== "string") {
    return { ok: false, error: "Missing content" };
  }
  return {
    ok: true,
    value: {
      sessionId,
      path: filePath,
      content: payload.content,
    },
  };
};

export const handleWorkspaceFileRead = async (
  req: Request,
  res: Response,
  sessionManager: SessionManager,
  logger: Logger
): Promise<void> => {
  const parsedPayload = parseWorkspaceFilePayload(req.body as unknown);
  if (!parsedPayload.ok) {
    res.status(HTTP_BAD_REQUEST).json({ error: parsedPayload.error });
    return;
  }

  const session = sessionManager.getSession(parsedPayload.value.sessionId);
  if (!session) {
    res.status(HTTP_NOT_FOUND).json({
      error: `Session ${parsedPayload.value.sessionId} not found`,
    });
    return;
  }

  if (
    !isWorkspacePathAllowlisted({
      relativePath: parsedPayload.value.path,
      workspaceSlug: session.initiativeSlug,
    })
  ) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Path is not allowlisted" });
    return;
  }

  const workspaceRoot = path.resolve(session.workspacePath);
  const absolutePath = resolveWorkspaceFilePath(
    workspaceRoot,
    parsedPayload.value.path
  );
  if (!absolutePath) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Unsafe path" });
    return;
  }

  try {
    const maxBytes = parsedPayload.value.maxBytes ?? DEFAULT_MAX_BYTES;
    const { buffer, truncated } = await readFileHead(absolutePath, maxBytes);
    const content = buffer.toString("utf8");
    res.json({
      path: parsedPayload.value.path,
      truncated,
      maxBytes,
      content,
    });
  } catch (error) {
    logger.error("Failed to read workspace file", error as Error, {
      sessionId: session.id,
      path: parsedPayload.value.path,
    });
    res.status(HTTP_INTERNAL_ERROR).json({ error: "Unable to read file" });
  }
};

export const handleWorkspaceFileWrite = async (
  req: Request,
  res: Response,
  sessionManager: SessionManager,
  logger: Logger
): Promise<void> => {
  const parsedPayload = parseWorkspaceFileWritePayload(req.body as unknown);
  if (!parsedPayload.ok) {
    res.status(HTTP_BAD_REQUEST).json({ error: parsedPayload.error });
    return;
  }

  const session = sessionManager.getSession(parsedPayload.value.sessionId);
  if (!session) {
    res.status(HTTP_NOT_FOUND).json({
      error: `Session ${parsedPayload.value.sessionId} not found`,
    });
    return;
  }

  if (
    !isWorkspacePathAllowlisted({
      relativePath: parsedPayload.value.path,
      workspaceSlug: session.initiativeSlug,
    })
  ) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Path is not allowlisted" });
    return;
  }

  const workspaceRoot = path.resolve(session.workspacePath);
  const absolutePath = resolveWorkspaceFilePath(
    workspaceRoot,
    parsedPayload.value.path
  );
  if (!absolutePath) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Unsafe path" });
    return;
  }

  try {
    const content = parsedPayload.value.content.endsWith("\n")
      ? parsedPayload.value.content
      : `${parsedPayload.value.content}\n`;
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, { encoding: "utf8" });

    res.json({ path: parsedPayload.value.path });
  } catch (error) {
    logger.error("Failed to write workspace file", error as Error, {
      sessionId: session.id,
      path: parsedPayload.value.path,
    });
    res.status(HTTP_INTERNAL_ERROR).json({ error: "Unable to write file" });
  }
};
