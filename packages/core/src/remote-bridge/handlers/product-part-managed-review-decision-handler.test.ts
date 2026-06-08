import assert from "node:assert/strict";
import test from "node:test";
import type { ClusterContractAgentBootstrapRequest } from "../../development-tree/node-bootstrap/cluster-contract-agent-bootstrapper";
import type { Session } from "../../session-manager";
import type { ProductPartDevelopmentBriefReviewController } from "./product-part-development-brief-review-controller";
import { handleProductPartManagedReviewDecision } from "./product-part-managed-review-decision-handler";

const WORKSPACE_ROOT = "/tmp/finder-widget";
const WORKSPACE_SLUG = "finderwidget-test01";
const PART_ID = "finder-widget";
const CLUSTER_ID = "note-selection-cluster";
const SESSION_ID = "lead-session-1";
const STAGE = `development_tree/materialized/product-parts/${PART_ID}`;
const ACCEPTED_MESSAGE_RE = /accepted/u;
const CLUSTER_WAVE_STARTED_RE = /first prompt sent/u;

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
  providerId: "codexCli",
  providerSessionStatus: "ready",
  runSlug: null,
  stage: STAGE,
  title: "finder-widget",
  updatedAt: "2026-06-08T00:00:00.000Z",
  workspacePath: WORKSPACE_ROOT,
});

test("Product Part order-plan review acceptance starts first cluster wave", async () => {
  const dialogMessages: string[] = [];
  const coreMessages: string[] = [];
  const sentInternalMessages: string[] = [];
  const bootstrapRequests: ClusterContractAgentBootstrapRequest[] = [];

  const handled = await handleProductPartManagedReviewDecision({
    createClusterWaveBootstrapper: () => ({
      bootstrapFirstWave: (request) => {
        bootstrapRequests.push(request);
        return Promise.resolve([
          {
            branchName: "codex/finder-widget/note-selection-cluster",
            clusterId: CLUSTER_ID,
            firstMessageSent: true,
            plan: {
              absolutePath: `${WORKSPACE_ROOT}.worktrees/${CLUSTER_ID}/doc/TODO/todo-plan.md`,
              action: "created",
              relativePath: "doc/TODO/todo-plan.md",
            },
            sessionId: "cluster-session-1",
            stage: `${STAGE}/clusters/${CLUSTER_ID}`,
            worktreePath: `${WORKSPACE_ROOT}.worktrees/${CLUSTER_ID}`,
          },
        ]);
      },
    }),
    developmentTreeAgentGateway: {
      createSessionForWorkflow: () => Promise.resolve({ id: "unused" }),
      handleMessage: () => Promise.resolve(),
    },
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
  assert.deepEqual(bootstrapRequests, [
    {
      partId: PART_ID,
      workspaceRoot: WORKSPACE_ROOT,
      workspaceSlug: WORKSPACE_SLUG,
    },
  ]);
  assert.match(coreMessages.join("\n"), ACCEPTED_MESSAGE_RE);
  assert.match(coreMessages.join("\n"), CLUSTER_WAVE_STARTED_RE);
});
