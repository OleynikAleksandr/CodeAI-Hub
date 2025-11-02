import { randomUUID } from "node:crypto";
import http from "node:http";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import type { CoreConfig } from "../config";
import type { ProviderRegistry } from "../provider-registry";
import type { SessionManager } from "../session-manager";
import type {
  RuntimeStatusEvent,
  RuntimeStatusReporter,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";

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
    };

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
    }
  | {
      readonly type: "session:delete";
      readonly payload: {
        readonly sessionId: string;
      };
    };

type ProviderSessionBinding = {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
};

type ProviderEventEnvelope = {
  readonly type?: string;
  readonly payload?: unknown;
};

type SessionIdChangedPayload = {
  readonly newId?: string;
};

const isSessionIdChangedPayload = (
  value: unknown
): value is SessionIdChangedPayload =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { readonly newId?: unknown }).newId === "string";

export class RemoteBridge {
  private readonly config: CoreConfig;

  private readonly sessionManager: SessionManager;

  private readonly providerRegistry: ProviderRegistry;

  private readonly logger: Logger;

  private readonly version: string;

  private readonly hooks: RemoteBridgeHooks;

  private readonly statusReporter: RuntimeStatusReporter;

  private latestStatus: RuntimeStatusEvent | null = null;

  private unsubscribeStatus?: () => void;

  private app?: express.Express;

  private httpServer?: http.Server;

  private wsServer?: WebSocketServer;

  private readonly clients: Map<string, ClientSocket> = new Map();

  private readonly providerSessions = new Map<string, ProviderSessionBinding>();

  constructor(options: {
    readonly config: CoreConfig;
    readonly sessionManager: SessionManager;
    readonly providerRegistry: ProviderRegistry;
    readonly logger: Logger;
    readonly version: string;
    readonly hooks?: RemoteBridgeHooks;
    readonly statusReporter: RuntimeStatusReporter;
  }) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.logger = options.logger;
    this.version = options.version;
    this.hooks = options.hooks ?? {};
    this.statusReporter = options.statusReporter;
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

    this.app.get("/api/v1/health", (_req: Request, res: Response) => {
      res.json({
        status: "ok",
        version: this.version,
        uptime: process.uptime(),
        clients: this.getActiveClientCount(),
      });
    });

    this.app.get("/api/v1/status", (_req: Request, res: Response) => {
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
    if (this.latestStatus) {
      socket.send(
        JSON.stringify({
          type: "core:loading-status",
          payload: this.latestStatus,
        })
      );
    }
  }

  private buildInitialState(): CoreStatePayload {
    return {
      sessions: this.sessionManager.listSessions(),
      providers: this.providerRegistry.listProviders(),
    };
  }

  private getDefaultProviderId(): string {
    return this.providerRegistry.listProviders()[0]?.id ?? "claudeCodeCli";
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
        await this.handleSessionCreate(incoming.payload?.providerId);
        break;
      case "session:message":
        await this.handleSessionMessage(
          incoming.payload.sessionId,
          incoming.payload.content
        );
        break;
      case "session:delete":
        await this.handleSessionDelete(incoming.payload.sessionId);
        break;
      default:
        this.logger.warn("Unsupported message", { clientId, incoming });
        break;
    }
  }

  private async handleSessionCreate(providerId?: string): Promise<void> {
    const actualProviderId = providerId ?? this.getDefaultProviderId();
    const adapter = this.providerRegistry.getAdapter(actualProviderId);
    if (!adapter) {
      this.broadcast({
        type: "session:error",
        payload: { message: `Provider ${actualProviderId} unavailable` },
      });
      return;
    }
    const providerSessionId = await adapter.createSession();
    const session = this.sessionManager.createSession(
      actualProviderId,
      providerSessionId
    );
    const unsubscribe = adapter.subscribe(
      providerSessionId,
      (event: unknown) => {
        this.handleProviderEvent(session.id, event);
      }
    );
    this.providerSessions.set(session.id, {
      providerId: actualProviderId,
      providerSessionId,
      unsubscribe,
    });
    this.broadcast({
      type: "session:created",
      payload: session,
    });
    this.broadcastSessionBinding(session.id);
  }

  private async handleSessionMessage(
    sessionId: string,
    content: string
  ): Promise<void> {
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

    const binding = this.providerSessions.get(sessionId);
    if (!binding) {
      this.logger.warn("Provider binding missing for session", { sessionId });
      return;
    }
    const adapter = this.providerRegistry.getAdapter(binding.providerId);
    if (!adapter) {
      this.logger.warn("Adapter missing for provider", { binding });
      return;
    }
    await adapter.sendMessage(binding.providerSessionId, content);
  }

  private async handleSessionDelete(sessionId: string): Promise<void> {
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      const adapter = this.providerRegistry.getAdapter(binding.providerId);
      binding.unsubscribe();
      this.providerSessions.delete(sessionId);
      await adapter?.closeSession(binding.providerSessionId);
    }
    const deleted = this.sessionManager.deleteSession(sessionId);
    if (!deleted) {
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
      type: "session:deleted",
      payload: { sessionId },
    });
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    if (!event || typeof event !== "object") {
      return;
    }
    const typed = event as ProviderEventEnvelope;
    if (
      typed.type === "sessionIdChanged" &&
      isSessionIdChangedPayload(typed.payload)
    ) {
      const newProviderSessionId = typed.payload.newId;
      if (newProviderSessionId) {
        this.updateProviderBinding(sessionId, newProviderSessionId);
        this.sessionManager.updateProviderSessionId(
          sessionId,
          newProviderSessionId
        );
      }
      this.broadcastSessionBinding(sessionId);
      return;
    }
    if (typed.type === "stream_event") {
      this.broadcast({
        type: "session:stream",
        payload: { sessionId, event: typed },
      });
      return;
    }
    if (typed.type === "assistant" || typed.type === "system") {
      const role = typed.type === "assistant" ? "assistant" : "system";
      this.appendProviderMessage(sessionId, role, typed);
      return;
    }
    if (typed.type === "result") {
      this.appendProviderMessage(sessionId, "assistant", typed);
      return;
    }
  }

  private appendProviderMessage(
    sessionId: string,
    role: "assistant" | "system",
    event: unknown
  ): void {
    const content = this.extractMessageContent(event);
    if (!content) {
      return;
    }
    const message = this.sessionManager.appendMessage(sessionId, role, content);
    if (message) {
      this.broadcast({ type: "session:message", payload: message });
    }
  }

  private extractMessageContent(event: unknown): string | null {
    if (!event || typeof event !== "object") {
      return null;
    }
    const typed = event as {
      readonly content?: unknown;
      readonly data?: unknown;
    };
    if (typeof typed.content === "string") {
      return typed.content;
    }
    if (typed.content && typeof typed.content === "object") {
      return JSON.stringify(typed.content);
    }
    if (typed.data) {
      return JSON.stringify(typed.data);
    }
    return null;
  }

  private updateProviderBinding(
    sessionId: string,
    providerSessionId?: string
  ): void {
    if (!providerSessionId) {
      return;
    }
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      binding.providerSessionId = providerSessionId;
    }
  }

  private broadcastSessionBinding(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    this.broadcast({
      type: "session:binding",
      payload: {
        sessionId,
        providerSessionId: session.providerSessionId ?? null,
        status: session.providerSessionStatus,
      },
    });
  }
}
