import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { extractTokenUsage } from "../../session-continuity/token-usage";
import type { Logger } from "../../telemetry/logger";
import type {
  BridgeEvent,
  IncomingMessage,
  WorkspaceScopeAckPayload,
} from "../types";
import {
  finalizeSessionWorkspaceSnapshot,
  parseWorkspaceScopeSetPayload,
  recordSessionWorkspaceSnapshot,
  shouldDeliverEventForScope,
  shouldDeliverTokenUsageForScope,
} from "./websocket-session-scope";

type ClientSocket = {
  readonly id: string;
  readonly socket: WebSocket;
  scope: {
    enabled: boolean;
    workspacePath: string | null;
  };
};

type TokenUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
  readonly updatedAt: string;
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
  private readonly sessionWorkspaceById = new Map<string, string>();

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
    recordSessionWorkspaceSnapshot({
      event,
      sessionWorkspaceById: this.sessionWorkspaceById,
    });
    this.recordTokenUsageSnapshot(event);
    const serialized = JSON.stringify(event);
    for (const client of this.clients.values()) {
      if (
        !shouldDeliverEventForScope({
          event,
          scope: client.scope,
          sessionWorkspaceById: this.sessionWorkspaceById,
        })
      ) {
        continue;
      }
      const { socket } = client;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      }
    }
    finalizeSessionWorkspaceSnapshot({
      event,
      sessionWorkspaceById: this.sessionWorkspaceById,
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  setWorkspaceScope(
    clientId: string,
    payload: unknown
  ): WorkspaceScopeAckPayload {
    const client = this.clients.get(clientId);
    const rejected = (
      reqId: string,
      error: string
    ): WorkspaceScopeAckPayload => ({
      requestId: reqId,
      status: "rejected",
      workspacePath: null,
      error,
    });
    if (!client) {
      return rejected("missing-client", "Client not connected");
    }
    const parsed = parseWorkspaceScopeSetPayload(payload);
    if (!parsed.ok) {
      return rejected(parsed.requestId, parsed.error);
    }
    client.scope = { enabled: true, workspacePath: parsed.workspacePath };
    return {
      requestId: parsed.requestId,
      status: "applied",
      workspacePath: parsed.workspacePath,
      error: null,
    };
  }

  setWorkspaceScopeForClient(
    clientId: string,
    workspacePath: string | null
  ): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    client.scope = {
      enabled: true,
      workspacePath,
    };
  }

  getWorkspaceScope(clientId: string): ClientSocket["scope"] | null {
    return this.clients.get(clientId)?.scope ?? null;
  }

  populateSessionWorkspaceScope(
    workspacePath: string,
    sessionIds: readonly string[]
  ): void {
    for (const sessionId of sessionIds) {
      this.sessionWorkspaceById.set(sessionId, workspacePath);
    }
  }

  sendToClient(clientId: string, event: BridgeEvent): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    client.socket.send(JSON.stringify(event));
  }

  private handleConnection(socket: WebSocket): void {
    const clientId = randomUUID();
    this.clients.set(clientId, {
      id: clientId,
      socket,
      scope: { enabled: false, workspacePath: null },
    });

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

    this.replayTokenUsageSnapshots(clientId);
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
      this.lastTokenUsageBySessionId.delete(event.payload.sessionId);
      return;
    }

    if (event.type === "session:stream") {
      const snapshot = extractTokenUsage(event.payload.event);
      if (!snapshot) {
        return;
      }
      this.lastTokenUsageBySessionId.set(event.payload.sessionId, snapshot);
    }
  }

  private replayTokenUsageSnapshots(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const [sessionId, snapshot] of this.lastTokenUsageBySessionId) {
      if (
        !(
          snapshot &&
          shouldDeliverTokenUsageForScope({
            scope: client.scope,
            sessionId,
            sessionWorkspaceById: this.sessionWorkspaceById,
          })
        )
      ) {
        continue;
      }

      client.socket.send(
        JSON.stringify({
          type: "session:stream",
          payload: {
            sessionId,
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
