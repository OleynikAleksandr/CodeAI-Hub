import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { injectApplicationSkeletonTaskPair } from "./managed-application-skeleton-plan-mutator";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";

const execFileAsync = promisify(execFile);
const APPLICATION_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const STATIC_APPLICATION_SKELETON_PHASE_RE =
  /Application Skeleton Contract Review|Application Skeleton Materialization|Persistent Application Skeleton User Return/u;
const QUALITY_GATES_ACTIVE_RE = /"activeStage": "quality_gates"/u;
const INCLUDED_IN_COMMIT_RE = /included-in-commit/u;
const MATERIALIZATION_TASK_RE = /phase3\.materialize/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "app-skeleton-shim-"));

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const assertImmediateCommitPair = (
  planText: string,
  taskId: string,
  message: string
): void => {
  const lines = planText.split("\n");
  const taskLineIndex = lines.findIndex((line) =>
    line.includes(`\`${taskId}\``)
  );
  assert.notEqual(taskLineIndex, -1, `Missing task ${taskId}`);
  assert.match(
    lines[taskLineIndex + 1] ?? "",
    new RegExp(`Git Commit: \`${escapeRegExp(message)}\``, "u")
  );
};

const configureGit = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "Test User"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "core.hooksPath", ".husky"], {
    cwd: workspaceRoot,
  });
};

const commitPlan = async (
  workspaceRoot: string,
  scriptPath: string,
  message: string
): Promise<void> => {
  await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
  await execFileAsync(process.execPath, [scriptPath, "commit", message], {
    cwd: workspaceRoot,
  });
};

test("application skeleton shim grows the child plan dynamically with paired commits", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await configureGit(workspaceRoot);
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });

    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const planPath = path.join(workspaceRoot, APPLICATION_PLAN_PATH);
    const artifactRoot = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/application_skeleton"
    );
    await mkdir(artifactRoot, { recursive: true });

    const seedPlan = await readFile(planPath, "utf8");
    assert.doesNotMatch(seedPlan, STATIC_APPLICATION_SKELETON_PHASE_RE);
    assertImmediateCommitPair(
      seedPlan,
      "application-skeleton.phase1.draft.task1",
      "docs: draft application skeleton contract"
    );
    await readFile(path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH), "utf8");

    await writeFile(
      path.join(artifactRoot, "application-skeleton.md"),
      "# Application Skeleton\n",
      "utf8"
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "docs: draft application skeleton contract"
    );

    const reviewPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      reviewPlan,
      "application-skeleton.phase2.review.task1",
      "docs: revise application skeleton review revision 1"
    );
    assert.doesNotMatch(reviewPlan, MATERIALIZATION_TASK_RE);

    const acceptanceInjection = injectApplicationSkeletonTaskPair({
      kind: "acceptance",
      planText: reviewPlan,
    });
    assert.ok(acceptanceInjection);
    await writeFile(planPath, acceptanceInjection.nextPlanText, "utf8");
    await writeFile(
      path.join(artifactRoot, "application-skeleton-map.json"),
      `${JSON.stringify({ accepted: true, lifecycle: "accepted" }, null, 2)}\n`,
      "utf8"
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "docs: accept application skeleton contract"
    );

    const materializationPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      materializationPlan,
      "application-skeleton.phase3.materialize.task1",
      "feat: materialize application skeleton"
    );

    await mkdir(path.join(workspaceRoot, "product-parts/project-manager"), {
      recursive: true,
    });
    await writeFile(
      path.join(workspaceRoot, "product-parts/project-manager/README.md"),
      "# Project Manager\n",
      "utf8"
    );
    await writeFile(
      path.join(artifactRoot, "application-skeleton.md"),
      "# Application Skeleton\n\nMaterialized.\n",
      "utf8"
    );
    await writeFile(
      path.join(artifactRoot, "application-skeleton-map.json"),
      `${JSON.stringify({ accepted: true, lifecycle: "materialized" }, null, 2)}\n`,
      "utf8"
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "feat: materialize application skeleton"
    );

    const userReturnPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      userReturnPlan,
      "application-skeleton.phase4.user-return.revision1.task1",
      "docs: revise application skeleton user return revision 1"
    );
    assert.doesNotMatch(userReturnPlan, INCLUDED_IN_COMMIT_RE);
    assert.match(
      await readFile(path.join(workspaceRoot, WORKSPACE_PLAN_PATH), "utf8"),
      QUALITY_GATES_ACTIVE_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
