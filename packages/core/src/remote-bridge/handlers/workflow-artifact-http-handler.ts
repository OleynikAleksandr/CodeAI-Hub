import path from "node:path";
import type { Request, Response } from "express";
import { isWorkflowWorkspacePathAllowed } from "../../workflow/paths/workflow-artifact-paths";
import { readFileHead, resolveWorkspaceFilePath } from "./workspace-file-utils";

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

const DEFAULT_MAX_BYTES = 300_000;
const MIN_MAX_BYTES = 1000;
const MAX_MAX_BYTES = 500_000;

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

const parseQuery = (
  query: unknown
):
  | {
      readonly ok: true;
      readonly value: {
        readonly workspacePath: string;
        readonly workspaceSlug: string;
        readonly relativePath: string;
        readonly maxBytes: number;
      };
    }
  | { readonly ok: false; readonly error: string } => {
  if (!isRecord(query)) {
    return { ok: false, error: "Invalid query" };
  }
  const workspacePath = readNonEmptyString(query.workspacePath);
  const workspaceSlug = readNonEmptyString(query.workspaceSlug);
  const relativePath = readNonEmptyString(query.path);
  if (!workspacePath) {
    return { ok: false, error: "Missing workspacePath" };
  }
  if (!workspaceSlug) {
    return { ok: false, error: "Missing workspaceSlug" };
  }
  if (!relativePath) {
    return { ok: false, error: "Missing path" };
  }
  return {
    ok: true,
    value: {
      workspacePath,
      workspaceSlug,
      relativePath,
      maxBytes: readMaxBytes(query.maxBytes),
    },
  };
};

export const handleWorkflowArtifactRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsed = parseQuery(req.query);
  if (!parsed.ok) {
    res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
    return;
  }

  if (
    !isWorkflowWorkspacePathAllowed({
      relativePath: parsed.value.relativePath,
      workspaceSlug: parsed.value.workspaceSlug,
    })
  ) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Path is not allowlisted" });
    return;
  }

  const workspaceRoot = path.resolve(parsed.value.workspacePath);
  const absolutePath = resolveWorkspaceFilePath(
    workspaceRoot,
    parsed.value.relativePath
  );
  if (!absolutePath) {
    res.status(HTTP_BAD_REQUEST).json({ error: "Unsafe path" });
    return;
  }

  try {
    const { buffer, truncated } = await readFileHead(
      absolutePath,
      parsed.value.maxBytes
    );
    const content = buffer.toString("utf8");
    res.json({
      path: parsed.value.relativePath,
      truncated,
      maxBytes: parsed.value.maxBytes,
      content,
    });
  } catch {
    res.status(HTTP_NOT_FOUND).json({ error: "Unable to read file" });
  }
};
