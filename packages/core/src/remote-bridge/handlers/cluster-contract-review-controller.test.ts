import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ClusterContractPlanWriter } from "../../development-tree/cluster-workflow/cluster-contract-plan-writer";
import { ClusterContractReviewController } from "./cluster-contract-review-controller";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "finder-widget";
const CLUSTER_ID = "note-selection-cluster";
const STAGE = `development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}`;
const MERGE_READY_RE = /phase3\.merge-ready\.task1/u;

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout;
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const initializeReviewWorkspace = async (
  workspaceRoot: string
): Promise<string> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  const plan = await new ClusterContractPlanWriter().writePlan({
    branchName: "codex/demo/finder-widget/note-selection-cluster",
    clusterId: CLUSTER_ID,
    partId: PART_ID,
    worktreeRoot: workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  let content = await readFile(plan.absolutePath, "utf8");
  content = content
    .replace("phase1.contract-draft.task1", "phase2.contract-review.task1")
    .replace(
      "docs: draft note-selection-cluster cluster contract",
      "docs: accept note-selection-cluster cluster contract"
    );
  await writeWorkspaceFile(workspaceRoot, plan.relativePath, content);
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: review plan"]);
  return plan.relativePath;
};

test("ClusterContractReviewController accepts review and marks merge-ready", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "cluster-contract-review-")
  );
  try {
    const planPath = await initializeReviewWorkspace(workspaceRoot);
    const result =
      await new ClusterContractReviewController().handleReviewDecision({
        content: "Подтверждаю",
        intent: "accept",
        sessionId: "cluster-session-1",
        stage: STAGE,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.equal(result.handled, true);
    assert.equal(
      (await runGit(workspaceRoot, ["status", "--porcelain"])).trim(),
      ""
    );
    const plan = await readFile(path.join(workspaceRoot, planPath), "utf8");
    assert.match(plan, MERGE_READY_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
