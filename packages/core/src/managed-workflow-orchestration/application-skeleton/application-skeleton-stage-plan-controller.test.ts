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
const BOOTSTRAP_TASK_RE = /application-skeleton\.phase1\.bootstrap\.task1/u;
const DRAFT_TASK_RE = /application-skeleton\.phase1\.draft\.task1/u;
const DRAFT_EXPECTED_RE =
  /"expectedCommitMessage": "docs: draft application skeleton contract"/u;
const DRAFT_REPAIR_TASK_1_RE = /application-skeleton\.phase1\.repair\.task1/u;
const DRAFT_REPAIR_TASK_2_RE = /application-skeleton\.phase1\.repair\.task2/u;
const DRAFT_REPAIR_EXPECTED_2_RE =
  /"expectedCommitMessage": "docs: repair application skeleton draft attempt 2"/u;
const REJECTED_DRAFT_HASH_1_RE = /badc0de1/u;
const REJECTED_DRAFT_HASH_2_RE = /badc0de2/u;
const REVIEW_TASK_RE = /application-skeleton\.phase2\.review\.task1/u;
const REVIEW_EXPECTED_RE =
  /"expectedCommitMessage": "docs: revise application skeleton review revision 1"/u;
const REVIEW_NO_REVISION_RE =
  /not-created-user-accepted-without-review-revision/u;
const MATERIALIZE_TASK_RE = /application-skeleton\.phase3\.materialize\.task1/u;
const MATERIALIZE_EXPECTED_RE =
  /"expectedCommitMessage": "feat: materialize application skeleton attempt 1"/u;
const MATERIALIZATION_REPAIR_TASK_1_RE =
  /application-skeleton\.phase3\.repair\.task1/u;
const MATERIALIZATION_REPAIR_EXPECTED_1_RE =
  /"expectedCommitMessage": "feat: repair application skeleton materialization attempt 1"/u;
const REJECTED_MATERIALIZATION_HASH_RE = /feed1234/u;
const PHASE_4_RE = /## Phase 4 — Persistent Application Skeleton User Return/u;
const QUALITY_GATES_UNLOCKED_RE = /"quality_gates"/u;
const APPLICATION_COMPLETED_RE =
  /"completedStages": \[\n {4}"application_skeleton"/u;
const MANAGED_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`;
const APPLICATION_MARKDOWN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`;
const APPLICATION_MAP_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;

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

const createInvalidDraftDecision =
  (): ApplicationSkeletonManagedValidationResult => ({
    diagnostics: ["missing_map_json"],
    mapJson: null,
    nextAction: "repair_current_artifact",
    nextPrompt: "repair draft",
    phase: "draft",
    valid: false,
  });

const createInvalidMaterializationDecision =
  (): ApplicationSkeletonManagedValidationResult => ({
    diagnostics: ["application-skeleton-map.json accepted must be true"],
    mapJson: { accepted: false, materialized: false },
    nextAction: "repair_materialization",
    nextPrompt: "repair materialization",
    phase: "materialization",
    valid: false,
  });

const prepareWorkspace = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    APPLICATION_MARKDOWN_PATH,
    "# Application Skeleton\n\n## Overview\n\nDraft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    APPLICATION_MAP_PATH,
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
    const draftPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(draftPlan, DRAFT_TASK_RE);
    assert.match(draftPlan, DRAFT_EXPECTED_RE);
    assert.doesNotMatch(draftPlan, BOOTSTRAP_TASK_RE);
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
      APPLICATION_MARKDOWN_PATH,
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
      APPLICATION_MAP_PATH,
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

test("ApplicationSkeletonStagePlanController commits rejected draft artifacts before opening repair", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "application-skeleton-rejected-draft-commit-")
  );
  const controller = new ApplicationSkeletonStagePlanController();
  try {
    await prepareWorkspace(workspaceRoot);
    await controller.openDraftPhase({ workspaceRoot });
    await writeWorkspaceFile(
      workspaceRoot,
      APPLICATION_MAP_PATH,
      "{ invalid json\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      MANAGED_DECISION_PATH,
      '{"stage":"application_skeleton","phase":"draft","valid":false}\n'
    );

    const rejectedCommit = await controller.commitRejectedTurn({
      decision: createInvalidDraftDecision(),
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(rejectedCommit.blocked, null);
    assert.match(rejectedCommit.commit?.hash ?? "", GIT_HASH_RE);
    assert.equal(
      await git(workspaceRoot, [
        "status",
        "--short",
        "--",
        APPLICATION_MARKDOWN_PATH,
        APPLICATION_MAP_PATH,
        MANAGED_DECISION_PATH,
      ]),
      ""
    );

    const repairPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(repairPlan, DRAFT_REPAIR_TASK_1_RE);
    assert.equal(repairPlan.includes(rejectedCommit.commit?.hash ?? ""), true);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ApplicationSkeletonStagePlanController records repeatable draft repair task pairs after rejected commits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "application-skeleton-draft-repair-plan-")
  );
  const controller = new ApplicationSkeletonStagePlanController();
  try {
    await prepareWorkspace(workspaceRoot);
    await controller.openDraftPhase({ workspaceRoot });

    const firstRejected = await controller.recordRejectedTurn({
      decision: createInvalidDraftDecision(),
      rejectedCommitHash: "badc0de1",
      workspaceRoot,
    });
    assert.equal(firstRejected.blocked, null);
    assert.equal(
      firstRejected.commit?.nextTaskId,
      "application-skeleton.phase1.repair.task1"
    );

    const firstRepairPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(firstRepairPlan, DRAFT_REPAIR_TASK_1_RE);
    assert.match(firstRepairPlan, REJECTED_DRAFT_HASH_1_RE);

    const secondRejected = await controller.recordRejectedTurn({
      decision: createInvalidDraftDecision(),
      rejectedCommitHash: "badc0de2",
      workspaceRoot,
    });
    assert.equal(secondRejected.blocked, null);
    assert.equal(
      secondRejected.commit?.nextTaskId,
      "application-skeleton.phase1.repair.task2"
    );

    const secondRepairPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(secondRepairPlan, DRAFT_REPAIR_TASK_2_RE);
    assert.match(secondRepairPlan, DRAFT_REPAIR_EXPECTED_2_RE);
    assert.match(secondRepairPlan, REJECTED_DRAFT_HASH_2_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ApplicationSkeletonStagePlanController records materialization repair task pairs after rejected commits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "application-skeleton-materialization-repair-plan-")
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
    await controller.commitManagedTurn({
      decision: createDraftDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await controller.acceptUserReviewWithoutRevision({ workspaceRoot });

    const rejectedMaterialization = await controller.recordRejectedTurn({
      decision: createInvalidMaterializationDecision(),
      rejectedCommitHash: "feed1234",
      workspaceRoot,
    });
    assert.equal(rejectedMaterialization.blocked, null);
    assert.equal(
      rejectedMaterialization.commit?.nextTaskId,
      "application-skeleton.phase3.repair.task1"
    );

    const repairPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/application-skeleton/todo-plan.md"
    );
    assert.match(repairPlan, MATERIALIZATION_REPAIR_TASK_1_RE);
    assert.match(repairPlan, MATERIALIZATION_REPAIR_EXPECTED_1_RE);
    assert.match(repairPlan, REJECTED_MATERIALIZATION_HASH_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
