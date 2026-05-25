import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { bootstrapWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { WorkflowStepCommitFacade } from "./workflow-step-commit-facade";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const ACCEPTED_STEP_COMMIT_RE = /codeai-step: Description accepted/u;
const CAPSULE_FINAL_DESCRIPTION_RE =
  /\.codeai-hub\/demo-workspace\/description\/Final_Description\.md/u;
const CAPSULE_PROVIDER_SESSION_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/sessions\/2026\/05\/25\/native-session\.jsonl/u;
const CAPSULE_PROVIDER_SQLITE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/logs_2\.sqlite/u;
const CAPSULE_PROVIDER_SHELL_SNAPSHOT_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/shell_snapshots\/snapshot\.sh/u;
const CAPSULE_TASK_TIMER_STATE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/state\/task-timers\.json/u;
const CAPSULE_UNIFIED_SESSION_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/sessions\/unified\/codex\/dialog\.jsonl/u;
const RUNTIME_SLICES_RE = new RegExp(["runtime", "slices"].join("-"), "u");

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

test("accepted step commit tracks workspace capsule directly and leaves Git clean", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "step-workspace-"));
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
      path.join(
        capsule.providerHomes.codex.absolutePath,
        "sessions",
        "2026",
        "05",
        "25",
        "native-session.jsonl"
      ),
      "native session\n"
    );
    await writeText(
      path.join(
        capsule.unifiedSessionsRoot.absolutePath,
        "codex",
        "dialog.jsonl"
      ),
      "unified session\n"
    );
    await writeText(
      path.join(capsule.stateRoot.absolutePath, "task-timers.json"),
      "{}\n"
    );

    const result = await new WorkflowStepCommitFacade().commitAcceptedStep({
      sessions: [
        { providerId: "codexCli", providerSessionId: "provider-session-1" },
      ],
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.stage, "description");
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      ACCEPTED_STEP_COMMIT_RE
    );
    await assert.rejects(readFile(path.join(workspaceRoot, ".gitignore")));
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.match(trackedFiles, CAPSULE_FINAL_DESCRIPTION_RE);
    assert.match(trackedFiles, CAPSULE_PROVIDER_SESSION_RE);
    assert.match(trackedFiles, CAPSULE_TASK_TIMER_STATE_RE);
    assert.match(trackedFiles, CAPSULE_UNIFIED_SESSION_RE);
    assert.doesNotMatch(trackedFiles, RUNTIME_SLICES_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accepted step commit untracks provider volatile files left by older capsule commits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-volatile-workspace-")
  );
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    const volatileSqlitePath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "logs_2.sqlite"
    );
    const volatileShellSnapshotPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "shell_snapshots",
      "snapshot.sh"
    );
    await writeText(volatileSqlitePath, "old logs\n");
    await writeText(volatileShellSnapshotPath, "old snapshot\n");
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, [
      "add",
      "-f",
      path.relative(workspaceRoot, volatileSqlitePath),
      path.relative(workspaceRoot, volatileShellSnapshotPath),
    ]);
    await git(workspaceRoot, ["commit", "-m", "test: old capsule commit"]);

    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );
    await writeText(volatileSqlitePath, "new logs\n");
    await rm(volatileShellSnapshotPath, { force: true });

    await new WorkflowStepCommitFacade().commitAcceptedStep({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.doesNotMatch(trackedFiles, CAPSULE_PROVIDER_SQLITE_RE);
    assert.doesNotMatch(trackedFiles, CAPSULE_PROVIDER_SHELL_SNAPSHOT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
