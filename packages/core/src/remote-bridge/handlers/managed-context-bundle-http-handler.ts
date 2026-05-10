import type { Request, Response } from "express";
import { buildManagedWorkflowContextBundleForInitialStage } from "./session-request-handler-managed-context-bundle";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

const MANAGED_STAGE_IDS = new Set([
  "application_skeleton",
  "diagram_modules",
  "quality_gates",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

interface ParsedQuery {
  readonly providerId: string;
  readonly stageId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

const parseQuery = (
  query: unknown
):
  | { readonly ok: true; readonly value: ParsedQuery }
  | { readonly ok: false; readonly error: string } => {
  if (!isRecord(query)) {
    return { ok: false, error: "Invalid query" };
  }
  const stageId = readNonEmptyString(query.stage);
  const workspacePath = readNonEmptyString(query.workspacePath);
  const workspaceSlug = readNonEmptyString(query.workspaceSlug);
  const providerId = readNonEmptyString(query.providerId);
  if (!stageId) {
    return { ok: false, error: "Missing stage" };
  }
  if (!MANAGED_STAGE_IDS.has(stageId)) {
    return { ok: false, error: `Unsupported managed stage: ${stageId}` };
  }
  if (!workspacePath) {
    return { ok: false, error: "Missing workspacePath" };
  }
  if (!workspaceSlug) {
    return { ok: false, error: "Missing workspaceSlug" };
  }
  if (!providerId) {
    return { ok: false, error: "Missing providerId" };
  }
  return {
    ok: true,
    value: { providerId, stageId, workspacePath, workspaceSlug },
  };
};

export const handleManagedContextBundleRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsed = parseQuery(req.query);
  if (!parsed.ok) {
    res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
    return;
  }
  try {
    const bundle = await buildManagedWorkflowContextBundleForInitialStage(
      parsed.value
    );
    if (!bundle) {
      res
        .status(HTTP_NOT_FOUND)
        .json({ error: "Managed context bundle unavailable" });
      return;
    }
    res.json({
      stage: parsed.value.stageId,
      content: bundle.rendered,
      sourceArtifactCount: bundle.sourceArtifactCount,
    });
  } catch {
    res
      .status(HTTP_NOT_FOUND)
      .json({ error: "Failed to assemble managed context bundle" });
  }
};
