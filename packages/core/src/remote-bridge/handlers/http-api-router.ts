import type { Express, Request, Response } from "express";
import type { FileDropService } from "../../file-drop/file-drop-service";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import { HttpApiSessionRoutes } from "./http-api-session-routes";
import {
  HTTP_NO_CONTENT,
  handleFileDropCollect,
  handleIdeaContract,
  handleWorkflowContract,
} from "./http-api-system-routes";
import {
  buildDescriptionContract,
  buildDiagramModulesContract,
  buildVirtualSimulationContract,
} from "./idea-contract-service";
import { InitiativesHttpHandler } from "./initiatives-http-handler";
import type { SessionRequestHandler } from "./session-request-handler";
import type {
  StatusInfo,
  SystemRequestHandler,
} from "./system-request-handler";
import { handleWorkflowArtifactRead } from "./workflow-artifact-http-handler";
import type { WorkflowEventsService } from "./workflow-events-service";
import type { WorkflowStateService } from "./workflow-state-service";

const INITIATIVES_ENDPOINT = "/api/v1/orchestrator/initiatives";
const WORKFLOW_STATE_ENDPOINT = "/api/v1/orchestrator/workflow-state";
const WORKFLOW_EVENTS_ENDPOINT = "/api/v1/orchestrator/workflow-events";
const WORKFLOW_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/workflow-artifact";

export interface RouterDependencies {
  readonly app: Express;
  readonly fileDropService: FileDropService;
  readonly getStatusInfo: () => StatusInfo;
  readonly logger: Logger;
  readonly onWorkspaceSessionCreated?: (
    workspacePath: string,
    workspaceSlug: string
  ) => Promise<void> | void;
  readonly sessionHandler: SessionRequestHandler;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly systemHandler: SystemRequestHandler;
  readonly workflowEventsService: WorkflowEventsService;
  readonly workflowStateService: WorkflowStateService;
}

export class HttpApiRouter {
  private readonly deps: RouterDependencies;
  private readonly sessionRoutes: HttpApiSessionRoutes;

  constructor(deps: RouterDependencies) {
    this.deps = deps;
    this.sessionRoutes = new HttpApiSessionRoutes(this.deps);
  }

  registerRoutes(): void {
    const { app, fileDropService, systemHandler } = this.deps;
    const initiativesHandler = new InitiativesHttpHandler(this.deps.logger);

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
    app.post("/api/v1/file-drop", async (_req: Request, res: Response) => {
      await handleFileDropCollect(this.deps, res);
    });
    app.delete("/api/v1/file-drop", (_req: Request, res: Response) => {
      fileDropService.clear();
      res.status(HTTP_NO_CONTENT).end();
    });
    app.get(
      "/api/v1/orchestrator/idea-contract",
      async (_req: Request, res: Response) => {
        await handleIdeaContract(this.deps, res);
      }
    );
    app.get(
      "/api/v1/orchestrator/description-contract",
      async (_req: Request, res: Response) => {
        await handleWorkflowContract(
          this.deps,
          res,
          buildDescriptionContract,
          "Description"
        );
      }
    );
    app.get(
      "/api/v1/orchestrator/virtual-simulation-contract",
      async (_req: Request, res: Response) => {
        await handleWorkflowContract(
          this.deps,
          res,
          buildVirtualSimulationContract,
          "Virtual simulation"
        );
      }
    );
    app.get(
      "/api/v1/orchestrator/diagram-modules-contract",
      async (_req: Request, res: Response) => {
        await handleWorkflowContract(
          this.deps,
          res,
          buildDiagramModulesContract,
          "Diagram modules"
        );
      }
    );
    app.get(INITIATIVES_ENDPOINT, async (req: Request, res: Response) => {
      await initiativesHandler.handleList(req, res);
    });
    app.post(INITIATIVES_ENDPOINT, async (req: Request, res: Response) => {
      await initiativesHandler.handleCreate(req, res);
    });
    app.get(WORKFLOW_STATE_ENDPOINT, (req: Request, res: Response) => {
      this.deps.workflowStateService.handleWorkflowStateRead(req, res);
    });
    app.get(WORKFLOW_EVENTS_ENDPOINT, (req: Request, res: Response) => {
      this.deps.workflowEventsService.handleWorkflowEventsRead(req, res);
    });
    app.get(WORKFLOW_ARTIFACT_ENDPOINT, async (req: Request, res: Response) => {
      await handleWorkflowArtifactRead(req, res);
    });
    this.sessionRoutes.registerRoutes();
  }

  private async handleArtifactUpsertSave(
    req: Request,
    res: Response
  ): Promise<void> {
    await this.sessionRoutes.handleArtifactUpsertSave(req, res);
  }
}
