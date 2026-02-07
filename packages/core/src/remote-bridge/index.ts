import http from "node:http";
import cors from "cors";
import express from "express";
import type { WebSocket } from "ws";
import type { CoreConfig } from "../config";
import type { FileDropService } from "../file-drop/file-drop-service";
import type { ProviderRegistry } from "../provider-registry";
import type { ProjectRegistry } from "../services/project-registry/project-registry";
import type { SessionManager } from "../session-manager";
import type {
  RuntimeStatusEvent,
  RuntimeStatusReporter,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";
import { UnifiedSessionStorage } from "../unified-session/storage";
import { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import { HttpApiRouter } from "./handlers/http-api-router";
import { ProjectRequestHandler } from "./handlers/project-request-handler";
import { SessionRequestHandler } from "./handlers/session-request-handler";
import { SettingsRequestHandler } from "./handlers/settings-request-handler";
import { SystemRequestHandler } from "./handlers/system-request-handler";
import { WebSocketManager } from "./handlers/websocket-manager";
import { WorkflowEventsService } from "./handlers/workflow-events-service";
import {
  type BridgeEvent,
  type CoreStatePayload,
  type IncomingMessage,
  serializeSession,
} from "./types";

export type CoreTtlState = {
  readonly idleTtlMs: number | null;
  readonly lastActivityAt: string | null;
  readonly idleSince: string | null;
  readonly secondsUntilShutdown: number | null;
};

type RemoteBridgeHooks = {
  readonly onClientConnected?: (clientId: string, total: number) => void;
  readonly onClientDisconnected?: (clientId: string, total: number) => void;
  readonly onShutdownRequested?: () => void;
};

export class RemoteBridge {
  private readonly config: CoreConfig;
  private readonly sessionManager: SessionManager;
  private readonly providerRegistry: ProviderRegistry;
  private readonly logger: Logger;
  private readonly version: string;
  private readonly hooks: RemoteBridgeHooks;
  private readonly statusReporter: RuntimeStatusReporter;
  private readonly getTtlState?: () => CoreTtlState;
  private readonly fileDropService: FileDropService;
  private readonly sessionStorage: UnifiedSessionStorage;
  private readonly workflowEventsService: WorkflowEventsService;

  private readonly projectHandler: ProjectRequestHandler;
  private readonly sessionHandler: SessionRequestHandler;
  private readonly systemHandler: SystemRequestHandler;
  private readonly settingsHandler: SettingsRequestHandler;
  private readonly workflowRuntime: WorkflowRuntime;
  private wsManager?: WebSocketManager;
  private httpServer?: http.Server;
  private latestStatus: RuntimeStatusEvent | null = null;
  private readonly unsubscribeStatus?: () => void;

  constructor(options: {
    readonly config: CoreConfig;
    readonly sessionManager: SessionManager;
    readonly providerRegistry: ProviderRegistry;
    readonly projectRegistry: ProjectRegistry;
    readonly logger: Logger;
    readonly version: string;
    readonly hooks?: RemoteBridgeHooks;
    readonly statusReporter: RuntimeStatusReporter;
    readonly getTtlState?: () => CoreTtlState;
    readonly fileDropService: FileDropService;
  }) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.logger = options.logger;
    this.version = options.version;
    this.hooks = options.hooks ?? {};
    this.statusReporter = options.statusReporter;
    this.getTtlState = options.getTtlState;
    this.fileDropService = options.fileDropService;
    this.workflowEventsService = new WorkflowEventsService({
      logger: this.logger,
    });
    this.sessionStorage = new UnifiedSessionStorage({
      workspaceSlug: this.config.claudeProjectSlug,
      logger: this.logger,
    });

    this.projectHandler = new ProjectRequestHandler(
      options.projectRegistry,
      (event) => {
        this.broadcast(event);
      }
    );

    this.sessionHandler = new SessionRequestHandler({
      config: this.config,
      sessionManager: this.sessionManager,
      providerRegistry: this.providerRegistry,
      sessionStorage: this.sessionStorage,
      logger: this.logger,
      continuityClock: () => new Date().toISOString(),
      broadcaster: (event) => {
        this.broadcast(event as BridgeEvent);
      },
      stateBroadcaster: () =>
        this.broadcast({
          type: "core:state",
          payload: this.buildInitialState(),
        }),
    });

    this.systemHandler = new SystemRequestHandler(
      this.config,
      this.version,
      this.logger,
      () => {
        this.hooks.onShutdownRequested?.();
      }
    );

    this.settingsHandler = new SettingsRequestHandler({
      config: this.config,
      logger: this.logger,
      broadcaster: (event) => {
        this.broadcast(event as BridgeEvent);
      },
    });

    this.workflowRuntime = new WorkflowRuntime({
      logger: this.logger,
      providerRegistry: this.providerRegistry,
      sessionHandler: this.sessionHandler,
      onWatcherEvent: (event) => {
        this.workflowEventsService.record(event);
      },
    });

    this.latestStatus = this.statusReporter.snapshot();
    this.unsubscribeStatus = this.statusReporter.subscribe((event) => {
      this.latestStatus = event;
      this.broadcast({ type: "core:loading-status", payload: event });
    });
  }

  async start(): Promise<void> {
    if (this.httpServer) {
      return;
    }

    const app = express();
    app.use(cors());
    app.use(express.json());

    const router = new HttpApiRouter({
      app,
      systemHandler: this.systemHandler,
      fileDropService: this.fileDropService,
      sessionHandler: this.sessionHandler,
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      logger: this.logger,
      workflowEventsService: this.workflowEventsService,
      onWorkspaceSessionCreated: async (workspacePath, workspaceSlug) => {
        await this.workflowRuntime.connectWorkspace({
          workspaceRoot: workspacePath,
          workspaceSlug,
        });
      },
      getStatusInfo: () => ({
        clientCount: this.wsManager?.getClientCount() ?? 0,
        ttlState: this.getTtlState?.(),
        sessionData: this.buildInitialState().sessions,
        providerData: this.providerRegistry.listProviders(),
      }),
    });
    router.registerRoutes();

    this.httpServer = http.createServer(app);
    this.wsManager = new WebSocketManager({
      httpServer: this.httpServer,
      logger: this.logger,
      onIncomingMessage: this.handleIncomingMessage.bind(this),
      onClientConnected: (id, count) =>
        this.hooks.onClientConnected?.(id, count),
      onClientDisconnected: (id, count) =>
        this.hooks.onClientDisconnected?.(id, count),
      getInitialState: () => this.buildInitialState(),
      getLatestStatus: () =>
        this.latestStatus ?? this.statusReporter.snapshot(),
    });
    this.wsManager.start();

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(this.config.port, this.config.host, () => {
        this.logger.info("Remote bridge started", {
          host: this.config.host,
          port: this.config.port,
        });
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.unsubscribeStatus?.();
    this.wsManager?.stop();
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => {
          resolve();
        });
      });
      this.httpServer = undefined;
    }
  }

  broadcast(event: BridgeEvent): void {
    this.wsManager?.broadcast(event);
  }

  private buildInitialState(): CoreStatePayload {
    return {
      sessions: this.sessionManager
        .listSessions()
        .map((session) => serializeSession(session)),
      providers: this.providerRegistry.listProviders(),
    };
  }

  private async handleIncomingMessage(
    clientId: string,
    _socket: WebSocket,
    incoming: IncomingMessage
  ): Promise<void> {
    switch (incoming.type) {
      case "session:create":
        await this.sessionHandler.handleCreate(
          incoming.payload?.providerId,
          incoming.payload?.workspacePath,
          {
            initiativeSlug: incoming.payload?.initiativeSlug ?? null,
            providerSessionId: incoming.payload?.providerSessionId ?? null,
            stage: incoming.payload?.stage ?? null,
            runSlug: incoming.payload?.runSlug ?? null,
          }
        );
        break;
      case "settings:load":
        await this.settingsHandler.handleLoad();
        break;
      case "session:message":
        await this.sessionHandler.handleMessage(
          incoming.payload.sessionId,
          incoming.payload.content
        );
        break;
      case "session:delete":
        await this.sessionHandler.handleDelete(incoming.payload.sessionId);
        break;
      case "projects:list":
        this.projectHandler.handleList();
        break;
      case "projects:add":
        this.projectHandler.handleAdd(
          incoming.payload.path,
          incoming.payload.name
        );
        break;
      case "projects:remove":
        this.projectHandler.handleRemove(incoming.payload.id);
        break;
      case "workspace:scope:set":
        this.handleWorkspaceScopeSet(clientId, incoming.payload);
        break;
      default:
        break;
    }
  }

  private handleWorkspaceScopeSet(clientId: string, payload: unknown): void {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const ack = wsManager.setWorkspaceScope(clientId, payload);
    wsManager.sendToClient(clientId, {
      type: "workspace:scope:ack",
      payload: ack,
    });
  }
}
