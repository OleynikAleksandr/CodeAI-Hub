import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { validateDevelopmentOrderPlanV2 } from "../../development-tree/product-part-workflow/development-order-plan-v2-contract";
import { ProductPartDevelopmentBriefReviewController } from "./product-part-development-brief-review-controller";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "engine";
const SECONDARY_PART_ID = "shell";
const CLUSTER_ID = "existing-cluster-id";
const CLUSTER_NODE_ID = `cluster:${PART_ID}/${CLUSTER_ID}`;
const CLUSTER_MODULE_ID = "existing-module-id";
const STANDALONE_MODULE_ID = "existing-standalone-module-id";
const STANDALONE_NODE_ID = `standalone-module:${PART_ID}/${STANDALONE_MODULE_ID}`;
const PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${PART_ID}/todo-plan.md`;
const SECONDARY_PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${SECONDARY_PART_ID}/todo-plan.md`;
const INDEX_PATH = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`;
const BRIEF_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/ProductPartDevelopmentBrief.draft.md`;
const LEAD_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${PART_ID}.json`;
const SECONDARY_BRIEF_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${SECONDARY_PART_ID}/ProductPartDevelopmentBrief.draft.md`;
const SECONDARY_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${SECONDARY_PART_ID}.json`;
const CLUSTER_MODULE_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}/modules/${CLUSTER_MODULE_ID}`;
const STANDALONE_MODULE_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/modules/${STANDALONE_MODULE_ID}`;
const ACCEPTED_BRIEFS_SECTION_RE =
  /Accepted Product Part briefs supplied by Core \(full text\)/u;
const ACCEPTED_LEAD_BRIEF_CONTENT_RE = /Accepted Product Part brief content\./u;
const ACCEPTED_SHELL_BRIEF_CONTENT_RE =
  /Accepted Shell Product Part brief content\./u;
const BLOCKED_ORDER_PLAN_RE =
  /\[BLOCKED\] `development-tree\.product-part\.engine\.phase3\.order-plan\.task1`/u;
const FENCED_JSON_BLOCK_RE = /```json\n([\s\S]*?)\n```/u;
const IN_PROGRESS_ORDER_PLAN_RE =
  /\[IN_PROGRESS\] `development-tree\.product-part\.engine\.phase3\.order-plan\.task1`/u;
const MISSING_SHELL_BRIEF_RE = /Missing accepted briefs: `shell`/u;
const PARENT_OWNED_BOUNDARIES_RE = /parent-owned boundaries for lower agents/u;
const TARGET_LEAD_DISPATCH_RE =
  /lead Development Order Plan assignment was dispatched/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

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

const createReviewPlan = (): string => {
  const taskPrefix = `development-tree.product-part.${PART_ID}`;
  return [
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        planId: `development-tree-product-part-${PART_ID}`,
        branch: "main",
        baseHead: "TBD",
        lastRecordedCommit: "draft123",
        planningSource: "test",
        currentTaskId: `${taskPrefix}.phase2.brief-review.task1`,
        expectedCommitMessage: `docs: accept ${PART_ID} product part development brief`,
        debt: null,
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "- This Product Part is lead: yes.",
    `1. [DONE] \`${taskPrefix}.phase1.brief.task1\` Draft brief (scope: \`${BRIEF_PATH}\`; expected commit: \`docs: update ${PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: update ${PART_ID} product part development brief\` (hash: draft123)`,
    `3. [IN_PROGRESS] \`${taskPrefix}.phase2.brief-review.task1\` Review brief (scope: user workflow; expected commit: \`docs: accept ${PART_ID} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${PART_ID} product part development brief\` (hash: TBD)`,
    `5. [TODO] \`${taskPrefix}.phase3.order-plan.task1\` Draft order plan (scope: order plan; expected commit: \`docs: update lead development order plan\`).`,
    "6. [TODO] Git Commit: `docs: update lead development order plan` (hash: TBD)",
    "",
  ].join("\n");
};

const createBlockedLeadPlan = (): string => {
  const taskPrefix = `development-tree.product-part.${PART_ID}`;
  return [
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        planId: `development-tree-product-part-${PART_ID}`,
        branch: "main",
        baseHead: "TBD",
        lastRecordedCommit: "lead123",
        planningSource: "test",
        currentTaskId: `${taskPrefix}.phase3.order-plan.task1`,
        expectedCommitMessage: "docs: update lead development order plan",
        debt: null,
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "- This Product Part is lead: yes.",
    `1. [DONE] \`${taskPrefix}.phase1.brief.task1\` Draft brief (scope: \`${BRIEF_PATH}\`; expected commit: \`docs: update ${PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: update ${PART_ID} product part development brief\` (hash: draft123)`,
    `3. [DONE] \`${taskPrefix}.phase2.brief-review.task1\` Review brief (scope: user workflow; expected commit: \`docs: accept ${PART_ID} product part development brief\`).`,
    `4. [DONE] Git Commit: \`docs: accept ${PART_ID} product part development brief\` (hash: lead123)`,
    `5. [BLOCKED] \`${taskPrefix}.phase3.order-plan.task1\` Draft order plan (scope: order plan; expected commit: \`docs: update lead development order plan\`).`,
    "6. [TODO] Git Commit: `docs: update lead development order plan` (hash: TBD)",
    "",
  ].join("\n");
};

const createSecondaryReviewPlan = (): string => {
  const taskPrefix = `development-tree.product-part.${SECONDARY_PART_ID}`;
  return [
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        planId: `development-tree-product-part-${SECONDARY_PART_ID}`,
        branch: "main",
        baseHead: "TBD",
        lastRecordedCommit: "shell-draft123",
        planningSource: "test",
        currentTaskId: `${taskPrefix}.phase2.brief-review.task1`,
        expectedCommitMessage: `docs: accept ${SECONDARY_PART_ID} product part development brief`,
        debt: null,
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "- This Product Part is lead: no.",
    `1. [DONE] \`${taskPrefix}.phase1.brief.task1\` Draft brief (scope: \`${SECONDARY_BRIEF_PATH}\`; expected commit: \`docs: update ${SECONDARY_PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: update ${SECONDARY_PART_ID} product part development brief\` (hash: shell-draft123)`,
    `3. [IN_PROGRESS] \`${taskPrefix}.phase2.brief-review.task1\` Review brief (scope: user workflow; expected commit: \`docs: accept ${SECONDARY_PART_ID} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${SECONDARY_PART_ID} product part development brief\` (hash: TBD)`,
    "",
  ].join("\n");
};

const createAcceptedBrief = (): string =>
  [
    "---",
    "status: draft",
    "agentTouched: false",
    "---",
    "# ProductPartDevelopmentBrief",
    "",
    "Accepted Product Part brief content.",
    "",
  ].join("\n");

const createProductPartsIndex = (): string =>
  [
    "- leadProductPartId: `engine`",
    "- productPartLeadershipOrder: `engine`, `shell`",
    "",
    "### Product Part: engine",
    "### Product Part: shell",
    "",
  ].join("\n");

const createAcceptedSecondaryBrief = (): string =>
  [
    "---",
    "status: accepted",
    "agentTouched: true",
    "---",
    "# ProductPartDevelopmentBrief",
    "",
    "Accepted Shell Product Part brief content.",
    "",
  ].join("\n");

const createDraftSecondaryBrief = (): string =>
  [
    "---",
    "status: draft",
    "agentTouched: true",
    "---",
    "# ProductPartDevelopmentBrief",
    "",
    "Accepted Shell Product Part brief content.",
    "",
  ].join("\n");

const createAcceptedSecondaryDecision = (): string =>
  `${JSON.stringify(
    {
      acceptedCommitHash: "shell123",
      acceptedCommitMessage:
        "docs: accept shell product part development brief",
      partId: SECONDARY_PART_ID,
      reviewState: "accepted",
      schema: "codeai-product-part-development-brief-managed-v1",
      sessionId: "shell-session-1",
      updatedAt: "2026-06-11T10:00:00.000Z",
    },
    null,
    2
  )}\n`;

const createAcceptedLeadDecision = (): string =>
  `${JSON.stringify(
    {
      acceptedCommitHash: "lead123",
      acceptedCommitMessage:
        "docs: accept engine product part development brief",
      partId: PART_ID,
      reviewState: "accepted",
      schema: "codeai-product-part-development-brief-managed-v1",
      sessionId: "lead-session-1",
      updatedAt: "2026-06-11T09:00:00.000Z",
    },
    null,
    2
  )}\n`;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const extractPromptPlan = (prompt: string): Record<string, unknown> => {
  const json = prompt.match(FENCED_JSON_BLOCK_RE)?.[1];
  assert.ok(json, "Expected lead assignment prompt to contain fenced JSON.");
  return JSON.parse(json) as Record<string, unknown>;
};

const prepareReviewWorkspace = async (
  options: {
    readonly includeProductPartsIndex?: boolean;
    readonly includeSecondaryAcceptedBrief?: boolean;
  } = {}
): Promise<string> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "lead-order-plan-prompt-")
  );
  await initializeGitWorkspace(workspaceRoot);
  await writeWorkspaceFile(workspaceRoot, PLAN_PATH, createReviewPlan());
  await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createAcceptedBrief());
  if (options.includeProductPartsIndex) {
    await writeWorkspaceFile(
      workspaceRoot,
      INDEX_PATH,
      createProductPartsIndex()
    );
  }
  if (options.includeSecondaryAcceptedBrief) {
    await writeWorkspaceFile(
      workspaceRoot,
      SECONDARY_BRIEF_PATH,
      createAcceptedSecondaryBrief()
    );
    await writeWorkspaceFile(
      workspaceRoot,
      SECONDARY_DECISION_PATH,
      createAcceptedSecondaryDecision()
    );
  }
  await mkdir(path.join(workspaceRoot, CLUSTER_MODULE_PATH), {
    recursive: true,
  });
  await mkdir(path.join(workspaceRoot, STANDALONE_MODULE_PATH), {
    recursive: true,
  });
  await commitAll(workspaceRoot, "docs: bootstrap lead product part review");
  return workspaceRoot;
};

test("lead order-plan assignment prompt includes a valid standalone-module v2 example", async () => {
  const workspaceRoot = await prepareReviewWorkspace();
  try {
    const result =
      await new ProductPartDevelopmentBriefReviewController().handleAccepted({
        sessionId: "product-part-session-1",
        stage: `development_tree/materialized/product-parts/${PART_ID}`,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });
    assert.equal(result.handled, true);
    assert.ok(result.nextInternalMessage);
    assert.match(result.nextInternalMessage, ACCEPTED_BRIEFS_SECTION_RE);
    assert.match(result.nextInternalMessage, ACCEPTED_LEAD_BRIEF_CONTENT_RE);

    const promptPlan = extractPromptPlan(result.nextInternalMessage);
    const nodes = Array.isArray(promptPlan.nodes) ? promptPlan.nodes : [];
    const contractSeeds = Array.isArray(promptPlan.contractSeeds)
      ? promptPlan.contractSeeds
      : [];
    assert.equal(
      nodes.some((node) => {
        const record = asRecord(node);
        return (
          record.id === STANDALONE_NODE_ID &&
          record.kind === "standalone_module" &&
          !("clusterId" in record)
        );
      }),
      true
    );
    assert.equal(
      contractSeeds.some((seed) => asRecord(seed).nodeId === CLUSTER_NODE_ID),
      true
    );
    assert.equal(
      contractSeeds.some(
        (seed) => asRecord(seed).nodeId === STANDALONE_NODE_ID
      ),
      true
    );
    assert.match(result.nextInternalMessage, PARENT_OWNED_BOUNDARIES_RE);

    const validation = await validateDevelopmentOrderPlanV2({
      leadProductPartId: PART_ID,
      plan: promptPlan,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.deepEqual(validation.diagnostics, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("lead order-plan assignment waits for all product part briefs", async () => {
  const workspaceRoot = await prepareReviewWorkspace({
    includeProductPartsIndex: true,
  });
  try {
    const result =
      await new ProductPartDevelopmentBriefReviewController().handleAccepted({
        sessionId: "product-part-session-1",
        stage: `development_tree/materialized/product-parts/${PART_ID}`,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });
    assert.equal(result.handled, true);
    assert.equal(result.nextInternalMessage, undefined);
    assert.match(result.message.content, MISSING_SHELL_BRIEF_RE);

    const planText = await readFile(
      path.join(workspaceRoot, PLAN_PATH),
      "utf8"
    );
    assert.match(planText, BLOCKED_ORDER_PLAN_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("lead order-plan assignment includes all accepted product part briefs", async () => {
  const workspaceRoot = await prepareReviewWorkspace({
    includeProductPartsIndex: true,
    includeSecondaryAcceptedBrief: true,
  });
  try {
    const result =
      await new ProductPartDevelopmentBriefReviewController().handleAccepted({
        sessionId: "product-part-session-1",
        stage: `development_tree/materialized/product-parts/${PART_ID}`,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });
    assert.equal(result.handled, true);
    assert.ok(result.nextInternalMessage);
    assert.match(result.nextInternalMessage, ACCEPTED_SHELL_BRIEF_CONTENT_RE);

    const promptPlan = extractPromptPlan(result.nextInternalMessage);
    assert.deepEqual(promptPlan.productPartLeadershipOrder, [
      PART_ID,
      SECONDARY_PART_ID,
    ]);
    assert.deepEqual(promptPlan.requiredBriefs, [
      { partId: PART_ID, status: "accepted" },
      { partId: SECONDARY_PART_ID, status: "accepted" },
    ]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("secondary brief acceptance dispatches unblocked order plan to lead session", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "lead-order-plan-target-dispatch-")
  );
  try {
    await initializeGitWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      INDEX_PATH,
      createProductPartsIndex()
    );
    await writeWorkspaceFile(workspaceRoot, PLAN_PATH, createBlockedLeadPlan());
    await writeWorkspaceFile(
      workspaceRoot,
      SECONDARY_PLAN_PATH,
      createSecondaryReviewPlan()
    );
    await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createAcceptedBrief());
    await writeWorkspaceFile(
      workspaceRoot,
      LEAD_DECISION_PATH,
      createAcceptedLeadDecision()
    );
    await writeWorkspaceFile(
      workspaceRoot,
      SECONDARY_BRIEF_PATH,
      createDraftSecondaryBrief()
    );
    await mkdir(path.join(workspaceRoot, CLUSTER_MODULE_PATH), {
      recursive: true,
    });
    await mkdir(path.join(workspaceRoot, STANDALONE_MODULE_PATH), {
      recursive: true,
    });
    await commitAll(
      workspaceRoot,
      "docs: bootstrap blocked lead and shell review"
    );

    const result =
      await new ProductPartDevelopmentBriefReviewController().handleAccepted({
        sessionId: "shell-session-1",
        stage: `development_tree/materialized/product-parts/${SECONDARY_PART_ID}`,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });
    assert.equal(result.handled, true);
    assert.equal(result.nextInternalMessage, undefined);
    assert.equal(result.targetInternalMessage?.sessionId, "lead-session-1");
    assert.match(
      result.targetInternalMessage?.content ?? "",
      ACCEPTED_SHELL_BRIEF_CONTENT_RE
    );
    assert.match(result.message.content, TARGET_LEAD_DISPATCH_RE);

    const leadPlanText = await readFile(
      path.join(workspaceRoot, PLAN_PATH),
      "utf8"
    );
    assert.match(leadPlanText, IN_PROGRESS_ORDER_PLAN_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
