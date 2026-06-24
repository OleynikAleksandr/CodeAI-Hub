import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import { resolveProviderSessionId } from "./session-provider-session-resolver";

const createAdapter = (
  overrides: Partial<ProviderAdapter> = {}
): ProviderAdapter =>
  ({
    closeSession: async () => undefined,
    createSession: async () => "provider-session",
    initialize: async () => undefined,
    sendMessage: async () => undefined,
    subscribe: () => () => undefined,
    ...overrides,
  }) as ProviderAdapter;

test("resolveProviderSessionId returns a managed timeout for stalled session creation", async () => {
  const adapter = createAdapter({
    createSession: () => new Promise<string>(() => undefined),
  });

  const result = await resolveProviderSessionId({
    adapter,
    providerId: "codexCli",
    requestedProviderSessionId: null,
    startupTimeoutMs: 5,
    workspacePath: "/tmp/codex-timeout",
  });

  assert.deepEqual(result, {
    error:
      "Failed to create codexCli session: Provider codexCli session create timed out after 5ms.",
  });
});

test("resolveProviderSessionId closes late sessions after startup timeout", async () => {
  let resolveLateSession: (sessionId: string) => void = () => undefined;
  const closedSessions: string[] = [];
  const adapter = createAdapter({
    closeSession: (sessionId) => {
      closedSessions.push(sessionId);
      return Promise.resolve();
    },
    createSession: () =>
      new Promise<string>((resolve) => {
        resolveLateSession = resolve;
      }),
  });

  const result = await resolveProviderSessionId({
    adapter,
    providerId: "codexCli",
    requestedProviderSessionId: null,
    startupTimeoutMs: 5,
    workspacePath: "/tmp/codex-timeout",
  });
  resolveLateSession("late-codex-session");
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.ok("error" in result);
  assert.deepEqual(closedSessions, ["late-codex-session"]);
});
