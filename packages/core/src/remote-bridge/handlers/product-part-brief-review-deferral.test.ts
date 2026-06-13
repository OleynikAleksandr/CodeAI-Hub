import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  promoteDeferredLeadBriefReview,
  resolveLeadBriefReviewDeferral,
} from "./product-part-brief-review-deferral";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const LEAD_PART_ID = "engine";
const SECONDARY_PART_ID = "shell";
const LEAD_SESSION_ID = "lead-session-1";
const INDEX_PATH = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`;
const LEAD_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${LEAD_PART_ID}.json`;
const SECONDARY_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${SECONDARY_PART_ID}.json`;
const LEAD_PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${LEAD_PART_ID}/todo-plan.md`;
const LEAD_REVIEW_TASK_ID = `development-tree.product-part.${LEAD_PART_ID}.phase2.brief-review.task1`;
const LEAD_REVIEW_COMMIT_MESSAGE = `docs: accept ${LEAD_PART_ID} product part development brief`;
const LEDGER_COMMIT_RE = /chore: advance managed workflow ledger/u;
const REVIEW_EXPECTED_COMMIT_RE = new RegExp(
  `"expectedCommitMessage": "${LEAD_REVIEW_COMMIT_MESSAGE}"`,
  "u"
);
const REVIEW_IN_PROGRESS_RE = new RegExp(
  `\\[IN_PROGRESS\\] \`${LEAD_REVIEW_TASK_ID}\``,
  "u"
);
const LEAD_REVIEW_OPENED_RE = /opened for user review|открыт/u;

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> =>
  (
    await execFileAsync("git", [...args], {
      cwd: workspaceRoot,
    })
  ).stdout;

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

const readJson = async (
  workspaceRoot: string,
  relativePath: string
): Promise<Record<string, unknown>> =>
  JSON.parse(await readText(workspaceRoot, relativePath)) as Record<
    string,
    unknown
  >;

const createLanePath = (workspaceRoot: string): string =>
  path.join(
    `${workspaceRoot}.worktrees`,
    WORKSPACE_SLUG,
    "product-parts",
    LEAD_PART_ID,
    "precode"
  );

const initializeRepository = async (workspaceRoot: string): Promise<void> => {
  await mkdir(workspaceRoot, { recursive: true });
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  await writeText(workspaceRoot, "README.md", "# Test\n");
  await commitAll(workspaceRoot, "test: initial");
};

const commitAll = async (
  workspaceRoot: string,
  message: string
): Promise<void> => {
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", message]);
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

const createDecision = (params: {
  readonly accepted?: boolean;
  readonly partId: string;
  readonly reviewState?: string;
  readonly sessionId?: string;
  readonly worktreePath?: string;
}): string =>
  `${JSON.stringify(
    {
      ...(params.accepted
        ? {
            acceptedCommitHash: `${params.partId}-accepted123`,
            acceptedCommitMessage: `docs: accept ${params.partId} product part development brief`,
          }
        : {}),
      partId: params.partId,
      reviewState:
        params.reviewState ?? (params.accepted ? "accepted" : "lane_started"),
      schema: "codeai-product-part-development-brief-managed-v1",
      sessionId: params.sessionId ?? `${params.partId}-session-1`,
      sessionStage: `development_tree/materialized/product-parts/${params.partId}`,
      updatedAt: "2026-06-13T09:00:00.000Z",
      ...(params.worktreePath ? { worktreePath: params.worktreePath } : {}),
    },
    null,
    2
  )}\n`;

const createDeferredLeadPlan = (): string =>
  [
    "# Lead Product Part Plan",
    "",
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        planId: `development-tree-product-part-${LEAD_PART_ID}`,
        branch: "main",
        baseHead: "TBD",
        lastRecordedCommit: "draft123",
        currentTaskId: LEAD_REVIEW_TASK_ID,
        expectedCommitMessage: null,
        debt: null,
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "- This Product Part is lead: yes.",
    `1. [DONE] \`development-tree.product-part.${LEAD_PART_ID}.phase1.brief.task1\` Draft lead brief (scope: brief; expected commit: \`docs: update ${LEAD_PART_ID} product part development brief\`).`,
    `2. [DONE] Git Commit: \`docs: update ${LEAD_PART_ID} product part development brief\` (hash: draft123)`,
    `3. [BLOCKED] \`${LEAD_REVIEW_TASK_ID}\` Review lead brief (scope: user workflow; expected commit: \`${LEAD_REVIEW_COMMIT_MESSAGE}\`).`,
    `4. [TODO] Git Commit: \`${LEAD_REVIEW_COMMIT_MESSAGE}\` (hash: TBD)`,
    "",
  ].join("\n");

test("lead Product Part review is deferred while secondary brief is missing", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "product-part-brief-deferral-")
  );
  const worktreesRoot = `${workspaceRoot}.worktrees`;
  try {
    const laneRoot = createLanePath(workspaceRoot);
    await mkdir(laneRoot, { recursive: true });
    await writeText(workspaceRoot, INDEX_PATH, createProductPartsIndex());

    const result = await resolveLeadBriefReviewDeferral({
      partId: LEAD_PART_ID,
      workspaceRoot: laneRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.deepEqual(result, {
      deferred: true,
      leadPartId: LEAD_PART_ID,
      missingPartIds: [SECONDARY_PART_ID],
    });
  } finally {
    await rm(worktreesRoot, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accepted secondary brief promotes deferred lead review before order plan", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "product-part-brief-promotion-")
  );
  const worktreesRoot = `${workspaceRoot}.worktrees`;
  try {
    const leadLaneRoot = createLanePath(workspaceRoot);
    await initializeRepository(leadLaneRoot);
    await writeText(workspaceRoot, INDEX_PATH, createProductPartsIndex());
    await writeText(
      workspaceRoot,
      SECONDARY_DECISION_PATH,
      createDecision({ accepted: true, partId: SECONDARY_PART_ID })
    );
    await writeText(
      workspaceRoot,
      LEAD_DECISION_PATH,
      createDecision({
        partId: LEAD_PART_ID,
        reviewState: "ready_for_review_deferred",
        sessionId: LEAD_SESSION_ID,
        worktreePath: leadLaneRoot,
      })
    );
    await writeText(leadLaneRoot, LEAD_PLAN_PATH, createDeferredLeadPlan());
    await writeText(
      leadLaneRoot,
      LEAD_DECISION_PATH,
      createDecision({
        partId: LEAD_PART_ID,
        reviewState: "ready_for_review_deferred",
        sessionId: LEAD_SESSION_ID,
        worktreePath: leadLaneRoot,
      })
    );
    await commitAll(leadLaneRoot, "docs: bootstrap deferred lead review");

    const result = await promoteDeferredLeadBriefReview({
      leadPartId: LEAD_PART_ID,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.promoted, true);
    assert.equal(result?.sessionId, LEAD_SESSION_ID);
    assert.match(result?.content ?? "", LEAD_REVIEW_OPENED_RE);
    const plan = await readText(leadLaneRoot, LEAD_PLAN_PATH);
    assert.match(plan, REVIEW_IN_PROGRESS_RE);
    assert.match(plan, REVIEW_EXPECTED_COMMIT_RE);
    const decision = await readJson(leadLaneRoot, LEAD_DECISION_PATH);
    assert.equal(decision.reviewState, "ready_for_review");
    assert.equal(decision.sessionId, LEAD_SESSION_ID);
    assert.match(
      await runGit(leadLaneRoot, ["log", "--oneline", "-1"]),
      LEDGER_COMMIT_RE
    );
    assert.equal(await runGit(leadLaneRoot, ["status", "--porcelain"]), "");
  } finally {
    await rm(worktreesRoot, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
