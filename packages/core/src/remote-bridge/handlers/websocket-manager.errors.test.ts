import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";
import { Logger } from "../../telemetry/logger";
import { WebSocketManager } from "./websocket-manager";

interface ExposedClientSocket {
  readonly socket: WebSocket;
}

interface ExposedWebSocketManager {
  readonly clients: Map<string, ExposedClientSocket>;
  readonly wsServer?: { emit(eventName: "error", error: Error): boolean };
}

const listen = async (server: http.Server): Promise<number> => {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("HTTP server address is unavailable.");
  }
  return address.port;
};

const closeServer = async (server: http.Server): Promise<void> => {
  if (!server.listening) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const closeSocket = async (socket: WebSocket): Promise<void> => {
  if (
    socket.readyState === WebSocket.CLOSED ||
    socket.readyState === WebSocket.CLOSING
  ) {
    return;
  }
  const closed = once(socket, "close");
  socket.close();
  await closed;
};

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 2000
): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await delay(20);
  }
  throw new Error("Timed out while waiting for async condition.");
};

const createManager = (
  httpServer: http.Server,
  onClientDisconnected: () => void
): WebSocketManager =>
  new WebSocketManager({
    httpServer,
    logger: new Logger("error"),
    onIncomingMessage: async () => undefined,
    onClientConnected: () => undefined,
    onClientDisconnected,
    getInitialState: () => ({ sessions: [], providers: [] }),
    getLatestStatus: () => null,
  });

test("WebSocketManager observes server error events", async () => {
  const httpServer = http.createServer();
  const manager = createManager(httpServer, () => undefined);
  try {
    manager.start();
    assert.doesNotThrow(() => {
      (manager as unknown as ExposedWebSocketManager).wsServer?.emit(
        "error",
        new Error("server boom")
      );
    });
  } finally {
    manager.stop();
    await closeServer(httpServer);
  }
});

test("WebSocketManager cleans up client state on socket error", async () => {
  const httpServer = http.createServer();
  let disconnectedCount = 0;
  const manager = createManager(httpServer, () => {
    disconnectedCount += 1;
  });
  let socket: WebSocket | null = null;
  try {
    manager.start();
    const port = await listen(httpServer);
    socket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/stream`);
    socket.on("error", () => undefined);
    await once(socket, "open");

    const exposed = manager as unknown as ExposedWebSocketManager;
    const serverSocket = Array.from(exposed.clients.values())[0]?.socket;
    assert.ok(serverSocket);

    assert.doesNotThrow(() => {
      serverSocket.emit("error", new Error("client boom"));
    });
    await waitFor(() => manager.getClientCount() === 0);
    assert.equal(disconnectedCount, 1);
  } finally {
    if (socket) {
      await closeSocket(socket);
    }
    manager.stop();
    await closeServer(httpServer);
  }
});
