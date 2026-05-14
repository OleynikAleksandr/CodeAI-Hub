import assert from "node:assert/strict";
import test from "node:test";
import type { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { ManagedWorkflowPostTurnService } from "./managed-workflow-post-turn-service";

const createQualityGatesSessionManager = (): SessionManager =>
  ({
    getSession: () => ({
      id: "quality-gates-session",
      initiativeSlug: "demo-workspace",
      providerId: "codexCli",
      stage: "quality_gates",
      workspacePath: "/tmp/demo-workspace",
    }),
  }) as unknown as SessionManager;

test("Quality Gates post-turn handle is fail-closed without provider dispatch", async () => {
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
    sessionManager: createQualityGatesSessionManager(),
  });

  service.handle("quality-gates-session");
  await service.whenIdle("quality-gates-session");

  assert.deepEqual(dispatched, []);
});
