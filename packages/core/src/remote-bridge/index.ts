import { randomUUID } from "node:crypto";
import http from "node:http";
import cors from "cors";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import type { CoreConfig } from "../config";
import type { ProviderRegistry } from "../provider-registry";
import type { SessionManager } from "../session-manager";
import type { Logger } from "../telemetry/logger";

type ClientSocket = {
  readonly id: string;
  readonly socket: WebSocket;
};

type BridgeEvent =
  | { readonly type: "core:state"; readonly payload: CoreStatePayload }
  | { readonly type: "session:created"; readonly payload: unknown }
  | { readonly type: "session:message"; readonly payload: unknown }
  | { readonly type: "session:error"; readonly payload: unknown }
  | { readonly type: "core:notification"; readonly payload: unknown };

const MOCK_RESPONSE_DELAY_MS = 500;

type CoreStatePayload = {
  readonly sessions: ReturnType<SessionManager["listSessions"]>;
  readonly providers: ReturnType<ProviderRegistry["listProviders"]>;
};

type RemoteBridgeHooks = {
  readonly onClientConnected?: (clientId: string, total: number) => void;
  readonly onClientDisconnected?: (clientId: string, total: number) => void;
};

type IncomingMessage =
  | {
      readonly type: "session:create";
      readonly payload: { readonly providerId?: string };
    }
  | {
      readonly type: "session:message";
      readonly payload: {
        readonly sessionId: string;
        readonly content: string;
      };
    };

export class RemoteBridge {
  private readonly config: CoreConfig;

  private readonly sessionManager: SessionManager;

  private readonly providerRegistry: ProviderRegistry;

  private readonly logger: Logger;

  private readonly version: string;

  private readonly hooks: RemoteBridgeHooks;

  private app?: express.Express;

  private httpServer?: http.Server;

  private wsServer?: WebSocketServer;

  private readonly clients: Map<string, ClientSocket> = new Map();

  constructor(options: {
    readonly config: CoreConfig;
    readonly sessionManager: SessionManager;
    readonly providerRegistry: ProviderRegistry;
    readonly logger: Logger;
    readonly version: string;
    readonly hooks?: RemoteBridgeHooks;
  }) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.logger = options.logger;
    this.version = options.version;
    this.hooks = options.hooks ?? {};
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

    this.wsServer.on("connection", (socket) => {
      try {
        this.handleClientConnection(socket);
      } catch (error) {
        this.logger.error("Failed to handle websocket connection", error);
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

    this.app.get("/api/v1/health", (_req, res) => {
      res.json({
        status: "ok",
        version: this.version,
        uptime: process.uptime(),
        clients: this.getActiveClientCount(),
      });
    });

    this.app.get("/api/v1/status", (_req, res) => {
      res.json({
        core: {
          version: this.version,
          uptime: process.uptime(),
          host: this.config.host,
          port: this.config.port,
          clients: this.getActiveClientCount(),
        },
        sessions: this.sessionManager.listSessions(),
        providers: this.providerRegistry.listProviders(),
      });
    });
  }

  private handleClientConnection(socket: WebSocket): void {
    const clientId = randomUUID();
    this.clients.set(clientId, { id: clientId, socket });
    this.logger.info("Client connected", { clientId });
    this.hooks.onClientConnected?.(clientId, this.getActiveClientCount());

    socket.on("message", (data) => {
      try {
        this.handleIncomingMessage(clientId, socket, data.toString());
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
  }

  private buildInitialState(): CoreStatePayload {
    return {
      sessions: this.sessionManager.listSessions(),
      providers: this.providerRegistry.listProviders(),
    };
  }

  private handleIncomingMessage(
    clientId: string,
    socket: WebSocket,
    rawMessage: string
  ): void {
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
        this.handleSessionCreate(incoming.payload?.providerId);
        break;
      case "session:message":
        this.handleSessionMessage(
          incoming.payload.sessionId,
          incoming.payload.content
        );
        break;
      default:
        this.logger.warn("Unsupported message", { clientId, incoming });
        break;
    }
  }

  private handleSessionCreate(providerId?: string): void {
    const actualProviderId = providerId ?? "codex";
    const session = this.sessionManager.createSession(actualProviderId);
    this.broadcast({
      type: "session:created",
      payload: session,
    });
  }

  private handleSessionMessage(sessionId: string, content: string): void {
    const userMessage = this.sessionManager.appendMessage(
      sessionId,
      "user",
      content
    );
    if (!userMessage) {
      this.broadcast({
        type: "session:error",
        payload: {
          sessionId,
          message: "Session not found",
        },
      });
      return;
    }

    this.broadcast({
      type: "session:message",
      payload: userMessage,
    });

    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }

    setTimeout(() => {
      const assistantMessage = this.sessionManager.appendMessage(
        sessionId,
        "assistant",
        `Mock response from ${session.providerId}: ${content}`
      );

      if (assistantMessage) {
        this.broadcast({
          type: "session:message",
          payload: assistantMessage,
        });
      }
    }, MOCK_RESPONSE_DELAY_MS);
  }
}
