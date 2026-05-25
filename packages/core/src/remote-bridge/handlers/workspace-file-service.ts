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

interface WorkspaceFileHandlerContext<TPayload> {
  readonly absolutePath: string;
  readonly logger: Logger;
  readonly payload: TPayload;
  readonly req: Request;
  readonly res: Response;
  readonly session: {
    readonly id: string;
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly workspacePath: string;
  };
}

type ParsePayloadResult<TPayload> =
  | { readonly ok: true; readonly value: TPayload }
  | { readonly ok: false; readonly error: string };

interface WorkspaceFileHandlerOptions<TPayload> {
  readonly errorLogMessage: string;
  readonly errorResponse: string;
  readonly execute: (
    ctx: WorkspaceFileHandlerContext<TPayload>
  ) => Promise<void>;
  readonly parsePayload: (body: unknown) => ParsePayloadResult<TPayload>;
}

const createWorkspaceFileHandler =
  <TPayload extends { readonly path: string; readonly sessionId: string }>(
    options: WorkspaceFileHandlerOptions<TPayload>
  ) =>
  async (
    req: Request,
    res: Response,
    sessionManager: SessionManager,
    logger: Logger
  ): Promise<void> => {
    const parsed = options.parsePayload(req.body as unknown);
    if (!parsed.ok) {
      res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
      return;
    }

    const session = sessionManager.getSession(parsed.value.sessionId);
    if (!session) {
      res.status(HTTP_NOT_FOUND).json({
        error: `Session ${parsed.value.sessionId} not found`,
      });
      return;
    }

    if (
      !isWorkspacePathAllowlisted({
        relativePath: parsed.value.path,
        workspaceSlug: session.initiativeSlug,
      })
    ) {
      res.status(HTTP_BAD_REQUEST).json({ error: "Path is not allowlisted" });
      return;
    }

    const workspaceRoot = path.resolve(session.workspacePath);
    const absolutePath = resolveWorkspaceFilePath(
      workspaceRoot,
      parsed.value.path
    );
    if (!absolutePath) {
      res.status(HTTP_BAD_REQUEST).json({ error: "Unsafe path" });
      return;
    }

    try {
      await options.execute({
        absolutePath,
        logger,
        payload: parsed.value,
        req,
        res,
        session: {
          id: session.id,
          initiativeSlug: session.initiativeSlug,
          stage: session.stage,
          workspacePath: session.workspacePath,
        },
      });
    } catch (error) {
      logger.error(options.errorLogMessage, error as Error, {
        sessionId: session.id,
        path: parsed.value.path,
      });
      res.status(HTTP_INTERNAL_ERROR).json({ error: options.errorResponse });
    }
  };

export const handleWorkspaceFileRead =
  createWorkspaceFileHandler<WorkspaceFilePayload>({
    errorLogMessage: "Failed to read workspace file",
    errorResponse: "Unable to read file",
    parsePayload: parseWorkspaceFilePayload,
    execute: async ({ absolutePath, payload, res }) => {
      const maxBytes = payload.maxBytes ?? DEFAULT_MAX_BYTES;
      const { buffer, truncated } = await readFileHead(absolutePath, maxBytes);
      const content = buffer.toString("utf8");
      res.json({
        path: payload.path,
        truncated,
        maxBytes,
        content,
      });
    },
  });

export const handleWorkspaceFileWrite =
  createWorkspaceFileHandler<WorkspaceFileWritePayload>({
    errorLogMessage: "Failed to write workspace file",
    errorResponse: "Unable to write file",
    parsePayload: parseWorkspaceFileWritePayload,
    execute: async ({ absolutePath, payload, res }) => {
      const content = payload.content.endsWith("\n")
        ? payload.content
        : `${payload.content}\n`;
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, { encoding: "utf8" });
      res.json({ path: payload.path });
    },
  });
