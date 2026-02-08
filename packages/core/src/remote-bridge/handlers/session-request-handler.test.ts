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

type RuntimeLockUpdate = {
  readonly sessionId: string;
  readonly active: boolean;
  readonly reason: string | null;
  readonly transitionRolloverId: string | null;
  readonly awaitingBootstrapTurn: boolean;
};

type HandlerHarness = {
  readonly handler: SessionRequestHandler;
  readonly sessionManager: SessionManager;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly events: BridgeEvent[];
  readonly promoted: BindingUpdate[];
  readonly continuityUpdates: BindingUpdate[];
  readonly runtimeLockUpdates: RuntimeLockUpdate[];
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
  const runtimeLockUpdates: RuntimeLockUpdate[] = [];

  const handler = Object.create(
    SessionRequestHandler.prototype
  ) as SessionRequestHandler & Record<string, unknown>;

  Object.assign(handler, {
    providerSessions,
    sessionManager,
    flowNodeRolloverInFlight: new Set(),
    flowNodeRolloverStarted: new Set(),
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
    workspaceRuntime: {
      notifyTurnStateChanged: noop,
      notifyFinalTurnCompleted: noop,
      notifyLockChanged: (
        sessionKey: { readonly sessionId: string },
        options: {
          readonly active: boolean;
          readonly reason?: string | null;
          readonly transition?: {
            readonly rolloverId: string;
            readonly awaitingBootstrapTurn: boolean;
          } | null;
        }
      ) => {
        runtimeLockUpdates.push({
          sessionId: sessionKey.sessionId,
          active: options.active,
          reason: options.reason ?? null,
          transitionRolloverId: options.transition?.rolloverId ?? null,
          awaitingBootstrapTurn:
            options.transition?.awaitingBootstrapTurn ?? false,
        });
      },
      notifySessionCreated: noop,
      notifyBindingChanged: noop,
      notifySessionDeleted: noop,
      notifyArtifactWritten: noop,
      recordHeartbeat: noop,
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
    runtimeLockUpdates,
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

const countIdleTurnStateEvents = (events: readonly BridgeEvent[]): number =>
  events.filter((event) => {
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
  }).length;

const countNoRolloverUnlockEvents = (events: readonly BridgeEvent[]): number =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "unlocked" &&
      payload.event.data.reason === "no_rollover_needed"
    );
  }).length;

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

test("SessionRequestHandler marks internal messages as running turns", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-internal-running"
  );

  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "temp_123",
    unsubscribe: noop,
  });

  const adapter = {
    sendMessage: async () => Promise.resolve(),
  };
  (harness.handler as any).providerRegistry = {
    getAdapter: () => adapter,
    handleRuntimeFailure: noop,
  };

  await (harness.handler as any).sendInternalMessage(session.id, "INTERNAL");

  const turnStates = collectTurnStateSequence(harness.events);
  assert.deepEqual(turnStates, ["running"]);
});

test("SessionRequestHandler resets internal turn state when adapter send fails", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-internal-failure"
  );

  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "temp_123",
    unsubscribe: noop,
  });

  const adapter = {
    sendMessage: () => {
      throw new Error("kaboom");
    },
  };
  (harness.handler as any).providerRegistry = {
    getAdapter: () => adapter,
    handleRuntimeFailure: noop,
  };

  await (harness.handler as any).sendInternalMessage(session.id, "INTERNAL");

  const turnStates = collectTurnStateSequence(harness.events);
  assert.deepEqual(turnStates, ["running", "idle"]);
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

test("SessionRequestHandler unlocks continuity lock only after bootstrap assistant message", async () => {
  const harness = createHarness();
  const sourceSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-continuity-source"
  );
  const targetSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-continuity-target"
  );
  const lifecycleStore = (
    harness.handler as any
  ).getSessionResumeLifecycleStore();
  lifecycleStore.set(sourceSession.id, {
    mode: "resume_via_rollover",
    finalTurnCompleted: false,
    terminalLockReason: null,
  });
  lifecycleStore.set(targetSession.id, {
    mode: "resume_via_rollover",
    finalTurnCompleted: false,
    terminalLockReason: null,
  });

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
  let continuityLockEvents = harness.events.filter(
    (event) =>
      event.type === "session:stream" &&
      (
        event.payload as {
          readonly event?: { readonly data?: { readonly kind?: string } };
        }
      )?.event?.data?.kind === "continuity_lock"
  );
  assert.equal(continuityLockEvents.length, 1);

  (harness.handler as any).handleProviderEvent(targetSession.id, {
    type: "assistant",
    payload: "bootstrap complete",
  });
  await flushAsyncWork();

  continuityLockEvents = harness.events.filter(
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

  const targetRuntimeUpdates = harness.runtimeLockUpdates.filter(
    (entry) => entry.sessionId === targetSession.id
  );
  assert.deepEqual(
    targetRuntimeUpdates.map((entry) => ({
      active: entry.active,
      reason: entry.reason,
      transitionRolloverId: entry.transitionRolloverId,
      awaitingBootstrapTurn: entry.awaitingBootstrapTurn,
    })),
    [
      {
        active: true,
        reason: "resume_bootstrap",
        transitionRolloverId: "rollover-1",
        awaitingBootstrapTurn: true,
      },
      {
        active: false,
        reason: "resume_ready",
        transitionRolloverId: null,
        awaitingBootstrapTurn: false,
      },
    ]
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

test("SessionRequestHandler does not emit no-rollover unlock while rollover context is pending", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-rollover-pending-unlock-guard",
    "provider-session-pending",
    {
      initiativeSlug: "demo",
      stage: "description",
      runSlug: "reviewer",
    }
  );
  (harness.handler as any).getSessionResumeLifecycleStore().set(session.id, {
    mode: "resume_in_place",
    finalTurnCompleted: false,
    terminalLockReason: null,
  });
  (harness.handler as any).registerFlowNodeContinuityLockContext({
    rolloverId: "rollover-pending",
    sourceSessionId: session.id,
    stageId: "description",
    runSlug: "reviewer",
    awaitingBootstrapTurn: false,
  });

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
  const noRolloverUnlockEvents = harness.events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "unlocked" &&
      payload.event.data.reason === "no_rollover_needed"
    );
  });

  assert.equal(turnIdleEvents.length, 0);
  assert.equal(noRolloverUnlockEvents.length, 0);
});

test("SessionRequestHandler defers turn-completed unlock until async rollover arbitration resolves", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-turn-completed-async-dual-gate",
    "provider-session-async-dual-gate",
    {
      initiativeSlug: "demo",
      stage: "description",
      runSlug: "reviewer",
    }
  );
  (harness.handler as any).getSessionResumeLifecycleStore().set(session.id, {
    mode: "resume_in_place",
    finalTurnCompleted: false,
    terminalLockReason: null,
  });

  let resolveFlowNodeArbitration: () => void = noop;
  (harness.handler as any).handleFlowNodeContinuityProviderEvent = () =>
    new Promise<void>((resolve) => {
      resolveFlowNodeArbitration = () => {
        (harness.handler as any).registerFlowNodeContinuityLockContext({
          rolloverId: "rollover-async-dual-gate",
          sourceSessionId: session.id,
          stageId: "description",
          runSlug: "reviewer",
          awaitingBootstrapTurn: false,
        });
        resolve();
      };
    });

  (harness.handler as any).handleProviderEvent(session.id, {
    type: "turn_completed",
  });
  await flushAsyncWork();

  assert.equal(countIdleTurnStateEvents(harness.events), 0);
  assert.equal(countNoRolloverUnlockEvents(harness.events), 0);

  resolveFlowNodeArbitration();
  await flushAsyncWork();

  assert.equal(countIdleTurnStateEvents(harness.events), 0);
  assert.equal(countNoRolloverUnlockEvents(harness.events), 0);
});

test("SessionRequestHandler enforces no_resume terminal lock and read-only send guard", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-no-resume-terminal",
    "provider-session-no-resume",
    {
      initiativeSlug: "demo",
      stage: "description",
    }
  );
  (harness.handler as any).getSessionResumeLifecycleStore().set(session.id, {
    mode: "no_resume",
    finalTurnCompleted: false,
    terminalLockReason: null,
  });

  (harness.handler as any).handleProviderEvent(session.id, {
    type: "turn_completed",
  });
  await flushAsyncWork();

  const terminalLockEvent = harness.events.find((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "locked" &&
      payload.event.data.reason === "terminal_no_resume"
    );
  });
  assert.ok(terminalLockEvent);

  await (harness.handler as any).handleMessage(session.id, "follow-up");
  const terminalReadOnlyError = harness.events.find((event) => {
    if (event.type !== "session:error") {
      return false;
    }
    const payload = event.payload as { readonly code?: string };
    return payload.code === "session_terminal_read_only";
  });
  assert.ok(terminalReadOnlyError);
});

test("SessionRequestHandler emits no-rollover unlock decision for resume_in_place sessions", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-resume-in-place"
  );
  (harness.handler as any).getSessionResumeLifecycleStore().set(session.id, {
    mode: "resume_in_place",
    finalTurnCompleted: false,
    terminalLockReason: null,
  });

  (harness.handler as any).handleProviderEvent(session.id, {
    type: "turn_completed",
  });
  await flushAsyncWork();

  const decisionEvent = harness.events.find((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "unlocked" &&
      payload.event.data.reason === "no_rollover_needed"
    );
  });
  assert.ok(decisionEvent);
});

test("SessionRequestHandler keeps lock active for resume_failed and resume_timeout", async () => {
  const harness = createHarness();
  const sourceSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-failed-timeout-source"
  );
  const targetSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-failed-timeout-target"
  );
  const registerContext = () =>
    (harness.handler as any).registerFlowNodeContinuityLockContext({
      rolloverId: "rollover-failure",
      sourceSessionId: sourceSession.id,
      targetSessionId: targetSession.id,
      stageId: "description",
      runSlug: "reviewer",
      awaitingBootstrapTurn: true,
    });

  registerContext();
  (harness.handler as any).emitContinuityLockEvent({
    sessionId: targetSession.id,
    rolloverId: "rollover-failure",
    sourceSessionId: sourceSession.id,
    targetSessionId: targetSession.id,
    stageId: "description",
    runSlug: "reviewer",
    state: "locked",
    reason: "resume_bootstrap",
  });
  (harness.handler as any).handleProviderEvent(targetSession.id, {
    type: "turn_failed",
  });
  await flushAsyncWork();

  const failureEvents = harness.events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "locked" &&
      payload.event.data.reason === "resume_failed"
    );
  });
  assert.equal(failureEvents.length, 2);

  registerContext();
  (harness.handler as any).emitContinuityLockEvent({
    sessionId: targetSession.id,
    rolloverId: "rollover-failure",
    sourceSessionId: sourceSession.id,
    targetSessionId: targetSession.id,
    stageId: "description",
    runSlug: "reviewer",
    state: "locked",
    reason: "resume_bootstrap",
  });
  (harness.handler as any).finalizeFlowNodeContinuityLock({
    sessionId: targetSession.id,
    reason: "resume_timeout",
  });
  await flushAsyncWork();

  const timeoutEvents = harness.events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "locked" &&
      payload.event.data.reason === "resume_timeout"
    );
  });
  assert.equal(timeoutEvents.length, 2);
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

  let resolveSend: () => void = noop;
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

  resolveSend();
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
