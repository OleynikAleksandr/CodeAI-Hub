import { randomUUID } from "node:crypto";
import http from "node:http";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import type { CoreConfig } from "../config";
import type { FileDropService } from "../file-drop/file-drop-service";
import type { ProviderRegistry } from "../provider-registry";
import type { ProjectRegistry } from "../services/project-registry/project-registry";
import type { WorkspaceProject } from "../services/project-registry/types";
import type { Session, SessionManager } from "../session-manager";
import type {
  RuntimeStatusEvent,
  RuntimeStatusReporter,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";
import { UnifiedSessionStorage } from "../unified-session/storage";
import { ProjectRequestHandler } from "./handlers/project-request-handler";
import { SessionRequestHandler } from "./handlers/session-request-handler";
import { SystemRequestHandler } from "./handlers/system-request-handler";

type ClientSocket = {
  readonly id: string;
  readonly socket: WebSocket;
};

type BridgeEvent =
  | { readonly type: "core:state"; readonly payload: CoreStatePayload }
  | { readonly type: "session:created"; readonly payload: unknown }
  | { readonly type: "session:message"; readonly payload: unknown }
  | {
      readonly type: "session:binding";
      readonly payload: {
        readonly sessionId: string;
        readonly providerSessionId: string | null;
        readonly status: "pending" | "ready" | "failed";
      };
    }
  | {
      readonly type: "session:deleted";
      readonly payload: { readonly sessionId: string };
    }
  | {
      readonly type: "session:stream";
      readonly payload: { readonly sessionId: string; readonly event: unknown };
    }
  | { readonly type: "session:error"; readonly payload: unknown }
  | { readonly type: "core:notification"; readonly payload: unknown }
  | {
      readonly type: "core:loading-status";
      readonly payload: RuntimeStatusEvent;
    }
  | {
      readonly type: "projects:update";
      readonly payload: { readonly projects: readonly WorkspaceProject[] };
    };

type SerializedSession = {
  readonly id: string;
  readonly providerId: string;
  readonly workspacePath: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly providerSessionId: string | null;
  readonly providerSessionStatus: "pending" | "ready" | "failed";
};

type CoreStatePayload = {
  readonly sessions: readonly SerializedSession[];
  readonly providers: ReturnType<ProviderRegistry["listProviders"]>;
};

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

type IncomingMessage =
  | {
      readonly type: "session:create";
      readonly payload: {
        readonly providerId?: string;
        readonly workspacePath?: string;
      };
    }
  | {
      readonly type: "session:message";
      readonly payload: {
        readonly sessionId: string;
        readonly content: string;
      };
    }
  | {
      readonly type: "session:delete";
      readonly payload: {
        readonly sessionId: string;
      };
    }
  | {
      readonly type: "projects:list";
    }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    };

const HTTP_NO_CONTENT = 204;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_FOUND = 404;

export class RemoteBridge {
  private readonly config: CoreConfig;

  private readonly sessionManager: SessionManager;

  private readonly providerRegistry: ProviderRegistry;

  private readonly projectRegistry: ProjectRegistry;

  private readonly projectHandler: ProjectRequestHandler;

  private readonly sessionHandler: SessionRequestHandler;

  private readonly systemHandler: SystemRequestHandler;

  private readonly logger: Logger;

  private readonly version: string;

  private readonly hooks: RemoteBridgeHooks;

  private readonly statusReporter: RuntimeStatusReporter;

  private readonly getTtlState?: () => CoreTtlState;

  private readonly fileDropService: FileDropService;

  private latestStatus: RuntimeStatusEvent | null = null;

  private unsubscribeStatus?: () => void;

  private app?: express.Express;

  private httpServer?: http.Server;

  private wsServer?: WebSocketServer;

  private readonly clients: Map<string, ClientSocket> = new Map();

  private readonly sessionStorage: UnifiedSessionStorage;

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
    this.projectRegistry = options.projectRegistry;
    this.logger = options.logger;
    this.version = options.version;
    this.hooks = options.hooks ?? {};
    this.statusReporter = options.statusReporter;
    this.getTtlState = options.getTtlState;
    this.fileDropService = options.fileDropService;
    this.sessionStorage = new UnifiedSessionStorage({
      workspaceSlug: this.config.claudeProjectSlug,
      logger: this.logger,
    });
    this.projectHandler = new ProjectRequestHandler(
      this.projectRegistry,
      (event) => this.broadcast(event)
    );
    this.sessionHandler = new SessionRequestHandler({
      config: this.config,
      sessionManager: this.sessionManager,
      providerRegistry: this.providerRegistry,
      sessionStorage: this.sessionStorage,
      logger: this.logger,
      broadcaster: (event) => this.broadcast(event as BridgeEvent),
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
      () => this.hooks.onShutdownRequested?.()
    );
    this.latestStatus = this.statusReporter.snapshot();
    this.unsubscribeStatus = this.statusReporter.subscribe((event) => {
      this.latestStatus = event;
      this.broadcast({
        type: "core:loading-status",
        payload: event,
      });
    });
  }

  async start(): Promise<void> {
    if (this.httpServer) {
      return;
    }

    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.registerHttpRoutes();

    this.httpServer = http.createServer(this.app);
    this.wsServer = new WebSocketServer({
      server: this.httpServer,
      path: "/api/v1/stream",
    });

    this.wsServer.on("connection", (socket: WebSocket) => {
      try {
        this.handleClientConnection(socket);
      } catch (error) {
        this.logger.error(
          "Failed to handle websocket connection",
          error as Error
        );
      }
    });

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
    this.unsubscribeStatus = undefined;
    for (const { socket } of this.clients.values()) {
      try {
        socket.close();
      } catch {
        // ignore silently
      }
    }
    this.clients.clear();

    if (this.wsServer) {
      await new Promise<void>((resolve) => {
        this.wsServer?.close(() => resolve());
      });
      this.wsServer = undefined;
    }

    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => resolve());
      });
      this.httpServer = undefined;
    }
  }

  broadcast(event: BridgeEvent): void {
    const serialized = JSON.stringify(event);
    for (const { socket } of this.clients.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      }
    }
  }

  getActiveClientCount(): number {
    return this.clients.size;
  }

  private registerHttpRoutes(): void {
    if (!this.app) {
      return;
    }

    this.app.get("/api/v1/health", (req: Request, res: Response) => {
      this.systemHandler.handleHealth(req, res, this.getActiveClientCount());
    });

    this.app.get("/api/v1/status", (req: Request, res: Response) => {
      this.systemHandler.handleStatus(req, res, {
        clientCount: this.getActiveClientCount(),
        ttlState: this.getTtlState?.(),
        sessionData: this.serializeSessions(),
        providerData: this.providerRegistry.listProviders(),
      });
    });

    this.app.post("/api/v1/shutdown", (req: Request, res: Response) => {
      this.systemHandler.handleShutdown(req, res);
    });

    this.app.get(
      "/api/v1/sessions/:sessionId/history",
      async (req: Request, res: Response) => {
        const sessionId = req.params.sessionId;
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
          res.status(HTTP_NOT_FOUND).json({
            error: `Session ${sessionId} not found`,
          });
          return;
        }
        try {
          const messages = await this.sessionStorage.readMessages(session);
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
          this.logger.error("Failed to read session history", error as Error, {
            sessionId: session.id,
          });
          res.status(HTTP_INTERNAL_ERROR).json({
            error: "Unable to read session history",
          });
        }
      }
    );

    this.app.post("/api/v1/file-drop", async (_req: Request, res: Response) => {
      try {
        const snapshot = await this.fileDropService.collect();
        if (!snapshot) {
          res.status(HTTP_NO_CONTENT).end();
          return;
        }
        res.json({
          paths: snapshot.paths,
          formatted: snapshot.formatted,
        });
      } catch (error) {
        this.logger.error("File drop capture failed", error as Error);
        res.status(HTTP_INTERNAL_ERROR).json({
          error: "Unable to capture file drop data",
        });
      }
    });

    this.app.delete("/api/v1/file-drop", (_req: Request, res: Response) => {
      this.fileDropService.clear();
      res.status(HTTP_NO_CONTENT).end();
    });
  }

  private handleClientConnection(socket: WebSocket): void {
    const clientId = randomUUID();
    this.clients.set(clientId, { id: clientId, socket });
    this.logger.info("Client connected", { clientId });
    this.hooks.onClientConnected?.(clientId, this.getActiveClientCount());

    socket.on("message", async (data) => {
      try {
        await this.handleIncomingMessage(clientId, socket, data.toString());
      } catch (error) {
        this.logger.error("Failed to process client message", error as Error, {
          clientId,
        });
      }
    });

    socket.on("close", () => {
      this.clients.delete(clientId);
      this.logger.info("Client disconnected", { clientId });
      this.hooks.onClientDisconnected?.(clientId, this.getActiveClientCount());
    });

    socket.send(
      JSON.stringify({
        type: "core:state",
        payload: this.buildInitialState(),
      })
    );
    const latestStatus = this.latestStatus ?? this.statusReporter.snapshot();
    if (latestStatus) {
      socket.send(
        JSON.stringify({
          type: "core:loading-status",
          payload: latestStatus,
        })
      );
    }
  }

  private buildInitialState(): CoreStatePayload {
    return {
      sessions: this.serializeSessions(),
      providers: this.providerRegistry.listProviders(),
    };
  }

  private serializeSessions(): readonly SerializedSession[] {
    return this.sessionManager
      .listSessions()
      .map((session) => this.serializeSession(session));
  }

  private serializeSession(session: Session): SerializedSession {
    return {
      id: session.id,
      providerId: session.providerId,
      workspacePath: session.workspacePath,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      providerSessionId: session.providerSessionId ?? null,
      providerSessionStatus: session.providerSessionStatus,
    };
  }

  private async handleIncomingMessage(
    clientId: string,
    socket: WebSocket,
    rawMessage: string
  ): Promise<void> {
    let incoming: IncomingMessage;
    try {
      incoming = JSON.parse(rawMessage) as IncomingMessage;
    } catch {
      socket.send(
        JSON.stringify({
          type: "session:error",
          payload: { message: "Invalid JSON payload" },
        })
      );
      return;
    }

    switch (incoming.type) {
      case "session:create":
        await this.sessionHandler.handleCreate(
          incoming.payload?.providerId,
          incoming.payload?.workspacePath
        );
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
        this.handleProjectsList();
        break;
      case "projects:add":
        this.handleProjectsAdd(incoming.payload.path, incoming.payload.name);
        break;
      case "projects:remove":
        this.handleProjectsRemove(incoming.payload.id);
        break;
      default:
        this.logger.warn("Unsupported message", { clientId, incoming });
        break;
    }
  }

  private handleProjectsList(): void {
    this.projectHandler.handleList();
  }

  private handleProjectsAdd(path: string, name?: string): void {
    this.projectHandler.handleAdd(path, name);
  }

  private handleProjectsRemove(id: string): void {
    this.projectHandler.handleRemove(id);
  }
}
