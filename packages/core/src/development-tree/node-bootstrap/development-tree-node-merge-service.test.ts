import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { DevelopmentTreeNodeMergeService } from "./development-tree-node-merge-service";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "finder-widget";
const CLUSTER_ID = "note-selection-cluster";
const MERGE_BOUNDARY_SCHEMA_RE =
  /codeai-development-tree-node-merge-boundary-v1/u;

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const clusterArtifactPath = (fileName: string): string =>
  `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}/${fileName}`;

const initializeMainRepository = async (
  workspaceRoot: string
): Promise<void> => {
  await runGit(workspaceRoot, ["init", "-b", "main"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Test\n");
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: initial"]);
};

const writeClusterArtifacts = async (worktreeRoot: string): Promise<void> => {
  await writeWorkspaceFile(
    worktreeRoot,
    clusterArtifactPath("ClusterSpecification.draft.md"),
    "# Cluster Specification\n\nAccepted contract.\n"
  );
  await writeWorkspaceFile(
    worktreeRoot,
    clusterArtifactPath("ClusterSpecification.draft.json"),
    '{"schema":"spec"}\n'
  );
  await writeWorkspaceFile(
    worktreeRoot,
    clusterArtifactPath("ClusterFacadeContract.draft.md"),
    "# Cluster Facade Contract\n\nAccepted contract.\n"
  );
  await writeWorkspaceFile(
    worktreeRoot,
    clusterArtifactPath("ClusterFacadeContract.draft.json"),
    '{"schema":"facade"}\n'
  );
  await writeWorkspaceFile(
    worktreeRoot,
    `doc/TODO/stages/development-tree/product-parts/${PART_ID}/clusters/${CLUSTER_ID}/todo-plan.md`,
    "# Cluster Contract Managed TODO Plan\n"
  );
  await writeWorkspaceFile(
    worktreeRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-clusters/${PART_ID}/${CLUSTER_ID}.review-result.json`,
    '{"reviewState":"merge_ready"}\n'
  );
};

test("DevelopmentTreeNodeMergeService merges accepted cluster contract files into main workspace", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "development-tree-merge-main-")
  );
  const worktreeRoot = `${workspaceRoot}.cluster-worktree`;
  try {
    await initializeMainRepository(workspaceRoot);
    await runGit(workspaceRoot, [
      "worktree",
      "add",
      "-b",
      "codex/cluster-contract",
      worktreeRoot,
      "HEAD",
    ]);
    await writeClusterArtifacts(worktreeRoot);
    await runGit(worktreeRoot, ["add", "."]);
    await runGit(worktreeRoot, [
      "commit",
      "-m",
      "docs: accept note-selection-cluster cluster contract",
    ]);

    const result =
      await new DevelopmentTreeNodeMergeService().mergeAcceptedClusterContract({
        clusterId: CLUSTER_ID,
        partId: PART_ID,
        sourceWorkspaceRoot: worktreeRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.equal(
      await realpath(result.targetWorkspaceRoot),
      await realpath(workspaceRoot)
    );
    assert.ok(
      result.copiedPaths.includes(
        clusterArtifactPath("ClusterSpecification.draft.md")
      )
    );
    assert.equal(
      await readFile(
        path.join(
          workspaceRoot,
          clusterArtifactPath("ClusterSpecification.draft.md")
        ),
        "utf8"
      ),
      "# Cluster Specification\n\nAccepted contract.\n"
    );
    assert.match(
      await readFile(path.join(workspaceRoot, result.boundaryPath), "utf8"),
      MERGE_BOUNDARY_SCHEMA_RE
    );
    assert.equal(await runGit(workspaceRoot, ["status", "--porcelain"]), "");
    assert.equal(await runGit(worktreeRoot, ["status", "--porcelain"]), "");
  } finally {
    await rm(worktreeRoot, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
