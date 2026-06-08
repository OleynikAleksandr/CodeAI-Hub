import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { validateDevelopmentOrderPlanV2 } from "../../development-tree/product-part-workflow/development-order-plan-v2-contract";
import { ProductPartDevelopmentBriefReviewController } from "./product-part-development-brief-review-controller";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "engine";
const CLUSTER_ID = "existing-cluster-id";
const CLUSTER_MODULE_ID = "existing-module-id";
const STANDALONE_MODULE_ID = "existing-standalone-module-id";
const STANDALONE_NODE_ID = `standalone-module:${PART_ID}/${STANDALONE_MODULE_ID}`;
const PLAN_PATH = `doc/TODO/stages/development-tree/product-parts/${PART_ID}/todo-plan.md`;
const BRIEF_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/ProductPartDevelopmentBrief.draft.md`;
const CLUSTER_MODULE_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}/modules/${CLUSTER_MODULE_ID}`;
const STANDALONE_MODULE_PATH = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/modules/${STANDALONE_MODULE_ID}`;
const FENCED_JSON_BLOCK_RE = /```json\n([\s\S]*?)\n```/u;

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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const extractPromptPlan = (prompt: string): Record<string, unknown> => {
  const json = prompt.match(FENCED_JSON_BLOCK_RE)?.[1];
  assert.ok(json, "Expected lead assignment prompt to contain fenced JSON.");
  return JSON.parse(json) as Record<string, unknown>;
};

const prepareReviewWorkspace = async (): Promise<string> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "lead-order-plan-prompt-")
  );
  await initializeGitWorkspace(workspaceRoot);
  await writeWorkspaceFile(workspaceRoot, PLAN_PATH, createReviewPlan());
  await writeWorkspaceFile(workspaceRoot, BRIEF_PATH, createAcceptedBrief());
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

    const promptPlan = extractPromptPlan(result.nextInternalMessage);
    const nodes = Array.isArray(promptPlan.nodes) ? promptPlan.nodes : [];
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
