import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";
import { Logger } from "../../telemetry/logger";
import { WebSocketManager } from "./websocket-manager";

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

const waitFor = async <T>(
  reader: () => T | null | undefined,
  timeoutMs = 2000
): Promise<T> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = reader();
    if (result != null) {
      return result;
    }
    await delay(20);
  }
  throw new Error("Timed out while waiting for async condition.");
};

const hasSessionEvent = (
  messages: readonly unknown[],
  type: string,
  sessionId: string
): boolean =>
  messages.some((message) => {
    if (!message || typeof message !== "object") {
      return false;
    }
    const typed = message as {
      readonly payload?: { readonly id?: string; readonly sessionId?: string };
      readonly type?: string;
    };
    return (
      typed.type === type &&
      (typed.payload?.id === sessionId ||
        typed.payload?.sessionId === sessionId)
    );
  });

test("WebSocketManager streams Core-attached worktree sessions to the main workspace client", async () => {
  const httpServer = http.createServer();
  const connectedClientIds: string[] = [];
  const manager = new WebSocketManager({
    httpServer,
    logger: new Logger("error"),
    onIncomingMessage: async () => undefined,
    onClientConnected: (clientId) => {
      connectedClientIds.push(clientId);
    },
    onClientDisconnected: () => undefined,
    getInitialState: () => ({ sessions: [], providers: [] }),
    getLatestStatus: () => null,
  });

  let socket: WebSocket | null = null;
  try {
    manager.start();
    const port = await listen(httpServer);
    socket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/stream`);
    const messages: unknown[] = [];
    socket.on("message", (payload) => {
      messages.push(JSON.parse(payload.toString()));
    });
    await once(socket, "open");

    const clientId = await waitFor(() => connectedClientIds[0] ?? null);
    const mainWorkspaceRoot = "/tmp/FinderWidget-Test01";
    const worktreeRoot =
      "/tmp/FinderWidget-Test01.worktrees/finderwidget-test01/product-parts/finder-widget/cluster-contracts/note-selection-cluster";
    const attachedSessionId = "attached-cluster-session";
    const unrelatedSessionId = "unrelated-session";

    manager.setWorkspaceScopeForClient(clientId, mainWorkspaceRoot);
    manager.broadcast({
      type: "session:created",
      payload: {
        id: attachedSessionId,
        providerId: "codexCli",
        workspacePath: worktreeRoot,
        initiativeSlug: null,
        stage: "development-tree",
        runSlug: null,
        continuationParentId: null,
        continuationIndex: 0,
        title: "Cluster Contract Session",
        createdAt: "2026-06-10T08:00:00.000Z",
        updatedAt: "2026-06-10T08:00:00.000Z",
        providerSessionId: "provider-attached",
        providerSessionStatus: "ready",
      },
    });
    manager.broadcast({
      type: "session:stream",
      payload: {
        sessionId: attachedSessionId,
        event: {
          type: "stream_event",
          data: { kind: "text_delta", text: "attached" },
          timestamp: "2026-06-10T08:00:01.000Z",
        },
      },
    });

    await waitFor(() =>
      hasSessionEvent(messages, "session:created", attachedSessionId)
        ? true
        : null
    );
    await waitFor(() =>
      hasSessionEvent(messages, "session:stream", attachedSessionId)
        ? true
        : null
    );

    manager.broadcast({
      type: "session:created",
      payload: {
        id: unrelatedSessionId,
        providerId: "codexCli",
        workspacePath: "/tmp/OtherProject.worktrees/demo",
        initiativeSlug: null,
        stage: "development-tree",
        runSlug: null,
        continuationParentId: null,
        continuationIndex: 0,
        title: "Other Session",
        createdAt: "2026-06-10T08:01:00.000Z",
        updatedAt: "2026-06-10T08:01:00.000Z",
        providerSessionId: "provider-other",
        providerSessionStatus: "ready",
      },
    });
    await delay(100);

    assert.equal(
      hasSessionEvent(messages, "session:created", unrelatedSessionId),
      false
    );
  } finally {
    if (socket) {
      await closeSocket(socket);
    }
    manager.stop();
    await closeServer(httpServer);
  }
});
