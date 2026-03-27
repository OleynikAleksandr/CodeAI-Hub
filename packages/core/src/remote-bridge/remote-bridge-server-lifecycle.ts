import http from "node:http";
import cors from "cors";
import express, { type Express } from "express";
import type { WebSocket } from "ws";
import type { CoreConfig } from "../config";
import type { RuntimeStatusEvent } from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";
import { WebSocketManager } from "./handlers/websocket-manager";
import type { BridgeEvent, CoreStatePayload, IncomingMessage } from "./types";

interface RemoteBridgeLifecycleHooks {
  readonly onClientConnected?: (clientId: string, total: number) => void;
  readonly onClientDisconnected?: (clientId: string, total: number) => void;
}

interface WorkspaceRuntimeLifecycleBridge {
  dispose(): void;
  subscribe(
    clientId: string,
    listener: (message: BridgeEvent) => void
  ): () => void;
}

export class RemoteBridgeServerLifecycle {
  private readonly config: CoreConfig;
  private readonly getInitialState: () => CoreStatePayload;
  private readonly getLatestStatus: () => RuntimeStatusEvent | null;
  private readonly hooks: RemoteBridgeLifecycleHooks;
  private readonly logger: Logger;
  private readonly onIncomingMessage: (
    clientId: string,
    socket: WebSocket,
    message: IncomingMessage
  ) => Promise<void>;
  private readonly workspaceRuntime: WorkspaceRuntimeLifecycleBridge;
  private readonly workspaceRuntimeUnsubscribeByClient = new Map<
    string,
    () => void
  >();

  private httpServer?: http.Server;
  private wsManager?: WebSocketManager;

  constructor(options: {
    readonly config: CoreConfig;
    readonly getInitialState: () => CoreStatePayload;
    readonly getLatestStatus: () => RuntimeStatusEvent | null;
    readonly hooks?: RemoteBridgeLifecycleHooks;
    readonly logger: Logger;
    readonly onIncomingMessage: (
      clientId: string,
      socket: WebSocket,
      message: IncomingMessage
    ) => Promise<void>;
    readonly workspaceRuntime: WorkspaceRuntimeLifecycleBridge;
  }) {
    this.config = options.config;
    this.getInitialState = options.getInitialState;
    this.getLatestStatus = options.getLatestStatus;
    this.hooks = options.hooks ?? {};
    this.logger = options.logger;
    this.onIncomingMessage = options.onIncomingMessage;
    this.workspaceRuntime = options.workspaceRuntime;
  }

  async start(registerRoutes: (app: Express) => void): Promise<void> {
    if (this.httpServer) {
      return;
    }
    const app = express();
    app.use(cors());
    app.use(express.json());
    registerRoutes(app);
    this.httpServer = http.createServer(app);
    this.wsManager = new WebSocketManager({
      httpServer: this.httpServer,
      logger: this.logger,
      onIncomingMessage: this.onIncomingMessage,
      onClientConnected: (id, count) => {
        this.workspaceRuntimeUnsubscribeByClient.set(
          id,
          this.workspaceRuntime.subscribe(id, (message) => {
            this.wsManager?.sendToClient(id, message);
          })
        );
        this.hooks.onClientConnected?.(id, count);
      },
      onClientDisconnected: (id, count) => {
        this.workspaceRuntimeUnsubscribeByClient.get(id)?.();
        this.workspaceRuntimeUnsubscribeByClient.delete(id);
        this.hooks.onClientDisconnected?.(id, count);
      },
      getInitialState: this.getInitialState,
      getLatestStatus: this.getLatestStatus,
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
    for (const unsubscribe of this.workspaceRuntimeUnsubscribeByClient.values()) {
      unsubscribe();
    }
    this.workspaceRuntimeUnsubscribeByClient.clear();
    this.workspaceRuntime.dispose();
    this.wsManager?.stop();
    if (!this.httpServer) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.httpServer?.close(() => {
        resolve();
      });
    });
    this.httpServer = undefined;
  }

  broadcast(event: BridgeEvent): void {
    this.wsManager?.broadcast(event);
  }

  getClientCount(): number {
    return this.wsManager?.getClientCount() ?? 0;
  }

  getManager(): WebSocketManager | undefined {
    return this.wsManager;
  }
}
