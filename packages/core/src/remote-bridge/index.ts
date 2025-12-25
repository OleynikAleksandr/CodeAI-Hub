import { randomUUID } from "node:crypto";
import http from "node:http";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import type { CoreConfig } from "../config";
import type { FileDropService } from "../file-drop/file-drop-service";
import type { ProviderRegistry } from "../provider-registry";
import type { Session, SessionManager } from "../session-manager";
import type {
  RuntimeStatusEvent,
  RuntimeStatusReporter,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";
import { UnifiedSessionStorage } from "../unified-session/storage";

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

type DialogMessagePayload = {
  readonly role?: string;
  readonly content?: unknown;
  readonly timestamp?: string;
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

const HTTP_NO_CONTENT = 204;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_FOUND = 404;
const HTTP_ACCEPTED = 202;
const MILLISECONDS_IN_SECOND = 1000;

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

  private latestStatus: RuntimeStatusEvent | null = null;

  private unsubscribeStatus?: () => void;

  private app?: express.Express;

  private httpServer?: http.Server;

  private wsServer?: WebSocketServer;

  private readonly clients: Map<string, ClientSocket> = new Map();

  private readonly providerSessions = new Map<string, ProviderSessionBinding>();

  private readonly sessionStorage: UnifiedSessionStorage;

  constructor(options: {
    readonly config: CoreConfig;
    readonly sessionManager: SessionManager;
    readonly providerRegistry: ProviderRegistry;
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
    this.sessionStorage = new UnifiedSessionStorage({
      workspaceSlug: this.config.claudeProjectSlug,
      logger: this.logger,
    });
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

    this.app.get("/api/v1/health", (_req: Request, res: Response) => {
      res.json({
        status: "ok",
        version: this.version,
        uptime: process.uptime(),
        clients: this.getActiveClientCount(),
        managedMode: this.config.managedMode,
        pid: process.pid,
      });
    });

    this.app.get("/api/v1/status", (_req: Request, res: Response) => {
      const ttlState = this.getTtlState?.();

      res.json({
        core: {
          version: this.version,
          uptime: process.uptime(),
          host: this.config.host,
          port: this.config.port,
          clients: this.getActiveClientCount(),
          managedMode: this.config.managedMode,
          pid: process.pid,
          ttl:
            ttlState == null
              ? undefined
              : {
                  mode: ttlState.idleTtlMs === null ? "infinite" : "finite",
                  idleTtlSeconds:
                    ttlState.idleTtlMs === null
                      ? null
                      : Math.round(ttlState.idleTtlMs / MILLISECONDS_IN_SECOND),
                  lastActivityAt: ttlState.lastActivityAt,
                  idleSince: ttlState.idleSince,
                  secondsUntilShutdown: ttlState.secondsUntilShutdown,
                },
        },
        sessions: this.serializeSessions(),
        providers: this.providerRegistry.listProviders(),
      });
    });

    this.app.post("/api/v1/shutdown", (_req: Request, res: Response) => {
      this.logger.info("Shutdown request received via API");
      res
        .status(HTTP_ACCEPTED)
        .json({ status: "shutting-down", pid: process.pid });
      setImmediate(() => {
        this.hooks.onShutdownRequested?.();
      });
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
        await this.handleSessionCreate(
          incoming.payload?.providerId,
          incoming.payload?.workspacePath
        );
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

  private async handleSessionCreate(
    providerId?: string,
    workspacePath?: string
  ): Promise<void> {
    const actualProviderId = providerId ?? this.getDefaultProviderId();
    const actualWorkspacePath =
      workspacePath ?? this.config.claudeWorkspacePath ?? process.cwd();
    const adapter = this.providerRegistry.getAdapter(actualProviderId);
    if (!adapter) {
      this.broadcast({
        type: "session:error",
        payload: { message: `Provider ${actualProviderId} unavailable` },
      });
      return;
    }
    let providerSessionId: string | undefined;
    try {
      providerSessionId = await adapter.createSession(actualWorkspacePath);
    } catch (error) {
      this.handleProviderFailure(actualProviderId, error);
      return;
    }
    const supportsImmediateBinding =
      typeof providerSessionId === "string" &&
      providerSessionId.length > 0 &&
      actualProviderId === "geminiCli";
    const session = this.sessionManager.createSession(
      actualProviderId,
      actualWorkspacePath,
      supportsImmediateBinding ? providerSessionId : undefined
    );
    this.sessionStorage.register(session);
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
    if (supportsImmediateBinding) {
      this.updateProviderBinding(session.id, providerSessionId);
    }
    this.broadcast({
      type: "session:created",
      payload: this.serializeSession(session),
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

    this.sessionStorage.appendMessage(sessionId, userMessage);
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
    try {
      await adapter.sendMessage(binding.providerSessionId, content);
    } catch (error) {
      this.handleProviderFailure(binding.providerId, error, sessionId);
    }
  }

  private async handleSessionDelete(sessionId: string): Promise<void> {
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      const adapter = this.providerRegistry.getAdapter(binding.providerId);
      binding.unsubscribe();
      this.providerSessions.delete(sessionId);
      try {
        await adapter?.closeSession(binding.providerSessionId);
      } catch (error) {
        this.handleProviderFailure(binding.providerId, error, sessionId);
      }
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

    this.sessionStorage.close(sessionId, "session-deleted");
    this.broadcast({
      type: "session:deleted",
      payload: { sessionId },
    });
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    if (typeof event === "string") {
      this.updateBindingWithResolvedId(sessionId, event);
      return;
    }
    if (!event || typeof event !== "object") {
      return;
    }
    this.handleTypedProviderEvent(sessionId, event as ProviderEventEnvelope);
  }

  private handleProviderFailure(
    providerId: string,
    error: unknown,
    sessionId?: string
  ): void {
    this.logger.error(
      "Provider operation failed",
      error instanceof Error ? error : new Error(String(error)),
      { providerId }
    );
    this.providerRegistry.handleRuntimeFailure(providerId, error);
    let emittedState = false;
    if (sessionId) {
      const binding = this.providerSessions.get(sessionId);
      if (binding) {
        binding.unsubscribe();
        this.providerSessions.delete(sessionId);
      }
      this.sessionManager.markProviderSessionFailed(sessionId);
      this.sessionStorage.close(sessionId, "provider-failure");
      this.broadcastSessionBinding(sessionId);
      emittedState = true;
    }
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Provider is unavailable.";
    this.broadcast({
      type: "session:error",
      payload: {
        sessionId: sessionId ?? null,
        providerId,
        message,
      },
    });
    if (!emittedState) {
      this.broadcast({
        type: "core:state",
        payload: this.buildInitialState(),
      });
    }
  }

  private appendProviderMessage(
    sessionId: string,
    role: "assistant" | "system" | "thinking",
    event: unknown
  ): void {
    const content = this.extractMessageContent(event);
    if (!content) {
      return;
    }
    const message = this.sessionManager.appendMessage(sessionId, role, content);
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
      this.broadcast({ type: "session:message", payload: message });
    }
  }

  private appendDialogMessage(
    sessionId: string,
    payload: DialogMessagePayload
  ): void {
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.content !== "string"
    ) {
      return;
    }
    const role =
      payload.role === "user" ||
      payload.role === "assistant" ||
      payload.role === "thinking"
        ? payload.role
        : "assistant";
    const message = this.sessionManager.appendMessage(
      sessionId,
      role,
      payload.content,
      payload.timestamp
    );
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
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

  private updateBindingWithResolvedId(
    sessionId: string,
    providerSessionId: string
  ): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    const alreadyReady = session.providerSessionStatus === "ready";
    if (alreadyReady && session.providerSessionId === providerSessionId) {
      return;
    }
    this.sessionManager.updateProviderSessionId(sessionId, providerSessionId);
    this.sessionStorage.promote(sessionId, providerSessionId);
    this.updateProviderBinding(sessionId, providerSessionId);
    this.broadcastSessionBinding(sessionId);
  }

  private broadcastSessionBinding(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    const payload = {
      sessionId,
      providerSessionId: session.providerSessionId ?? null,
      status: session.providerSessionStatus,
    } as const;
    this.broadcast({
      type: "session:binding",
      payload,
    });
    this.broadcast({
      type: "core:state",
      payload: this.buildInitialState(),
    });
  }

  private handleTypedProviderEvent(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    switch (event.type) {
      case "sessionIdChanged":
        this.handleSessionIdChangedEvent(sessionId, event.payload);
        return;
      case "realSessionId":
        this.handleRealSessionIdEvent(sessionId, event.payload);
        return;
      case "stream_event":
        this.broadcast({
          type: "session:stream",
          payload: { sessionId, event },
        });
        return;
      case "assistant":
        this.appendProviderMessage(sessionId, "assistant", event);
        return;
      case "thinking":
        this.appendProviderMessage(sessionId, "thinking", event);
        return;
      case "dialog_message":
        this.appendDialogMessage(sessionId, event as DialogMessagePayload);
        return;
      default:
        return;
    }
  }

  private handleSessionIdChangedEvent(
    sessionId: string,
    payload: unknown
  ): void {
    if (!isSessionIdChangedPayload(payload)) {
      return;
    }
    const { newId } = payload;
    if (newId) {
      this.updateBindingWithResolvedId(sessionId, newId);
    }
  }

  private handleRealSessionIdEvent(sessionId: string, payload: unknown): void {
    const nextId = this.extractSessionIdFromPayload(payload);
    if (nextId) {
      this.updateBindingWithResolvedId(sessionId, nextId);
    }
  }

  private extractSessionIdFromPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const candidate = payload as { readonly sessionId?: unknown };
    return typeof candidate.sessionId === "string" ? candidate.sessionId : null;
  }
}
