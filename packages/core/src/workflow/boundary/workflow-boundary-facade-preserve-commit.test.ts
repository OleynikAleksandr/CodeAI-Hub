import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PRESERVE_COMMIT_RE = /chore: preserve workspace changes/u;
const DIAGRAM_STAGE_FILE_RE = /doc\/TODO\/stages\/diagram\.md/u;

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

test("WorkflowBoundaryFacade preserves dirty files in a separate commit before creating a boundary", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-boundary-preserve-")
  );
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(
      path.join(workspaceRoot, "doc", "TODO", "stages", "diagram.md"),
      "stage bootstrap\n"
    );

    const result = await facade.ensureBoundary({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.created, true);
    assert.deepEqual(
      await new WorkflowBoundaryGit().statusPorcelain(workspaceRoot),
      []
    );
    assert.match(
      await runGit(workspaceRoot, ["log", "--pretty=%s"]),
      PRESERVE_COMMIT_RE
    );
    assert.match(
      await runGit(workspaceRoot, ["ls-files"]),
      DIAGRAM_STAGE_FILE_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
