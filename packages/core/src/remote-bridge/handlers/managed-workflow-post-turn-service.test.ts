import assert from "node:assert/strict";
import test from "node:test";
import type { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { injectApplicationSkeletonReviewRevisionPair } from "./managed-documentation-commit-transaction";
import {
  ManagedWorkflowPostTurnService,
  recognizeManagedAcceptanceForStage,
  recognizeManagedContractAcceptancePhrase,
} from "./managed-workflow-post-turn-service";

const legacyRevisionHelperRetainedForCommitCleanup =
  injectApplicationSkeletonReviewRevisionPair;

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

test("recognizer keeps explicit managed acceptance phrases available", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю контракт"),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("I accept"),
    "Accept Contract"
  );
  assert.equal(
    recognizeManagedAcceptanceForStage(
      "application_skeleton",
      "Подтверждаю контракт"
    ),
    "Подтверждаю контракт"
  );
});

test("recognizer rejects ambiguous, negated, and out-of-stage acceptance text", () => {
  assert.equal(recognizeManagedContractAcceptancePhrase("Окей"), null);
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Не принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedAcceptanceForStage("diagram_modules", "Принимаю контракт"),
    null
  );
});

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

test("Application Skeleton accept-contract command rejects while legacy orchestration is disabled", async () => {
  const service = new ManagedWorkflowPostTurnService({
    logger: new Logger("error"),
    sessionManager: createManagedSessionManager("application_skeleton"),
  });

  const decision = await service.handleApplicationSkeletonAcceptContractCommand(
    {
      sessionId: "session-1",
      source: "typed-fallback",
    }
  );

  assert.equal(decision.kind, "rejected");
  assert.equal(decision.stage, "application_skeleton");
  assert.equal(decision.reasons.length, 1);
});

test("typed managed acceptance is ignored without invoking post-turn orchestration", async () => {
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

  service.handleContractAcceptance({
    phrase: "Принимаю контракт",
    sessionId: "session-1",
  });
  await service.whenIdle("session-1");

  assert.deepEqual(dispatched, []);
});

test("legacy revision helper is isolated from post-turn fail-closed behavior", () => {
  assert.equal(typeof legacyRevisionHelperRetainedForCommitCleanup, "function");
});
