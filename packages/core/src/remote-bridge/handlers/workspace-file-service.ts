import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { isWorkspacePathAllowlisted } from "../../security/workspace-path-allowlist";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { captureWorkflowMutation } from "../../workflow/undo/workflow-mutation-journal-runtime";
import { WorkflowStepUndoLedgerStore } from "../../workflow/undo/workflow-step-undo-ledger";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import { readFileHead, resolveWorkspaceFilePath } from "./workspace-file-utils";

const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const BACKSLASH_RE = /\\/g;
const LEADING_DOT_SLASH_RE = /^\.?\//;
const WORKFLOW_STAGE_IDS = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
]);

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

const normalizeRelativeWorkspacePath = (value: string): string =>
  path.posix.normalize(
    value.replace(BACKSLASH_RE, "/").replace(LEADING_DOT_SLASH_RE, "")
  );

const resolveWorkflowUndoStage = (params: {
  readonly relativePath: string;
  readonly sessionStage: string | null;
  readonly workspaceSlug: string | null;
}): WorkflowStageId | null => {
  if (!params.workspaceSlug) {
    return null;
  }
  const normalized = normalizeRelativeWorkspacePath(params.relativePath);
  const segments = normalized.split("/");
  if (
    !(
      segments[0] === ".codeai-hub" &&
      segments[1] === params.workspaceSlug &&
      segments[2] &&
      WORKFLOW_STAGE_IDS.has(segments[2] as WorkflowStageId)
    )
  ) {
    return null;
  }
  const stage = segments[2] as WorkflowStageId;
  return params.sessionStage && params.sessionStage !== stage ? null : stage;
};

const readPreviousContent = async (
  absolutePath: string
): Promise<string | null> => {
  try {
    return await readFile(absolutePath, "utf8");
  } catch (error) {
    const code =
      typeof error === "object" && error !== null
        ? (error as { code?: string }).code
        : null;
    if (code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const isDescriptionQuestionnairePath = (params: {
  readonly relativePath: string;
  readonly workspaceSlug: string;
}): boolean =>
  normalizeRelativeWorkspacePath(params.relativePath) ===
  `.codeai-hub/${params.workspaceSlug}/description/questionnaire.md`;

const resolveWorkspaceFileUndoBehavior = (params: {
  readonly preserveQuestionnaire: boolean;
  readonly previousContent: string | null;
}): "delete_path" | "preserve_path" | "restore_previous" => {
  if (params.preserveQuestionnaire) {
    return "preserve_path";
  }
  return params.previousContent === null ? "delete_path" : "restore_previous";
};

const recordWorkspaceFileWriteUndo = async (params: {
  readonly previousContent: string | null;
  readonly relativePath: string;
  readonly session: WorkspaceFileHandlerContext<WorkspaceFileWritePayload>["session"];
}): Promise<void> => {
  const workspaceSlug = params.session.initiativeSlug;
  const stage = resolveWorkflowUndoStage({
    relativePath: params.relativePath,
    sessionStage: params.session.stage,
    workspaceSlug,
  });
  if (!(workspaceSlug && stage)) {
    return;
  }
  const preserveQuestionnaire = isDescriptionQuestionnairePath({
    relativePath: params.relativePath,
    workspaceSlug,
  });
  await new WorkflowStepUndoLedgerStore({
    workspaceRoot: params.session.workspacePath,
    workspaceSlug,
  }).append([
    {
      kind: "write_file",
      previousContent: params.previousContent,
      relativePath: normalizeRelativeWorkspacePath(params.relativePath),
      source: "workspace_file_write",
      stage,
      undoBehavior: resolveWorkspaceFileUndoBehavior({
        preserveQuestionnaire,
        previousContent: params.previousContent,
      }),
    },
  ]);
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
    execute: async ({ absolutePath, payload, res, session }) => {
      const writeFileContent = async () => {
        const content = payload.content.endsWith("\n")
          ? payload.content
          : `${payload.content}\n`;
        const previousContent = await readPreviousContent(absolutePath);
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, content, { encoding: "utf8" });
        await recordWorkspaceFileWriteUndo({
          previousContent,
          relativePath: payload.path,
          session,
        });
      };
      const stage = resolveWorkflowUndoStage({
        relativePath: payload.path,
        sessionStage: session.stage,
        workspaceSlug: session.initiativeSlug,
      });
      if (session.initiativeSlug && stage) {
        await captureWorkflowMutation(
          {
            source: "workspace_file_write_diff",
            stage,
            workspaceRoot: session.workspacePath,
            workspaceSlug: session.initiativeSlug,
          },
          writeFileContent
        );
      } else {
        await writeFileContent();
      }
      res.json({ path: payload.path });
    },
  });
