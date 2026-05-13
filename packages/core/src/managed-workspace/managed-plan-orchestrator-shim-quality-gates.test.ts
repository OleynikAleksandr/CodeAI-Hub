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
const SYNTHETIC_REVIEW_TASK_RE = /quality-gates\.phase2\.review\.task2/u;
const GENERIC_CONTINUE_RE = /Continue managed quality_gates updates/u;
const USER_RETURN_ANCHOR_TASK_ID = "quality-gates.phase4.user-return.task1";
const USER_RETURN_REVISION1_MESSAGE =
  "docs: revise quality gates user return revision 1";
const USER_RETURN_REVISION1_TASK_RE =
  /quality-gates\.phase4\.user-return\.revision1\.task1/u;

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

const bootstrapQualityGatesIntegrationPlan = async (
  workspaceRoot: string
): Promise<{
  readonly artifactRoot: string;
  readonly planPath: string;
  readonly scriptPath: string;
}> => {
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
  return { artifactRoot, planPath, scriptPath };
};

const writeValidatedIntegratedQualityGatesArtifacts = async (
  workspaceRoot: string,
  artifactRoot: string
): Promise<void> => {
  await mkdir(path.join(workspaceRoot, ".husky"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "scripts", "quality-gates"), {
    recursive: true,
  });
  await writeFile(
    path.join(workspaceRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "demo",
        scripts: {
          build: "echo build",
          "qg:build-compile": "npm run build",
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    path.join(workspaceRoot, ".husky", "pre-commit"),
    "npm run qg:build-compile\n",
    "utf8"
  );
  await writeFile(
    path.join(workspaceRoot, ".husky", "pre-push"),
    "npm run qg:before-push\n",
    "utf8"
  );
  await writeFile(
    path.join(workspaceRoot, "scripts", "quality-gates", "run.mjs"),
    "process.exit(0);\n",
    "utf8"
  );
  await writeFile(
    path.join(artifactRoot, "quality-gates.json"),
    `${JSON.stringify(
      {
        schema: "codeai-quality-gates-v1",
        accepted: true,
        acceptanceCommitted: true,
        integrated: true,
        integrationState: "integrated",
        commands: {
          "qg-build-compile": {
            command: "npm run build",
            desiredStatus: "required",
          },
        },
        requiredBeforeCommit: ["qg-build-compile"],
        requiredBeforePush: [],
        integratedPaths: [
          "package.json",
          ".husky/pre-commit",
          ".husky/pre-push",
          "scripts/quality-gates/run.mjs",
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

test("quality gates shim opens the phase 4 idle anchor only after validated integration", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    const { artifactRoot, planPath, scriptPath } =
      await bootstrapQualityGatesIntegrationPlan(workspaceRoot);

    await writeValidatedIntegratedQualityGatesArtifacts(
      workspaceRoot,
      artifactRoot
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "feat: integrate quality gates baseline"
    );

    const userReturnPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      userReturnPlan,
      USER_RETURN_ANCHOR_TASK_ID,
      USER_RETURN_REVISION1_MESSAGE
    );
    assert.doesNotMatch(userReturnPlan, USER_RETURN_REVISION1_TASK_RE);
    assert.doesNotMatch(userReturnPlan, INCLUDED_IN_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("quality gates shim keeps one-correction-then-accept on revision and integration pairs", async () => {
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
    const revisionInjection = injectQualityGatesTaskPair({
      kind: "review_revision",
      planText: reviewPlan,
    });
    assert.ok(revisionInjection);
    await writeFile(planPath, revisionInjection.nextPlanText, "utf8");
    await writeFile(
      path.join(artifactRoot, "quality-gates.md"),
      "# Quality Gates\n\nRevision 1\n",
      "utf8"
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "docs: revise quality gates contract - revision 1"
    );

    const revisedPlan = await readFile(planPath, "utf8");
    assert.doesNotMatch(revisedPlan, SYNTHETIC_REVIEW_TASK_RE);
    assert.doesNotMatch(revisedPlan, GENERIC_CONTINUE_RE);
    const acceptanceInjection = injectQualityGatesTaskPair({
      kind: "acceptance",
      planText: revisedPlan,
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
    assert.doesNotMatch(integrationPlan, SYNTHETIC_REVIEW_TASK_RE);
    assert.doesNotMatch(integrationPlan, GENERIC_CONTINUE_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("quality gates shim opens the same phase 4 idle anchor after a validated integration repair", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    const { artifactRoot, planPath, scriptPath } =
      await bootstrapQualityGatesIntegrationPlan(workspaceRoot);
    const integrationPlan = await readFile(planPath, "utf8");
    const repairInjection = injectQualityGatesTaskPair({
      diagnostics: ["hook registry output missing"],
      kind: "repair",
      planText: integrationPlan,
      targetPhase: "phase3.integration",
    });
    assert.ok(repairInjection);
    await writeFile(planPath, repairInjection.nextPlanText, "utf8");

    await writeValidatedIntegratedQualityGatesArtifacts(
      workspaceRoot,
      artifactRoot
    );
    await commitPlan(
      workspaceRoot,
      scriptPath,
      "docs: repair quality gates phase3.integration attempt 1"
    );

    const userReturnPlan = await readFile(planPath, "utf8");
    assertImmediateCommitPair(
      userReturnPlan,
      USER_RETURN_ANCHOR_TASK_ID,
      USER_RETURN_REVISION1_MESSAGE
    );
    assert.doesNotMatch(userReturnPlan, USER_RETURN_REVISION1_TASK_RE);
    assert.doesNotMatch(userReturnPlan, INCLUDED_IN_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
