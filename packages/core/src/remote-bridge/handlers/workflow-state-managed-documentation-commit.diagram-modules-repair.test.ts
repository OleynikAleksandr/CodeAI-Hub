import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { Logger } from "../../telemetry/logger";
import { writeDiagramModulesRepairAttemptEvidence } from "./diagram-modules-repair-attempt-evidence";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import { readManagedGitStatus } from "./managed-git-stage-gate";
import { commitManagedDocumentationStageIfReady } from "./workflow-state-managed-documentation-commit";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const DIAGRAM_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const REPAIR_TASK_ID =
  "diagram-modules.product-part.local-runtime.repair1.task1";
const REPAIR_COMMIT_MESSAGE =
  "docs: repair diagram modules product part local-runtime attempt 1";
const REPAIR_COMMIT_RE =
  /docs: repair diagram modules product part local-runtime attempt 1/u;
const USER_REVIEW_RE = /diagram-modules\.user-review\.task1/u;

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

const createProductPartsIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "### Product Part: local-runtime",
    "- Id: local-runtime",
    "- Title: Local Runtime",
    "- Purpose: Runtime shell.",
    "- Status: planned",
    "",
  ].join("\n");

const createInvalidProductPart = (): string => "# Wrong Header\n";

const createRepairPlan = (): string =>
  [
    "# Managed Workspace TODO Plan",
    "",
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        planId: "managed-workspace-diagram-modules",
        branch: "main",
        baseHead: "TBD",
        lastRecordedCommit: "TBD",
        planningSource: ".codeai-hub/workflow/index.json",
        currentTaskId: REPAIR_TASK_ID,
        expectedCommitMessage: REPAIR_COMMIT_MESSAGE,
        debt: null,
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "",
    "## Phase 1 - Diagram Modules Repair",
    "",
    "1. [IN_PROGRESS] `diagram-modules.product-part.local-runtime.repair1.task1` Repair only Product Part `local-runtime` and stop for Core acceptance (scope: `.codeai-hub/**/diagram_modules/product-parts/local-runtime.md, .codeai-hub/**/workflow/revisions/diagram-modules/attempts/**`; expected commit: `docs: repair diagram modules product part local-runtime attempt 1`).",
    "2. [TODO] Git Commit: `docs: repair diagram modules product part local-runtime attempt 1` (hash: TBD)",
  ].join("\n");

const initManagedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage: "diagram_modules",
  });
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    createProductPartsIndex()
  );
  await writeWorkspaceFile(
    workspaceRoot,
    DIAGRAM_PLAN_PATH,
    createRepairPlan()
  );
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed repair baseline",
  ]);
};

test("repair attempt evidence makes invalid Diagram Modules repair committable without accepting the Product Part", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-repair-commit-")
  );

  try {
    await initManagedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/local-runtime.md`,
      createInvalidProductPart()
    );
    await writeDiagramModulesRepairAttemptEvidence({
      diagnostics: ["missing '# Module Inventory' or '# Product Part:' header"],
      now: new Date("2026-05-11T12:00:00.000Z"),
      outcome: "still_invalid",
      repairTaskId: REPAIR_TASK_ID,
      targetArtifactPath: `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/local-runtime.md`,
      validator: "diagram_modules.product_part",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    const latestStatus = await readManagedGitStatus(
      workspaceRoot,
      WORKSPACE_SLUG
    );
    await commitManagedDocumentationStageIfReady({
      context: {
        applicationSkeletonProgress: null,
        diagramModulesProgress: null,
        managedGitStatus: latestStatus,
        qualityGatesProgress: null,
      },
      logger: new Logger("error"),
      transaction: new ManagedDocumentationCommitTransaction(),
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-3"]),
      REPAIR_COMMIT_RE
    );
    assert.doesNotMatch(
      await readFile(path.join(workspaceRoot, DIAGRAM_PLAN_PATH), "utf8"),
      USER_REVIEW_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
