import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import type { QualityGatesGuardDecision } from "./quality-gates-contract-guard";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import { runQualityGatesRepairOrchestration } from "./quality-gates-repair-orchestration";

const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const PHASE_1_DRAFT_TASK_ID = "quality-gates.phase1.draft.task1";
const REPAIR_TASK_RE = /quality-gates\.phase1\.draft\.repair1\.task1/u;

const writePlanFile = async (
  workspaceRoot: string,
  taskId: string,
  expectedCommit: string
): Promise<void> => {
  const planPath = path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH);
  await mkdir(path.dirname(planPath), { recursive: true });
  await writeFile(
    planPath,
    [
      "# Managed Workspace TODO Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      JSON.stringify(
        {
          branch: "main",
          currentTaskId: taskId,
          debt: null,
          executionScopeStatus: "ACTIVE",
          expectedCommitMessage: expectedCommit,
          schema: "codeai-plan-v1",
        },
        null,
        2
      ),
      "```",
      "<!-- codeai-plan-state:end -->",
      "",
      "## Phase 1 — Quality Gates Contract Bootstrap",
      "",
      "### Stream: Quality Gates Draft Contract",
      "",
      `1. [IN_PROGRESS] \`${taskId}\` Draft quality gates contract artifacts (scope: \`.codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json\`; expected commit: \`${expectedCommit}\`).`,
      `2. [TODO] Git Commit: \`${expectedCommit}\` (hash: TBD)`,
      "",
    ].join("\n"),
    "utf8"
  );
};

const buildProgress = (
  overrides: Partial<QualityGatesProgressSnapshot> = {}
): QualityGatesProgressSnapshot => ({
  accepted: false,
  acceptanceCommitted: false,
  commandContractReady: true,
  integrated: false,
  integrationState: "draft",
  jsonExists: true,
  markdownExists: true,
  substep: "awaiting_acceptance",
  validationErrors: [],
  ...overrides,
});

const buildCleanGitStatus = (): ManagedGitStatus => ({
  clean: true,
  dirtyByStage: {
    application_skeleton: [],
    diagram_modules: [],
    quality_gates: [],
  },
  dirtyFiles: [],
});

test("repair orchestration injects repair task pair when guard reports no progress", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-repair-inject-")
  );
  try {
    await writePlanFile(
      workspaceRoot,
      PHASE_1_DRAFT_TASK_ID,
      "docs: draft quality gates contract"
    );
    const decision: QualityGatesGuardDecision = {
      kind: "repair_no_progress",
      reason: "terminal_no_owned_diff_in_phase_1_draft",
    };
    const result = await runQualityGatesRepairOrchestration({
      decision,
      logger: new Logger("error"),
      managedGitStatus: buildCleanGitStatus(),
      phase: "phase_1_draft",
      progress: buildProgress({
        commandContractReady: false,
        jsonExists: false,
        markdownExists: false,
      }),
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(result.status, "injected");
    assert.match(result.injectedRepairTaskId ?? "", REPAIR_TASK_RE);
    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_PLAN_PATH),
      "utf8"
    );
    assert.match(planText, REPAIR_TASK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("repair orchestration writes tracked attempt evidence when already in repair task", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-repair-evidence-")
  );
  try {
    await writePlanFile(
      workspaceRoot,
      "quality-gates.phase1.draft.repair1.task1",
      "docs: repair quality gates phase1.draft attempt 1"
    );
    const decision: QualityGatesGuardDecision = {
      details: ["quality-gates.json is missing"],
      kind: "repair_invalid_draft",
      reason: "implicit_readiness_with_invalid_draft",
    };
    const result = await runQualityGatesRepairOrchestration({
      decision,
      logger: new Logger("error"),
      managedGitStatus: buildCleanGitStatus(),
      phase: "phase_1_draft",
      progress: buildProgress({ jsonExists: false }),
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(result.status, "evidence_written");
    assert.ok(result.evidencePath);
    const evidence = await readFile(
      path.join(workspaceRoot, result.evidencePath ?? ""),
      "utf8"
    );
    const parsed = JSON.parse(evidence) as Record<string, unknown>;
    assert.equal(parsed.schema, "codeai-quality-gates-repair-attempt-v1");
    assert.equal(
      parsed.repairTaskId,
      "quality-gates.phase1.draft.repair1.task1"
    );
    assert.equal(parsed.outcome, "no_accepted_diff");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("repair orchestration is a noop when guard reports commit_ready", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-repair-noop-")
  );
  try {
    await writePlanFile(
      workspaceRoot,
      PHASE_1_DRAFT_TASK_ID,
      "docs: draft quality gates contract"
    );
    const decision: QualityGatesGuardDecision = {
      kind: "commit_ready",
      reason: "draft_complete",
    };
    const result = await runQualityGatesRepairOrchestration({
      decision,
      logger: new Logger("error"),
      managedGitStatus: buildCleanGitStatus(),
      phase: "phase_1_draft",
      progress: buildProgress(),
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(result.status, "noop");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
