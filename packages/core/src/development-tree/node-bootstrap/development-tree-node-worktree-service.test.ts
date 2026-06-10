import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { DevelopmentTreeNodeWorktreeService } from "./development-tree-node-worktree-service";

const execFileAsync = promisify(execFile);
const NON_RUNTIME_COLLISION_RE = /not runtime-only/u;

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

const createExpectedWorktreePath = (workspaceRoot: string): string =>
  path.join(
    `${workspaceRoot}.worktrees`,
    "finderwidget-test01",
    "product-parts",
    "finder-widget",
    "cluster-contracts",
    "note-selection-cluster"
  );

const createWorktree = async (
  workspaceRoot: string
): Promise<{
  readonly branchName: string;
  readonly worktreePath: string;
}> =>
  await new DevelopmentTreeNodeWorktreeService().createClusterContractWorktree({
    clusterId: "note-selection-cluster",
    partId: "finder-widget",
    workspaceRoot,
    workspaceSlug: "finderwidget-test01",
  });

test("DevelopmentTreeNodeWorktreeService creates a deterministic cluster contract worktree", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "development-tree-worktree-")
  );
  try {
    await initializeRepository(workspaceRoot);

    const result = await createWorktree(workspaceRoot);

    assert.equal(
      result.branchName,
      "codex/development-tree/finderwidget-test01/product-parts/finder-widget/clusters/note-selection-cluster/contract"
    );
    assert.equal(
      result.worktreePath,
      createExpectedWorktreePath(workspaceRoot)
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

test("DevelopmentTreeNodeWorktreeService removes stale runtime-only target before creating worktree", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "development-tree-worktree-stale-")
  );
  try {
    await initializeRepository(workspaceRoot);
    const worktreePath = createExpectedWorktreePath(workspaceRoot);
    await mkdir(path.join(worktreePath, ".codeai-hub", "state"), {
      recursive: true,
    });
    await writeFile(
      path.join(worktreePath, ".codeai-hub", "state", "task-timers.json"),
      "{}\n",
      "utf8"
    );

    const result = await createWorktree(workspaceRoot);

    assert.equal(result.worktreePath, worktreePath);
    assert.equal(
      await readFile(path.join(worktreePath, "README.md"), "utf8"),
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

test("DevelopmentTreeNodeWorktreeService blocks non-runtime target collisions before branch reset", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "development-tree-worktree-collision-")
  );
  try {
    await initializeRepository(workspaceRoot);
    const worktreePath = createExpectedWorktreePath(workspaceRoot);
    await mkdir(worktreePath, { recursive: true });
    await writeFile(
      path.join(worktreePath, "README.md"),
      "collision\n",
      "utf8"
    );

    await assert.rejects(async () => {
      await createWorktree(workspaceRoot);
    }, NON_RUNTIME_COLLISION_RE);
    assert.equal(
      await runGit(workspaceRoot, [
        "show-ref",
        "--verify",
        "--quiet",
        "refs/heads/codex/development-tree/finderwidget-test01/product-parts/finder-widget/clusters/note-selection-cluster/contract",
      ]).then(
        () => "exists",
        () => "missing"
      ),
      "missing"
    );
  } finally {
    await rm(`${workspaceRoot}.worktrees`, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
