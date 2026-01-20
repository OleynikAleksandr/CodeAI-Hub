import type { Request, Response } from "express";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { WorkflowStateFacade } from "../../workflow/state/workflow-state-facade";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowWatcherEvent } from "../../workflow/watcher/watcher-types";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

type WorkspaceSlugResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly status: number; readonly error: string };

export class WorkflowStateService {
  private readonly logger: Logger;
  private readonly sessionManager?: SessionManager;
  private readonly stores = new Map<string, WorkflowStateFacade>();

  constructor(options: {
    readonly logger: Logger;
    readonly sessionManager?: SessionManager;
  }) {
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
  }

  record(event: WorkflowWatcherEvent): WorkflowState {
    const store = this.getStore(event.workspaceSlug);
    return store.apply(event);
  }

  handleWorkflowStateRead(req: Request, res: Response): void {
    const workspaceSlugResult = this.resolveWorkspaceSlug(req);
    if (!workspaceSlugResult.ok) {
      res
        .status(workspaceSlugResult.status)
        .json({ error: workspaceSlugResult.error });
      return;
    }

    const state = this.getStore(workspaceSlugResult.value).snapshot();
    const workspaceRoot = this.resolveWorkspaceRoot(
      req,
      workspaceSlugResult.value
    );

    if (!workspaceRoot) {
      res.json({ state, continuity: { chains: [] } });
      return;
    }

    SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot,
      workspaceSlug: workspaceSlugResult.value,
    })
      .then((chains) => {
        res.json({ state, continuity: { chains } });
      })
      .catch((error) => {
        this.logger.warn("Failed to read continuity chains", {
          workspaceSlug: workspaceSlugResult.value,
          error: error instanceof Error ? error.message : String(error),
        });
        res.json({ state, continuity: { chains: [] } });
      });
  }

  private resolveWorkspaceSlug(req: Request): WorkspaceSlugResult {
    const query = req.query as Record<string, unknown>;
    const workspaceSlug = readNonEmptyString(query.workspaceSlug);
    if (workspaceSlug) {
      return { ok: true, value: workspaceSlug };
    }

    const sessionId = readNonEmptyString(query.sessionId);
    if (!sessionId) {
      return {
        ok: false,
        status: HTTP_BAD_REQUEST,
        error: "Missing workspaceSlug or sessionId",
      };
    }
    if (!this.sessionManager) {
      return {
        ok: false,
        status: HTTP_BAD_REQUEST,
        error: "Session lookup unavailable",
      };
    }
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return {
        ok: false,
        status: HTTP_NOT_FOUND,
        error: `Session ${sessionId} not found`,
      };
    }
    if (!session.initiativeSlug) {
      return {
        ok: false,
        status: HTTP_BAD_REQUEST,
        error: "Session missing workspace slug",
      };
    }
    return { ok: true, value: session.initiativeSlug };
  }

  private getStore(workspaceSlug: string): WorkflowStateFacade {
    const existing = this.stores.get(workspaceSlug);
    if (existing) {
      return existing;
    }
    this.logger.debug("Creating workflow state store", { workspaceSlug });
    const store = new WorkflowStateFacade({ workspaceSlug });
    this.stores.set(workspaceSlug, store);
    return store;
  }

  private resolveWorkspaceRoot(
    req: Request,
    workspaceSlug: string
  ): string | null {
    if (!this.sessionManager) {
      return null;
    }
    const query = req.query as Record<string, unknown>;
    const sessionId = readNonEmptyString(query.sessionId);
    if (sessionId) {
      const session = this.sessionManager.getSession(sessionId);
      if (session?.workspacePath) {
        return session.workspacePath;
      }
    }

    const session = this.sessionManager
      .listSessions()
      .find((candidate) => candidate.initiativeSlug === workspaceSlug);
    return session?.workspacePath ?? null;
  }
}
