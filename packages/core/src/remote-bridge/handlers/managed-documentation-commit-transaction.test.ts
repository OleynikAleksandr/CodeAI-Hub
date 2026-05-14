import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";

const execFileAsync = promisify(execFile);
const DISABLED_REASON_RE = /disabled/u;
const PRODUCT_PARTS_INDEX_STATUS_RE = /product-parts\.index\.md/u;

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

test("managed documentation commit transaction is fail-closed and does not stage dirty files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-documentation-commit-disabled-")
  );

  try {
    await initWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      "# Product Parts\n"
    );

    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: "demo",
      });

    assert.equal(result.status, "blocked");
    assert.deepEqual(result.ownedFiles, []);
    assert.deepEqual(result.unmanagedDirtyFiles, []);
    assert.match(result.blockedReason ?? "", DISABLED_REASON_RE);
    assert.equal(
      await runGit(workspaceRoot, ["diff", "--cached", "--name-only"]),
      ""
    );
    assert.match(
      await runGit(workspaceRoot, [
        "status",
        "--short",
        "--untracked-files=all",
      ]),
      PRODUCT_PARTS_INDEX_STATUS_RE
    );
    assert.equal(
      await runGit(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "test: baseline"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed documentation commit transaction stays blocked even when workspace is clean", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-documentation-commit-clean-disabled-")
  );

  try {
    await initWorkspace(workspaceRoot);

    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: "demo",
      });

    assert.equal(result.status, "blocked");
    assert.deepEqual(result.dirtyFiles, []);
    assert.deepEqual(result.ownedFiles, []);
    assert.match(result.blockedReason ?? "", DISABLED_REASON_RE);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
