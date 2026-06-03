import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const WORKFLOW_CLEAR_COMMIT_RE = /^codeai-clear:/u;

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-boundary-clear-"));

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

test("WorkflowBoundaryFacade materializes empty registry when clearing to the first boundary", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    const git = new WorkflowBoundaryGit();
    const descriptionBoundary = await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "description.md"), "done\n");
    await git.commit({
      commitMessage: "codeai-step: Description accepted",
      paths: ["description.md"],
      workspaceRoot,
    });
    await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "virtual.md"), "virtual\n");
    await git.commit({
      commitMessage: "codeai-step: Virtual Simulation accepted",
      paths: ["virtual.md"],
      workspaceRoot,
    });

    const restored = await facade.restoreBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      restored.boundaryHash.startsWith(descriptionBoundary.boundaryHash),
      true
    );
    assert.deepEqual(restored.prunedStages, [
      "description",
      "virtual_simulation",
    ]);
    await assert.rejects(
      readFile(path.join(workspaceRoot, "description.md"), "utf8")
    );
    await assert.rejects(
      readFile(path.join(workspaceRoot, "virtual.md"), "utf8")
    );
    const registryJson = JSON.parse(
      await readFile(descriptionBoundary.registryPath, "utf8")
    );
    assert.deepEqual(registryJson.entries, []);
    assert.equal(registryJson.workspaceSlug, WORKSPACE_SLUG);
    assert.deepEqual(await git.statusPorcelain(workspaceRoot), []);
    assert.match(
      await runGit(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      WORKFLOW_CLEAR_COMMIT_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
