import path from "node:path";
import { InitiativeStore } from "@codeai-hub/initiatives";
import type { Request, Response } from "express";
import type { Logger } from "../../telemetry/logger";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractString = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) {
    return null;
  }
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
};

const resolveWorkspaceRoot = (req: Request, body: unknown): string | null => {
  const candidate =
    (typeof req.query.workspacePath === "string"
      ? req.query.workspacePath
      : null) ??
    extractString(body, "workspacePath") ??
    null;

  if (!candidate) {
    return null;
  }

  return path.resolve(candidate);
};

interface CreateInitiativeRequest {
  readonly description?: string;
  readonly displayName: string;
  readonly workspacePath: string;
}

const parseCreateInitiativeRequest = (
  value: unknown
): CreateInitiativeRequest | null => {
  if (!isRecord(value)) {
    return null;
  }

  const workspacePath = extractString(value, "workspacePath");
  const displayName = extractString(value, "displayName");
  if (!(workspacePath && displayName)) {
    return null;
  }

  const description =
    typeof value.description === "string" ? value.description : undefined;

  return {
    workspacePath,
    displayName,
    description,
  };
};

export class InitiativesHttpHandler {
  private readonly logger: Logger;
  private readonly initiatives: InitiativeStore;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initiatives = new InitiativeStore();
  }

  async handleList(req: Request, res: Response): Promise<void> {
    const workspaceRoot = resolveWorkspaceRoot(req, null);
    if (!workspaceRoot) {
      res.status(HTTP_BAD_REQUEST).json({ error: "workspacePath is required" });
      return;
    }

    try {
      const initiatives = await this.initiatives.list(workspaceRoot);
      res.json({ initiatives });
    } catch (error) {
      this.logger.error("Failed to list initiatives", error as Error, {
        workspaceRoot,
      });
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to list initiatives",
      });
    }
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    const payload = parseCreateInitiativeRequest(req.body as unknown);
    if (!payload) {
      res.status(HTTP_BAD_REQUEST).json({
        error: "Invalid payload (expected workspacePath + displayName)",
      });
      return;
    }

    const workspaceRoot = resolveWorkspaceRoot(req, payload);
    if (!workspaceRoot) {
      res.status(HTTP_BAD_REQUEST).json({ error: "workspacePath is required" });
      return;
    }

    try {
      const initiative = await this.initiatives.create(workspaceRoot, {
        displayName: payload.displayName,
        description: payload.description,
      });

      res.json({ initiative });
    } catch (error) {
      this.logger.error("Failed to create initiative", error as Error, {
        workspaceRoot,
      });
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to create initiative",
      });
    }
  }

  async requireExisting(
    workspaceRoot: string,
    initiativeSlug: string,
    res: Response
  ): Promise<boolean> {
    const initiative = await this.initiatives.read(
      workspaceRoot,
      initiativeSlug
    );
    if (!initiative) {
      res
        .status(HTTP_NOT_FOUND)
        .json({ error: `Initiative ${initiativeSlug} not found` });
      return false;
    }
    return true;
  }
}
