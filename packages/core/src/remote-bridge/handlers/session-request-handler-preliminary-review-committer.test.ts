import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "../../session-manager";
import { SessionRequestHandlerPreliminaryReviewCommitter } from "./session-request-handler-preliminary-review-committer";

type PreliminaryStage = "description" | "virtual_simulation";
type NextStage = "diagram_modules" | "virtual_simulation";

const REVIEW_PREFIX_BY_STAGE: Record<PreliminaryStage, string> = {
  description: "Core: Description перешёл в пользовательскую проверку.",
  virtual_simulation:
    "Core: Virtual Simulation перешёл в пользовательскую проверку.",
};

const createSession = (stage: PreliminaryStage): Session => ({
  continuationIndex: 1,
  continuationParentId: null,
  createdAt: "2026-05-29T00:00:00.000Z",
  id: `session-${stage}`,
  initiativeSlug: "demo-workspace",
  messages: [
    {
      content: REVIEW_PREFIX_BY_STAGE[stage],
      id: `review-${stage}`,
      role: "system",
      sessionId: `session-${stage}`,
      tag: "managed-workflow-user-review",
      timestamp: "2026-05-29T00:00:00.000Z",
    },
  ],
  providerId: "codexCli",
  providerSessionId: "provider-session",
  providerSessionStatus: "ready",
  runSlug: null,
  stage,
  title: stage,
  updatedAt: "2026-05-29T00:00:00.000Z",
  workspacePath: "/workspace",
});

test("preliminary review acceptance activates the next Core workflow stage", async () => {
  const cases: readonly {
    readonly stage: PreliminaryStage;
    readonly nextStage: NextStage;
  }[] = [
    { nextStage: "virtual_simulation", stage: "description" },
    { nextStage: "diagram_modules", stage: "virtual_simulation" },
  ];

  for (const { nextStage, stage } of cases) {
    const events: unknown[] = [];
    const commitStages: string[] = [];
    const operationOrder: string[] = [];
    const committer = new SessionRequestHandlerPreliminaryReviewCommitter({
      broadcaster: (event) => {
        events.push(event);
      },
      eventMessages: {
        appendCoreMessage: () => {
          operationOrder.push("append-core-message");
        },
        appendDialogMessage: () => {
          operationOrder.push("append-dialog-message");
        },
        waitForMessagePersistence: () => {
          operationOrder.push("wait-for-message-persistence");
          return Promise.resolve();
        },
      },
      stepCommitFacade: {
        commitAcceptedStep: (options) => {
          operationOrder.push("commit-accepted-step");
          commitStages.push(options.stage);
          return Promise.resolve({
            commit: { hash: "accepted" },
            stage: options.stage,
          } as never);
        },
      },
    });

    const handled = await committer.handle({
      content: "подтверждаю",
      hiddenUserMessage: false,
      session: createSession(stage),
      sessionId: `session-${stage}`,
    });

    assert.equal(handled, true);
    assert.deepEqual(commitStages, [stage]);
    assert.deepEqual(operationOrder, [
      "append-dialog-message",
      "append-core-message",
      "wait-for-message-persistence",
      "commit-accepted-step",
    ]);
    assert.deepEqual(events, [
      { payload: { stage: nextStage }, type: "workflow:stage:activate" },
    ]);
  }
});
