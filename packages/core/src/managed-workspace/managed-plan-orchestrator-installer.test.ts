import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { injectApplicationSkeletonTaskPair } from "./managed-application-skeleton-plan-mutator";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";
import {
  NEXT_STAGE_AFTER,
  STAGE_PLANS,
  STAGE_TERMINAL_COMMITS,
} from "./managed-todo-tree";

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-plan-"));
const execFileAsync = promisify(execFile);
const ACTIVE_SCOPE_RE = /Execution Scope Status: ACTIVE/u;
const DIAGRAM_TASK_RE = /Current Task: diagram-modules\.stream1\.task1/u;
const DIAGRAM_PLAN_TASK_RE =
  /"currentTaskId": "diagram-modules\.stream1\.task1"/u;
const DIAGRAM_NEXT_TASK_RE =
  /Current Task: diagram-modules\.product-part\.project-manager/u;
const DIAGRAM_NEXT_COMMIT_RE =
  /Expected Commit: docs: update diagram modules product part project-manager/u;
const DIAGRAM_SECOND_TASK_RE =
  /Current Task: diagram-modules\.product-part\.vs-code-extension/u;
const DIAGRAM_SECOND_COMMIT_RE =
  /Expected Commit: docs: update diagram modules product part vs-code-extension/u;
const DIAGRAM_THIRD_TASK_RE =
  /Current Task: diagram-modules\.product-part\.core-runtime/u;
const DIAGRAM_THIRD_COMMIT_RE =
  /Expected Commit: docs: update diagram modules product part core-runtime/u;
const DIAGRAM_USER_RETURN_TASK_RE =
  /Current Task: diagram-modules\.user-return\.revision1\.task1/u;
const DIAGRAM_USER_RETURN_REVISION2_TASK_RE =
  /Current Task: diagram-modules\.user-return\.revision2\.task1/u;
const DIAGRAM_USER_RETURN_COMMIT_RE =
  /Expected Commit: docs: revise diagram modules user return revision 1/u;
const DIAGRAM_USER_RETURN_REVISION2_COMMIT_RE =
  /Expected Commit: docs: revise diagram modules user return revision 2/u;
const DIAGRAM_USER_RETURN_PHASE_RE =
  /Phase 2 — Persistent Diagram Modules User Return/u;
const APPLICATION_SKELETON_TASK_RE =
  /Current Task: application-skeleton\.phase1\.draft\.task1/u;
const APPLICATION_SKELETON_DRAFT_COMMIT_RE =
  /Expected Commit: docs: draft application skeleton contract/u;
const APPLICATION_SKELETON_REVIEW_TASK_RE =
  /Current Task: application-skeleton\.phase2\.review\.task1/u;
const APPLICATION_SKELETON_REVIEW_REVISION_COMMIT_RE =
  /Expected Commit: docs: revise application skeleton review revision 1/u;
const APPLICATION_SKELETON_REVIEW_REVISION_COMMIT_PIN_RE =
  /\[TODO\] Git Commit: `docs: revise application skeleton review revision 1`/u;
const APPLICATION_SKELETON_REVIEW_IN_PROGRESS_RE =
  /\[IN_PROGRESS\] `application-skeleton\.phase2\.review\.task1`/u;
const APPLICATION_SKELETON_MATERIALIZE_TASK_RE =
  /Current Task: application-skeleton\.phase3\.materialize\.task1/u;
const APPLICATION_SKELETON_MATERIALIZE_COMMIT_RE =
  /Expected Commit: feat: materialize application skeleton/u;
const APPLICATION_SKELETON_MATERIALIZE_IN_PROGRESS_RE =
  /\[IN_PROGRESS\] `application-skeleton\.phase3\.materialize\.task1`/u;
const APPLICATION_SKELETON_MATERIALIZE_REPAIR_COMMIT =
  "docs: repair application skeleton phase3.materialize attempt 1";
const APPLICATION_SKELETON_USER_RETURN_PHASE_RE =
  /Phase 4 — Persistent Application Skeleton User Return/u;
const APPLICATION_SKELETON_USER_RETURN_IN_PROGRESS_RE =
  /\[IN_PROGRESS\] `application-skeleton\.phase4\.user-return\.revision1\.task1`/u;
const APPLICATION_SKELETON_USER_RETURN_COMMIT_PIN_RE =
  /\[TODO\] Git Commit: `docs: revise application skeleton user return revision 1`/u;
const QUALITY_GATES_ACTIVE_STAGE_RE = /"activeStage": "quality_gates"/u;
const QUALITY_GATES_PLAN_ID_RE = /managed-workspace-quality-gates/u;
const QUALITY_GATES_TASK_RE = /quality-gates\.phase1\.draft\.task1/u;
const APPLICATION_SKELETON_STATIC_REVIEW_RE =
  /Application Skeleton Contract Review/u;
const APPLICATION_SKELETON_STATIC_MATERIALIZE_RE =
  /application-skeleton\.phase3\.materialize\.task1/u;
const APPLICATION_SKELETON_ACTIVE_STAGE_RE =
  /"activeStage": "application_skeleton"/u;
const APPLICATION_SKELETON_ACTIVE_PLAN_PATH_RE =
  /"activePlanPath": "doc\/TODO\/stages\/application-skeleton\/todo-plan\.md"/u;
const LEDGER_COMMIT_RE = /chore: record managed workspace ledger/u;
const DIAGRAM_MODULES_COMMIT_RE =
  /docs: update diagram modules product part index/u;
const PLAN_COMMIT_HASH_RE = /hash: [0-9a-f]+/u;
const PRODUCT_PART_SUMMARY_RE =
  /Materialize only Diagram Modules Product Part "project-manager"/u;
const VS_CODE_PRODUCT_PART_SUMMARY_RE =
  /Materialize only Diagram Modules Product Part "vs-code-extension"/u;
const FUTURE_CORE_RUNTIME_TASK_RE =
  /Materialize only Diagram Modules Product Part "core-runtime"/u;
const PRODUCT_PART_FIELD_FALSE_TASK_RE =
  /diagram-modules\.product-part\.(Id|Title|Purpose|Status|Every|Translate)/u;
const INDEX_SUMMARY_RE = /Update Diagram Modules Product Part index artifact/u;
const INCLUDED_IN_COMMIT_RE = /included-in-commit/u;
const WORKSPACE_CHANGED_FILES_RE =
  /"changedFiles": \[\n\s+"\.codeai-hub\/demo-workspace\/diagram_modules\/product-parts\.index\.md"/u;
const WORKSPACE_COMMIT_HASH_RE = /"commitHash": "[0-9a-f]+"/u;
const WORKSPACE_ACCEPTED_COMMIT_RE = /"acceptedCommits": \[\n\s+\{/u;
const WORKSPACE_LAST_COMMIT_RE =
  /"lastAcceptedCommitMessage": "docs: update diagram modules product part index"/u;
const WORKSPACE_PLAN_ACTIVE_STAGE_RE = /"activeStage": "diagram_modules"/u;
const WORKSPACE_COMPLETED_DIAGRAM_STAGE_RE =
  /"completedStages": \[\n\s+"diagram_modules"/u;
const WORKSPACE_UNLOCKED_APPLICATION_STAGE_RE =
  /"unlockedStages": \[[\s\S]*"application_skeleton"/u;
const DIAGRAM_STAGE_PLAN_RE =
  /doc\/TODO\/stages\/diagram-modules\/todo-plan\.md/u;
const ROOT_TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const DIAGRAM_STAGE_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const APPLICATION_STAGE_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const QUALITY_GATES_STAGE_PLAN_PATH =
  "doc/TODO/stages/quality-gates/todo-plan.md";

test("ManagedPlanOrchestratorInstaller writes plan scripts, hooks, and package scripts", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await writeFile(
      path.join(workspaceRoot, "package.json"),
      `${JSON.stringify({ name: "demo", scripts: { test: "node test.js" } }, null, 2)}\n`,
      "utf8"
    );

    const result = await new ManagedPlanOrchestratorInstaller().install(
      workspaceRoot
    );

    assert.equal(result.hooksWritten.length, 5);
    assert.equal(result.packageScripts.includes("plan:status"), true);
    assert.equal(
      await readFile(
        path.join(workspaceRoot, "scripts/plan-orchestrator/plan-cli.mjs"),
        "utf8"
      ).then((content) => content.includes("codeai-plan-state:start")),
      true
    );
    assert.match(
      await readFile(
        path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
        "utf8"
      ),
      WORKSPACE_PLAN_ACTIVE_STAGE_RE
    );
    assert.match(
      await readFile(
        path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
        "utf8"
      ),
      DIAGRAM_STAGE_PLAN_RE
    );
    assert.match(
      await readFile(path.join(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH), "utf8"),
      DIAGRAM_PLAN_TASK_RE
    );
    await assert.rejects(
      access(path.join(workspaceRoot, APPLICATION_STAGE_PLAN_PATH))
    );
    await assert.rejects(
      access(path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH))
    );
    await assert.rejects(access(path.join(workspaceRoot, ROOT_TODO_PLAN_PATH)));

    const packageJson = JSON.parse(
      await readFile(path.join(workspaceRoot, "package.json"), "utf8")
    );
    assert.equal(packageJson.scripts.test, "node test.js");
    assert.equal(
      packageJson.scripts["plan:validate"],
      "node ./scripts/plan-orchestrator/plan-cli.mjs validate"
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ManagedPlanOrchestratorInstaller writes a plan shim that reads the generated todo plan", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot);
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );

    const result = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      {
        cwd: workspaceRoot,
      }
    );

    assert.match(result.stdout, ACTIVE_SCOPE_RE);
    assert.match(result.stdout, DIAGRAM_TASK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ManagedPlanOrchestratorInstaller seeds todo plan for active workflow stage", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );

    const result = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const plan = await readFile(
      path.join(workspaceRoot, APPLICATION_STAGE_PLAN_PATH),
      "utf8"
    );

    assert.match(result.stdout, APPLICATION_SKELETON_TASK_RE);
    assert.match(result.stdout, APPLICATION_SKELETON_DRAFT_COMMIT_RE);
    assert.doesNotMatch(plan, APPLICATION_SKELETON_STATIC_REVIEW_RE);
    assert.doesNotMatch(plan, APPLICATION_SKELETON_STATIC_MATERIALIZE_RE);
    await assert.rejects(
      access(path.join(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH))
    );
    await assert.rejects(
      access(path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH))
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed plan shim advances application skeleton draft commits to open-ended user-led review without skipping the review task", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
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
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const artifactPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md"
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, "# Application Skeleton\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });

    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: draft application skeleton contract"],
      { cwd: workspaceRoot }
    );

    const status = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const plan = await readFile(
      path.join(
        workspaceRoot,
        "doc/TODO/stages/application-skeleton/todo-plan.md"
      ),
      "utf8"
    );
    const gitStatus = await execFileAsync("git", ["status", "--short"], {
      cwd: workspaceRoot,
    });

    assert.match(status.stdout, APPLICATION_SKELETON_REVIEW_TASK_RE);
    assert.match(status.stdout, APPLICATION_SKELETON_REVIEW_REVISION_COMMIT_RE);
    assert.match(plan, APPLICATION_SKELETON_REVIEW_IN_PROGRESS_RE);
    assert.match(plan, APPLICATION_SKELETON_REVIEW_REVISION_COMMIT_PIN_RE);
    assert.doesNotMatch(plan, APPLICATION_SKELETON_STATIC_MATERIALIZE_RE);
    assert.equal(gitStatus.stdout.trim(), "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed plan shim advances application skeleton acceptance commits to materialization", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
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
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const planPath = path.join(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    const artifactRoot = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/application_skeleton"
    );
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      path.join(artifactRoot, "application-skeleton.md"),
      "# Application Skeleton\n",
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: draft application skeleton contract"],
      { cwd: workspaceRoot }
    );

    const acceptanceInjection = injectApplicationSkeletonTaskPair({
      kind: "acceptance",
      planText: await readFile(planPath, "utf8"),
    });
    assert.ok(acceptanceInjection);
    await writeFile(planPath, acceptanceInjection.nextPlanText, "utf8");
    await writeFile(
      path.join(artifactRoot, "application-skeleton-map.json"),
      `${JSON.stringify({ accepted: true, lifecycle: "accepted" }, null, 2)}\n`,
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: accept application skeleton contract"],
      { cwd: workspaceRoot }
    );

    const status = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const plan = await readFile(planPath, "utf8");

    assert.match(status.stdout, APPLICATION_SKELETON_MATERIALIZE_TASK_RE);
    assert.match(status.stdout, APPLICATION_SKELETON_MATERIALIZE_COMMIT_RE);
    assert.match(plan, APPLICATION_SKELETON_MATERIALIZE_IN_PROGRESS_RE);

    const qualityGatesPlanPath = path.join(
      workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH
    );
    await assert.rejects(access(qualityGatesPlanPath));
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
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "feat: materialize application skeleton"],
      { cwd: workspaceRoot }
    );

    const userReturnPlan = await readFile(planPath, "utf8");
    const qualityGatesPlan = await readFile(qualityGatesPlanPath, "utf8");
    const workspacePlan = await readFile(
      path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    const gitStatus = await execFileAsync("git", ["status", "--short"], {
      cwd: workspaceRoot,
    });
    const lastCommit = await execFileAsync("git", ["log", "-1", "--oneline"], {
      cwd: workspaceRoot,
    });

    assert.match(userReturnPlan, APPLICATION_SKELETON_USER_RETURN_PHASE_RE);
    assert.match(
      userReturnPlan,
      APPLICATION_SKELETON_USER_RETURN_IN_PROGRESS_RE
    );
    assert.match(
      userReturnPlan,
      APPLICATION_SKELETON_USER_RETURN_COMMIT_PIN_RE
    );
    assert.match(qualityGatesPlan, QUALITY_GATES_PLAN_ID_RE);
    assert.match(qualityGatesPlan, QUALITY_GATES_TASK_RE);
    assert.match(workspacePlan, QUALITY_GATES_ACTIVE_STAGE_RE);
    assert.match(lastCommit.stdout, LEDGER_COMMIT_RE);
    assert.equal(gitStatus.stdout, "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed plan shim hands off application skeleton after materialization repair commits", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
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
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const planPath = path.join(workspaceRoot, APPLICATION_STAGE_PLAN_PATH);
    const artifactRoot = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/application_skeleton"
    );
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      path.join(artifactRoot, "application-skeleton.md"),
      "# Application Skeleton\n",
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: draft application skeleton contract"],
      { cwd: workspaceRoot }
    );

    const acceptanceInjection = injectApplicationSkeletonTaskPair({
      kind: "acceptance",
      planText: await readFile(planPath, "utf8"),
    });
    assert.ok(acceptanceInjection);
    await writeFile(planPath, acceptanceInjection.nextPlanText, "utf8");
    await writeFile(
      path.join(artifactRoot, "application-skeleton-map.json"),
      `${JSON.stringify({ accepted: true, lifecycle: "accepted" }, null, 2)}\n`,
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: accept application skeleton contract"],
      { cwd: workspaceRoot }
    );

    const repairInjection = injectApplicationSkeletonTaskPair({
      diagnostics: ["misplaced .codeai-hub/demo-workspace/product-parts"],
      kind: "repair",
      planText: await readFile(planPath, "utf8"),
      targetPhase: "phase3.materialize",
      targetSummary: "Move misplaced product-parts projection to root",
    });
    assert.ok(repairInjection);
    await writeFile(planPath, repairInjection.nextPlanText, "utf8");
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
      "# Application Skeleton\n\nMaterialized by repair.\n",
      "utf8"
    );
    await writeFile(
      path.join(artifactRoot, "application-skeleton-map.json"),
      `${JSON.stringify({ accepted: true, lifecycle: "materialized" }, null, 2)}\n`,
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", APPLICATION_SKELETON_MATERIALIZE_REPAIR_COMMIT],
      { cwd: workspaceRoot }
    );

    const userReturnPlan = await readFile(planPath, "utf8");
    const qualityGatesPlan = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH),
      "utf8"
    );
    const workspacePlan = await readFile(
      path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    const gitStatus = await execFileAsync("git", ["status", "--short"], {
      cwd: workspaceRoot,
    });
    const lastCommit = await execFileAsync("git", ["log", "-1", "--oneline"], {
      cwd: workspaceRoot,
    });

    assert.match(userReturnPlan, APPLICATION_SKELETON_USER_RETURN_PHASE_RE);
    assert.match(
      userReturnPlan,
      APPLICATION_SKELETON_USER_RETURN_IN_PROGRESS_RE
    );
    assert.match(qualityGatesPlan, QUALITY_GATES_PLAN_ID_RE);
    assert.match(qualityGatesPlan, QUALITY_GATES_TASK_RE);
    assert.match(workspacePlan, QUALITY_GATES_ACTIVE_STAGE_RE);
    assert.match(lastCommit.stdout, LEDGER_COMMIT_RE);
    assert.equal(gitStatus.stdout, "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed plan shim advances the active task inside plan commits", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
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
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot);
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const artifactPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(
      artifactPath,
      [
        "# Product Parts Index",
        "",
        "## Product Parts",
        "",
        "### Product Part: project-manager",
        "- Id: project-manager",
        "- Title: Project Manager",
        "- Purpose: Owns workflow.",
        "- Status: generated",
        "",
        "### Product Part: vs-code-extension",
        "- Id: vs-code-extension",
        "- Title: VS Code Extension",
        "- Purpose: Owns editor shell.",
        "- Status: planned",
        "",
        "### Product Part: core-runtime",
        "- Id: core-runtime",
        "- Title: Core Runtime",
        "- Purpose: Owns orchestration.",
        "- Status: planned",
        "",
        "<!-- Translate descriptive prose only. Every entry has fields. -->",
      ].join("\n"),
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });

    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: update diagram modules product part index"],
      { cwd: workspaceRoot }
    );

    const status = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const plan = await readFile(
      path.join(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH),
      "utf8"
    );
    const workspacePlan = await readFile(
      path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    const gitLog = await execFileAsync("git", ["log", "--pretty=%s", "-2"], {
      cwd: workspaceRoot,
    });
    const gitStatus = await execFileAsync("git", ["status", "--short"], {
      cwd: workspaceRoot,
    });

    assert.match(status.stdout, DIAGRAM_NEXT_TASK_RE);
    assert.match(status.stdout, DIAGRAM_NEXT_COMMIT_RE);
    assert.doesNotMatch(plan, INCLUDED_IN_COMMIT_RE);
    assert.match(plan, PLAN_COMMIT_HASH_RE);
    assert.match(plan, PRODUCT_PART_SUMMARY_RE);
    assert.doesNotMatch(plan, VS_CODE_PRODUCT_PART_SUMMARY_RE);
    assert.doesNotMatch(plan, FUTURE_CORE_RUNTIME_TASK_RE);
    assert.doesNotMatch(plan, PRODUCT_PART_FIELD_FALSE_TASK_RE);
    assert.match(workspacePlan, WORKSPACE_ACCEPTED_COMMIT_RE);
    assert.match(workspacePlan, INDEX_SUMMARY_RE);
    assert.match(workspacePlan, WORKSPACE_CHANGED_FILES_RE);
    assert.match(workspacePlan, WORKSPACE_LAST_COMMIT_RE);
    assert.match(workspacePlan, WORKSPACE_COMMIT_HASH_RE);
    assert.match(gitLog.stdout, LEDGER_COMMIT_RE);
    assert.match(gitLog.stdout, DIAGRAM_MODULES_COMMIT_RE);
    await assert.rejects(access(path.join(workspaceRoot, ROOT_TODO_PLAN_PATH)));
    assert.equal(gitStatus.stdout.trim(), "");

    const partPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md"
    );
    await mkdir(path.dirname(partPath), { recursive: true });
    await writeFile(partPath, "# Product Part: project-manager\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [
        scriptPath,
        "commit",
        "docs: update diagram modules product part project-manager",
      ],
      { cwd: workspaceRoot }
    );

    const nextStatus = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const nextPlan = await readFile(
      path.join(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH),
      "utf8"
    );

    assert.match(nextStatus.stdout, DIAGRAM_SECOND_TASK_RE);
    assert.match(nextStatus.stdout, DIAGRAM_SECOND_COMMIT_RE);
    assert.match(nextPlan, VS_CODE_PRODUCT_PART_SUMMARY_RE);
    assert.doesNotMatch(nextPlan, FUTURE_CORE_RUNTIME_TASK_RE);

    const vsCodePath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts/vs-code-extension.md"
    );
    await writeFile(vsCodePath, "# Product Part: vs-code-extension\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [
        scriptPath,
        "commit",
        "docs: update diagram modules product part vs-code-extension",
      ],
      { cwd: workspaceRoot }
    );

    const thirdStatus = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    assert.match(thirdStatus.stdout, DIAGRAM_THIRD_TASK_RE);
    assert.match(thirdStatus.stdout, DIAGRAM_THIRD_COMMIT_RE);

    const corePath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts/core-runtime.md"
    );
    await writeFile(corePath, "# Product Part: core-runtime\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [
        scriptPath,
        "commit",
        "docs: update diagram modules product part core-runtime",
      ],
      { cwd: workspaceRoot }
    );

    const userReturnStatus = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const userReturnPlan = await readFile(
      path.join(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH),
      "utf8"
    );
    const userReturnWorkspacePlan = await readFile(
      path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    assert.match(userReturnStatus.stdout, DIAGRAM_USER_RETURN_TASK_RE);
    assert.match(userReturnStatus.stdout, DIAGRAM_USER_RETURN_COMMIT_RE);
    assert.match(userReturnPlan, DIAGRAM_USER_RETURN_PHASE_RE);
    assert.match(userReturnWorkspacePlan, WORKSPACE_PLAN_ACTIVE_STAGE_RE);
    assert.match(userReturnWorkspacePlan, WORKSPACE_COMPLETED_DIAGRAM_STAGE_RE);
    assert.match(
      userReturnWorkspacePlan,
      WORKSPACE_UNLOCKED_APPLICATION_STAGE_RE
    );

    await writeFile(
      corePath,
      "# Product Part: core-runtime\n\nUser-requested revision\n",
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [
        scriptPath,
        "commit",
        "docs: revise diagram modules user return revision 1",
      ],
      { cwd: workspaceRoot }
    );

    const revisionStatus = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    assert.match(revisionStatus.stdout, DIAGRAM_USER_RETURN_REVISION2_TASK_RE);
    assert.match(
      revisionStatus.stdout,
      DIAGRAM_USER_RETURN_REVISION2_COMMIT_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed plan shim preserves activeStage on non-terminal commit", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
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
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const draftArtifactPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md"
    );
    await mkdir(path.dirname(draftArtifactPath), { recursive: true });
    await writeFile(draftArtifactPath, "# Application Skeleton\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: draft application skeleton contract"],
      { cwd: workspaceRoot }
    );

    const workspacePlan = await readFile(
      path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    assert.match(workspacePlan, APPLICATION_SKELETON_ACTIVE_STAGE_RE);
    assert.match(workspacePlan, APPLICATION_SKELETON_ACTIVE_PLAN_PATH_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed stage advance mappings cover all managed workflow stages", () => {
  assert.deepEqual(STAGE_TERMINAL_COMMITS, {
    application_skeleton: "feat: materialize application skeleton",
    diagram_modules: null,
    quality_gates: "feat: integrate quality gates baseline",
  });
  assert.deepEqual(NEXT_STAGE_AFTER, {
    application_skeleton: "quality_gates",
    diagram_modules: "application_skeleton",
    quality_gates: null,
  });
  assert.deepEqual(STAGE_PLANS, {
    application_skeleton: "doc/TODO/stages/application-skeleton/todo-plan.md",
    diagram_modules: "doc/TODO/stages/diagram-modules/todo-plan.md",
    quality_gates: "doc/TODO/stages/quality-gates/todo-plan.md",
  });
});
