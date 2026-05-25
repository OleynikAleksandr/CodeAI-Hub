import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedWorkflowScaffoldInstaller } from "../managed-workflow-scaffold-installer";
import { DiagramModulesManagedGitBoundary } from "./diagram-modules-managed-git-boundary";
import { DiagramModulesStagePlanController } from "./diagram-modules-stage-plan-controller";
import type { DiagramModulesManagedValidationResult } from "./diagram-modules-validator";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const ACCEPTED_COMMITS_RE = /"acceptedCommits": \[/u;
const FINAL_DESCRIPTION_TRACKED_RE =
  /\.codeai-hub\/demo-workspace\/description\/Final_Description\.md/u;
const GIT_HASH_RE = /^[0-9a-f]{7,}$/u;
const INPUT_CHECKPOINT_COMMIT_RE =
  /Git Commit: `docs: checkpoint managed workflow inputs` \(hash: [0-9a-f]{7,}\)/u;
const INPUT_CHECKPOINT_SUBJECT_RE = /docs: checkpoint managed workflow inputs/u;
const INDEX_COMMIT_HASH_RE =
  /Git Commit: `docs: update diagram modules product part index` \(hash: [0-9a-f]{7,}\)/u;
const INDEX_SUBJECT_RE = /docs: update diagram modules product part index/u;
const INDEX_TASK_RE = /diagram-modules\.phase1\.index\.task1`/u;
const INDEX_TASK_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase1\.index\.task1"/u;
const LEDGER_SUBJECT_RE = /chore: advance managed workflow ledger/u;
const LAST_ACCEPTED_HASH_RE = /"lastAcceptedCommitHash": "[0-9a-f]{7,}"/u;
const PRODUCT_PART_INDEX_TRACKED_RE =
  /\.codeai-hub\/demo-workspace\/diagram_modules\/product-parts\.index\.md/u;
const MODULE_MAP_SIDECAR_TRACKED_RE =
  /\.codeai-hub\/demo-workspace\/diagram_modules\/module-map\.flow\.json/u;
const GENERATED_DIST_TRACKED_RE = /product-parts\/project-manager\/dist/u;
const GENERATED_NODE_MODULES_TRACKED_RE = /node_modules/u;
const PROJECT_MANAGER_README_TRACKED_RE =
  /product-parts\/project-manager\/README\.md/u;
const RUNTIME_METADATA_TRACKED_RE =
  /\.codeai-hub\/demo-workspace\/continuity\/diagram_modules\/session-1\/chain\.json/u;
const PROJECT_MANAGER_PRODUCT_PART_SUBJECT_RE =
  /docs: update diagram modules project-manager product part/u;
const PROJECT_MANAGER_TASK_RE =
  /diagram-modules\.phase1\.product-part\.project-manager\.task1/u;
const PROJECT_MANAGER_TASK_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase1\.product-part\.project-manager\.task1"/u;
const REVIEW_COMMIT_RE =
  /Git Commit: `docs: open diagram modules user review` \(hash: TBD\)/u;
const REVIEW_EXPECTED_COMMIT_RE =
  /"expectedCommitMessage": "docs: open diagram modules user review"/u;
const REVIEW_PHASE_RE = /## Phase 2 — Diagram Modules User Review/u;
const REVIEW_TASK_RE = /diagram-modules\.phase2\.review\.task1/u;
const REVIEW_TASK_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase2\.review\.task1"/u;
const INDEX_LOCK_BLOCKER_RE =
  /could not acquire the repository index lock after retrying/u;
const PRODUCT_PART_INDEX_PATH = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`;

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

const writeManagedDecision = async (
  workspaceRoot: string,
  decision: DiagramModulesManagedValidationResult
): Promise<void> =>
  writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/diagram_modules.json`,
    `${JSON.stringify(
      {
        ...decision,
        schema: "codeai-managed-workflow-diagram-modules-v1",
        stage: "diagram_modules",
      },
      null,
      2
    )}\n`
  );

const createIndexAcceptedDecision =
  (): DiagramModulesManagedValidationResult => ({
    currentPartId: "project-manager",
    diagnostics: [],
    generatedPartIds: [],
    nextAction: "dispatch_next_product_part",
    nextPrompt: "next product part",
    plannedPartIds: ["project-manager"],
    valid: true,
  });

const createFinalPartAcceptedDecision =
  (): DiagramModulesManagedValidationResult => ({
    currentPartId: null,
    diagnostics: [],
    generatedPartIds: ["project-manager"],
    nextAction: "open_user_review",
    nextPrompt: "review",
    plannedPartIds: ["project-manager"],
    valid: true,
  });

const createRetryingController = (): DiagramModulesStagePlanController =>
  new DiagramModulesStagePlanController({
    gitBoundary: new DiagramModulesManagedGitBoundary({
      retryDelaysMs: [10, 20, 50],
    }),
  });

const prepareAcceptedIndexWorkspace = async (
  workspaceRoot: string
): Promise<DiagramModulesManagedValidationResult> => {
  const scaffoldInstaller = new ManagedWorkflowScaffoldInstaller();
  await scaffoldInstaller.installDiagramModulesScaffold({ workspaceRoot });
  await scaffoldInstaller.checkpointDiagramModulesInputs({
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    [
      "# Product Parts",
      "",
      "1. `project-manager` - `.codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md`",
    ].join("\n")
  );
  const indexDecision = createIndexAcceptedDecision();
  await writeManagedDecision(workspaceRoot, indexDecision);
  return indexDecision;
};

test("DiagramModulesStagePlanController commits accepted turns and advances the managed stage plan", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "diagram-stage-plan-controller-")
  );
  const controller = new DiagramModulesStagePlanController();

  try {
    const scaffoldInstaller = new ManagedWorkflowScaffoldInstaller();
    await scaffoldInstaller.installDiagramModulesScaffold({ workspaceRoot });
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`,
      "# Upstream description\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`,
      "# Virtual Simulation\n"
    );
    await scaffoldInstaller.checkpointDiagramModulesInputs({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    const checkpointPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(checkpointPlan, INPUT_CHECKPOINT_COMMIT_RE);
    assert.match(checkpointPlan, INDEX_TASK_STATE_RE);
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");

    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/continuity/diagram_modules/session-1/chain.json`,
      '{"stage":"diagram_modules","sessionId":"session-1"}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`,
      '{"chains":["session-1"]}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      '{"activeStage":"diagram_modules","updated":true}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
      [
        "# Product Parts",
        "",
        "1. `project-manager` - `.codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md`",
        "- Status: planned",
      ].join("\n")
    );
    const indexDecision = createIndexAcceptedDecision();
    await writeManagedDecision(workspaceRoot, indexDecision);

    const indexCommit = await controller.commitAcceptedTurn({
      decision: indexDecision,
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(indexCommit.blocked, null);
    assert.match(indexCommit.commit?.hash ?? "", GIT_HASH_RE);
    assert.equal(
      await git(workspaceRoot, ["rev-parse", "--is-inside-work-tree"]),
      "true"
    );

    const afterIndexPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(afterIndexPlan, INDEX_TASK_RE);
    assert.match(afterIndexPlan, INDEX_COMMIT_HASH_RE);
    assert.match(afterIndexPlan, PROJECT_MANAGER_TASK_RE);
    assert.match(afterIndexPlan, PROJECT_MANAGER_TASK_STATE_RE);
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");

    const trackedAfterIndex = await git(workspaceRoot, ["ls-files"]);
    assert.match(trackedAfterIndex, PRODUCT_PART_INDEX_TRACKED_RE);
    assert.match(trackedAfterIndex, FINAL_DESCRIPTION_TRACKED_RE);
    assert.match(trackedAfterIndex, RUNTIME_METADATA_TRACKED_RE);

    await writeWorkspaceFile(
      workspaceRoot,
      PRODUCT_PART_INDEX_PATH,
      [
        "# Product Parts",
        "",
        "1. `project-manager` - `.codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md`",
        "- Status: generated",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/project-manager.md`,
      "# Product Part: project-manager\n\n## Modules\n"
    );
    const finalDecision = createFinalPartAcceptedDecision();
    await writeManagedDecision(workspaceRoot, finalDecision);

    const finalCommit = await controller.commitAcceptedTurn({
      decision: finalDecision,
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(finalCommit.blocked, null);
    assert.match(finalCommit.commit?.hash ?? "", GIT_HASH_RE);

    const finalPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(finalPlan, REVIEW_PHASE_RE);
    assert.match(finalPlan, REVIEW_TASK_RE);
    assert.match(finalPlan, REVIEW_TASK_STATE_RE);
    assert.match(finalPlan, REVIEW_EXPECTED_COMMIT_RE);
    assert.match(finalPlan, REVIEW_COMMIT_RE);
    assert.equal(
      (
        await stat(
          path.join(
            workspaceRoot,
            ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager"
          )
        )
      ).isDirectory(),
      true
    );
    assert.equal(
      await git(workspaceRoot, [
        "status",
        "--short",
        "--",
        PRODUCT_PART_INDEX_PATH,
      ]),
      ""
    );
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");

    const workspacePlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md"
    );
    assert.match(workspacePlan, LAST_ACCEPTED_HASH_RE);
    assert.match(workspacePlan, ACCEPTED_COMMITS_RE);

    const subjects = await git(workspaceRoot, ["log", "--format=%s"]);
    assert.match(subjects, INPUT_CHECKPOINT_SUBJECT_RE);
    assert.match(subjects, LEDGER_SUBJECT_RE);
    assert.match(subjects, INDEX_SUBJECT_RE);
    assert.match(subjects, PROJECT_MANAGER_PRODUCT_PART_SUBJECT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("DiagramModulesManagedGitBoundary excludes generated outputs from managed commits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "diagram-managed-git-output-exclude-")
  );
  const gitBoundary = new DiagramModulesManagedGitBoundary();

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/project-manager/README.md",
      "# Project Manager\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/project-manager/dist/index.js",
      "export {};\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "node_modules/demo-package/index.js",
      "module.exports = {};\n"
    );

    const commit = await gitBoundary.commitManagedChanges({
      commitMessage: "test: managed output exclude",
      managedPaths: [
        "product-parts",
        "product-parts/project-manager/dist",
        "node_modules",
      ],
      workspaceRoot,
    });

    assert.equal(commit.noStagedChanges, false);
    assert.match(commit.hash ?? "", GIT_HASH_RE);

    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.match(trackedFiles, PROJECT_MANAGER_README_TRACKED_RE);
    assert.doesNotMatch(trackedFiles, GENERATED_NODE_MODULES_TRACKED_RE);
    assert.doesNotMatch(trackedFiles, GENERATED_DIST_TRACKED_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("DiagramModulesManagedGitBoundary commits generated dot-directory sidecars", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "diagram-managed-git-dot-sidecar-")
  );
  const gitBoundary = new DiagramModulesManagedGitBoundary();
  const sidecarPath = `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/module-map.flow.json`;

  try {
    await writeWorkspaceFile(workspaceRoot, sidecarPath, '{"nodes":[]}\n');

    const commit = await gitBoundary.commitManagedChanges({
      commitMessage: "test: managed dot sidecar",
      managedPaths: [sidecarPath],
      workspaceRoot,
    });

    assert.equal(commit.noStagedChanges, false);
    assert.match(commit.hash ?? "", GIT_HASH_RE);

    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.match(trackedFiles, MODULE_MAP_SIDECAR_TRACKED_RE);
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("DiagramModulesStagePlanController retries transient managed git index locks", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "diagram-stage-plan-lock-retry-")
  );
  const controller = createRetryingController();

  try {
    const indexDecision = await prepareAcceptedIndexWorkspace(workspaceRoot);
    await git(workspaceRoot, ["init"]);
    const lockPath = path.join(workspaceRoot, ".git", "index.lock");
    await writeFile(lockPath, "busy\n", "utf8");
    setTimeout(() => {
      rm(lockPath, { force: true }).catch(() => undefined);
    }, 15);

    const indexCommit = await controller.commitAcceptedTurn({
      decision: indexDecision,
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(indexCommit.blocked, null);
    assert.match(indexCommit.commit?.hash ?? "", GIT_HASH_RE);
    const afterIndexPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(afterIndexPlan, INDEX_COMMIT_HASH_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("DiagramModulesStagePlanController blocks persistent managed git index locks without advancing the plan", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "diagram-stage-plan-lock-block-")
  );
  const controller = new DiagramModulesStagePlanController({
    gitBoundary: new DiagramModulesManagedGitBoundary({
      retryDelaysMs: [1, 1],
    }),
  });

  try {
    const indexDecision = await prepareAcceptedIndexWorkspace(workspaceRoot);
    await git(workspaceRoot, ["init"]);
    await writeFile(
      path.join(workspaceRoot, ".git", "index.lock"),
      "busy\n",
      "utf8"
    );

    const indexCommit = await controller.commitAcceptedTurn({
      decision: indexDecision,
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(indexCommit.commit, null);
    assert.equal(indexCommit.blocked?.reason, "commit_failed");
    assert.match(indexCommit.blocked?.message ?? "", INDEX_LOCK_BLOCKER_RE);
    const afterIndexPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(afterIndexPlan, INDEX_TASK_STATE_RE);
    assert.doesNotMatch(afterIndexPlan, INDEX_COMMIT_HASH_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
