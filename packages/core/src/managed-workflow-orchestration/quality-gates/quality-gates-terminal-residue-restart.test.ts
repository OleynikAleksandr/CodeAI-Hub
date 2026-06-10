import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { DiagramModulesManagedGitBoundary } from "../diagram-modules/diagram-modules-managed-git-boundary";
import { ensureManagedTerminalGitClean } from "../managed-terminal-clean-git-boundary";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "codeai-hub-codex-5-4";
const PRESERVE_COMMIT_RE = /chore: preserve workspace changes/u;
const QUALITY_GATES_SCRIPT_RE = /scripts\/quality-gates\/ci-restore\.mjs/u;
const USER_NOTES_RE = /user-notes\.md/u;

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, {
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

test("quality gates restart commits workflow script changes and preserves user files without stopping", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-terminal-restart-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await writeWorkspaceFile(workspaceRoot, "README.md", "# demo\n");
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/quality-gates/ci-restore.mjs",
      "export const restore = () => 1;\n"
    );
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, ["commit", "-m", "test: initial"]);
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/quality-gates/ci-restore.mjs",
      "export const restore = () => 2;\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/quality-gates/dependency-direction.mjs",
      "export const check = () => true;\n"
    );
    await writeWorkspaceFile(workspaceRoot, "user-notes.md", "# my notes\n");

    await ensureManagedTerminalGitClean({
      gitBoundary: new DiagramModulesManagedGitBoundary(),
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      await git(workspaceRoot, ["status", "--short", "--untracked-files=all"]),
      ""
    );
    assert.match(
      await git(workspaceRoot, ["log", "--pretty=%s"]),
      PRESERVE_COMMIT_RE
    );
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.match(trackedFiles, QUALITY_GATES_SCRIPT_RE);
    assert.match(trackedFiles, USER_NOTES_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
