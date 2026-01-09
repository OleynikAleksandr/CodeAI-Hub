import path from "node:path";
import { InitiativeStore, RunStore } from "@codeai-hub/initiatives";
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

type CreateRunRequest = {
  readonly workspacePath: string;
  readonly displayName: string;
  readonly description?: string;
};

const parseCreateRunRequest = (value: unknown): CreateRunRequest | null => {
  if (!isRecord(value)) {
    return null;
  }

  const workspacePath = extractString(value, "workspacePath");
  const displayName = extractString(value, "displayName");
  if (!(workspacePath && displayName)) {
    return null;
  }

  return {
    workspacePath,
    displayName,
    description:
      typeof value.description === "string" ? value.description : undefined,
  };
};

export class RunsHttpHandler {
  private readonly logger: Logger;
  private readonly initiatives: InitiativeStore;
  private readonly runs: RunStore;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initiatives = new InitiativeStore();
    this.runs = new RunStore(this.initiatives);
  }

  async handleList(req: Request, res: Response): Promise<void> {
    const initiativeSlug = req.params.initiativeSlug;
    if (!initiativeSlug) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: "initiativeSlug is required" });
      return;
    }

    const workspaceRoot = resolveWorkspaceRoot(req, null);
    if (!workspaceRoot) {
      res.status(HTTP_BAD_REQUEST).json({ error: "workspacePath is required" });
      return;
    }

    try {
      const initiative = await this.initiatives.read(
        workspaceRoot,
        initiativeSlug
      );
      if (!initiative) {
        res
          .status(HTTP_NOT_FOUND)
          .json({ error: `Initiative ${initiativeSlug} not found` });
        return;
      }

      const runs = await this.runs.list(workspaceRoot, initiativeSlug);
      res.json({ runs, currentRunId: initiative.currentRunId ?? null });
    } catch (error) {
      this.logger.error("Failed to list runs", error as Error, {
        workspaceRoot,
        initiativeSlug,
      });
      res.status(HTTP_INTERNAL_ERROR).json({ error: "Unable to list runs" });
    }
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    const initiativeSlug = req.params.initiativeSlug;
    if (!initiativeSlug) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: "initiativeSlug is required" });
      return;
    }

    const payload = parseCreateRunRequest(req.body as unknown);
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
      const initiative = await this.initiatives.read(
        workspaceRoot,
        initiativeSlug
      );
      if (!initiative) {
        res
          .status(HTTP_NOT_FOUND)
          .json({ error: `Initiative ${initiativeSlug} not found` });
        return;
      }

      const run = await this.runs.create(workspaceRoot, initiativeSlug, {
        displayName: payload.displayName,
        description: payload.description,
      });
      await this.runs.selectCurrent(workspaceRoot, initiativeSlug, run.runId);

      res.json({ run, currentRunId: run.runId });
    } catch (error) {
      this.logger.error("Failed to create run", error as Error, {
        workspaceRoot,
        initiativeSlug,
      });
      res.status(HTTP_INTERNAL_ERROR).json({ error: "Unable to create run" });
    }
  }

  async handleSelectCurrent(req: Request, res: Response): Promise<void> {
    const initiativeSlug = req.params.initiativeSlug;
    const runId = req.params.runId;
    if (!(initiativeSlug && runId)) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: "initiativeSlug and runId are required" });
      return;
    }

    const workspaceRoot = resolveWorkspaceRoot(req, req.body as unknown);
    if (!workspaceRoot) {
      res.status(HTTP_BAD_REQUEST).json({ error: "workspacePath is required" });
      return;
    }

    try {
      const initiative = await this.initiatives.read(
        workspaceRoot,
        initiativeSlug
      );
      if (!initiative) {
        res
          .status(HTTP_NOT_FOUND)
          .json({ error: `Initiative ${initiativeSlug} not found` });
        return;
      }

      const runs = await this.runs.list(workspaceRoot, initiativeSlug);
      if (!runs.some((run) => run.runId === runId)) {
        res.status(HTTP_NOT_FOUND).json({ error: `Run ${runId} not found` });
        return;
      }

      await this.runs.selectCurrent(workspaceRoot, initiativeSlug, runId);
      res.json({ ok: true, currentRunId: runId });
    } catch (error) {
      this.logger.error("Failed to select current run", error as Error, {
        workspaceRoot,
        initiativeSlug,
        runId,
      });
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to select current run" });
    }
  }
}
