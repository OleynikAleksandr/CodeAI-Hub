import assert from "node:assert/strict";
import test from "node:test";
import { reconcileKimiThinkingEnabled } from "./kimi-thinking-reconciler";

interface ReconfigureCall {
  readonly enabled: boolean;
}

interface ReconcilerHarness {
  readonly invalidated: string[];
  readonly invalidateProviderBinding: (sessionId: string) => void;
  readonly providerRegistry: {
    getAdapter: (providerId: string) => unknown;
  };
  readonly reconfigureCalls: ReconfigureCall[];
  readonly sessionManager: {
    invalidateProviderBinding: (sessionId: string) => void;
    listSessions: () => ReadonlyArray<{
      readonly id: string;
      readonly providerId: string;
    }>;
  };
  setAdapterPresent(present: boolean): void;
  setReconfigureResult(result: boolean): void;
}

const createReconcilerHarness = (
  sessions: {
    readonly id: string;
    readonly providerId: string;
  }[]
): ReconcilerHarness => {
  const invalidated: string[] = [];
  const reconfigureCalls: ReconfigureCall[] = [];
  let reconfigureResult = true;
  let adapterPresent = true;

  const fakeAdapter = {
    get reconfigureThinking() {
      if (!adapterPresent) {
        return undefined;
      }
      return (enabled: boolean) => {
        reconfigureCalls.push({ enabled });
        return Promise.resolve(reconfigureResult);
      };
    },
  };

  return {
    invalidateProviderBinding: (sessionId) => invalidated.push(sessionId),
    invalidated,
    providerRegistry: {
      getAdapter: (providerId) =>
        providerId === "kimiCode" && adapterPresent ? fakeAdapter : undefined,
    },
    sessionManager: {
      invalidateProviderBinding: (sessionId) => invalidated.push(sessionId),
      listSessions: () => sessions,
    },
    reconfigureCalls,
    setReconfigureResult(result) {
      reconfigureResult = result;
    },
    setAdapterPresent(present) {
      adapterPresent = present;
    },
  };
};

test("reconcileKimiThinkingEnabled does not invalidate bindings when reconfigure reports no change", async () => {
  const harness = createReconcilerHarness([
    { id: "kimi-1", providerId: "kimiCode" },
  ]);
  harness.setReconfigureResult(false); // adapter already at requested value

  await reconcileKimiThinkingEnabled(
    { providers: { kimi: { thinkingEnabled: true } } },
    harness.providerRegistry,
    harness.sessionManager
  );

  assert.equal(
    harness.reconfigureCalls.length,
    1,
    "reconfigure must be called"
  );
  assert.equal(harness.reconfigureCalls[0]?.enabled, true);
  assert.equal(
    harness.invalidated.length,
    0,
    "no bindings must be invalidated"
  );
});

test("reconcileKimiThinkingEnabled invalidates kimi bindings when reconfigure reports a restart", async () => {
  const harness = createReconcilerHarness([
    { id: "kimi-1", providerId: "kimiCode" },
    { id: "kimi-2", providerId: "kimiCode" },
    { id: "codex-1", providerId: "codexCli" },
  ]);
  harness.setReconfigureResult(true);

  await reconcileKimiThinkingEnabled(
    { providers: { kimi: { thinkingEnabled: false } } },
    harness.providerRegistry,
    harness.sessionManager
  );

  assert.equal(harness.reconfigureCalls.length, 1);
  assert.equal(harness.reconfigureCalls[0]?.enabled, false);
  assert.deepEqual(
    harness.invalidated,
    ["kimi-1", "kimi-2"],
    "only kimiCode sessions must be invalidated"
  );
});

test("reconcileKimiThinkingEnabled treats thinkingEnabled undefined as enabled (true)", async () => {
  const harness = createReconcilerHarness([
    { id: "kimi-1", providerId: "kimiCode" },
  ]);
  harness.setReconfigureResult(true);

  await reconcileKimiThinkingEnabled(
    { providers: { kimi: {} } },
    harness.providerRegistry,
    harness.sessionManager
  );

  assert.equal(harness.reconfigureCalls[0]?.enabled, true);
});

test("reconcileKimiThinkingEnabled is a no-op when no kimi sessions exist", async () => {
  const harness = createReconcilerHarness([
    { id: "codex-1", providerId: "codexCli" },
  ]);

  await reconcileKimiThinkingEnabled(
    { providers: { kimi: { thinkingEnabled: true } } },
    harness.providerRegistry,
    harness.sessionManager
  );

  assert.equal(harness.reconfigureCalls.length, 0);
  assert.equal(harness.invalidated.length, 0);
});

test("reconcileKimiThinkingEnabled is a no-op when kimi provider is not registered", async () => {
  const harness = createReconcilerHarness([
    { id: "kimi-1", providerId: "kimiCode" },
  ]);
  harness.setAdapterPresent(false);

  await reconcileKimiThinkingEnabled(
    { providers: { kimi: { thinkingEnabled: true } } },
    harness.providerRegistry,
    harness.sessionManager
  );

  assert.equal(harness.reconfigureCalls.length, 0);
  assert.equal(harness.invalidated.length, 0);
});

test("reconcileKimiThinkingEnabled is a no-op when settings have no kimi block", async () => {
  const harness = createReconcilerHarness([
    { id: "kimi-1", providerId: "kimiCode" },
  ]);

  await reconcileKimiThinkingEnabled(
    { providers: { codex: { autoUpdate: true } } },
    harness.providerRegistry,
    harness.sessionManager
  );

  assert.equal(harness.reconfigureCalls.length, 0);
});

test("reconcileKimiThinkingEnabled handles reset-to-defaults settings shape (record providers.kimi)", async () => {
  // handleReset passes result.settings through; verify the same reconciler
  // treats a freshly reset snapshot identically to a user save.
  const harness = createReconcilerHarness([
    { id: "kimi-1", providerId: "kimiCode" },
  ]);
  harness.setReconfigureResult(true);

  await reconcileKimiThinkingEnabled(
    {
      providers: {
        kimi: { autoUpdate: true, defaultModel: "kimi-k2.7-code" },
      },
    },
    harness.providerRegistry,
    harness.sessionManager
  );

  assert.equal(harness.reconfigureCalls[0]?.enabled, true);
  assert.equal(harness.invalidated.length, 1);
});
