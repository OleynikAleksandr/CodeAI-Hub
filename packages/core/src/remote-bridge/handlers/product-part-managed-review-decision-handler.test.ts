import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "../../session-manager";
import type { ProductPartDevelopmentBriefReviewController } from "./product-part-development-brief-review-controller";
import { handleProductPartManagedReviewDecision } from "./product-part-managed-review-decision-handler";

const WORKSPACE_ROOT = "/tmp/finder-widget";
const WORKSPACE_SLUG = "finderwidget-test01";
const PART_ID = "finder-widget";
const SESSION_ID = "lead-session-1";
const STAGE = `development_tree/materialized/product-parts/${PART_ID}`;
const ACCEPTED_MESSAGE_RE = /accepted/u;
const CLUSTER_WAVE_STARTED_RE = /first cluster-contract wave|first prompt/u;
const LEAD_REVIEW_SESSION_ID = "lead-review-session-1";
const MODEL_BINDING = {
  baseModelId: "gpt-5.4-mini",
  boundAt: "2026-06-08T00:00:00.000Z",
  key: "provider\u001fcodexCli\u001fsession\u001flead-session-1",
  modelId: "gpt-5.4-mini reasoning:medium",
  providerId: "codexCli",
  reasoningEffort: "medium",
  source: "settings_default",
  updatedAt: "2026-06-08T00:00:00.000Z",
} as const;

type ProductPartReviewResult = Awaited<
  ReturnType<ProductPartDevelopmentBriefReviewController["handleAccepted"]>
>;

const createSession = (): Session => ({
  continuationIndex: 1,
  continuationParentId: null,
  createdAt: "2026-06-08T00:00:00.000Z",
  id: SESSION_ID,
  initiativeSlug: WORKSPACE_SLUG,
  messages: [],
  modelBinding: MODEL_BINDING,
  providerId: "codexCli",
  providerSessionStatus: "ready",
  runSlug: null,
  stage: STAGE,
  title: "finder-widget",
  updatedAt: "2026-06-08T00:00:00.000Z",
  workspacePath: WORKSPACE_ROOT,
});

test("Product Part order-plan review acceptance does not start cluster wave", async () => {
  const dialogMessages: string[] = [];
  const coreMessages: string[] = [];
  const sentInternalMessages: string[] = [];

  const handled = await handleProductPartManagedReviewDecision({
    eventMessages: {
      appendCoreMessage: (_sessionId, message) => {
        coreMessages.push(String(message.content));
      },
      appendDialogMessage: (_sessionId, message) => {
        dialogMessages.push(String(message.content));
      },
    },
    intent: "accept",
    messageDispatch: {
      sendInternalMessage: (_sessionId, content) => {
        sentInternalMessages.push(content);
        return Promise.resolve();
      },
    },
    options: {
      content: "подтверждаю",
      hiddenUserMessage: false,
      session: createSession(),
      sessionId: SESSION_ID,
    },
    productPartReview: {
      handleAccepted: () =>
        Promise.resolve({
          handled: true,
          message: {
            content: "accepted order plan",
            tag: "managed-workflow-assignment",
          },
          startFirstWave: { partId: PART_ID },
        } as ProductPartReviewResult & {
          readonly startFirstWave: { readonly partId: string };
        }),
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(dialogMessages, ["подтверждаю"]);
  assert.equal(sentInternalMessages.length, 0);
  assert.match(coreMessages.join("\n"), ACCEPTED_MESSAGE_RE);
  assert.doesNotMatch(coreMessages.join("\n"), CLUSTER_WAVE_STARTED_RE);
});

test("Product Part brief acceptance dispatches promoted lead review message to lead session", async () => {
  const dialogMessages: string[] = [];
  const coreMessages: Array<{
    readonly content: string;
    readonly sessionId: string;
  }> = [];
  const sentInternalMessages: string[] = [];

  const handled = await handleProductPartManagedReviewDecision({
    eventMessages: {
      appendCoreMessage: (sessionId, message) => {
        coreMessages.push({
          content: String(message.content),
          sessionId,
        });
      },
      appendDialogMessage: (_sessionId, message) => {
        dialogMessages.push(String(message.content));
      },
    },
    intent: "accept",
    messageDispatch: {
      sendInternalMessage: (_sessionId, content) => {
        sentInternalMessages.push(content);
        return Promise.resolve();
      },
    },
    options: {
      content: "подтверждаю",
      hiddenUserMessage: false,
      session: createSession(),
      sessionId: SESSION_ID,
    },
    productPartReview: {
      handleAccepted: () =>
        Promise.resolve({
          handled: true,
          message: {
            content: "secondary brief accepted",
            tag: "managed-workflow-complete",
          },
          targetCoreMessage: {
            content: "lead brief is ready for review",
            sessionId: LEAD_REVIEW_SESSION_ID,
            tag: "managed-workflow-user-review",
          },
        } satisfies ProductPartReviewResult),
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(dialogMessages, ["подтверждаю"]);
  assert.deepEqual(sentInternalMessages, []);
  assert.deepEqual(coreMessages, [
    {
      content: "secondary brief accepted",
      sessionId: SESSION_ID,
    },
    {
      content: "lead brief is ready for review",
      sessionId: LEAD_REVIEW_SESSION_ID,
    },
  ]);
});
