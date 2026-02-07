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

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    setImmediate(() => resolve());
  });
  await new Promise<void>((resolve) => {
    setImmediate(() => resolve());
  });
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
    flowNodeContinuityLockContexts: new Map(),
    flowNodeContinuityLockTimeouts: new Map(),
    sessionStorage: {
      appendMessage: noop,
      close: noop,
      promote: (sessionId: string, providerSessionId: string) => {
        promoted.push({ sessionId, providerSessionId });
      },
    },
    continuity: {
      handleProviderEvent: async () => Promise.resolve(),
      ensureTrackedOnOutboundMessage: async () => Promise.resolve(),
      updateProviderSessionId: (
        sessionId: string,
        providerSessionId: string
      ) => {
        continuityUpdates.push({ sessionId, providerSessionId });
      },
    },
    providerRegistry: {
      getAdapter: () => null,
      handleRuntimeFailure: noop,
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

const collectTurnStateSequence = (events: readonly BridgeEvent[]): string[] =>
  events
    .filter((event) => event.type === "session:stream")
    .map((event) => {
      const payload = event.payload as {
        readonly event?: {
          readonly data?: { readonly kind?: string; readonly state?: string };
        };
      };
      if (payload.event?.data?.kind !== "turn_state") {
        return null;
      }
      return payload.event.data.state ?? null;
    })
    .filter((state): state is string => typeof state === "string");

test("SessionRequestHandler emits turn_state events for provider lifecycle", async () => {
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
  await flushAsyncWork();

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

test("SessionRequestHandler unlocks continuity lock after bootstrap turn completion", async () => {
  const harness = createHarness();
  const sourceSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-continuity-source"
  );
  const targetSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-continuity-target"
  );

  (harness.handler as any).registerFlowNodeContinuityLockContext({
    rolloverId: "rollover-1",
    sourceSessionId: sourceSession.id,
    targetSessionId: targetSession.id,
    stageId: "description",
    runSlug: "reviewer",
    awaitingBootstrapTurn: true,
  });

  (harness.handler as any).emitContinuityLockEvent({
    sessionId: targetSession.id,
    rolloverId: "rollover-1",
    sourceSessionId: sourceSession.id,
    targetSessionId: targetSession.id,
    stageId: "description",
    runSlug: "reviewer",
    state: "locked",
    reason: "resume_bootstrap",
  });

  (harness.handler as any).handleProviderEvent(targetSession.id, {
    type: "turn_completed",
  });
  await flushAsyncWork();

  const continuityLockEvents = harness.events.filter(
    (event) =>
      event.type === "session:stream" &&
      (
        event.payload as {
          readonly event?: { readonly data?: { readonly kind?: string } };
        }
      )?.event?.data?.kind === "continuity_lock"
  );

  assert.equal(continuityLockEvents.length, 3);

  const unlockEvents = continuityLockEvents.slice(1).map((event) => {
    const payload = event.payload as {
      readonly sessionId?: string;
      readonly event?: {
        readonly data?: { readonly state?: string; readonly reason?: string };
      };
    };
    return {
      sessionId: payload.sessionId,
      state: payload.event?.data?.state,
      reason: payload.event?.data?.reason,
    };
  });

  assert.deepEqual(unlockEvents, [
    {
      sessionId: targetSession.id,
      state: "unlocked",
      reason: "resume_ready",
    },
    {
      sessionId: sourceSession.id,
      state: "unlocked",
      reason: "resume_ready",
    },
  ]);

  assert.equal(
    (
      harness.handler as unknown as {
        readonly flowNodeContinuityLockContexts: Map<string, unknown>;
      }
    ).flowNodeContinuityLockContexts.size,
    0
  );
});

test("SessionRequestHandler does not emit idle before continuity lock when rollover starts at turn end", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-turn-end-arbitration",
    "provider-session-1",
    {
      initiativeSlug: "demo",
      stage: "description",
      runSlug: "reviewer",
    }
  );

  (harness.handler as any).handleFlowNodeContinuitySilentPreemptiveRollover =
    () => {
      (harness.handler as any).emitContinuityLockEvent({
        sessionId: session.id,
        rolloverId: "rollover-atomic",
        sourceSessionId: session.id,
        stageId: "description",
        runSlug: "reviewer",
        state: "locked",
        reason: "threshold_reached",
      });
      return Promise.resolve(true);
    };

  (harness.handler as any).handleProviderEvent(session.id, {
    type: "turn_completed",
  });
  await flushAsyncWork();

  const turnIdleEvents = harness.events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: { readonly kind?: string; readonly state?: string };
      };
    };
    return (
      payload.event?.data?.kind === "turn_state" &&
      payload.event.data.state === "idle"
    );
  });

  const lockEvents = harness.events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: { readonly data?: { readonly kind?: string } };
    };
    return payload.event?.data?.kind === "continuity_lock";
  });

  assert.equal(lockEvents.length, 1);
  assert.equal(turnIdleEvents.length, 0);
});

test("SessionRequestHandler blocks old-session sends while rollover is pending", async () => {
  const harness = createHarness();
  const sourceSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-send-guard",
    "provider-session-2",
    {
      initiativeSlug: "demo",
      stage: "description",
      runSlug: "reviewer",
    }
  );
  const targetSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-send-guard"
  );

  (harness.handler as any).registerFlowNodeContinuityLockContext({
    rolloverId: "rollover-guard",
    sourceSessionId: sourceSession.id,
    targetSessionId: targetSession.id,
    stageId: "description",
    runSlug: "reviewer",
    awaitingBootstrapTurn: true,
  });

  await (harness.handler as any).handleMessage(sourceSession.id, "hello");

  const blockedSendEvent = harness.events.find((event) => {
    if (event.type !== "session:error") {
      return false;
    }
    const payload = event.payload as {
      readonly code?: string;
      readonly sessionId?: string;
    };
    return (
      payload.code === "continuity_rollover_pending" &&
      payload.sessionId === sourceSession.id
    );
  });

  assert.ok(blockedSendEvent);
  const sessionAfter = harness.sessionManager.getSession(sourceSession.id);
  assert.equal(sessionAfter?.messages.length ?? 0, 0);
});

test("SessionRequestHandler emits immediate running before provider send resolves", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-immediate-running"
  );

  let resolveSend: (() => void) | null = null;
  const sendPromise = new Promise<void>((resolve) => {
    resolveSend = resolve;
  });
  const sendCalls: string[] = [];
  (harness.handler as any).providerRegistry = {
    getAdapter: () => ({
      sendMessage: (_providerSessionId: string, content: string) => {
        sendCalls.push(content);
        return sendPromise;
      },
    }),
    handleRuntimeFailure: noop,
  };
  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "provider-session-3",
    unsubscribe: noop,
  });

  const pendingSend = (harness.handler as any).handleMessage(
    session.id,
    "hello"
  );
  await flushAsyncWork();

  const turnStatesBeforeResolve = collectTurnStateSequence(harness.events);
  assert.deepEqual(turnStatesBeforeResolve, ["running"]);
  assert.deepEqual(sendCalls, ["hello"]);

  resolveSend?.();
  await pendingSend;
});

test("SessionRequestHandler rolls back running state to idle on provider send failure", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-running-rollback"
  );

  (harness.handler as any).providerRegistry = {
    getAdapter: () => ({
      sendMessage: () => Promise.reject(new Error("simulated send failure")),
    }),
    handleRuntimeFailure: noop,
  };
  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "provider-session-4",
    unsubscribe: noop,
  });

  await (harness.handler as any).handleMessage(session.id, "rollback me");

  const turnStates = collectTurnStateSequence(harness.events);
  assert.deepEqual(turnStates, ["running", "idle"]);
});
