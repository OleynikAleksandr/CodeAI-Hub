import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { Logger } from "../../telemetry/logger";
import type { BridgeEvent, IncomingMessage } from "../types";

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
    socket.send(
      JSON.stringify({
        type: "core:state",
        payload: this.deps.getInitialState(),
      })
    );

    const status = this.deps.getLatestStatus();
    if (status) {
      socket.send(
        JSON.stringify({ type: "core:loading-status", payload: status })
      );
    }
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
}
