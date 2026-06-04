import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { resolveWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import { WorkflowRollbackCoordinator } from "./workflow-rollback-coordinator";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PROVIDER_SESSION_RELATIVE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/sessions\/2026\/06\/04\/future-session\.jsonl/u;
const UNIFIED_SESSION_RELATIVE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/sessions\/unified\/codex\/future-session\.jsonl/u;

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-rollback-runtime-"));

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

test("WorkflowRollbackCoordinator removes future workflow session histories through Git", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const git = new WorkflowBoundaryGit();
    await writeText(capsule.gitignoreFile.absolutePath, "# capsule\n");
    const boundaryCommit = await git.commit({
      commitMessage: "codeai-boundary: Virtual Simulation",
      paths: [capsule.workspaceCapsuleRoot.relativePath],
      workspaceRoot,
    });
    const providerSessionPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "sessions/2026/06/04/future-session.jsonl"
    );
    const unifiedSessionPath = path.join(
      capsule.unifiedSessionsRoot.absolutePath,
      "codex/future-session.jsonl"
    );
    await writeText(providerSessionPath, "future native session\n");
    await writeText(unifiedSessionPath, "future unified session\n");
    await git.commit({
      commitMessage: "codeai-step: Virtual Simulation accepted",
      paths: [
        path.relative(workspaceRoot, providerSessionPath),
        path.relative(workspaceRoot, unifiedSessionPath),
      ],
      workspaceRoot,
    });

    await new WorkflowRollbackCoordinator({ git }).rollback({
      prunedStages: ["virtual_simulation"],
      stage: "virtual_simulation",
      target: {
        boundaryHash: boundaryCommit.hash,
        commitMessage: "codeai-boundary: Virtual Simulation",
        stage: "virtual_simulation",
        stageLabel: "Virtual Simulation",
      },
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    await assert.rejects(readFile(providerSessionPath, "utf8"));
    await assert.rejects(readFile(unifiedSessionPath, "utf8"));
    assert.deepEqual(await git.statusPorcelain(workspaceRoot), []);
    const headTreeFiles = await runGit(workspaceRoot, [
      "ls-tree",
      "-r",
      "--name-only",
      "HEAD",
    ]);
    assert.doesNotMatch(headTreeFiles, PROVIDER_SESSION_RELATIVE_RE);
    assert.doesNotMatch(headTreeFiles, UNIFIED_SESSION_RELATIVE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
