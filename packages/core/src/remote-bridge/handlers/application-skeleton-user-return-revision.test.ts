import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { Logger } from "../../telemetry/logger";
import { runApplicationSkeletonRevisionInjection } from "./application-skeleton-revision-injection-runner";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import { readManagedGitStatus } from "./managed-git-stage-gate";
import { commitManagedDocumentationStageIfReady } from "./workflow-state-managed-documentation-commit";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const APPLICATION_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const REVISION1_MESSAGE =
  "docs: revise application skeleton user return revision 1";
const REVISION1_TASK_RE =
  /"currentTaskId": "application-skeleton\.phase4\.user-return\.revision1\.task1"/u;
const REVISION2_TASK_RE =
  /"currentTaskId": "application-skeleton\.phase4\.user-return\.revision2\.task1"/u;
const USER_RETURN_ANCHOR_TODO_RE =
  /\[TODO\] `application-skeleton\.phase4\.user-return\.task1`/u;

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

const createUserReturnAnchorPlan = (): string =>
  [
    "# Managed Workspace TODO Plan",
    "",
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        planId: "managed-workspace-application-skeleton",
        branch: "main",
        baseHead: "TBD",
        lastRecordedCommit: "TBD",
        planningSource: ".codeai-hub/workflow/index.json",
        currentTaskId: "application-skeleton.phase4.user-return.task1",
        expectedCommitMessage: REVISION1_MESSAGE,
        debt: null,
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "",
    "## Phase 4 - Persistent Application Skeleton User Return",
    "",
    "1. [IN_PROGRESS] `application-skeleton.phase4.user-return.task1` Open post-completion Application Skeleton user-return revisions (scope: `product-parts/**, .codeai-hub/**/application_skeleton/**`; expected commit: `docs: revise application skeleton user return revision 1`).",
    "2. [TODO] Git Commit: `docs: revise application skeleton user return revision 1` (hash: TBD)",
  ].join("\n");

const initManagedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await runGit(workspaceRoot, ["config", "core.hooksPath", ".husky"]);
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage: "application_skeleton",
  });
  await writeWorkspaceFile(
    workspaceRoot,
    APPLICATION_PLAN_PATH,
    createUserReturnAnchorPlan()
  );
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed user return baseline",
  ]);
};

test("post-materialization Application Skeleton user return injects and commits a revision task", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-user-return-")
  );

  try {
    await initManagedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`,
      "# Application Skeleton\n\nUser return revision.\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
      `${JSON.stringify({ accepted: true, materialized: true }, null, 2)}\n`
    );

    await runApplicationSkeletonRevisionInjection({
      logger: new Logger("error"),
      sessionId: "skeleton-user-return-session",
      stage: "application_skeleton",
      workspaceRoot,
    });

    const injectedPlan = await readFile(
      path.join(workspaceRoot, APPLICATION_PLAN_PATH),
      "utf8"
    );
    assert.match(injectedPlan, REVISION1_TASK_RE);
    assert.match(injectedPlan, USER_RETURN_ANCHOR_TODO_RE);

    await commitManagedDocumentationStageIfReady({
      context: {
        applicationSkeletonProgress: null,
        diagramModulesProgress: null,
        managedGitStatus: await readManagedGitStatus(
          workspaceRoot,
          WORKSPACE_SLUG
        ),
        qualityGatesProgress: null,
      },
      logger: new Logger("error"),
      transaction: new ManagedDocumentationCommitTransaction(),
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--pretty=%s", "-4"]),
      new RegExp(REVISION1_MESSAGE, "u")
    );
    assert.match(
      await readFile(path.join(workspaceRoot, APPLICATION_PLAN_PATH), "utf8"),
      REVISION2_TASK_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
