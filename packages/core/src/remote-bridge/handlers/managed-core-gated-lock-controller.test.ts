import assert from "node:assert/strict";
import test from "node:test";
import { ManagedCoreGatedLockController } from "./managed-core-gated-lock-controller";

interface LockCall {
  readonly active: boolean;
  readonly nodeId: string;
  readonly reason?: string | null;
  readonly sessionId: string;
  readonly workspaceRoot: string;
}

interface GateEventData {
  readonly active?: boolean;
  readonly kind?: string;
  readonly providerSessionId?: string | null;
  readonly reason?: string | null;
  readonly sessionIds?: readonly string[];
}

const createController = (
  stage: string | null
): {
  readonly calls: LockCall[];
  readonly controller: ManagedCoreGatedLockController;
  readonly gateEvents: GateEventData[];
} => {
  const calls: LockCall[] = [];
  const gateEvents: GateEventData[] = [];
  const controller = new ManagedCoreGatedLockController({
    broadcaster: (event) => {
      const streamEvent = event.payload.event as {
        readonly data?: GateEventData;
      };
      gateEvents.push(streamEvent.data ?? {});
    },
    sessionManager: {
      getSession: (sessionId: string) =>
        sessionId === "parent-session"
          ? {
              id: sessionId,
              stage,
              workspacePath: "/workspace",
            }
          : {
              continuationParentId: "parent-session",
              id: sessionId,
              providerSessionId: "provider-session-1",
              stage,
              workspacePath: "/workspace",
            },
    },
    workspaceRuntime: {
      notifyLockChanged: (sessionKey, options) => {
        calls.push({
          active: options.active,
          nodeId: sessionKey.nodeId,
          reason: options.reason,
          sessionId: sessionKey.sessionId,
          workspaceRoot: sessionKey.workspaceRoot,
        });
      },
    },
  });
  return { calls, controller, gateEvents };
};

test("managed core-gated lock starts during technical-stage Core arbitration", () => {
  const { calls, controller } = createController("diagram_modules");

  controller.lockForCoreArbitration("session-1");
  controller.lockForCoreArbitration("session-1");

  assert.deepEqual(calls, [
    {
      active: true,
      nodeId: "diagram_modules",
      reason: "managed_core_gated",
      sessionId: "session-1",
      workspaceRoot: "/workspace",
    },
    {
      active: true,
      nodeId: "diagram_modules",
      reason: "managed_core_gated",
      sessionId: "session-1",
      workspaceRoot: "/workspace",
    },
  ]);
});

test("managed core-gated lock emits realtime gate aliases for PM projections", () => {
  const { controller, gateEvents } = createController("diagram_modules");

  controller.lockForCoreArbitration("session-1");

  assert.deepEqual(gateEvents, [
    {
      active: true,
      kind: "managed_input_gate",
      providerSessionId: "provider-session-1",
      reason: "managed_core_gated",
      sessionIds: ["session-1", "parent-session"],
    },
  ]);
});

test("managed core-gated lock releases only sessions locked by this controller", () => {
  const { calls, controller } = createController("quality_gates");

  controller.apply("session-1", "settled");
  controller.lockForCoreArbitration("session-1");
  controller.apply("session-1", "continued");
  controller.apply("session-1", "settled");
  controller.apply("session-1", "not_managed");

  assert.deepEqual(calls, [
    {
      active: true,
      nodeId: "quality_gates",
      reason: "managed_core_gated",
      sessionId: "session-1",
      workspaceRoot: "/workspace",
    },
    {
      active: true,
      nodeId: "quality_gates",
      reason: "managed_core_gated",
      sessionId: "session-1",
      workspaceRoot: "/workspace",
    },
    {
      active: false,
      nodeId: "quality_gates",
      reason: null,
      sessionId: "session-1",
      workspaceRoot: "/workspace",
    },
  ]);
});

test("managed core-gated lock reasserts continuation after arbitration", () => {
  const { calls, controller } = createController("diagram_modules");

  controller.lockForCoreArbitration("session-1");
  controller.apply("session-1", "continued");

  assert.deepEqual(calls, [
    {
      active: true,
      nodeId: "diagram_modules",
      reason: "managed_core_gated",
      sessionId: "session-1",
      workspaceRoot: "/workspace",
    },
    {
      active: true,
      nodeId: "diagram_modules",
      reason: "managed_core_gated",
      sessionId: "session-1",
      workspaceRoot: "/workspace",
    },
  ]);
});

test("managed core-gated lock ignores preliminary workflow stages", () => {
  const { calls, controller } = createController("description");

  controller.lockForCoreArbitration("session-1");
  controller.apply("session-1", "continued");

  assert.deepEqual(calls, []);
});
