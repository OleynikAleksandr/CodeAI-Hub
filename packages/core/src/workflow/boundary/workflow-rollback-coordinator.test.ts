import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import { WorkflowBoundaryRegistryStore } from "./workflow-boundary-registry";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const CLEAR_VIRTUAL_SIMULATION_MESSAGE = "codeai-clear: Virtual Simulation";
const FAILING_PRE_COMMIT_HOOK = "#!/bin/sh\nexit 1\n";

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-rollback-"));

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

const installFailingPreCommitHook = async (
  workspaceRoot: string
): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "core.hooksPath", ".husky"]);
  const hookPath = path.join(workspaceRoot, ".husky", "pre-commit");
  await writeText(hookPath, FAILING_PRE_COMMIT_HOOK);
  await chmod(hookPath, 0o755);
};

test("Workflow rollback commits clear state through workspace hooks", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await installFailingPreCommitHook(workspaceRoot);
    const git = new WorkflowBoundaryGit();
    await git.commit({
      commitMessage: "test: track failing hook",
      paths: [".husky"],
      workspaceRoot,
    });
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-27T00:00:00.000Z",
      git,
    });
    await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "Final_Description.md"), "ok\n");
    await git.commit({
      commitMessage: "codeai-step: Description accepted",
      paths: [".codeai-hub", "Final_Description.md"],
      workspaceRoot,
    });
    await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "virtual.md"), "remove me\n");

    await facade.restoreBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      await runGit(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      CLEAR_VIRTUAL_SIMULATION_MESSAGE
    );
    assert.deepEqual(await git.statusPorcelain(workspaceRoot), []);
    await assert.rejects(readFile(path.join(workspaceRoot, "virtual.md")));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Workflow boundary registry prune is stable when no entries are removed", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const registryStore = new WorkflowBoundaryRegistryStore();
    await registryStore.recordBoundary({
      boundaryHash: "abc123",
      commitMessage: "codeai-boundary: Description",
      createdAt: "2026-05-27T00:00:00.000Z",
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const registryPath = registryStore.getRegistryPath({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const before = await readFile(registryPath, "utf8");

    await registryStore.pruneFromStage({
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await readFile(registryPath, "utf8"), before);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
