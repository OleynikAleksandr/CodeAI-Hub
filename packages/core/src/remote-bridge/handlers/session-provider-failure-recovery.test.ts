import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import { SessionManager } from "../../session-manager";
import type { BridgeEvent } from "../types";
import { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";

const noop = (): void => undefined;
const STARTUP_FAILURE_RE = /Provider session startup timed out/u;

test("SessionProviderFailureRecovery closes shell sessions without provider binding", () => {
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/startup-recovery",
    undefined,
    { initiativeSlug: "demo", stage: "virtual_simulation" }
  );
  const closedSessions: string[] = [];
  const bindingBroadcasts: string[] = [];
  const events: BridgeEvent[] = [];
  const registryFailures: string[] = [];
  const recovery = new SessionProviderFailureRecovery({
    broadcaster: (event: BridgeEvent) => {
      events.push(event);
    },
    broadcastSessionBinding: (sessionId: string) => {
      bindingBroadcasts.push(sessionId);
    },
    consumeRetryBudget: noop,
    emitTurnStateEvent: noop,
    expirePendingUserIntent: noop,
    logger: {
      error: noop,
    },
    providerRegistry: {
      getAdapter: () => undefined,
      handleRuntimeFailure: (providerId: string) => {
        registryFailures.push(providerId);
      },
    } as unknown as ProviderRegistry,
    providerSessions: new Map(),
    sessionManager,
    sessionStorage: {
      close: (sessionId: string) => {
        closedSessions.push(sessionId);
      },
    },
    stateBroadcaster: noop,
  } as unknown as ConstructorParameters<
    typeof SessionProviderFailureRecovery
  >[0]);

  recovery.handleProviderFailure(
    "codexCli",
    new Error("Provider session startup timed out"),
    session.id
  );

  assert.equal(session.providerSessionStatus, "failed");
  assert.deepEqual(closedSessions, [session.id]);
  assert.deepEqual(bindingBroadcasts, [session.id]);
  assert.deepEqual(registryFailures, ["codexCli"]);
  assert.equal(events[0]?.type, "session:error");
  assert.match(
    (events[0]?.payload as { readonly message?: string } | undefined)
      ?.message ?? "",
    STARTUP_FAILURE_RE
  );
});
