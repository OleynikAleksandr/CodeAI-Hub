import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Express, Request, Response } from "express";
import type { FileDropService } from "../../file-drop/file-drop-service";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import { buildIdeaContract } from "./idea-contract-service";
import { InitiativesHttpHandler } from "./initiatives-http-handler";
import { RunsHttpHandler } from "./runs-http-handler";
import type {
  StatusInfo,
  SystemRequestHandler,
} from "./system-request-handler";
import {
  handleWorkspaceFileRead,
  handleWorkspaceFileWrite,
} from "./workspace-file-service";

const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_NO_CONTENT = 204;
const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const IDEA_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/idea-artifact";
const INITIATIVES_ENDPOINT = "/api/v1/orchestrator/initiatives";
const RUNS_ENDPOINT = "/api/v1/orchestrator/initiatives/:initiativeSlug/runs";
const RUN_SELECT_CURRENT_ENDPOINT =
  "/api/v1/orchestrator/initiatives/:initiativeSlug/runs/:runId/select-current";
const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";
const IDEA_PATH_RE =
  /^\.codeai-hub\/full-development-flow\/initiatives\/[a-z0-9]+(?:-[a-z0-9]+)*\/idea\/idea\.md$/;
const VIRTUAL_SIMULATION_PATH_RE =
  /^\.codeai-hub\/full-development-flow\/initiatives\/[a-z0-9]+(?:-[a-z0-9]+)*\/idea\/virtual-simulation\.md$/;

export type RouterDependencies = {
  readonly app: Express;
  readonly systemHandler: SystemRequestHandler;
  readonly fileDropService: FileDropService;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly logger: Logger;
  readonly getStatusInfo: () => StatusInfo;
};

export class HttpApiRouter {
  private readonly deps: RouterDependencies;

  constructor(deps: RouterDependencies) {
    this.deps = deps;
  }

  registerRoutes(): void {
    const { app, systemHandler, fileDropService } = this.deps;
    const initiativesHandler = new InitiativesHttpHandler(this.deps.logger);
    const runsHandler = new RunsHttpHandler(this.deps.logger);

    app.get("/api/v1/health", (req: Request, res: Response) => {
      systemHandler.handleHealth(
        req,
        res,
        this.deps.getStatusInfo().clientCount
      );
    });

    app.get("/api/v1/status", (req: Request, res: Response) => {
      systemHandler.handleStatus(req, res, this.deps.getStatusInfo());
    });

    app.post("/api/v1/shutdown", (req: Request, res: Response) => {
      systemHandler.handleShutdown(req, res);
    });

    app.get(
      "/api/v1/sessions/:sessionId/history",
      async (req: Request, res: Response) => {
        await this.handleSessionHistory(req, res);
      }
    );

    app.post("/api/v1/file-drop", async (_req: Request, res: Response) => {
      await this.handleFileDropCollect(res);
    });

    app.delete("/api/v1/file-drop", (_req: Request, res: Response) => {
      fileDropService.clear();
      res.status(HTTP_NO_CONTENT).end();
    });

    app.get(IDEA_CONTRACT_ENDPOINT, async (_req: Request, res: Response) => {
      await this.handleIdeaContract(res);
    });

    app.post(IDEA_ARTIFACT_ENDPOINT, async (req: Request, res: Response) => {
      await this.handleIdeaArtifactSave(req, res);
    });

    app.get(INITIATIVES_ENDPOINT, async (req: Request, res: Response) => {
      await initiativesHandler.handleList(req, res);
    });

    app.post(INITIATIVES_ENDPOINT, async (req: Request, res: Response) => {
      await initiativesHandler.handleCreate(req, res);
    });

    app.get(RUNS_ENDPOINT, async (req: Request, res: Response) => {
      await runsHandler.handleList(req, res);
    });

    app.post(RUNS_ENDPOINT, async (req: Request, res: Response) => {
      await runsHandler.handleCreate(req, res);
    });

    app.post(
      RUN_SELECT_CURRENT_ENDPOINT,
      async (req: Request, res: Response) => {
        await runsHandler.handleSelectCurrent(req, res);
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

  private async handleSessionHistory(
    req: Request,
    res: Response
  ): Promise<void> {
    const sessionId = req.params.sessionId;
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      res.status(HTTP_NOT_FOUND).json({
        error: `Session ${sessionId} not found`,
      });
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
          timestamp: message.timestamp,
          sessionId: message.sessionId,
        })),
      });
    } catch (error) {
      this.deps.logger.error("Failed to read session history", error as Error, {
        sessionId: session.id,
      });
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to read session history",
      });
    }
  }

  private async handleFileDropCollect(res: Response): Promise<void> {
    try {
      const snapshot = await this.deps.fileDropService.collect();
      if (!snapshot) {
        res.status(HTTP_NO_CONTENT).end();
        return;
      }
      res.json({
        paths: snapshot.paths,
        formatted: snapshot.formatted,
      });
    } catch (error) {
      this.deps.logger.error("File drop capture failed", error as Error);
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to capture file drop data",
      });
    }
  }

  private async handleIdeaContract(res: Response): Promise<void> {
    try {
      const contract = await buildIdeaContract();
      if (!contract) {
        res.status(HTTP_NOT_FOUND).json({
          error: "Idea contract templates are unavailable",
        });
        return;
      }
      res.json(contract);
    } catch (error) {
      this.deps.logger.error("Idea contract build failed", error as Error);
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to build idea contract",
      });
    }
  }

  private async handleIdeaArtifactSave(
    req: Request,
    res: Response
  ): Promise<void> {
    const parsedPayload = parseIdeaArtifactPayload(req.body as unknown);
    if (!parsedPayload.ok) {
      res.status(HTTP_BAD_REQUEST).json({ error: parsedPayload.error });
      return;
    }
    const { sessionId, ideaMarkdown, virtualSimulationMarkdown, paths } =
      parsedPayload.value;

    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      res
        .status(HTTP_NOT_FOUND)
        .json({ error: `Session ${sessionId} not found` });
      return;
    }

    const workspaceRoot = path.resolve(session.workspacePath);
    if (!isAllowedIdeaArtifactPaths(paths)) {
      res.status(HTTP_BAD_REQUEST).json({
        error:
          "Invalid artifact paths (expected .codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/...)",
      });
      return;
    }
    const ideaPath = resolveArtifactPath(workspaceRoot, paths.idea);
    const virtualSimulationPath = resolveArtifactPath(
      workspaceRoot,
      paths.virtualSimulation
    );
    if (!(ideaPath && virtualSimulationPath)) {
      res.status(HTTP_BAD_REQUEST).json({ error: "Unsafe artifact path" });
      return;
    }

    try {
      const content = ideaMarkdown.endsWith("\n")
        ? ideaMarkdown
        : `${ideaMarkdown}\n`;
      const simulationContent = virtualSimulationMarkdown.endsWith("\n")
        ? virtualSimulationMarkdown
        : `${virtualSimulationMarkdown}\n`;
      await writeArtifactFile(ideaPath, content);
      await writeArtifactFile(virtualSimulationPath, simulationContent);
      res.json({
        paths: {
          idea: paths.idea,
          virtualSimulation: paths.virtualSimulation,
        },
      });
    } catch (error) {
      this.deps.logger.error("Failed to write Idea artifacts", error as Error, {
        sessionId,
        ideaPath: paths.idea,
        virtualSimulationPath: paths.virtualSimulation,
      });
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to write artifact" });
    }
  }
}

type IdeaArtifactPayload = {
  readonly sessionId: string;
  readonly ideaMarkdown: string;
  readonly virtualSimulationMarkdown: string;
  readonly paths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
};

type IdeaArtifactPayloadResult =
  | { readonly ok: true; readonly value: IdeaArtifactPayload }
  | { readonly ok: false; readonly error: string };

const parseIdeaArtifactPayload = (
  payload: unknown
): IdeaArtifactPayloadResult => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid payload" };
  }
  const candidate = payload as Record<string, unknown>;
  const sessionId = readNonEmptyString(candidate.sessionId);
  if (!sessionId) {
    return { ok: false, error: "Missing sessionId" };
  }
  const ideaMarkdown = readNonEmptyString(candidate.ideaMarkdown);
  if (!ideaMarkdown) {
    return { ok: false, error: "Missing ideaMarkdown" };
  }
  const virtualSimulationMarkdown =
    readNonEmptyString(candidate.virtualSimulationMarkdown) ??
    readNonEmptyString(candidate.virtual_simulation_markdown);
  if (!virtualSimulationMarkdown) {
    return { ok: false, error: "Missing virtualSimulationMarkdown" };
  }
  const ideaPath =
    readNonEmptyString(candidate.ideaPath) ??
    readNonEmptyString(candidate.idea_path);
  const virtualSimulationPath =
    readNonEmptyString(candidate.virtualSimulationPath) ??
    readNonEmptyString(candidate.virtual_simulation_path);
  if (!ideaPath) {
    return { ok: false, error: "Missing ideaPath" };
  }
  if (!virtualSimulationPath) {
    return { ok: false, error: "Missing virtualSimulationPath" };
  }
  return {
    ok: true,
    value: {
      sessionId,
      ideaMarkdown,
      virtualSimulationMarkdown,
      paths: {
        idea: ideaPath,
        virtualSimulation: virtualSimulationPath,
      },
    },
  };
};

const isAllowedIdeaArtifactPaths = (paths: {
  readonly idea: string;
  readonly virtualSimulation: string;
}): boolean =>
  IDEA_PATH_RE.test(paths.idea) &&
  VIRTUAL_SIMULATION_PATH_RE.test(paths.virtualSimulation);

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
};

const resolveArtifactPath = (
  workspaceRoot: string,
  relativePath: string
): string | null => {
  const artifactPath = path.resolve(workspaceRoot, relativePath);
  if (!artifactPath.startsWith(`${workspaceRoot}${path.sep}`)) {
    return null;
  }
  return artifactPath;
};

const writeArtifactFile = async (
  artifactPath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, content, { encoding: "utf8" });
};
