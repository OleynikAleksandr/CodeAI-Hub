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

const handleIncomingMessage = async (): Promise<void> => {
  // No-op: this test drives the manager directly instead of client requests.
};

const handleClientDisconnected = (): void => {
  // No-op: disconnect side effects are not relevant for this replay test.
};

test("WebSocketManager replays usage limits after workspace scope changes", async () => {
  const httpServer = http.createServer();
  const connectedClientIds: string[] = [];
  const manager = new WebSocketManager({
    httpServer,
    logger: new Logger("error"),
    onIncomingMessage: handleIncomingMessage,
    onClientConnected: (connectedId) => {
      connectedClientIds.push(connectedId);
    },
    onClientDisconnected: handleClientDisconnected,
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
    const workspaceA = "/tmp/codeai-hub-workspace-a";
    const workspaceB = "/tmp/codeai-hub-workspace-b";
    const sessionId = "session-b";

    manager.setWorkspaceScopeForClient(clientId, workspaceA);
    manager.broadcast({
      type: "session:created",
      payload: {
        id: sessionId,
        providerId: "codexCli",
        workspacePath: workspaceB,
        initiativeSlug: null,
        stage: "description",
        runSlug: null,
        continuationParentId: null,
        continuationIndex: 0,
        title: "Codex Session",
        createdAt: "2026-03-15T08:00:00.000Z",
        updatedAt: "2026-03-15T08:00:00.000Z",
        providerSessionId: "019cf07b-022f-7413-bca7-0495894cd1d0",
        providerSessionStatus: "ready",
      },
    });
    manager.broadcast({
      type: "session:stream",
      payload: {
        sessionId,
        event: {
          type: "stream_event",
          provider: "codex",
          threadId: "019cf07b-022f-7413-bca7-0495894cd1d0",
          usageLimits: {
            currentSession: {
              percentUsed: 18,
              resetsAt: "2026-03-15T12:52:06.000Z",
            },
            currentWeekAllModels: {
              percentUsed: 5,
              resetsAt: "2026-03-22T07:52:06.000Z",
            },
            currentWeekSonnetOnly: null,
          },
          data: {
            kind: "usage_limits",
            usageLimits: {
              currentSession: {
                percentUsed: 18,
                resetsAt: "2026-03-15T12:52:06.000Z",
              },
              currentWeekAllModels: {
                percentUsed: 5,
                resetsAt: "2026-03-22T07:52:06.000Z",
              },
              currentWeekSonnetOnly: null,
            },
            usageLimitLabels: {
              currentSession: "Session",
              currentWeekAllModels: "Weekly",
            },
            providerScopeKey: "codex:019cf07b-022f-7413-bca7-0495894cd1d0",
            source: "codex_rpc",
            collectedAt: "2026-03-15T08:21:50.908Z",
          },
          uuid: "test::usage_limits",
          timestamp: "2026-03-15T08:21:50.908Z",
        },
      },
    });

    await delay(100);
    const liveDeliveryWhileOutOfScope = messages.some((message) => {
      if (!message || typeof message !== "object") {
        return false;
      }
      const payload =
        "payload" in message &&
        message.payload &&
        typeof message.payload === "object"
          ? (message.payload as Record<string, unknown>)
          : null;
      const event =
        payload?.event && typeof payload.event === "object"
          ? (payload.event as Record<string, unknown>)
          : null;
      const data =
        event?.data && typeof event.data === "object"
          ? (event.data as Record<string, unknown>)
          : null;
      return payload?.sessionId === sessionId && data?.kind === "usage_limits";
    });
    assert.equal(liveDeliveryWhileOutOfScope, false);

    manager.setWorkspaceScopeForClient(clientId, workspaceB);

    const replayed = await waitFor(() =>
      messages.find((message) => {
        if (!message || typeof message !== "object") {
          return false;
        }
        const payload =
          "payload" in message &&
          message.payload &&
          typeof message.payload === "object"
            ? (message.payload as Record<string, unknown>)
            : null;
        const event =
          payload?.event && typeof payload.event === "object"
            ? (payload.event as Record<string, unknown>)
            : null;
        const data =
          event?.data && typeof event.data === "object"
            ? (event.data as Record<string, unknown>)
            : null;
        return (
          payload?.sessionId === sessionId && data?.kind === "usage_limits"
        );
      })
    );

    const replayedPayload = (
      replayed as {
        readonly payload: {
          readonly event: {
            readonly data: {
              readonly providerScopeKey: string;
              readonly usageLimits: {
                readonly currentSession?: {
                  readonly percentUsed: number;
                } | null;
              };
            };
          };
        };
      }
    ).payload;

    assert.equal(
      replayedPayload.event.data.providerScopeKey,
      "codex:019cf07b-022f-7413-bca7-0495894cd1d0"
    );
    assert.equal(
      replayedPayload.event.data.usageLimits.currentSession?.percentUsed,
      18
    );
  } finally {
    if (socket) {
      await closeSocket(socket);
    }
    manager.stop();
    await closeServer(httpServer);
  }
});
