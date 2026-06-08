import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { DevelopmentTreeNodeWorktreeService } from "./development-tree-node-worktree-service";

const execFileAsync = promisify(execFile);

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout;
};

const initializeRepository = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  await writeFile(path.join(workspaceRoot, "README.md"), "# Test\n", "utf8");
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: initial"]);
};

test("DevelopmentTreeNodeWorktreeService creates a deterministic cluster contract worktree", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "development-tree-worktree-")
  );
  try {
    await initializeRepository(workspaceRoot);

    const result =
      await new DevelopmentTreeNodeWorktreeService().createClusterContractWorktree(
        {
          clusterId: "note-selection-cluster",
          partId: "finder-widget",
          workspaceRoot,
          workspaceSlug: "finderwidget-test01",
        }
      );

    assert.equal(
      result.branchName,
      "codex/development-tree/finderwidget-test01/product-parts/finder-widget/clusters/note-selection-cluster/contract"
    );
    assert.equal(
      result.worktreePath,
      path.join(
        `${workspaceRoot}.worktrees`,
        "finderwidget-test01",
        "product-parts",
        "finder-widget",
        "cluster-contracts",
        "note-selection-cluster"
      )
    );
    assert.equal(
      await runGit(result.worktreePath, ["branch", "--show-current"]),
      `${result.branchName}\n`
    );
    assert.equal(
      await readFile(path.join(result.worktreePath, "README.md"), "utf8"),
      "# Test\n"
    );
    assert.equal(
      (await runGit(workspaceRoot, ["status", "--porcelain"])).trim(),
      ""
    );
  } finally {
    await rm(`${workspaceRoot}.worktrees`, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
