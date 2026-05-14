import assert from "node:assert/strict";
import test from "node:test";
import type { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { ManagedWorkflowPostTurnService } from "./managed-workflow-post-turn-service";

const createManagedSessionManager = (
  stage: "application_skeleton" | "diagram_modules" | "quality_gates"
): SessionManager =>
  ({
    getSession: () => ({
      id: "session-1",
      initiativeSlug: "demo-workspace",
      providerId: "codexCli",
      stage,
      workspacePath: "/tmp/demo-workspace",
    }),
  }) as unknown as SessionManager;

test("post-turn handle is fail-closed and does not dispatch provider messages", async () => {
  const dispatched: string[] = [];
  const service = new ManagedWorkflowPostTurnService({
    developmentTreeAgentSessions: {
      gateway: {
        createSessionForWorkflow: () => Promise.resolve(null),
        handleMessage: (_sessionId, content) => {
          dispatched.push(typeof content === "string" ? content : "payload");
          return Promise.resolve();
        },
      },
      providerId: "codexCli",
    },
    logger: new Logger("error"),
    sessionManager: createManagedSessionManager("diagram_modules"),
  });

  service.handle("session-1");
  await service.whenIdle("session-1");

  assert.deepEqual(dispatched, []);
});

test("ordinary user text cannot invoke removed accept orchestration", async () => {
  const dispatched: string[] = [];
  const service = new ManagedWorkflowPostTurnService({
    developmentTreeAgentSessions: {
      gateway: {
        createSessionForWorkflow: () => Promise.resolve(null),
        handleMessage: (_sessionId, content) => {
          dispatched.push(typeof content === "string" ? content : "payload");
          return Promise.resolve();
        },
      },
      providerId: "codexCli",
    },
    logger: new Logger("error"),
    sessionManager: createManagedSessionManager("application_skeleton"),
  });

  service.handle("session-1");
  await service.whenIdle("session-1");

  assert.deepEqual(dispatched, []);
});
