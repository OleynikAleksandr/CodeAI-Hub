import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedWorkflowScaffoldInstaller } from "../managed-workflow-scaffold-installer";
import { QualityGatesStagePlanController } from "./quality-gates-stage-plan-controller";
import type { QualityGatesManagedValidationResult } from "./quality-gates-validator";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const GIT_HASH_RE = /^[0-9a-f]{7,}$/u;
const DRAFT_TASK_RE = /quality-gates\.phase1\.draft\.task1/u;
const REVIEW_TASK_RE = /quality-gates\.phase2\.review\.task1/u;
const INTEGRATE_TASK_RE = /quality-gates\.phase3\.integrate\.task1/u;
const FORMAL_VERIFY_TASK_RE = /quality-gates\.phase4\.verify\.task1/u;
const INTEGRATION_REPAIR_TASK_RE = /quality-gates\.phase3\.repair\.task1/u;
const DRAFT_REPAIR_CYCLE_RE = /## Quality Gates Draft Repair Cycle/u;
const INTEGRATION_REPAIR_CYCLE_RE =
  /## Quality Gates Integration Repair Cycle/u;
const NUMERIC_PHASE_HEADING_RE = /^## Phase (\d+) — .+$/gmu;
const NO_REVISION_RE = /not-created-user-accepted-without-review-revision/u;
const PHASE_4_RE = /## Phase 4 — Formal Quality Gates Verification/u;
const PHASE_5_RE = /## Phase 5 — Persistent Quality Gates User Return/u;
const PERSISTENT_RETURN_COMMIT_DONE_RE =
  /\[DONE\] Git Commit: `not-created-persistent-user-return-open` \(hash: not-created-persistent-user-return-open\)/u;
const PERSISTENT_RETURN_COMMIT_TODO_RE =
  /\[TODO\] Git Commit: `not-created-persistent-user-return-open`/u;
const QUALITY_GATES_COMPLETED_RE =
  /"completedStages": \[\n {4}"quality_gates"/u;
const REJECTED_INTEGRATION_HASH_RE = /feed1234/u;
const QUALITY_GATES_MARKDOWN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`;
const QUALITY_GATES_JSON_PATH = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`;
const MANAGED_DECISION_PATH = `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`;

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
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

const buildContractJson = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  accepted: false,
  commands: {
    "qg-secret-scan": {
      availability: "not_integrated",
      desiredStatus: "active",
      id: "qg-secret-scan",
      integrationRequired: true,
      plannedIntegrationPaths: [
        "package.json",
        "scripts/quality-gates/secret-scan.mjs",
        ".husky/pre-commit",
      ],
    },
  },
  integrated: false,
  integrationState: "not_started",
  requiredBeforeCommit: ["qg-secret-scan"],
  requiredBeforeModuleExecution: [],
  requiredBeforePush: [],
  requiredBeforeRelease: [],
  schema: "codeai-quality-gates-v1",
  ...overrides,
});

const createDraftDecision = (): QualityGatesManagedValidationResult => ({
  contractJson: buildContractJson(),
  diagnostics: [],
  nextAction: "open_user_review",
  nextPrompt: "review",
  phase: "draft",
  valid: true,
});

const createIntegratedDecision = (): QualityGatesManagedValidationResult => ({
  contractJson: buildContractJson({
    accepted: true,
    integrated: true,
    integratedPaths: [
      "package.json",
      ".husky/pre-commit",
      "scripts/quality-gates/secret-scan.mjs",
    ],
    integrationState: "integrated",
  }),
  diagnostics: [],
  nextAction: "open_persistent_return",
  nextPrompt: "complete",
  phase: "integration",
  valid: true,
});

const createInvalidDraftDecision = (): QualityGatesManagedValidationResult => ({
  contractJson: buildContractJson(),
  diagnostics: ["commands_missing"],
  nextAction: "repair_current_artifact",
  nextPrompt: "repair",
  phase: "draft",
  valid: false,
});

const createInvalidIntegrationDecision =
  (): QualityGatesManagedValidationResult => ({
    contractJson: buildContractJson({ accepted: true }),
    diagnostics: ["missing_package_script:qg-secret-scan"],
    nextAction: "repair_integration",
    nextPrompt: "repair",
    phase: "integration",
    valid: false,
  });

const assertUniqueNumericPhaseHeadings = (plan: string): void => {
  const phaseNumbers = Array.from(
    plan.matchAll(NUMERIC_PHASE_HEADING_RE),
    (match) => match[1]
  );
  assert.equal(new Set(phaseNumbers).size, phaseNumbers.length);
};

const prepareWorkspace = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_GATES_MARKDOWN_PATH,
    "# Quality Gates Baseline\n\n## Overview\n\nDraft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_GATES_JSON_PATH,
    `${JSON.stringify(buildContractJson(), null, 2)}\n`
  );
};

test("QualityGatesStagePlanController commits draft, accepts review, and commits integration", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-stage-plan-")
  );
  const controller = new QualityGatesStagePlanController();
  try {
    await prepareWorkspace(workspaceRoot);
    await controller.openDraftPhase({ workspaceRoot });
    const draftPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(draftPlan, DRAFT_TASK_RE);
    await writeWorkspaceFile(
      workspaceRoot,
      MANAGED_DECISION_PATH,
      '{"stage":"quality_gates","phase":"draft"}\n'
    );

    const draftCommit = await controller.commitManagedTurn({
      decision: createDraftDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(draftCommit.blocked, null);
    assert.match(draftCommit.commit?.hash ?? "", GIT_HASH_RE);

    const reviewPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(reviewPlan, REVIEW_TASK_RE);

    await controller.acceptUserReviewWithoutRevision({ workspaceRoot });
    const integrationPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(integrationPlan, NO_REVISION_RE);
    assert.match(integrationPlan, INTEGRATE_TASK_RE);

    await writeWorkspaceFile(
      workspaceRoot,
      QUALITY_GATES_JSON_PATH,
      `${JSON.stringify(createIntegratedDecision().contractJson, null, 2)}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "package.json",
      '{"scripts":{"qg:secret-scan":"node scripts/quality-gates/secret-scan.mjs"}}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/quality-gates/secret-scan.mjs",
      "console.log('ok');\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg:secret-scan\n"
    );
    await writeWorkspaceFile(workspaceRoot, "tsconfig.base.json", "{}\n");
    await writeWorkspaceFile(
      workspaceRoot,
      MANAGED_DECISION_PATH,
      '{"stage":"quality_gates","phase":"integration"}\n'
    );

    const integratedCommit = await controller.commitManagedTurn({
      decision: createIntegratedDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(integratedCommit.blocked, null);
    assert.match(integratedCommit.commit?.hash ?? "", GIT_HASH_RE);

    const finalPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(finalPlan, PHASE_4_RE);
    assert.match(finalPlan, FORMAL_VERIFY_TASK_RE);
    assert.doesNotMatch(finalPlan, PHASE_5_RE);
    assert.doesNotMatch(finalPlan, PERSISTENT_RETURN_COMMIT_DONE_RE);
    const workspacePlanAfterIntegration = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md"
    );
    assert.doesNotMatch(
      workspacePlanAfterIntegration,
      QUALITY_GATES_COMPLETED_RE
    );

    await writeWorkspaceFile(
      workspaceRoot,
      MANAGED_DECISION_PATH,
      '{"stage":"quality_gates","phase":"verification"}\n'
    );
    const verifiedCommit = await controller.commitManagedTurn({
      decision: createIntegratedDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(verifiedCommit.blocked, null);

    const verifiedPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(verifiedPlan, PHASE_5_RE);
    assert.match(verifiedPlan, PERSISTENT_RETURN_COMMIT_DONE_RE);
    assert.doesNotMatch(verifiedPlan, PERSISTENT_RETURN_COMMIT_TODO_RE);
    const workspacePlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md"
    );
    assert.match(workspacePlan, QUALITY_GATES_COMPLETED_RE);
    assert.equal(
      await git(workspaceRoot, [
        "status",
        "--short",
        "--",
        QUALITY_GATES_MARKDOWN_PATH,
        QUALITY_GATES_JSON_PATH,
        MANAGED_DECISION_PATH,
        "package.json",
        "tsconfig.base.json",
        ".husky/pre-commit",
        "scripts/quality-gates/secret-scan.mjs",
      ]),
      ""
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("QualityGatesStagePlanController cleans pre-acceptance integration residue", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-draft-scope-clean-")
  );
  const controller = new QualityGatesStagePlanController();
  try {
    await prepareWorkspace(workspaceRoot);
    await controller.openDraftPhase({ workspaceRoot });
    await git(workspaceRoot, ["add", "package.json"]);
    await git(workspaceRoot, ["commit", "-m", "test: package baseline"]);
    const packageBefore = await readWorkspaceFile(
      workspaceRoot,
      "package.json"
    ).catch(() => null);
    await writeWorkspaceFile(
      workspaceRoot,
      "package.json",
      '{"scripts":{"plan:commit":"node ./scripts/plan-orchestrator/plan-cli.mjs commit"}}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nnpm run qg:secret-scan\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/quality-gates/secret-scan.mjs",
      "console.log('premature');\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      MANAGED_DECISION_PATH,
      '{"stage":"quality_gates","phase":"draft"}\n'
    );

    const draftCommit = await controller.commitManagedTurn({
      decision: createDraftDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(draftCommit.blocked, null);
    assert.equal(
      await readWorkspaceFile(workspaceRoot, "package.json").catch(() => null),
      packageBefore
    );
    assert.equal(
      await git(workspaceRoot, [
        "status",
        "--short",
        "--",
        "package.json",
        ".husky/pre-commit",
        "scripts/quality-gates",
      ]),
      ""
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("QualityGatesStagePlanController records integration repair after rejected commit", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-integration-repair-")
  );
  const controller = new QualityGatesStagePlanController();
  try {
    await prepareWorkspace(workspaceRoot);
    await controller.openDraftPhase({ workspaceRoot });
    await controller.commitManagedTurn({
      decision: createDraftDecision(),
      sessionId: "session-1",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await controller.acceptUserReviewWithoutRevision({ workspaceRoot });

    const rejected = await controller.recordRejectedTurn({
      decision: createInvalidIntegrationDecision(),
      rejectedCommitHash: "feed1234",
      workspaceRoot,
    });
    assert.equal(rejected.blocked, null);
    assert.equal(
      rejected.commit?.nextTaskId,
      "quality-gates.phase3.repair.task1"
    );

    const repairPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(repairPlan, INTEGRATION_REPAIR_TASK_RE);
    assert.match(repairPlan, INTEGRATION_REPAIR_CYCLE_RE);
    assert.match(repairPlan, REJECTED_INTEGRATION_HASH_RE);
    assertUniqueNumericPhaseHeadings(repairPlan);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("QualityGatesStagePlanController labels draft repairs without duplicate phase numbers", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-draft-repair-labels-")
  );
  const controller = new QualityGatesStagePlanController();
  try {
    await prepareWorkspace(workspaceRoot);
    await controller.openDraftPhase({ workspaceRoot });

    const rejected = await controller.recordRejectedTurn({
      decision: createInvalidDraftDecision(),
      rejectedCommitHash: "feed1234",
      workspaceRoot,
    });
    assert.equal(rejected.blocked, null);
    assert.equal(
      rejected.commit?.nextTaskId,
      "quality-gates.phase1.repair.task1"
    );

    const repairPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    assert.match(repairPlan, DRAFT_REPAIR_CYCLE_RE);
    assert.match(repairPlan, REJECTED_INTEGRATION_HASH_RE);
    assertUniqueNumericPhaseHeadings(repairPlan);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
