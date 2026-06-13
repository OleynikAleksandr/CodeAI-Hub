import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ProductPartDevelopmentBriefReviewController } from "./product-part-development-brief-review-controller";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const LEAD_PART_ID = "engine";
const SECONDARY_PART_ID = "shell";
const LEAD_SESSION_ID = "lead-session-1";
const SECONDARY_SESSION_ID = "shell-session-1";
const INDEX_PATH = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`;
const LEAD_PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${LEAD_PART_ID}/todo-plan.md`;
const SECONDARY_PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${SECONDARY_PART_ID}/todo-plan.md`;
const LEAD_BRIEF_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${LEAD_PART_ID}/ProductPartDevelopmentBrief.draft.md`;
const SECONDARY_BRIEF_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${SECONDARY_PART_ID}/ProductPartDevelopmentBrief.draft.md`;
const LEAD_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${LEAD_PART_ID}.json`;
const SECONDARY_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${SECONDARY_PART_ID}.json`;
const ACCEPTED_SHELL_BRIEF_RE = /Accepted Shell Product Part brief content\./u;
const IN_PROGRESS_ORDER_PLAN_RE =
  /\[IN_PROGRESS\] `development-tree\.product-part\.engine\.phase3\.order-plan\.task1`/u;
const STATUS_ACCEPTED_RE = /^status: accepted$/mu;
const TARGET_LEAD_DISPATCH_RE =
  /lead Development Order Plan assignment was dispatched/u;

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout;
};

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const readText = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const initializeRepository = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  await writeText(workspaceRoot, "README.md", "# Test\n");
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: initial"]);
};

const commitAll = async (
  workspaceRoot: string,
  message: string
): Promise<void> => {
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", message]);
};

const createLanePath = (workspaceRoot: string, partId: string): string =>
  path.join(
    `${workspaceRoot}.worktrees`,
    WORKSPACE_SLUG,
    "product-parts",
    partId,
    "precode"
  );

const createLane = async (
  workspaceRoot: string,
  partId: string
): Promise<string> => {
  const lanePath = createLanePath(workspaceRoot, partId);
  await runGit(workspaceRoot, [
    "worktree",
    "add",
    "-B",
    `codex/development-tree/${WORKSPACE_SLUG}/product-parts/${partId}/precode`,
    lanePath,
    "HEAD",
  ]);
  await runGit(lanePath, ["config", "user.email", "test@example.local"]);
  await runGit(lanePath, ["config", "user.name", "Test"]);
  return lanePath;
};

const createPlanState = (params: {
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly partId: string;
}): string =>
  `${JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: `development-tree-product-part-${params.partId}`,
      branch: "main",
      baseHead: "TBD",
      lastRecordedCommit: "TBD",
      currentTaskId: params.currentTaskId,
      expectedCommitMessage: params.expectedCommitMessage,
      debt: null,
    },
    null,
    2
  )}\n`;

const wrapPlanState = (state: string): readonly string[] => [
  "<!-- codeai-plan-state:start -->",
  "```json",
  state.trimEnd(),
  "```",
  "<!-- codeai-plan-state:end -->",
];

const createLeadPlan = (): string => {
  const taskPrefix = `development-tree.product-part.${LEAD_PART_ID}`;
  return [
    "# Lead Product Part Plan",
    "",
    ...wrapPlanState(
      createPlanState({
        currentTaskId: `${taskPrefix}.phase3.order-plan.task1`,
        expectedCommitMessage: "docs: update lead development order plan",
        partId: LEAD_PART_ID,
      })
    ),
    "- This Product Part is lead: yes.",
    `1. [DONE] \`${taskPrefix}.phase2.brief-review.task1\` Review lead brief (scope: user workflow; expected commit: \`docs: accept ${LEAD_PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: accept ${LEAD_PART_ID} product part development brief\` (hash: lead123)`,
    `3. [BLOCKED] \`${taskPrefix}.phase3.order-plan.task1\` Draft order plan (scope: order plan; expected commit: \`docs: update lead development order plan\`).`,
    "4. [TODO] Git Commit: `docs: update lead development order plan` (hash: TBD)",
    "",
  ].join("\n");
};

const createSecondaryPlan = (): string => {
  const taskPrefix = `development-tree.product-part.${SECONDARY_PART_ID}`;
  return [
    "# Secondary Product Part Plan",
    "",
    ...wrapPlanState(
      createPlanState({
        currentTaskId: `${taskPrefix}.phase2.brief-review.task1`,
        expectedCommitMessage: `docs: accept ${SECONDARY_PART_ID} product part development brief`,
        partId: SECONDARY_PART_ID,
      })
    ),
    "- This Product Part is lead: no.",
    `1. [DONE] \`${taskPrefix}.phase1.brief.task1\` Draft secondary brief (scope: \`${SECONDARY_BRIEF_PATH}\`; expected commit: \`docs: update ${SECONDARY_PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: update ${SECONDARY_PART_ID} product part development brief\` (hash: shell-draft123)`,
    `3. [IN_PROGRESS] \`${taskPrefix}.phase2.brief-review.task1\` Review secondary brief (scope: user workflow; expected commit: \`docs: accept ${SECONDARY_PART_ID} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${SECONDARY_PART_ID} product part development brief\` (hash: TBD)`,
    "",
  ].join("\n");
};

const createProductPartsIndex = (): string =>
  [
    "- leadProductPartId: `engine`",
    "- productPartLeadershipOrder: `engine`, `shell`",
    "",
    "### Product Part: engine",
    "### Product Part: shell",
    "",
  ].join("\n");

const createAcceptedLeadBrief = (): string =>
  [
    "---",
    "status: accepted",
    "agentTouched: true",
    "---",
    "# ProductPartDevelopmentBrief",
    "",
    "Accepted Lead Product Part brief content.",
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

const createDecision = (params: {
  readonly accepted?: boolean;
  readonly partId: string;
  readonly sessionId: string;
  readonly worktreePath: string;
}): string =>
  `${JSON.stringify(
    {
      ...(params.accepted
        ? {
            acceptedCommitHash: "lead123",
            acceptedCommitMessage: `docs: accept ${params.partId} product part development brief`,
          }
        : {}),
      partId: params.partId,
      reviewState: params.accepted ? "accepted" : "lane_started",
      schema: "codeai-product-part-development-brief-managed-v1",
      sessionId: params.sessionId,
      sessionStage: `development_tree/materialized/product-parts/${params.partId}`,
      updatedAt: "2026-06-13T08:00:00.000Z",
      worktreePath: params.worktreePath,
    },
    null,
    2
  )}\n`;

const readJson = async (
  workspaceRoot: string,
  relativePath: string
): Promise<Record<string, unknown>> =>
  JSON.parse(await readText(workspaceRoot, relativePath)) as Record<
    string,
    unknown
  >;

test("secondary Product Part lane acceptance checkpoints brief to main and dispatches lead lane", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "product-part-lane-acceptance-")
  );
  const worktreesRoot = `${workspaceRoot}.worktrees`;
  try {
    await initializeRepository(workspaceRoot);
    const leadLane = await createLane(workspaceRoot, LEAD_PART_ID);
    const secondaryLane = await createLane(workspaceRoot, SECONDARY_PART_ID);

    await writeText(workspaceRoot, INDEX_PATH, createProductPartsIndex());
    await writeText(workspaceRoot, LEAD_BRIEF_PATH, createAcceptedLeadBrief());
    await writeText(
      workspaceRoot,
      LEAD_DECISION_PATH,
      createDecision({
        accepted: true,
        partId: LEAD_PART_ID,
        sessionId: LEAD_SESSION_ID,
        worktreePath: leadLane,
      })
    );
    await writeText(
      workspaceRoot,
      SECONDARY_DECISION_PATH,
      createDecision({
        partId: SECONDARY_PART_ID,
        sessionId: SECONDARY_SESSION_ID,
        worktreePath: secondaryLane,
      })
    );
    await commitAll(workspaceRoot, "docs: bootstrap main product part state");

    await writeText(leadLane, LEAD_PLAN_PATH, createLeadPlan());
    await commitAll(leadLane, "docs: bootstrap lead product part lane");
    await writeText(secondaryLane, SECONDARY_PLAN_PATH, createSecondaryPlan());
    await writeText(
      secondaryLane,
      SECONDARY_BRIEF_PATH,
      createDraftSecondaryBrief()
    );
    await commitAll(
      secondaryLane,
      "docs: bootstrap secondary product part lane"
    );

    const result =
      await new ProductPartDevelopmentBriefReviewController().handleAccepted({
        sessionId: SECONDARY_SESSION_ID,
        stage: `development_tree/materialized/product-parts/${SECONDARY_PART_ID}`,
        workspaceRoot: secondaryLane,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.equal(result.handled, true);
    assert.equal(result.nextInternalMessage, undefined);
    assert.equal(result.targetInternalMessage?.sessionId, LEAD_SESSION_ID);
    assert.match(
      result.targetInternalMessage?.content ?? "",
      ACCEPTED_SHELL_BRIEF_RE
    );
    assert.match(result.message.content, TARGET_LEAD_DISPATCH_RE);

    const mainBrief = await readText(workspaceRoot, SECONDARY_BRIEF_PATH);
    assert.match(mainBrief, STATUS_ACCEPTED_RE);
    const mainDecision = await readJson(workspaceRoot, SECONDARY_DECISION_PATH);
    assert.equal(mainDecision.reviewState, "accepted");
    assert.equal(mainDecision.checkpointState, "accepted_checkpoint");
    assert.equal(mainDecision.worktreePath, secondaryLane);
    assert.equal(typeof mainDecision.acceptedLaneCommitHash === "string", true);

    assert.match(
      await readText(leadLane, LEAD_PLAN_PATH),
      IN_PROGRESS_ORDER_PLAN_RE
    );
    assert.equal(await runGit(workspaceRoot, ["status", "--porcelain"]), "");
    assert.equal(await runGit(leadLane, ["status", "--porcelain"]), "");
    assert.equal(await runGit(secondaryLane, ["status", "--porcelain"]), "");
  } finally {
    await rm(worktreesRoot, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
