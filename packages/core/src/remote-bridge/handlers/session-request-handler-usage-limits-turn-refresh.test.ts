import assert from "node:assert/strict";
import test from "node:test";
import { createUsageRefreshTurnHook } from "./session-request-handler-usage-limits-turn-refresh";

test("createUsageRefreshTurnHook forwards then refreshes with turn_completed", async () => {
  const refreshCalls: Array<{
    readonly lifecycleTrigger?: string;
    readonly sessionId: string;
  }> = [];
  const forwarded: string[] = [];
  const host = {
    handleRefreshUsageLimits: (params: {
      readonly lifecycleTrigger?: "turn_completed";
      readonly providerId: string;
      readonly providerSessionId: string | null;
      readonly sessionId: string;
    }): Promise<void> => {
      refreshCalls.push({
        lifecycleTrigger: params.lifecycleTrigger,
        sessionId: params.sessionId,
      });
      return Promise.resolve();
    },
  };

  const hook = createUsageRefreshTurnHook(host, (sessionId) =>
    forwarded.push(sessionId)
  );
  hook("session-1");
  await Promise.resolve();

  assert.deepEqual(forwarded, ["session-1"]);
  assert.equal(refreshCalls.length, 1);
  assert.equal(refreshCalls[0]?.lifecycleTrigger, "turn_completed");
  assert.equal(refreshCalls[0]?.sessionId, "session-1");
});

test("createUsageRefreshTurnHook works without forward and swallows refresh errors", async () => {
  let refreshed = false;
  const host = {
    handleRefreshUsageLimits: (): Promise<void> => {
      refreshed = true;
      return Promise.reject(new Error("boom"));
    },
  };

  const hook = createUsageRefreshTurnHook(host, undefined);
  // Must not throw synchronously, and the rejection must be swallowed.
  hook("session-2");
  await Promise.resolve();

  assert.equal(refreshed, true);
});
