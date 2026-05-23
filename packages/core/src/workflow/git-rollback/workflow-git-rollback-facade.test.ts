import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkflowGitRollbackFacade } from "./workflow-git-rollback-facade";

const WORKSPACE_SLUG = "demo-workspace";
const GIT_HASH_RE = /^[0-9a-f]{7,40}$/iu;

const git = (workspaceRoot: string, args: readonly string[]): string =>
  execFileSync("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const exists = async (targetPath: string): Promise<boolean> =>
  Boolean(await stat(targetPath).catch(() => null));

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content = "test\n"
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const commitAll = (workspaceRoot: string, message: string): string => {
  git(workspaceRoot, ["add", "-A", "--", "."]);
  git(workspaceRoot, ["commit", "-m", message]);
  return git(workspaceRoot, ["rev-parse", "--short", "HEAD"]);
};

const createRepository = async (): Promise<string> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-git-rollback-")
  );
  git(workspaceRoot, ["init", "-b", "main"]);
  git(workspaceRoot, ["config", "user.email", "test@example.local"]);
  git(workspaceRoot, ["config", "user.name", "Test User"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  commitAll(workspaceRoot, "chore: initial workspace");
  return workspaceRoot;
};

test("Git rollback restores Quality Gates to the pre-stage boundary and keeps Application Skeleton", async () => {
  const workspaceRoot = await createRepository();
  try {
    const appMapPath = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;
    const qualityReportPath = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`;
    await writeWorkspaceFile(workspaceRoot, appMapPath, '{"accepted":true}\n');
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`
    );
    commitAll(workspaceRoot, "feat: materialize application skeleton");
    await writeWorkspaceFile(workspaceRoot, qualityReportPath);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`,
      '{"valid":true}\n'
    );
    commitAll(workspaceRoot, "docs: draft quality gates contract");
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`
    );
    commitAll(workspaceRoot, "docs: repair quality gates draft attempt 1");
    await rm(path.join(workspaceRoot, qualityReportPath), { force: true });
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      '{"stale":true}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/untracked.tmp`
    );

    const result = await new WorkflowGitRollbackFacade().rollbackStage({
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.handled, true);
    assert.equal(result.reason, null);
    assert.match(result.rollbackCommit ?? "", GIT_HASH_RE);
    assert.equal(await exists(path.join(workspaceRoot, appMapPath)), true);
    assert.equal(
      await exists(path.join(workspaceRoot, qualityReportPath)),
      false
    );
    assert.equal(
      await exists(
        path.join(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`
        )
      ),
      false
    );
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
    assert.equal(
      git(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: clear workflow stage quality_gates"
    );
    assert.equal(
      await readFile(path.join(workspaceRoot, appMapPath), "utf8"),
      '{"accepted":true}\n'
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Git rollback reports non-managed stages without touching the repository", async () => {
  const workspaceRoot = await createRepository();
  try {
    const result = await new WorkflowGitRollbackFacade().rollbackStage({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.handled, false);
    assert.equal(result.reason, "stage_not_git_managed");
    assert.equal(git(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
