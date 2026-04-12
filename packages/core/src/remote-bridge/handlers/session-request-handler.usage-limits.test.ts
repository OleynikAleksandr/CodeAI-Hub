import assert from "node:assert/strict";
import test from "node:test";
import { createHarness, noop } from "./session-request-handler.test-helpers";

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
        providerScopeKey: "claude:provider-session-usage",
        usageLimits: {
          currentSession: {
            percentUsed: 42,
            resetsAt: "2026-04-13T00:00:00.000Z",
          },
        },
        data: {
          kind: "usage_limits",
          providerScopeKey: "claude:provider-session-usage",
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
});
