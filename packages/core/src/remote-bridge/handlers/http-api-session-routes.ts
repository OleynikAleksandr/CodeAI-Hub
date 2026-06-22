import path from "node:path";
import type { Request, Response } from "express";
import {
  deleteStandaloneWorkspaceChat,
  renameStandaloneWorkspaceChat,
} from "../../unified-session/standalone-workspace-chat-list";
import {
  buildWorkflowStageArtifactUpsertPlan,
  parseArtifactUpsertPayload,
  writeArtifactUpsertPlan,
} from "./http-api-artifact-upsert-service";
import type { RouterDependencies } from "./http-api-router";
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_ERROR,
  HTTP_NO_CONTENT,
  HTTP_NOT_FOUND,
} from "./http-api-system-routes";
import { handleWorkspaceActivate } from "./workspace-activate-service";
import {
  handleWorkspaceFileRead,
  handleWorkspaceFileWrite,
} from "./workspace-file-service";
import { handleWorkspaceSessionCreate } from "./workspace-session-service";

const ARTIFACT_UPSERT_ENDPOINT = "/api/v1/orchestrator/artifact-upsert";
const SESSION_HISTORY_ENDPOINT = "/api/v1/sessions/:sessionId/history";
const STANDALONE_CHATS_ENDPOINT = "/api/v1/standalone-chats";
const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";
const WORKSPACE_SESSION_ENDPOINT = "/api/v1/orchestrator/workspace-session";
const WORKSPACE_ACTIVATE_ENDPOINT = "/api/v1/orchestrator/workspace-activate";

const readTextField = (source: Record<string, unknown>, key: string): string =>
  typeof source[key] === "string" ? source[key].trim() : "";

export class HttpApiSessionRoutes {
  private readonly deps: RouterDependencies;

  constructor(deps: RouterDependencies) {
    this.deps = deps;
  }

  registerRoutes(): void {
    const { app } = this.deps;
    app.get(SESSION_HISTORY_ENDPOINT, async (req: Request, res: Response) => {
      await this.handleSessionHistory(req, res);
    });
    app.get(STANDALONE_CHATS_ENDPOINT, async (req: Request, res: Response) => {
      await this.handleStandaloneChats(req, res);
    });
    app.patch(
      STANDALONE_CHATS_ENDPOINT,
      async (req: Request, res: Response) => {
        await this.handleStandaloneChatRename(req, res);
      }
    );
    app.delete(
      STANDALONE_CHATS_ENDPOINT,
      async (req: Request, res: Response) => {
        await this.handleStandaloneChatDelete(req, res);
      }
    );
    app.post(ARTIFACT_UPSERT_ENDPOINT, async (req: Request, res: Response) => {
      await this.handleArtifactUpsertSave(req, res);
    });
    app.post(
      WORKSPACE_SESSION_ENDPOINT,
      async (req: Request, res: Response) => {
        await handleWorkspaceSessionCreate({
          req,
          res,
          sessionManager: this.deps.sessionManager,
          logger: this.deps.logger,
          onWorkspaceSessionCreated: this.deps.onWorkspaceSessionCreated,
        });
      }
    );
    app.post(
      WORKSPACE_ACTIVATE_ENDPOINT,
      async (req: Request, res: Response) => {
        await handleWorkspaceActivate({
          req,
          res,
          logger: this.deps.logger,
          onWorkspaceActivated: this.deps.onWorkspaceSessionCreated,
          sessionHandler: this.deps.sessionHandler,
        });
      }
    );
    app.post(WORKSPACE_FILE_ENDPOINT, async (req: Request, res: Response) => {
      await handleWorkspaceFileRead(
        req,
        res,
        this.deps.sessionManager,
        this.deps.logger
      );
    });
    app.post(
      WORKSPACE_FILE_WRITE_ENDPOINT,
      async (req: Request, res: Response) => {
        await handleWorkspaceFileWrite(
          req,
          res,
          this.deps.sessionManager,
          this.deps.logger
        );
      }
    );
  }

  async handleArtifactUpsertSave(req: Request, res: Response): Promise<void> {
    const parsedPayload = parseArtifactUpsertPayload(req.body as unknown);
    if (!parsedPayload.ok) {
      res.status(HTTP_BAD_REQUEST).json({ error: parsedPayload.error });
      return;
    }
    const { sessionId, artifacts } = parsedPayload.value;
    if (artifacts.length === 0) {
      res.status(HTTP_NO_CONTENT).end();
      return;
    }
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      res
        .status(HTTP_NOT_FOUND)
        .json({ error: `Session ${sessionId} not found` });
      return;
    }
    const planResult = await buildWorkflowStageArtifactUpsertPlan({
      workspacePath: session.workspacePath,
      sessionContext: {
        initiativeSlug: session.initiativeSlug,
        runSlug: session.runSlug,
        stage: session.stage,
      },
      artifacts,
    });
    if (!planResult.ok) {
      res.status(HTTP_BAD_REQUEST).json({ error: planResult.error });
      return;
    }
    const writeResult = await writeArtifactUpsertPlan(planResult.value);
    if (!writeResult.ok) {
      this.deps.logger.error(
        "Failed to write artifact upserts",
        writeResult.error,
        {
          sessionId,
        }
      );
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to write artifact upsert" });
      return;
    }
    res.json({
      saved: planResult.value.upserts.map((upsert) => ({
        slot: upsert.slot,
        path: upsert.relativePath,
        changed: upsert.changed,
      })),
    });
  }

  private async handleSessionHistory(
    req: Request,
    res: Response
  ): Promise<void> {
    const sessionId = req.params.sessionId;
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      res
        .status(HTTP_NOT_FOUND)
        .json({ error: `Session ${sessionId} not found` });
      return;
    }
    try {
      const messages = await this.deps.sessionStorage.readMessages(session);
      res.json({
        sessionId: session.id,
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          ...(typeof message.localizedContent === "string"
            ? { localizedContent: message.localizedContent }
            : {}),
          timestamp: message.timestamp,
          sessionId: message.sessionId,
        })),
      });
    } catch (error) {
      this.deps.logger.error("Failed to read session history", error as Error, {
        sessionId: session.id,
      });
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to read session history" });
    }
  }

  private async handleStandaloneChats(
    req: Request,
    res: Response
  ): Promise<void> {
    const workspacePath =
      typeof req.query.workspacePath === "string"
        ? req.query.workspacePath.trim()
        : "";
    if (!(workspacePath && path.isAbsolute(workspacePath))) {
      res.status(HTTP_BAD_REQUEST).json({ error: "workspacePath is required" });
      return;
    }
    try {
      const chats = await this.deps.sessionStorage.listStandaloneWorkspaceChats(
        {
          liveSessions:
            this.deps.sessionManager.getSessionsByWorkspacePath(workspacePath),
          workspacePath,
        }
      );
      res.json({ chats });
    } catch (error) {
      this.deps.logger.error(
        "Failed to list standalone workspace chats",
        error as Error,
        { workspacePath }
      );
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to list standalone chats" });
    }
  }

  private async handleStandaloneChatRename(
    req: Request,
    res: Response
  ): Promise<void> {
    const body =
      typeof req.body === "object" && req.body !== null
        ? (req.body as Record<string, unknown>)
        : {};
    const workspacePath = readTextField(body, "workspacePath");
    const providerId = readTextField(body, "providerId");
    const providerSessionId = readTextField(body, "providerSessionId");
    const title = readTextField(body, "title");
    if (
      !(
        workspacePath &&
        path.isAbsolute(workspacePath) &&
        providerId &&
        providerSessionId &&
        title
      )
    ) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: "Invalid chat rename request" });
      return;
    }
    try {
      await renameStandaloneWorkspaceChat({
        providerId,
        providerSessionId,
        title,
        workspacePath,
      });
      res.json({ ok: true });
    } catch (error) {
      this.deps.logger.error(
        "Failed to rename standalone workspace chat",
        error as Error,
        { providerId, providerSessionId, workspacePath }
      );
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to rename standalone chat" });
    }
  }

  private async handleStandaloneChatDelete(
    req: Request,
    res: Response
  ): Promise<void> {
    const workspacePath =
      typeof req.query.workspacePath === "string"
        ? req.query.workspacePath.trim()
        : "";
    const providerId =
      typeof req.query.providerId === "string"
        ? req.query.providerId.trim()
        : "";
    const providerSessionId =
      typeof req.query.providerSessionId === "string"
        ? req.query.providerSessionId.trim()
        : "";
    if (
      !(
        workspacePath &&
        path.isAbsolute(workspacePath) &&
        providerId &&
        providerSessionId
      )
    ) {
      res
        .status(HTTP_BAD_REQUEST)
        .json({ error: "Invalid chat delete request" });
      return;
    }
    try {
      await deleteStandaloneWorkspaceChat({
        providerId,
        providerSessionId,
        workspacePath,
      });
      res.status(HTTP_NO_CONTENT).end();
    } catch (error) {
      this.deps.logger.error(
        "Failed to delete standalone workspace chat",
        error as Error,
        { providerId, providerSessionId, workspacePath }
      );
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to delete standalone chat" });
    }
  }
}
