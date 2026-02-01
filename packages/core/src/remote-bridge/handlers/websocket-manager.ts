import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { extractTokenUsage } from "../../session-continuity/token-usage";
import type { Logger } from "../../telemetry/logger";
import type { BridgeEvent, IncomingMessage } from "../types";
import {
  extractProviderSessionIdFromStreamEvent,
  extractSessionsFromInitialState,
  loadTokenUsageCache,
  persistTokenUsageCache,
  type TokenUsageSnapshot,
} from "./token-usage-cache";

type ClientSocket = {
  readonly id: string;
  readonly socket: WebSocket;
};

export type WebSocketManagerDependencies = {
  readonly httpServer: Server;
  readonly logger: Logger;
  readonly onIncomingMessage: (
    clientId: string,
    socket: WebSocket,
    message: IncomingMessage
  ) => Promise<void>;
  readonly onClientConnected: (clientId: string, total: number) => void;
  readonly onClientDisconnected: (clientId: string, total: number) => void;
  readonly getInitialState: () => unknown;
  readonly getLatestStatus: () => unknown;
};

export class WebSocketManager {
  private wsServer?: WebSocketServer;
  private readonly clients = new Map<string, ClientSocket>();
  private readonly deps: WebSocketManagerDependencies;
  private readonly lastTokenUsageBySessionId = new Map<
    string,
    TokenUsageSnapshot
  >();
  private readonly tokenUsageByProviderSessionId = loadTokenUsageCache();
  private readonly providerSessionIdBySessionId = new Map<string, string>();
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(deps: WebSocketManagerDependencies) {
    this.deps = deps;
  }

  start(): void {
    this.wsServer = new WebSocketServer({
      server: this.deps.httpServer,
      path: "/api/v1/stream",
    });

    this.wsServer.on("connection", (socket: WebSocket) => {
      this.handleConnection(socket);
    });
  }

  stop(): void {
    for (const { socket } of this.clients.values()) {
      try {
        socket.close();
      } catch {
        // ignore
      }
    }
    this.clients.clear();

    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = undefined;
    }
  }

  broadcast(event: BridgeEvent): void {
    this.recordTokenUsageSnapshot(event);
    const serialized = JSON.stringify(event);
    for (const { socket } of this.clients.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private handleConnection(socket: WebSocket): void {
    const clientId = randomUUID();
    this.clients.set(clientId, { id: clientId, socket });

    this.deps.onClientConnected(clientId, this.clients.size);

    socket.on("message", async (data) => {
      await this.processMessage(clientId, socket, data.toString());
    });

    socket.on("close", () => {
      this.clients.delete(clientId);
      this.deps.onClientDisconnected(clientId, this.clients.size);
    });

    // Send initial state
    const initialState = this.deps.getInitialState();
    socket.send(
      JSON.stringify({
        type: "core:state",
        payload: initialState,
      })
    );

    const status = this.deps.getLatestStatus();
    if (status) {
      socket.send(
        JSON.stringify({ type: "core:loading-status", payload: status })
      );
    }

    this.replayTokenUsageSnapshots(socket, initialState);
  }

  private async processMessage(
    clientId: string,
    socket: WebSocket,
    raw: string
  ): Promise<void> {
    try {
      const incoming = JSON.parse(raw) as IncomingMessage;
      await this.deps.onIncomingMessage(clientId, socket, incoming);
    } catch (error) {
      this.deps.logger.error(
        "Failed to process client message",
        error as Error,
        { clientId }
      );
      socket.send(
        JSON.stringify({
          type: "session:error",
          payload: { message: "Invalid JSON payload" },
        })
      );
    }
  }

  private recordTokenUsageSnapshot(event: BridgeEvent): void {
    if (event.type === "session:deleted") {
      this.handleSessionDeleted(event.payload.sessionId);
      return;
    }

    if (event.type === "session:binding") {
      this.handleSessionBinding(
        event.payload.sessionId,
        event.payload.providerSessionId
      );
      return;
    }

    if (event.type === "session:stream") {
      this.handleSessionStream(event.payload.sessionId, event.payload.event);
    }
  }

  private handleSessionDeleted(sessionId: string): void {
    this.lastTokenUsageBySessionId.delete(sessionId);
    const providerSessionId = this.providerSessionIdBySessionId.get(sessionId);
    this.providerSessionIdBySessionId.delete(sessionId);
    if (!providerSessionId) {
      return;
    }
    this.tokenUsageByProviderSessionId.delete(providerSessionId);
    this.schedulePersist();
  }

  private handleSessionBinding(
    sessionId: string,
    providerSessionIdRaw: string | null
  ): void {
    const providerSessionId = providerSessionIdRaw?.trim()
      ? providerSessionIdRaw.trim()
      : null;
    if (!providerSessionId) {
      this.providerSessionIdBySessionId.delete(sessionId);
      return;
    }

    this.providerSessionIdBySessionId.set(sessionId, providerSessionId);
    const persisted = this.tokenUsageByProviderSessionId.get(providerSessionId);
    if (!persisted) {
      return;
    }
    this.lastTokenUsageBySessionId.set(sessionId, persisted);
  }

  private handleSessionStream(sessionId: string, providerEvent: unknown): void {
    const snapshot = extractTokenUsage(providerEvent);
    if (!snapshot) {
      return;
    }

    this.lastTokenUsageBySessionId.set(sessionId, snapshot);

    const providerSessionId =
      this.providerSessionIdBySessionId.get(sessionId) ??
      extractProviderSessionIdFromStreamEvent(providerEvent);
    if (!providerSessionId) {
      return;
    }
    this.providerSessionIdBySessionId.set(sessionId, providerSessionId);
    this.tokenUsageByProviderSessionId.set(providerSessionId, snapshot);
    this.schedulePersist();
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      return;
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      persistTokenUsageCache(this.tokenUsageByProviderSessionId);
    }, 500);
  }

  private replayTokenUsageSnapshots(
    socket: WebSocket,
    initialState: unknown
  ): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const sessions = extractSessionsFromInitialState(initialState);
    for (const session of sessions) {
      const providerSessionId = session.providerSessionId;
      if (providerSessionId) {
        this.providerSessionIdBySessionId.set(session.id, providerSessionId);
      }

      const snapshot =
        this.lastTokenUsageBySessionId.get(session.id) ??
        (providerSessionId
          ? this.tokenUsageByProviderSessionId.get(providerSessionId)
          : undefined);
      if (!snapshot) {
        continue;
      }
      this.lastTokenUsageBySessionId.set(session.id, snapshot);

      socket.send(
        JSON.stringify({
          type: "session:stream",
          payload: {
            sessionId: session.id,
            event: {
              type: "stream_event",
              tokenUsage: { used: snapshot.used, limit: snapshot.limit },
              data: {
                kind: "token_usage",
                used: snapshot.used,
                limit: snapshot.limit,
              },
              uuid: "replay::token_usage",
              timestamp: snapshot.updatedAt,
            },
          },
        })
      );
    }
  }
}
