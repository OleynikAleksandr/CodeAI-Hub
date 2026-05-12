import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";
import { injectQualityGatesTaskPair } from "./managed-quality-gates-plan-mutator";

const execFileAsync = promisify(execFile);
const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const STATIC_QUALITY_GATES_PHASE_RE =
  /Managed Gate Integration|Quality Gates Contract Review|Quality Gates Integration|Persistent Quality Gates User Return/u;
const LEGACY_STREAM_TASK_RE = /quality-gates\.stream1\.task2/u;
const INTEGRATION_TASK_RE = /quality-gates\.phase3\.integration\.task1/u;
const INCLUDED_IN_COMMIT_RE = /included-in-commit/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "quality-gates-shim-"));

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

test("quality gates shim grows the child plan dynamically with paired commits", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await configureGit(workspaceRoot);
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "quality_gates",
    });

    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const planPath = path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH);
    const artifactRoot = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/quality_gates"
    );
    await mkdir(artifactRoot, { recursive: true });

    const seedPlan = await readFile(planPath, "utf8");
    assert.doesNotMatch(seedPlan, STATIC_QUALITY_GATES_PHASE_RE);
    assert.doesNotMatch(seedPlan, LEGACY_STREAM_TASK_RE);
    assertImmediateCommitPair(
      seedPlan,
      "quality-gates.phase1.draft.task1",
      "docs: draft quality gates contract"
    );

    await writeFile(
      path.join(artifactRoot, "quality-gates.md"),
      "# Quality Gates\n",
      "utf8"
    );
    await writeFile(
      path.join(artifactRoot, "quality-gates.json"),
      `${JSON.stringify({ schema: "codeai-quality-gates-v1", accepted: false }, null, 2)}\n`,
      "utf8"
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "docs: draft quality gates contract"
    );

    const reviewPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      reviewPlan,
      "quality-gates.phase2.review.task1",
      "docs: revise quality gates contract - revision 1"
    );
    assert.doesNotMatch(reviewPlan, INTEGRATION_TASK_RE);

    const acceptanceInjection = injectQualityGatesTaskPair({
      kind: "acceptance",
      planText: reviewPlan,
    });
    assert.ok(acceptanceInjection);
    await writeFile(planPath, acceptanceInjection.nextPlanText, "utf8");
    await writeFile(
      path.join(artifactRoot, "quality-gates.json"),
      `${JSON.stringify({ schema: "codeai-quality-gates-v1", accepted: true, acceptanceCommitted: false }, null, 2)}\n`,
      "utf8"
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "docs: accept quality gates contract"
    );

    const integrationPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      integrationPlan,
      "quality-gates.phase3.integration.task1",
      "feat: integrate quality gates baseline"
    );

    await writeFile(
      path.join(workspaceRoot, "package.json"),
      `${JSON.stringify({ name: "demo", scripts: { build: "echo build" } }, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      path.join(artifactRoot, "quality-gates.json"),
      `${JSON.stringify({ schema: "codeai-quality-gates-v1", accepted: true, acceptanceCommitted: true, integrated: true, integrationState: "integrated" }, null, 2)}\n`,
      "utf8"
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "feat: integrate quality gates baseline"
    );

    const userReturnPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      userReturnPlan,
      "quality-gates.phase4.user-return.revision1.task1",
      "docs: revise quality gates user return revision 1"
    );
    assert.doesNotMatch(userReturnPlan, INCLUDED_IN_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
