import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  acceptQualityGatesRepairLimitAsIs,
  buildQualityGatesRepairLimitRevisionPrompt,
  readQualityGatesRepairLimitTask,
} from "./quality-gates-repair-limit-acceptance";
import { QUALITY_GATES_STAGE_PLAN_PATH } from "./quality-gates-stage-plan-model";

const ACCEPTED_AS_IS_RE =
  /\(hash: not-created-user-accepted-repair-limit-as-is\)/u;
const REPAIR_TASK4_DONE_RE =
  /15\. \[DONE\] `quality-gates\.phase3\.repair\.task4`/u;
const VERIFY_TASK_LINE_RE = /`quality-gates\.phase4\.verify\.task1`/u;
const VERIFY_CURRENT_TASK_RE =
  /"currentTaskId": "quality-gates\.phase4\.verify\.task1"/u;
const VERIFY_EXPECTED_COMMIT_RE =
  /"expectedCommitMessage": "chore: verify quality gates enforcement"/u;
const PHASE5_CURRENT_TASK_RE =
  /"currentTaskId": "quality-gates\.phase5\.user-return\.task1"/u;
const NULL_EXPECTED_COMMIT_RE = /"expectedCommitMessage": null/u;
const REVIEW_CURRENT_TASK_RE =
  /"currentTaskId": "quality-gates\.phase2\.review\.task1"/u;
const NOT_ON_REPAIR_RE = /not on an open repair attempt/u;
const USER_FEEDBACK_RE = /Rename the gate script to qg-typecheck\./u;
const SLUG_PATH_RE = /finderwidget-test01\/quality_gates\//u;
const STOP_FOR_VALIDATION_RE = /stop for Core validation/u;

interface LedgerCommitCall {
  readonly commitMessage: string;
  readonly managedPaths: readonly string[];
}

const createLedgerBoundary = (calls: LedgerCommitCall[]) => ({
  commitManagedChanges: (params: {
    readonly commitMessage: string;
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }) => {
    calls.push({
      commitMessage: params.commitMessage,
      managedPaths: params.managedPaths,
    });
    return Promise.resolve({ hash: "fake1234", noStagedChanges: false });
  },
});

const writeStagePlan = async (params: {
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly workspaceRoot: string;
}): Promise<void> => {
  const planPath = path.join(
    params.workspaceRoot,
    QUALITY_GATES_STAGE_PLAN_PATH
  );
  await mkdir(path.dirname(planPath), { recursive: true });
  const state = {
    currentTaskId: params.currentTaskId,
    expectedCommitMessage: params.expectedCommitMessage,
    lastRecordedCommit: "05c865e",
    schema: "codeai-plan-v1",
  };
  await writeFile(
    planPath,
    [
      "# Quality Gates Managed TODO Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      JSON.stringify(state, null, 2),
      "```",
      "<!-- codeai-plan-state:end -->",
      "",
      "## Repair Cycle",
      "",
      "### Stream: Core-Gated Repair Attempts",
      "",
      `15. [IN_PROGRESS] \`${params.currentTaskId}\` Repair the rejected Quality Gates artifact and stop for Core validation (scope: managed artifacts; (expected commit: \`${params.expectedCommitMessage}\`).`,
      `16. [TODO] Git Commit: \`${params.expectedCommitMessage}\` (hash: TBD)`,
      "",
    ].join("\n"),
    "utf8"
  );
};

const readStagePlan = (workspaceRoot: string): Promise<string> =>
  readFile(path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH), "utf8");

test("readQualityGatesRepairLimitTask parses the open repair attempt", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-repair-limit-"));
  try {
    await writeStagePlan({
      currentTaskId: "quality-gates.phase3.repair.task4",
      expectedCommitMessage: "feat: repair quality gates integration attempt 4",
      workspaceRoot,
    });
    const repairTask = await readQualityGatesRepairLimitTask(workspaceRoot);
    assert.deepEqual(repairTask, { attemptNumber: 4, phase: "integration" });
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("readQualityGatesRepairLimitTask returns null outside repair tasks", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-repair-limit-"));
  try {
    await writeStagePlan({
      currentTaskId: "quality-gates.phase2.review.task1",
      expectedCommitMessage: "docs: revise quality gates contract revision 1",
      workspaceRoot,
    });
    assert.equal(await readQualityGatesRepairLimitTask(workspaceRoot), null);
    await rm(path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH));
    assert.equal(await readQualityGatesRepairLimitTask(workspaceRoot), null);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accept after integration repair limit opens formal verification", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-repair-limit-"));
  try {
    await writeStagePlan({
      currentTaskId: "quality-gates.phase3.repair.task4",
      expectedCommitMessage: "feat: repair quality gates integration attempt 4",
      workspaceRoot,
    });
    const ledgerCalls: LedgerCommitCall[] = [];
    const accepted = await acceptQualityGatesRepairLimitAsIs({
      gitBoundary: createLedgerBoundary(ledgerCalls),
      workspaceRoot,
    });
    assert.equal(accepted.phase, "integration");
    assert.equal(accepted.nextTaskId, "quality-gates.phase4.verify.task1");
    const planText = await readStagePlan(workspaceRoot);
    assert.match(planText, REPAIR_TASK4_DONE_RE);
    assert.match(planText, ACCEPTED_AS_IS_RE);
    assert.match(planText, VERIFY_TASK_LINE_RE);
    assert.match(planText, VERIFY_CURRENT_TASK_RE);
    assert.match(planText, VERIFY_EXPECTED_COMMIT_RE);
    assert.equal(ledgerCalls.length, 1);
    assert.ok(
      ledgerCalls[0]?.managedPaths.includes(QUALITY_GATES_STAGE_PLAN_PATH)
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accept after verification repair limit opens persistent return", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-repair-limit-"));
  try {
    await writeStagePlan({
      currentTaskId: "quality-gates.phase4.repair.task5",
      expectedCommitMessage:
        "chore: repair quality gates verification attempt 5",
      workspaceRoot,
    });
    const ledgerCalls: LedgerCommitCall[] = [];
    const accepted = await acceptQualityGatesRepairLimitAsIs({
      gitBoundary: createLedgerBoundary(ledgerCalls),
      workspaceRoot,
    });
    assert.equal(accepted.phase, "verification");
    assert.equal(accepted.nextTaskId, "quality-gates.phase5.user-return.task1");
    const planText = await readStagePlan(workspaceRoot);
    assert.match(planText, PHASE5_CURRENT_TASK_RE);
    assert.match(planText, NULL_EXPECTED_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accept after draft repair limit opens contract review", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-repair-limit-"));
  try {
    await writeStagePlan({
      currentTaskId: "quality-gates.phase1.repair.task4",
      expectedCommitMessage: "docs: repair quality gates draft attempt 4",
      workspaceRoot,
    });
    const ledgerCalls: LedgerCommitCall[] = [];
    const accepted = await acceptQualityGatesRepairLimitAsIs({
      gitBoundary: createLedgerBoundary(ledgerCalls),
      workspaceRoot,
    });
    assert.equal(accepted.phase, "draft");
    assert.equal(accepted.nextTaskId, "quality-gates.phase2.review.task1");
    const planText = await readStagePlan(workspaceRoot);
    assert.match(planText, REVIEW_CURRENT_TASK_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accept refuses stage plans outside an open repair attempt", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-repair-limit-"));
  try {
    await writeStagePlan({
      currentTaskId: "quality-gates.phase2.review.task1",
      expectedCommitMessage: "docs: revise quality gates contract revision 1",
      workspaceRoot,
    });
    await assert.rejects(
      () =>
        acceptQualityGatesRepairLimitAsIs({
          gitBoundary: createLedgerBoundary([]),
          workspaceRoot,
        }),
      NOT_ON_REPAIR_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("revision prompt carries the user corrections", () => {
  const prompt = buildQualityGatesRepairLimitRevisionPrompt({
    userFeedback: "Rename the gate script to qg-typecheck.",
    workspaceSlug: "finderwidget-test01",
  });
  assert.match(prompt, USER_FEEDBACK_RE);
  assert.match(prompt, SLUG_PATH_RE);
  assert.match(prompt, STOP_FOR_VALIDATION_RE);
});
