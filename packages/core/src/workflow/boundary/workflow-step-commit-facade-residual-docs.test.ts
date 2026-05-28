import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { bootstrapWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { WorkflowStepCommitFacade } from "./workflow-step-commit-facade";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const RESIDUAL_DOC_DIRTY_RE = /docs\//u;

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

test("accepted step commit currently blocks on workflow-neutral residual documents", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-residual-docs-")
  );
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );
    await writeText(
      path.join(workspaceRoot, "docs", "decision-note.md"),
      "# Decision Note\n"
    );

    await assert.rejects(
      new WorkflowStepCommitFacade().commitAcceptedStep({
        stage: "description",
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      }),
      RESIDUAL_DOC_DIRTY_RE
    );

    assert.match(
      await git(workspaceRoot, ["status", "--porcelain"]),
      RESIDUAL_DOC_DIRTY_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
