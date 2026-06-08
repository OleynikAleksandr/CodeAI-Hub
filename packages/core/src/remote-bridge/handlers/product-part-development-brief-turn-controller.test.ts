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
const BRIEF_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/ProductPartDevelopmentBrief.draft.md`;
const CONTINUITY_INDEX_PATH = `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`;
const PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${PART_ID}/todo-plan.md`;
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
const STATUS_ACCEPTED_RE = /^status: accepted$/mu;

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

const createPlan = (): string => {
  const taskPrefix = `development-tree.product-part.${PART_ID}`;
  const state = JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: `development-tree-product-part-${PART_ID}`,
      branch: "main",
      baseHead: "TBD",
      lastRecordedCommit: "TBD",
      planningSource: `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/${PART_ID}.md`,
      currentTaskId: `${taskPrefix}.phase1.brief.task1`,
      expectedCommitMessage: `docs: update ${PART_ID} product part development brief`,
      debt: null,
    },
    null,
    2
  );
  return [
    "# Product Part Development Brief Managed TODO Plan",
    "",
    "<!-- codeai-plan-state:start -->",
    "```json",
    state,
    "```",
    "<!-- codeai-plan-state:end -->",
    "",
    `1. [IN_PROGRESS] \`${taskPrefix}.phase1.brief.task1\` Draft the Product Part Development Brief (scope: \`${BRIEF_PATH}\`; expected commit: \`docs: update ${PART_ID} product part development brief\`).`,
    `2. [TODO] Git Commit: \`docs: update ${PART_ID} product part development brief\` (hash: TBD)`,
    `3. [TODO] \`${taskPrefix}.phase2.brief-review.task1\` Review the Product Part Development Brief (scope: user workflow; expected commit: \`docs: accept ${PART_ID} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${PART_ID} product part development brief\` (hash: TBD)`,
    "",
  ].join("\n");
};

const createReviewPlan = (isLeadPart: boolean): string => {
  const taskPrefix = `development-tree.product-part.${PART_ID}`;
  const state = JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: `development-tree-product-part-${PART_ID}`,
      branch: "main",
      baseHead: "TBD",
      lastRecordedCommit: "draft123",
      planningSource: `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/${PART_ID}.md`,
      currentTaskId: `${taskPrefix}.phase2.brief-review.task1`,
      expectedCommitMessage: `docs: accept ${PART_ID} product part development brief`,
      debt: null,
    },
    null,
    2
  );
  return [
    "# Product Part Development Brief Managed TODO Plan",
    "",
    "<!-- codeai-plan-state:start -->",
    "```json",
    state,
    "```",
    "<!-- codeai-plan-state:end -->",
    "",
    "## Managed Context",
    "",
    `- This Product Part is lead: ${isLeadPart ? "yes" : "no"}.`,
    "",
    `1. [DONE] \`${taskPrefix}.phase1.brief.task1\` Draft the Product Part Development Brief (scope: \`${BRIEF_PATH}\`; expected commit: \`docs: update ${PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: update ${PART_ID} product part development brief\` (hash: draft123)`,
    `3. [IN_PROGRESS] \`${taskPrefix}.phase2.brief-review.task1\` Review the Product Part Development Brief (scope: user workflow; expected commit: \`docs: accept ${PART_ID} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${PART_ID} product part development brief\` (hash: TBD)`,
    ...(isLeadPart
      ? [
          `5. [TODO] \`${taskPrefix}.phase3.order-plan.task1\` After every Product Part Development Brief is accepted, the lead Product Part agent drafts the Core-readable Development Order Plan and JSON companion (scope: order plan; expected commit: \`docs: update lead development order plan\`).`,
          "6. [TODO] Git Commit: `docs: update lead development order plan` (hash: TBD)",
        ]
      : []),
    "",
  ].join("\n");
};

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
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "product-part-brief-handoff-")
  );
  try {
    await runGit(workspaceRoot, ["init"]);
    await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
    await runGit(workspaceRoot, ["config", "user.name", "Test"]);
    await writeWorkspaceFile(workspaceRoot, PLAN_PATH, createPlan());
    await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createBrief(false));
    await runGit(workspaceRoot, ["add", "."]);
    await runGit(workspaceRoot, [
      "commit",
      "-m",
      "docs: bootstrap product part development briefs",
    ]);

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
    const { stdout: statusOutput } = await runGit(workspaceRoot, [
      "status",
      "--porcelain",
    ]);
    assert.equal(statusOutput.trim(), "");
    const { stdout: logOutput } = await runGit(workspaceRoot, [
      "log",
      "--oneline",
      "-3",
    ]);
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
    await runGit(workspaceRoot, ["add", ".gitignore"]);
    await runGit(workspaceRoot, ["commit", "-m", "test: ignore runtime"]);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/runtime/sessions/session.json`,
      '{"runtime":true}\n'
    );

    await acceptReview(workspaceRoot);

    const { stdout } = await runGit(workspaceRoot, ["status", "--porcelain"]);
    assert.equal(stdout.trim(), "");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Product Part review acceptance prepares lead order plan task", async () => {
  const workspaceRoot = await prepareReviewWorkspace(true);
  try {
    await acceptReview(workspaceRoot);
    const plan = await readFile(path.join(workspaceRoot, PLAN_PATH), "utf8");
    assert.match(plan, LEAD_ORDER_IN_PROGRESS_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

const prepareReviewWorkspace = async (isLeadPart: boolean): Promise<string> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "product-part-brief-review-")
  );
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  await writeWorkspaceFile(
    workspaceRoot,
    PLAN_PATH,
    createReviewPlan(isLeadPart)
  );
  await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createBrief(true));
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "commit",
    "-m",
    "docs: update engine product part development brief",
  ]);
  return workspaceRoot;
};

const acceptReview = async (workspaceRoot: string): Promise<void> => {
  const result =
    await new ProductPartDevelopmentBriefReviewController().handleAccepted({
      sessionId: "product-part-session-1",
      stage: `development_tree/materialized/product-parts/${PART_ID}`,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
  assert.equal(result.handled, true);
  const { stdout } = await runGit(workspaceRoot, ["status", "--porcelain"]);
  assert.equal(stdout.trim(), "");
};
