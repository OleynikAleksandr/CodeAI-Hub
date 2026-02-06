import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import type { BridgeEvent } from "../types";
import {
  type ProviderSessionBinding,
  SessionRequestHandler,
} from "./session-request-handler";

type BindingUpdate = {
  readonly sessionId: string;
  readonly providerSessionId: string;
};

type HandlerHarness = {
  readonly handler: SessionRequestHandler;
  readonly sessionManager: SessionManager;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly events: BridgeEvent[];
  readonly promoted: BindingUpdate[];
  readonly continuityUpdates: BindingUpdate[];
};

const noop = (): void => {
  // noop
};

const createHarness = (): HandlerHarness => {
  const sessionManager = new SessionManager();
  const providerSessions = new Map<string, ProviderSessionBinding>();
  const events: BridgeEvent[] = [];
  const promoted: BindingUpdate[] = [];
  const continuityUpdates: BindingUpdate[] = [];

  const handler = Object.create(
    SessionRequestHandler.prototype
  ) as SessionRequestHandler & Record<string, unknown>;

  Object.assign(handler, {
    providerSessions,
    sessionManager,
    sessionStorage: {
      promote: (sessionId: string, providerSessionId: string) => {
        promoted.push({ sessionId, providerSessionId });
      },
    },
    continuity: {
      handleProviderEvent: async () => Promise.resolve(),
      updateProviderSessionId: (
        sessionId: string,
        providerSessionId: string
      ) => {
        continuityUpdates.push({ sessionId, providerSessionId });
      },
    },
    logger: {
      info: noop,
      warn: noop,
      error: noop,
    },
    broadcaster: (event: BridgeEvent) => {
      events.push(event);
    },
    stateBroadcaster: noop,
    handleFlowNodeContinuityProviderEvent: async () => Promise.resolve(),
    handleFlowNodeContinuitySilentPreemptiveRollover: async () =>
      Promise.resolve(),
  });

  return {
    handler,
    sessionManager,
    providerSessions,
    events,
    promoted,
    continuityUpdates,
  };
};

test("SessionRequestHandler emits turn_state events for provider lifecycle", () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-turn-state"
  );

  (harness.handler as any).handleProviderEvent(session.id, {
    type: "turn_started",
  });
  (harness.handler as any).handleProviderEvent(session.id, {
    type: "turn_completed",
  });

  const turnStateEvents = harness.events.filter(
    (event) =>
      event.type === "session:stream" &&
      (
        event.payload as {
          readonly event?: { readonly data?: { readonly kind?: string } };
        }
      )?.event?.data?.kind === "turn_state"
  );

  assert.equal(turnStateEvents.length, 2);
  assert.equal(
    (
      turnStateEvents[0].payload as {
        readonly event?: { readonly data?: { readonly state?: string } };
      }
    )?.event?.data?.state,
    "running"
  );
  assert.equal(
    (
      turnStateEvents[1].payload as {
        readonly event?: { readonly data?: { readonly state?: string } };
      }
    )?.event?.data?.state,
    "idle"
  );
});

test("SessionRequestHandler updates provider binding on sessionIdChanged", () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-binding"
  );

  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "temp_123",
    unsubscribe: noop,
  });

  (harness.handler as any).handleProviderEvent(session.id, {
    type: "sessionIdChanged",
    payload: { newId: "real-session-123" },
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.equal(updatedSession?.providerSessionId, "real-session-123");
  assert.equal(updatedSession?.providerSessionStatus, "ready");
  assert.equal(
    harness.providerSessions.get(session.id)?.providerSessionId,
    "real-session-123"
  );
  assert.deepEqual(harness.promoted, [
    { sessionId: session.id, providerSessionId: "real-session-123" },
  ]);
  assert.deepEqual(harness.continuityUpdates, [
    { sessionId: session.id, providerSessionId: "real-session-123" },
  ]);

  const bindingEvents = harness.events.filter(
    (event) => event.type === "session:binding"
  );
  assert.equal(bindingEvents.length, 1);
  assert.equal(
    (bindingEvents[0].payload as { readonly providerSessionId?: string })
      ?.providerSessionId,
    "real-session-123"
  );
});
