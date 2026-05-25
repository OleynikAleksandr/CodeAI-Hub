import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";
import { WorkflowStepCommitFacade } from "./workflow-step-commit-facade";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const ACCEPTED_STEP_COMMIT_RE = /codeai-step: Description accepted/u;
const LOCAL_STATE_IGNORE_RE = /^\.codeai-hub\/state\/$/mu;
const RUNTIME_SLICE_MANIFEST_RE =
  /\.codeai-hub\/demo-workspace\/runtime-slices\/manifest\.json/u;
const TASK_TIMER_STATE_RE = /\.codeai-hub\/state\/task-timers\.json/u;

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

test("accepted step commit captures runtime slices and leaves Git clean", async () => {
  const homeDirectory = await mkdtemp(path.join(tmpdir(), "step-home-"));
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "step-workspace-"));
  const previousHome = process.env.HOME;
  const workspacePathSlug = sanitizeWorkspaceSlug(workspaceRoot);
  await writeText(
    path.join(
      workspaceRoot,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "description",
      "Final_Description.md"
    ),
    "# Final Description\n"
  );
  await writeText(
    path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
    "{}\n"
  );
  await writeText(
    path.join(
      homeDirectory,
      ".codeai-hub",
      "sessions",
      workspacePathSlug,
      "codex",
      "dialog.jsonl"
    ),
    "session\n"
  );
  process.env.HOME = homeDirectory;

  try {
    const result = await new WorkflowStepCommitFacade().commitAcceptedStep({
      sessions: [
        { providerId: "codexCli", providerSessionId: "provider-session-1" },
      ],
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.stage, "description");
    assert.ok(result.runtimeSliceCount >= 1);
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      ACCEPTED_STEP_COMMIT_RE
    );
    assert.match(
      await readFile(path.join(workspaceRoot, ".gitignore"), "utf8"),
      LOCAL_STATE_IGNORE_RE
    );
    assert.match(
      await git(workspaceRoot, ["ls-files"]),
      RUNTIME_SLICE_MANIFEST_RE
    );
    assert.doesNotMatch(
      await git(workspaceRoot, ["ls-files"]),
      TASK_TIMER_STATE_RE
    );
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(homeDirectory, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
