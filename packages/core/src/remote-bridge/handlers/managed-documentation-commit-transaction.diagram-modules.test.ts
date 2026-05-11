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
