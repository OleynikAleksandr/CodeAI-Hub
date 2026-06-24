import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import {
  type PostRebindUsageLimitsAdapter,
  triggerPostRebindUsageLimitsRefresh,
} from "./session-request-handler-post-rebind-usage-limits";

const createSilentLogger = (): Logger =>
  ({
    debug: () => {
      // no-op
    },
    info: () => {
      // no-op
    },
    warn: () => {
      // no-op
    },
    error: () => {
      // no-op
    },
    log: () => {
      // no-op
    },
    minLevel: "debug",
  }) as unknown as Logger;

const createStubSession = (): Session =>
  ({
    sessionId: "session-1",
    workspacePath: "/workspace",
  }) as unknown as Session;

test("triggerPostRebindUsageLimitsRefresh skips adapters without refreshUsageLimits", () => {
  const events: BridgeEvent[] = [];
  const adapter: PostRebindUsageLimitsAdapter = {};
  triggerPostRebindUsageLimitsRefresh({
    adapter,
    broadcaster: (event) => events.push(event),
    logger: createSilentLogger(),
    providerId: "claudeCodeCli",
    providerSessionId: "claude-1",
    session: createStubSession(),
    sessionId: "session-1",
  });
  assert.equal(events.length, 0);
});

test("triggerPostRebindUsageLimitsRefresh invokes adapter.refreshUsageLimits exactly once with the retry binding", () => {
  const calls: Array<{
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }> = [];
  const adapter: PostRebindUsageLimitsAdapter = {
    refreshUsageLimits: (params) => {
      calls.push({
        providerSessionId: params.providerSessionId,
        runtimeSessionId: params.runtimeSessionId,
        workspacePath: params.workspacePath,
      });
    },
  };
  triggerPostRebindUsageLimitsRefresh({
    adapter,
    broadcaster: () => {
      // ignored in this test
    },
    logger: createSilentLogger(),
    providerId: "codexCli",
    providerSessionId: "codex-thread-42",
    session: createStubSession(),
    sessionId: "session-1",
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    providerSessionId: "codex-thread-42",
    runtimeSessionId: "session-1",
    workspacePath: "/workspace",
  });
});

test("triggerPostRebindUsageLimitsRefresh broadcasts only normalized usage_limits events", () => {
  const events: BridgeEvent[] = [];
  const adapter: PostRebindUsageLimitsAdapter = {
    refreshUsageLimits: (params) => {
      // Adapter pushes one ignored non-usage event followed by a real payload.
      params.broadcast({ not: "usage" });
      params.broadcast({
        data: { kind: "usage_limits" },
        usageLimits: { remaining: 42 },
        providerScopeKey: "claude",
        uuid: "abc::usage_limits",
        timestamp: "2026-04-21T15:00:00Z",
      });
    },
  };
  triggerPostRebindUsageLimitsRefresh({
    adapter,
    broadcaster: (event) => events.push(event),
    logger: createSilentLogger(),
    providerId: "claudeCodeCli",
    providerSessionId: "claude-1",
    session: createStubSession(),
    sessionId: "session-1",
  });
  assert.equal(events.length, 1);
  const [broadcast] = events;
  assert.equal(broadcast.type, "session:stream");
  const payload = (broadcast as { payload: Record<string, unknown> }).payload;
  assert.equal(payload.sessionId, "session-1");
});

test("triggerPostRebindUsageLimitsRefresh swallows synchronous adapter failures without crashing", () => {
  const warnings: string[] = [];
  const logger = {
    ...createSilentLogger(),
    warn: (message: string) => {
      warnings.push(message);
    },
  } as unknown as Logger;
  const adapter: PostRebindUsageLimitsAdapter = {
    refreshUsageLimits: () => {
      throw new Error("boom");
    },
  };
  triggerPostRebindUsageLimitsRefresh({
    adapter,
    broadcaster: () => {
      // ignored in this test
    },
    logger,
    providerId: "kimiCode",
    providerSessionId: "kimi-1",
    session: createStubSession(),
    sessionId: "session-1",
  });
  assert.ok(
    warnings.some((w) => w.includes("Post-rebind usage limits refresh failed"))
  );
});
