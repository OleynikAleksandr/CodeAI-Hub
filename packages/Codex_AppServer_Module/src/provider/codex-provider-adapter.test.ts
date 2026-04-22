import assert from "node:assert/strict";
import test from "node:test";
import { CodexProviderAdapter } from "./codex-provider-adapter";

test("CodexProviderAdapter refreshUsageLimits returns an awaitable promise and broadcasts the resolved payload", async () => {
  const adapter = Object.create(
    CodexProviderAdapter.prototype
  ) as CodexProviderAdapter;
  (
    adapter as unknown as {
      facade: {
        refreshUsageLimits: () => Promise<{
          readonly data: {
            readonly kind: "usage_limits";
            readonly providerScopeKey: string;
          };
          readonly providerScopeKey: string;
          readonly usageLimits: {
            readonly currentSession: {
              readonly percentUsed: number;
              readonly resetsAt: string;
            };
          };
        }>;
      };
    }
  ).facade = {
    refreshUsageLimits: async () => ({
      providerScopeKey: "codex:global",
      usageLimits: {
        currentSession: {
          percentUsed: 29,
          resetsAt: "2026-04-22T09:00:00.000Z",
        },
      },
      data: {
        kind: "usage_limits",
        providerScopeKey: "codex:global",
      },
    }),
  };

  const broadcastEvents: unknown[] = [];
  const result = adapter.refreshUsageLimits({
    broadcast: (event) => {
      broadcastEvents.push(event);
    },
    providerSessionId: "codex-provider-session",
    runtimeSessionId: "runtime-session",
    workspacePath: "/tmp/codex-refresh",
  });

  assert.equal(typeof (result as Promise<void>).then, "function");
  await result;
  assert.equal(broadcastEvents.length, 1);
  assert.equal(
    (
      broadcastEvents[0] as {
        readonly providerScopeKey?: string;
        readonly usageLimits?: {
          readonly currentSession?: { readonly percentUsed?: number };
        };
      }
    ).providerScopeKey,
    "codex:global"
  );
  assert.equal(
    (
      broadcastEvents[0] as {
        readonly usageLimits?: {
          readonly currentSession?: { readonly percentUsed?: number };
        };
      }
    ).usageLimits?.currentSession?.percentUsed,
    29
  );
});
