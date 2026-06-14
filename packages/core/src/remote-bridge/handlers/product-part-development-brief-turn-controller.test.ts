import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ProductPartDevelopmentBriefReviewController } from "./product-part-development-brief-review-controller";
import { ProductPartDevelopmentBriefTurnController } from "./product-part-development-brief-turn-controller";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "engine";
const CLUSTER_ID = "runtime-cluster";
const MODULE_ID = "engine-core";
const CLUSTER_NODE_ID = `cluster:${PART_ID}/${CLUSTER_ID}`;
const MODULE_NODE_ID = `module:${PART_ID}/${CLUSTER_ID}/${MODULE_ID}`;
const BRIEF_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/ProductPartDevelopmentBrief.draft.md`;
const ORDER_PLAN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/DevelopmentOrderPlan.draft.md`;
const ORDER_PLAN_JSON_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/DevelopmentOrderPlan.draft.json`;
const CONTINUITY_INDEX_PATH = `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`;
const MATERIALIZED_MODULE_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}/modules/${MODULE_ID}`;
const PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${PART_ID}/todo-plan.md`;
const UNLOCK_STATE_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${PART_ID}.unlock-state.json`;
const ACCEPTED_BRIEF_COMMIT_RE =
  /docs: update engine product part development brief/u;
const AGENT_TOUCHED_TRUE_RE = /^agentTouched: true$/mu;
const LEDGER_COMMIT_RE = /chore: advance managed workflow ledger/u;
const PHASE1_DONE_RE =
  /\[DONE\] `development-tree\.product-part\.engine\.phase1\.brief\.task1`/u;
const PHASE1_GIT_COMMIT_RE =
  /Git Commit: `docs: update engine product part development brief` \(hash: [a-f0-9]+\)/u;
const PHASE2_REVIEW_IN_PROGRESS_RE =
  /\[IN_PROGRESS\] `development-tree\.product-part\.engine\.phase2\.brief-review\.task1`/u;
const RETURN_IN_PROGRESS_RE =
  /\[IN_PROGRESS\] `development-tree\.product-part\.engine\.phase-return\.user-return\.task1`/u;
const LEAD_ORDER_IN_PROGRESS_RE =
  /\[IN_PROGRESS\] `development-tree\.product-part\.engine\.phase3\.order-plan\.task1`/u;
const LEAD_ORDER_DONE_RE =
  /\[DONE\] `development-tree\.product-part\.engine\.phase3\.order-plan\.task1`/u;
const LEAD_ORDER_GIT_COMMIT_RE =
  /Git Commit: `docs: update lead development order plan` \(hash: [a-f0-9]+\)/u;
const LEAD_ORDER_LOG_COMMIT_RE = /docs: update lead development order plan/u;
const LEAD_ORDER_REVIEW_IN_PROGRESS_RE =
  /\[IN_PROGRESS\] `development-tree\.product-part\.engine\.phase4\.order-plan-review\.task1`/u;
const LEAD_ORDER_REVIEW_DONE_RE =
  /\[DONE\] `development-tree\.product-part\.engine\.phase4\.order-plan-review\.task1`/u;
const LEAD_ORDER_REVIEW_GIT_COMMIT_RE =
  /Git Commit: `docs: accept lead development order plan` \(hash: [a-f0-9]+\)/u;
const RETURN_AFTER_ORDER_PLAN_RE =
  /\[IN_PROGRESS\] `development-tree\.product-part\.engine\.phase-return\.user-return\.task1`/u;
const ORDER_PLAN_EXPECTED_COMMIT_NULL_RE = /"expectedCommitMessage": null/u;
const NO_DOWNSTREAM_COORDINATION_RE = /downstream-coordination/u;
const DEVELOPMENT_ORDER_PLAN_RE = /DevelopmentOrderPlan/u;
const DEVELOPMENT_ORDER_PLAN_V2_RE = /codeai-development-order-plan-v2/u;
const STATUS_ACCEPTED_RE = /^status: accepted$/mu;
const BRIEF_BOOTSTRAP_COMMIT =
  "docs: bootstrap product part development briefs";
const BRIEF_ACCEPTED_COMMIT =
  "docs: update engine product part development brief";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createTempWorkspace = (prefix: string): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), prefix));
const runGit = (
  workspaceRoot: string,
  args: readonly string[]
): Promise<{ readonly stdout: string }> =>
  execFileAsync("git", [...args], { cwd: workspaceRoot });
const initializeGitWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
};
const commitAll = async (
  workspaceRoot: string,
  message: string
): Promise<void> => {
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", message]);
};

const assertCleanGit = async (workspaceRoot: string): Promise<void> => {
  const { stdout } = await runGit(workspaceRoot, ["status", "--porcelain"]);
  assert.equal(stdout.trim(), "");
};

const readGitLog = async (
  workspaceRoot: string,
  maxCount: string
): Promise<string> =>
  (await runGit(workspaceRoot, ["log", "--oneline", maxCount])).stdout;

const writeOrderPlanArtifacts = async (
  workspaceRoot: string
): Promise<void> => {
  const markdown = createOrderPlanMarkdown();
  const json = createOrderPlanJson();
  await writeWorkspaceFile(workspaceRoot, ORDER_PLAN_PATH, markdown);
  await writeWorkspaceFile(workspaceRoot, ORDER_PLAN_JSON_PATH, json);
};

const createPlanState = (params: {
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly lastRecordedCommit: string;
}): string =>
  JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: `development-tree-product-part-${PART_ID}`,
      branch: "main",
      baseHead: "TBD",
      lastRecordedCommit: params.lastRecordedCommit,
      planningSource: `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/${PART_ID}.md`,
      currentTaskId: params.currentTaskId,
      expectedCommitMessage: params.expectedCommitMessage,
      debt: null,
    },
    null,
    2
  );

const createPlan = (): string => {
  const taskPrefix = `development-tree.product-part.${PART_ID}`;
  const state = createPlanState({
    currentTaskId: `${taskPrefix}.phase1.brief.task1`,
    expectedCommitMessage: `docs: update ${PART_ID} product part development brief`,
    lastRecordedCommit: "TBD",
  });
  return [
    "<!-- codeai-plan-state:start -->",
    "```json",
    state,
    "```",
    "<!-- codeai-plan-state:end -->",
    `1. [IN_PROGRESS] \`${taskPrefix}.phase1.brief.task1\` Draft the Product Part Development Brief (scope: \`${BRIEF_PATH}\`; expected commit: \`docs: update ${PART_ID} product part development brief\`).`,
    `2. [TODO] Git Commit: \`docs: update ${PART_ID} product part development brief\` (hash: TBD)`,
    `3. [TODO] \`${taskPrefix}.phase2.brief-review.task1\` Review the Product Part Development Brief (scope: user workflow; expected commit: \`docs: accept ${PART_ID} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${PART_ID} product part development brief\` (hash: TBD)`,
    "",
  ].join("\n");
};

const createReviewPlan = (isLeadPart: boolean): string => {
  const taskPrefix = `development-tree.product-part.${PART_ID}`;
  const state = createPlanState({
    currentTaskId: `${taskPrefix}.phase2.brief-review.task1`,
    expectedCommitMessage: `docs: accept ${PART_ID} product part development brief`,
    lastRecordedCommit: "draft123",
  });
  return [
    "<!-- codeai-plan-state:start -->",
    "```json",
    state,
    "```",
    "<!-- codeai-plan-state:end -->",
    `- This Product Part is lead: ${isLeadPart ? "yes" : "no"}.`,
    `1. [DONE] \`${taskPrefix}.phase1.brief.task1\` Draft the Product Part Development Brief (scope: \`${BRIEF_PATH}\`; expected commit: \`docs: update ${PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: update ${PART_ID} product part development brief\` (hash: draft123)`,
    `3. [IN_PROGRESS] \`${taskPrefix}.phase2.brief-review.task1\` Review the Product Part Development Brief (scope: user workflow; expected commit: \`docs: accept ${PART_ID} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${PART_ID} product part development brief\` (hash: TBD)`,
    ...(isLeadPart
      ? [
          `5. [TODO] \`${taskPrefix}.phase3.order-plan.task1\` After every Product Part Development Brief is accepted, the lead Product Part agent drafts the Core-readable Development Order Plan and JSON companion (scope: order plan; expected commit: \`docs: update lead development order plan\`).`,
          "6. [TODO] Git Commit: `docs: update lead development order plan` (hash: TBD)",
          `7. [TODO] \`${taskPrefix}.phase4.order-plan-review.task1\` User reviews the Development Order Plan before Core can open Cluster or standalone Module agents (scope: user workflow; expected commit: \`docs: accept lead development order plan\`).`,
          "8. [TODO] Git Commit: `docs: accept lead development order plan` (hash: TBD)",
        ]
      : []),
    "",
  ].join("\n");
};

const createOrderPlanMarkdown = (): string =>
  "# Development Order Plan\n\nBuild the engine Product Part first, then open dependent clusters once the Product Part contract is stable.";
const createOrderPlanJson = (): string =>
  `${JSON.stringify(
    {
      schema: "codeai-development-order-plan-v2",
      leadProductPartId: PART_ID,
      productPartLeadershipOrder: [PART_ID],
      requiredBriefs: [{ partId: PART_ID, status: "accepted" }],
      nodes: [
        {
          clusterId: CLUSTER_ID,
          dependsOn: [],
          id: CLUSTER_NODE_ID,
          kind: "cluster",
          partId: PART_ID,
        },
        {
          clusterId: CLUSTER_ID,
          dependsOn: [CLUSTER_NODE_ID],
          id: MODULE_NODE_ID,
          kind: "module",
          moduleId: MODULE_ID,
          partId: PART_ID,
        },
      ],
      contractSeeds: [
        {
          blockingQuestions: [],
          consumer: "finder-widget-shell",
          nodeId: CLUSTER_NODE_ID,
          requiredInputs: ["markdown note folder path"],
          requiredOutputs: ["latest selected note metadata"],
          requiredOwnedModules: [MODULE_ID],
          requiredStatuses: ["success", "empty", "error"],
        },
      ],
      waves: [
        {
          gate: "lead_product_part_coordination_review",
          id: "wave-1-cluster-contracts",
          parallelGroup: "A",
          unlockNodeIds: [CLUSTER_NODE_ID],
        },
      ],
      lockedNodes: [
        {
          nodeId: MODULE_NODE_ID,
          reason: "waiting_for_cluster_specification_and_facade_contract",
        },
      ],
    },
    null,
    2
  )}\n`;

const createBrief = (filled: boolean): string => {
  const block = (content: string): string =>
    ["<!-- agent-fill -->", content, "<!-- /agent-fill -->"].join("\n");
  const value = (text: string): string =>
    filled
      ? text
      : "_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._";
  return [
    "---",
    "status: draft",
    "agentTouched: false",
    "outdated: false",
    "orphaned: false",
    "---",
    "# ProductPartDevelopmentBrief",
    "",
    "## Product purpose",
    block(value("Coordinates the engine Product Part.")),
    "",
    "## Included clusters and standalone modules",
    block(value("Includes one simple runtime cluster.")),
    "",
    "## Skeleton and Quality Gates constraints",
    block(value("Uses the accepted skeleton and gates.")),
    "",
    "## Visible dependencies",
    block(value("No external Product Part dependency.")),
    "",
    "## Open questions",
    block(value("None.")),
    "",
  ].join("\n");
};

test("Product Part brief handoff commits accepted draft and opens user review", async () => {
  const workspaceRoot = await createTempWorkspace(
    "product-part-brief-handoff-"
  );
  try {
    await initializeGitWorkspace(workspaceRoot);
    await writeWorkspaceFile(workspaceRoot, PLAN_PATH, createPlan());
    await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createBrief(false));
    await commitAll(workspaceRoot, BRIEF_BOOTSTRAP_COMMIT);

    await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createBrief(true));
    await writeWorkspaceFile(
      workspaceRoot,
      CONTINUITY_INDEX_PATH,
      `${JSON.stringify(
        {
          entries: [
            {
              dialogId: "product-part-session-1",
              latestSessionId: "product-part-session-1",
              providerId: "claudeCodeCli",
              providerSessionId: "real-provider-session",
              rootSessionId: "product-part-session-1",
              stage: `development_tree/materialized/product-parts/${PART_ID}`,
              updatedAt: "2026-06-02T00:00:00.000Z",
            },
          ],
          updatedAt: "2026-06-02T00:00:00.000Z",
          version: 1,
          workspaceSlug: WORKSPACE_SLUG,
        },
        null,
        2
      )}\n`
    );
    const result =
      await new ProductPartDevelopmentBriefTurnController().handleTurnCompleted(
        {
          sessionId: "product-part-session-1",
          stage: `development_tree/materialized/product-parts/${PART_ID}`,
          workspaceRoot,
          workspaceSlug: WORKSPACE_SLUG,
        }
      );

    assert.equal(result.handled, true);
    await assertCleanGit(workspaceRoot);
    const logOutput = await readGitLog(workspaceRoot, "-3");
    assert.match(logOutput, ACCEPTED_BRIEF_COMMIT_RE);
    assert.match(logOutput, LEDGER_COMMIT_RE);

    const plan = await readFile(path.join(workspaceRoot, PLAN_PATH), "utf8");
    assert.match(plan, PHASE1_DONE_RE);
    assert.match(plan, PHASE1_GIT_COMMIT_RE);
    assert.match(plan, PHASE2_REVIEW_IN_PROGRESS_RE);
    const brief = await readFile(path.join(workspaceRoot, BRIEF_PATH), "utf8");
    assert.match(brief, AGENT_TOUCHED_TRUE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Product Part review acceptance opens non-lead user return", async () => {
  const workspaceRoot = await prepareReviewWorkspace(false);
  try {
    await acceptReview(workspaceRoot);
    const plan = await readFile(path.join(workspaceRoot, PLAN_PATH), "utf8");
    const brief = await readFile(path.join(workspaceRoot, BRIEF_PATH), "utf8");
    assert.match(plan, RETURN_IN_PROGRESS_RE);
    assert.match(brief, STATUS_ACCEPTED_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Product Part review acceptance ignores local runtime session directory", async () => {
  const workspaceRoot = await prepareReviewWorkspace(false);
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      ".gitignore",
      `.codeai-hub/${WORKSPACE_SLUG}/runtime/\n`
    );
    await commitAll(workspaceRoot, "test: ignore runtime");
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/runtime/sessions/session.json`,
      '{"runtime":true}\n'
    );

    await acceptReview(workspaceRoot);

    await assertCleanGit(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Product Part review acceptance prepares lead order plan task", async () => {
  const workspaceRoot = await prepareReviewWorkspace(true);
  try {
    const result = await acceptReview(workspaceRoot);
    if (!result.handled) {
      assert.fail(
        "Expected lead Product Part review acceptance to be handled."
      );
    }
    const plan = await readFile(path.join(workspaceRoot, PLAN_PATH), "utf8");
    const nextMessage = result.nextInternalMessage ?? "";
    assert.match(plan, LEAD_ORDER_IN_PROGRESS_RE);
    assert.match(nextMessage, DEVELOPMENT_ORDER_PLAN_RE);
    assert.match(nextMessage, DEVELOPMENT_ORDER_PLAN_V2_RE);
    assert.match(nextMessage, new RegExp(ORDER_PLAN_PATH));
    assert.match(nextMessage, new RegExp(ORDER_PLAN_JSON_PATH));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Lead Product Part order plan handoff opens user review", async () => {
  const workspaceRoot = await prepareReviewWorkspace(true);
  try {
    await acceptReview(workspaceRoot);
    await writeOrderPlanArtifacts(workspaceRoot);

    const result =
      await new ProductPartDevelopmentBriefTurnController().handleTurnCompleted(
        {
          sessionId: "product-part-session-1",
          stage: `development_tree/materialized/product-parts/${PART_ID}`,
          workspaceRoot,
          workspaceSlug: WORKSPACE_SLUG,
        }
      );

    assert.equal(result.handled, true);
    await assertCleanGit(workspaceRoot);
    const logOutput = await readGitLog(workspaceRoot, "-4");
    assert.match(logOutput, LEAD_ORDER_LOG_COMMIT_RE);
    assert.match(logOutput, LEDGER_COMMIT_RE);
    const plan = await readFile(path.join(workspaceRoot, PLAN_PATH), "utf8");
    assert.match(plan, LEAD_ORDER_DONE_RE);
    assert.match(plan, LEAD_ORDER_GIT_COMMIT_RE);
    assert.match(plan, LEAD_ORDER_REVIEW_IN_PROGRESS_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Lead Product Part order plan review acceptance closes Product Part lane", async () => {
  const workspaceRoot = await prepareOrderPlanReviewWorkspace();
  try {
    const result = await acceptReview(workspaceRoot);
    assert.equal(result.handled, true);
    await assertCleanGit(workspaceRoot);
    const plan = await readFile(path.join(workspaceRoot, PLAN_PATH), "utf8");
    assert.match(plan, LEAD_ORDER_REVIEW_DONE_RE);
    assert.match(plan, LEAD_ORDER_REVIEW_GIT_COMMIT_RE);
    assert.match(plan, RETURN_AFTER_ORDER_PLAN_RE);
    assert.match(plan, ORDER_PLAN_EXPECTED_COMMIT_NULL_RE);
    assert.doesNotMatch(plan, NO_DOWNSTREAM_COORDINATION_RE);
    const unlockState = await readFile(
      path.join(workspaceRoot, UNLOCK_STATE_PATH),
      "utf8"
    );
    assert.match(
      unlockState,
      new RegExp(`"id": "${CLUSTER_NODE_ID}"[\\s\\S]*"status": "unlocked"`)
    );
    assert.match(
      unlockState,
      new RegExp(`"id": "${MODULE_NODE_ID}"[\\s\\S]*"status": "locked"`)
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

const prepareReviewWorkspace = async (isLeadPart: boolean): Promise<string> => {
  const workspaceRoot = await createTempWorkspace("product-part-brief-review-");
  await initializeGitWorkspace(workspaceRoot);
  const plan = createReviewPlan(isLeadPart);
  await writeWorkspaceFile(workspaceRoot, PLAN_PATH, plan);
  await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createBrief(true));
  await mkdir(path.join(workspaceRoot, MATERIALIZED_MODULE_PATH), {
    recursive: true,
  });
  await commitAll(workspaceRoot, BRIEF_ACCEPTED_COMMIT);
  return workspaceRoot;
};

const prepareOrderPlanReviewWorkspace = async (): Promise<string> => {
  const workspaceRoot = await prepareReviewWorkspace(true);
  await acceptReview(workspaceRoot);
  await writeOrderPlanArtifacts(workspaceRoot);
  const result =
    await new ProductPartDevelopmentBriefTurnController().handleTurnCompleted({
      sessionId: "product-part-session-1",
      stage: `development_tree/materialized/product-parts/${PART_ID}`,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
  assert.equal(result.handled, true);
  return workspaceRoot;
};

const acceptReview = async (
  workspaceRoot: string
): ReturnType<
  ProductPartDevelopmentBriefReviewController["handleAccepted"]
> => {
  const result =
    await new ProductPartDevelopmentBriefReviewController().handleAccepted({
      sessionId: "product-part-session-1",
      stage: `development_tree/materialized/product-parts/${PART_ID}`,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
  assert.equal(result.handled, true);
  await assertCleanGit(workspaceRoot);
  return result;
};
