import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { injectDiagramModulesRepairTaskPair } from "../../managed-workspace/managed-diagram-modules-plan-mutator";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import { readManagedGitStatus } from "./managed-git-stage-gate";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const DIAGRAM_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const REPAIR_COMMIT_RE =
  /docs: repair diagram modules product part index attempt 1/u;
const USER_RETURN_REVISION1_STATE_RE =
  /"currentTaskId": "diagram-modules\.user-return\.revision1\.task1"/u;
const USER_RETURN_REVISION2_STATE_RE =
  /"currentTaskId": "diagram-modules\.user-return\.revision2\.task1"/u;
const USER_RETURN_REVISION_COMMIT_RE =
  /docs: revise diagram modules user return revision 1/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const initManagedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage: "diagram_modules",
  });
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed baseline",
  ]);
};

const injectIndexRepairTask = async (workspaceRoot: string): Promise<void> => {
  const absolutePlanPath = path.join(workspaceRoot, DIAGRAM_PLAN_PATH);
  const planText = await readFile(absolutePlanPath, "utf8");
  const injection = injectDiagramModulesRepairTaskPair({
    diagnostics: [
      "Diagram Modules index does not declare any Product Part ids.",
    ],
    planText,
    targetArtifactPath: `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    targetKind: "index",
    validator: "diagram_modules.index",
  });
  assert.ok(injection);
  await writeFile(absolutePlanPath, injection.nextPlanText, "utf8");
};

const createProjectManagerIndex = (status: "generated" | "planned"): string =>
  [
    "# Product Parts Index",
    "",
    "### Product Part: project-manager",
    "- Id: project-manager",
    "- Title: Project Manager",
    "- Purpose: Owns the workflow shell.",
    `- Status: ${status}`,
    "",
  ].join("\n");

const createProjectManagerPart = (body: string): string =>
  [
    "# Product Part: project-manager",
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    "| Part ID | `project-manager` |",
    "",
    "## Standalone Modules",
    "",
    "| Module | Responsibility |",
    "| --- | --- |",
    `| workflow-shell | ${body} |`,
    "",
  ].join("\n");

test("Diagram Modules child plan is Core-owned dirty state for repair commits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-plan-dirty-")
  );

  try {
    await initManagedWorkspace(workspaceRoot);
    await injectIndexRepairTask(workspaceRoot);

    const status = await readManagedGitStatus(workspaceRoot, WORKSPACE_SLUG);
    assert.deepEqual(status.dirtyByStage.diagram_modules, [DIAGRAM_PLAN_PATH]);
    assert.deepEqual(status.dirtyByStage.application_skeleton, []);
    assert.deepEqual(status.dirtyByStage.quality_gates, []);

    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.equal(result.status, "committed");
    assert.deepEqual(result.unmanagedDirtyFiles, []);
    assert.deepEqual(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-3"]),
      REPAIR_COMMIT_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules user-return revision commits Project Manager artifact edits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-user-return-commit-")
  );

  try {
    await initManagedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
      createProjectManagerIndex("planned")
    );

    const indexResult =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });
    assert.equal(indexResult.status, "committed");

    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
      createProjectManagerIndex("generated")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/project-manager.md`,
      createProjectManagerPart("Initial generated ownership.")
    );

    const partResult =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });
    assert.equal(partResult.status, "committed");
    assert.match(
      await readFile(path.join(workspaceRoot, DIAGRAM_PLAN_PATH), "utf8"),
      USER_RETURN_REVISION1_STATE_RE
    );

    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/project-manager.md`,
      createProjectManagerPart("User-requested Project Manager revision.")
    );

    const revisionResult =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.equal(revisionResult.status, "committed");
    assert.deepEqual(revisionResult.unmanagedDirtyFiles, []);
    assert.deepEqual(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await readFile(path.join(workspaceRoot, DIAGRAM_PLAN_PATH), "utf8"),
      USER_RETURN_REVISION2_STATE_RE
    );
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-3"]),
      USER_RETURN_REVISION_COMMIT_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
