import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerManagedWorkflowTurn } from "./session-request-handler-managed-workflow-turn";

const PART_ID = "engine";
const CORE_REPAIR_RE = /Core managed repair/u;
const CORE_VALIDATION_RE = /пока не готов/u;
const INVALID_MODULE_ID_RE = /module:engine\/<moduleId>/u;
const STANDALONE_MODULE_ID_RE = /standalone-module:engine\/<moduleId>/u;
const STAGE = `development_tree/materialized/product-parts/${PART_ID}`;
const WORKSPACE_SLUG = "demo-workspace";

const PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${PART_ID}/todo-plan.md`;
const ORDER_PLAN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/DevelopmentOrderPlan.draft.md`;
const ORDER_PLAN_JSON_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/DevelopmentOrderPlan.draft.json`;
const CLUSTER_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/clusters/runtime-cluster`;
const STANDALONE_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/modules/empty-state-resolver`;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createManagedPlan = (): string =>
  [
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        currentTaskId: `development-tree.product-part.${PART_ID}.phase3.order-plan.task1`,
        expectedCommitMessage: "docs: update lead development order plan",
        lastRecordedCommit: "brief123",
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
  ].join("\n");

const createInvalidOrderPlanJson = (): string =>
  `${JSON.stringify(
    {
      schema: "codeai-development-order-plan-v2",
      leadProductPartId: PART_ID,
      productPartLeadershipOrder: [PART_ID],
      requiredBriefs: [{ partId: PART_ID, status: "accepted" }],
      nodes: [
        {
          clusterId: "runtime-cluster",
          dependsOn: [],
          id: `cluster:${PART_ID}/runtime-cluster`,
          kind: "cluster",
          partId: PART_ID,
        },
        {
          dependsOn: [],
          id: `module:${PART_ID}/empty-state-resolver`,
          kind: "module",
          partId: PART_ID,
        },
      ],
      waves: [
        {
          id: "wave-1",
          unlockNodeIds: [`module:${PART_ID}/empty-state-resolver`],
        },
      ],
      lockedNodes: [],
    },
    null,
    2
  )}\n`;

test("lead order-plan validation failure dispatches repair continuation", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "order-plan-repair-")
  );
  try {
    await mkdir(path.join(workspaceRoot, CLUSTER_PATH), { recursive: true });
    await mkdir(path.join(workspaceRoot, STANDALONE_PATH), { recursive: true });
    await writeWorkspaceFile(workspaceRoot, PLAN_PATH, createManagedPlan());
    await writeWorkspaceFile(
      workspaceRoot,
      ORDER_PLAN_PATH,
      "# Development Order Plan\n\nDraft with one invalid standalone module id."
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ORDER_PLAN_JSON_PATH,
      createInvalidOrderPlanJson()
    );

    const coreMessages: Array<{
      readonly content: string;
      readonly tag?: string;
    }> = [];
    const internalMessages: string[] = [];
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: STAGE }
    );

    const handler = new SessionRequestHandlerManagedWorkflowTurn({
      eventMessages: {
        appendCoreMessage: (_sessionId, message) => {
          coreMessages.push(message);
        },
      },
      getMessageDispatch: () =>
        ({
          dispatchUserMessage: (options: { readonly content: string }) => {
            internalMessages.push(options.content);
            return Promise.resolve();
          },
          sendInternalMessage: (_sessionId: string, content: string) => {
            internalMessages.push(content);
            return Promise.resolve();
          },
        }) as never,
      sessionManager,
    });

    const result = await handler.handleTurnCompleted(session.id);

    assert.equal(result, "continued");
    assert.match(coreMessages[0]?.content ?? "", CORE_VALIDATION_RE);
    assert.match(internalMessages[0] ?? "", CORE_REPAIR_RE);
    assert.match(internalMessages[0] ?? "", STANDALONE_MODULE_ID_RE);
    assert.match(internalMessages[0] ?? "", INVALID_MODULE_ID_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
