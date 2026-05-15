import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedWorkflowScaffoldInstaller } from "../managed-workflow-scaffold-installer";
import { ApplicationSkeletonStagePlanController } from "./application-skeleton-stage-plan-controller";
import type { ApplicationSkeletonManagedValidationResult } from "./application-skeleton-validator";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const GIT_HASH_RE = /^[0-9a-f]{7,}$/u;
const REVIEW_TASK_RE = /application-skeleton\.phase2\.review\.task1/u;
const REVIEW_EXPECTED_RE =
  /"expectedCommitMessage": "docs: revise application skeleton review revision 1"/u;
const REVIEW_NO_REVISION_RE =
  /not-created-user-accepted-without-review-revision/u;
const MATERIALIZE_TASK_RE = /application-skeleton\.phase3\.materialize\.task1/u;
const MATERIALIZE_EXPECTED_RE =
  /"expectedCommitMessage": "feat: materialize application skeleton attempt 1"/u;
const PHASE_4_RE = /## Phase 4 — Persistent Application Skeleton User Return/u;
const QUALITY_GATES_UNLOCKED_RE = /"quality_gates"/u;
const APPLICATION_COMPLETED_RE =
  /"completedStages": \[\n {4}"application_skeleton"/u;
const MANAGED_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const readWorkspaceFile = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const createDraftDecision = (): ApplicationSkeletonManagedValidationResult => ({
  diagnostics: [],
  mapJson: {
    accepted: false,
    materialized: false,
    productParts: [
      {
        partId: "core-runtime",
        codePath: "product-parts/core-runtime",
      },
    ],
  },
  nextAction: "open_user_review",
  nextPrompt: "review",
  phase: "draft",
  valid: true,
});

const createMaterializedDecision =
  (): ApplicationSkeletonManagedValidationResult => ({
    diagnostics: [],
    mapJson: {
      accepted: true,
      materialized: true,
      materializationState: "materialized",
      materializedPaths: ["product-parts/core-runtime"],
      productParts: [
        {
          partId: "core-runtime",
          codePath: "product-parts/core-runtime",
        },
      ],
      reviewState: "materialized",
      sourceRoot: "product-parts",
    },
    nextAction: "open_persistent_return",
    nextPrompt: "complete",
    phase: "materialization",
    valid: true,
  });

const prepareWorkspace = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`,
    "# Application Skeleton\n\n## Overview\n\nDraft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
    `${JSON.stringify(createDraftDecision().mapJson, null, 2)}\n`
  );
};

test("ApplicationSkeletonStagePlanController commits draft, accepts review, and commits materialization", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "application-skeleton-stage-plan-")
  );
  const controller = new ApplicationSkeletonStagePlanController();
  try {
    await prepareWorkspace(workspaceRoot);
    await controller.openDraftPhase({ workspaceRoot });
    await writeWorkspaceFile(
      workspaceRoot,
      MANAGED_DECISION_PATH,
      '{"stage":"application_skeleton","phase":"draft"}\n'
    );

    const draftCommit = await controller.commitManagedTurn({
      decision: createDraftDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(draftCommit.blocked, null);
    assert.match(draftCommit.commit?.hash ?? "", GIT_HASH_RE);
    assert.equal(
      await git(workspaceRoot, [
        "status",
        "--short",
        "--",
        MANAGED_DECISION_PATH,
      ]),
      ""
    );

    const reviewPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(reviewPlan, REVIEW_TASK_RE);
    assert.match(reviewPlan, REVIEW_EXPECTED_RE);

    await controller.acceptUserReviewWithoutRevision({ workspaceRoot });
    const materializationPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(materializationPlan, REVIEW_NO_REVISION_RE);
    assert.match(materializationPlan, MATERIALIZE_TASK_RE);
    assert.match(materializationPlan, MATERIALIZE_EXPECTED_RE);

    await mkdir(path.join(workspaceRoot, "product-parts/core-runtime"), {
      recursive: true,
    });
    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/core-runtime/README.md",
      "# Core Runtime\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`,
      [
        "# Application Skeleton",
        "",
        "## Overview",
        "",
        "reviewState: materialized",
        "accepted: true",
        "materialized: true",
        "materializationState: materialized",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
      `${JSON.stringify(createMaterializedDecision().mapJson, null, 2)}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      MANAGED_DECISION_PATH,
      '{"stage":"application_skeleton","phase":"materialization"}\n'
    );

    const materializedCommit = await controller.commitManagedTurn({
      decision: createMaterializedDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(materializedCommit.blocked, null);
    assert.match(materializedCommit.commit?.hash ?? "", GIT_HASH_RE);
    assert.equal(
      await git(workspaceRoot, [
        "status",
        "--short",
        "--",
        "product-parts/core-runtime/README.md",
      ]),
      ""
    );
    assert.equal(
      await git(workspaceRoot, [
        "status",
        "--short",
        "--",
        MANAGED_DECISION_PATH,
      ]),
      ""
    );

    const finalPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(finalPlan, PHASE_4_RE);

    const workspacePlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md"
    );
    assert.match(workspacePlan, APPLICATION_COMPLETED_RE);
    assert.match(workspacePlan, QUALITY_GATES_UNLOCKED_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
