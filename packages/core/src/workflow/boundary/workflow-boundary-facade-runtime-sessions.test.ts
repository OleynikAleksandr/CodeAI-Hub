import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { resolveWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PROVIDER_SESSION_LOG_RE =
  /runtime\/sessions\/unified\/glmClaudeCode\/glmclaudecode-description\.jsonl/u;

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-boundary-runtime-"));

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<void> => {
  await execFileAsync("git", args, { cwd: workspaceRoot });
};

test("WorkflowBoundaryFacade currently blocks tracked provider session transcripts", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const sessionLogPath = path.join(
      capsule.unifiedSessionsRoot.absolutePath,
      "glmClaudeCode",
      "glmclaudecode-description.jsonl"
    );
    const translationsLogPath = path.join(
      capsule.unifiedSessionsRoot.absolutePath,
      "glmClaudeCode",
      "glmclaudecode-description.translations.jsonl"
    );
    await writeText(sessionLogPath, '{"message":"seed"}\n');
    await writeText(translationsLogPath, '{"message":"seed"}\n');
    await runGit(workspaceRoot, [
      "add",
      "--",
      path.relative(workspaceRoot, sessionLogPath),
      path.relative(workspaceRoot, translationsLogPath),
    ]);
    await runGit(workspaceRoot, [
      "commit",
      "-m",
      "seed tracked provider session logs",
    ]);
    await writeText(sessionLogPath, '{"message":"changed"}\n');
    await writeText(translationsLogPath, '{"message":"changed"}\n');

    await assert.rejects(
      facade.ensureBoundary({
        stage: "virtual_simulation",
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      }),
      PROVIDER_SESSION_LOG_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
