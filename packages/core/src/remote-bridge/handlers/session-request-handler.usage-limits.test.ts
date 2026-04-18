import assert from "node:assert/strict";
import test from "node:test";
import { createHarness, noop } from "./session-request-handler.test-helpers";

const findUsageLimitsStreamEvents = (
  events: ReturnType<typeof createHarness>["events"],
  sessionId: string
): Array<{
  readonly payload: {
    readonly event: {
      readonly data?: {
        readonly kind?: string;
        readonly usageLimits?: {
          readonly currentSession?: {
            readonly percentUsed?: number;
          } | null;
        };
      };
      readonly providerSessionId?: string;
      readonly type?: string;
      readonly uuid?: string;
      readonly usageLimits?: {
        readonly currentSession?: {
          readonly percentUsed?: number;
        } | null;
      };
    };
    readonly sessionId?: string;
  };
}> =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: { readonly kind?: string };
      };
      readonly sessionId?: string;
    };
    return (
      payload.sessionId === sessionId &&
      payload.event?.data?.kind === "usage_limits"
    );
  }) as Array<{
    readonly payload: {
      readonly event: {
        readonly data?: {
          readonly kind?: string;
          readonly usageLimits?: {
            readonly currentSession?: {
              readonly percentUsed?: number;
            } | null;
          };
        };
        readonly providerSessionId?: string;
        readonly type?: string;
        readonly uuid?: string;
        readonly usageLimits?: {
          readonly currentSession?: {
            readonly percentUsed?: number;
          } | null;
        };
      };
      readonly sessionId?: string;
    };
  }>;

test("SessionRequestHandler refreshUsageLimits broadcasts into the active runtime session scope", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/session-usage-refresh",
    "provider-session-usage"
  );
  const refreshCalls: Array<{
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }> = [];
  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "provider-session-usage",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    refreshUsageLimits: (params: {
      readonly broadcast: (event: unknown) => void;
      readonly providerSessionId: string;
      readonly runtimeSessionId: string;
      readonly workspacePath: string;
    }) => {
      refreshCalls.push({
        providerSessionId: params.providerSessionId,
        runtimeSessionId: params.runtimeSessionId,
        workspacePath: params.workspacePath,
      });
      params.broadcast({
        providerScopeKey: "claude:global",
        usageLimits: {
          currentSession: {
            percentUsed: 42,
            resetsAt: "2026-04-13T00:00:00.000Z",
          },
        },
        data: {
          kind: "usage_limits",
          providerScopeKey: "claude:global",
          usageLimits: {
            currentSession: {
              percentUsed: 42,
              resetsAt: "2026-04-13T00:00:00.000Z",
            },
          },
        },
      });
    },
  });

  await harness.handler.handleRefreshUsageLimits({
    providerId: "claudeCodeCli",
    providerSessionId: null,
    sessionId: session.id,
  });

  assert.deepEqual(refreshCalls, [
    {
      providerSessionId: "provider-session-usage",
      runtimeSessionId: session.id,
      workspacePath: "/tmp/session-usage-refresh",
    },
  ]);

  const usageLimitsStreamEvent = harness.events.find((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: { readonly kind?: string };
      };
      readonly sessionId?: string;
    };
    return (
      payload.sessionId === session.id &&
      payload.event?.data?.kind === "usage_limits"
    );
  });
  assert.ok(usageLimitsStreamEvent);
  assert.equal(
    (
      usageLimitsStreamEvent.payload as {
        readonly event?: {
          readonly data?: { readonly providerScopeKey?: string };
        };
      }
    ).event?.data?.providerScopeKey,
    "claude:global"
  );
});

test("SessionRequestHandler replays cached usage limits on reconnect without provider refresh for idle session", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/session-usage-reconnect",
    "provider-session-reconnect"
  );
  let refreshCalls = 0;
  harness.providerSessions.set(session.id, {
    providerId: "codexCli",
    providerSessionId: "provider-session-reconnect",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    refreshUsageLimits: () => {
      refreshCalls += 1;
    },
    usageLimitsFacade: {
      getCachedStreamPayload: () => ({
        providerScopeKey: "codex:provider-session-reconnect",
        usageLimits: {
          currentSession: {
            percentUsed: 31,
            resetsAt: "2026-04-18T10:00:00.000Z",
          },
        },
        data: {
          kind: "usage_limits",
          providerScopeKey: "codex:provider-session-reconnect",
          usageLimits: {
            currentSession: {
              percentUsed: 31,
              resetsAt: "2026-04-18T10:00:00.000Z",
            },
          },
        },
      }),
    },
  });
  (
    harness.api as unknown as {
      workspaceRuntime?: {
        getSnapshot?: (workspaceRoot: string) => {
          readonly sessions: Record<
            string,
            { readonly turnState: "idle" | "running" }
          >;
        };
      };
    }
  ).workspaceRuntime = {
    getSnapshot: (workspaceRoot) => {
      assert.equal(workspaceRoot, "/tmp/session-usage-reconnect");
      return {
        sessions: {
          [session.id]: { turnState: "idle" },
        },
      };
    },
  };

  await harness.handler.handleRefreshUsageLimits({
    lifecycleTrigger: "reconnect",
    providerId: "codexCli",
    providerSessionId: null,
    sessionId: session.id,
  });

  assert.equal(refreshCalls, 0);
  const usageLimitEvents = findUsageLimitsStreamEvents(
    harness.events,
    session.id
  );
  assert.equal(usageLimitEvents.length, 1);
  assert.equal(
    usageLimitEvents[0]?.payload.event.providerSessionId,
    "provider-session-reconnect"
  );
  assert.equal(usageLimitEvents[0]?.payload.event.type, "stream_event");
  assert.equal(
    usageLimitEvents[0]?.payload.event.usageLimits?.currentSession?.percentUsed,
    31
  );
});

test("SessionRequestHandler performs binding bootstrap refresh only until cached replay is available", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/session-usage-bootstrap",
    "provider-session-bootstrap"
  );
  let refreshCalls = 0;
  let cachedPayload: {
    readonly data: {
      readonly kind: "usage_limits";
      readonly providerScopeKey: string;
      readonly usageLimits: {
        readonly currentSession: {
          readonly percentUsed: number;
          readonly resetsAt: string;
        };
      };
    };
    readonly providerScopeKey: string;
    readonly usageLimits: {
      readonly currentSession: {
        readonly percentUsed: number;
        readonly resetsAt: string;
      };
    };
  } | null = null;
  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "provider-session-bootstrap",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    refreshUsageLimits: (params: {
      readonly broadcast: (event: unknown) => void;
    }) => {
      refreshCalls += 1;
      cachedPayload = {
        providerScopeKey: "claude:global",
        usageLimits: {
          currentSession: {
            percentUsed: 55,
            resetsAt: "2026-04-18T12:00:00.000Z",
          },
        },
        data: {
          kind: "usage_limits",
          providerScopeKey: "claude:global",
          usageLimits: {
            currentSession: {
              percentUsed: 55,
              resetsAt: "2026-04-18T12:00:00.000Z",
            },
          },
        },
      };
      params.broadcast(cachedPayload);
    },
    usageLimitsFacade: {
      getCachedStreamPayload: () => cachedPayload,
    },
  });

  await harness.handler.handleRefreshUsageLimits({
    lifecycleTrigger: "binding_ready",
    providerId: "claudeCodeCli",
    providerSessionId: null,
    sessionId: session.id,
  });

  assert.equal(refreshCalls, 1);
  let usageLimitEvents = findUsageLimitsStreamEvents(
    harness.events,
    session.id
  );
  assert.equal(usageLimitEvents.length, 1);
  assert.equal(
    usageLimitEvents[0]?.payload.event.usageLimits?.currentSession?.percentUsed,
    55
  );

  await harness.handler.handleRefreshUsageLimits({
    lifecycleTrigger: "binding_ready",
    providerId: "claudeCodeCli",
    providerSessionId: null,
    sessionId: session.id,
  });

  assert.equal(refreshCalls, 1);
  usageLimitEvents = findUsageLimitsStreamEvents(harness.events, session.id);
  assert.equal(usageLimitEvents.length, 2);
  assert.equal(
    usageLimitEvents[1]?.payload.event.uuid,
    "replay::usage_limits::provider-session-bootstrap"
  );
  assert.equal(
    usageLimitEvents[1]?.payload.event.usageLimits?.currentSession?.percentUsed,
    55
  );
});
