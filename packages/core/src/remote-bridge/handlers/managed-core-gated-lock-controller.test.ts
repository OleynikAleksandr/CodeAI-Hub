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

const createController = (
  stage: string | null
): {
  readonly calls: LockCall[];
  readonly controller: ManagedCoreGatedLockController;
} => {
  const calls: LockCall[] = [];
  const controller = new ManagedCoreGatedLockController({
    sessionManager: {
      getSession: (sessionId: string) => ({
        id: sessionId,
        stage,
        workspacePath: "/workspace",
      }),
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
  return { calls, controller };
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
