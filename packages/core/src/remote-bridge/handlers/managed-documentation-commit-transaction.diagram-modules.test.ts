import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import { readManagedGitStatus } from "./managed-git-stage-gate";

const execFileAsync = promisify(execFile);
const DIAGRAM_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const WORKSPACE_SLUG = "demo-workspace";

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

const initWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: baseline"]);
};

test("Diagram Modules dirty state is still classified, but transaction remains blocked", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-transaction-disabled-")
  );

  try {
    await initWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      DIAGRAM_PLAN_PATH,
      "# Diagram Modules Plan\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
      "# Product Parts Index\n"
    );

    const status = await readManagedGitStatus(workspaceRoot, WORKSPACE_SLUG);
    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.deepEqual([...status.dirtyByStage.diagram_modules].sort(), [
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
      DIAGRAM_PLAN_PATH,
    ]);
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.ownedFiles, []);
    assert.equal(
      await runGit(workspaceRoot, ["diff", "--cached", "--name-only"]),
      ""
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
