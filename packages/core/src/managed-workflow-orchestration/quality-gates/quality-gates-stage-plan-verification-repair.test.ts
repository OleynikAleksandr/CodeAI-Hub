import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE5_TASK_ID,
  resolveNextAfterCommit,
  resolveNextAfterRejectedCommit,
  updateStagePlanAfterCommit,
} from "./quality-gates-stage-plan-model";
import type { QualityGatesManagedValidationResult } from "./quality-gates-validator";

const VERIFY_TASK_ID = "quality-gates.phase4.verify.task1";
const VERIFY_COMMIT_MESSAGE = "chore: verify quality gates enforcement";
const VERIFY_REPAIR_TASK_ID = "quality-gates.phase4.repair.task1";
const VERIFY_REPAIR_COMMIT_MESSAGE =
  "chore: repair quality gates verification attempt 1";
const PHASE_2_REVIEW_RE = /quality-gates\.phase2\.review/u;
const PHASE_3_REPAIR_RE = /quality-gates\.phase3\.repair/u;
const PHASE_4_REPAIR_DONE_RE = /\[DONE\].*phase4\.repair\.task1/u;
const PERSISTENT_RETURN_RE = /Persistent Quality Gates User Return/u;
const VERIFICATION_REPAIR_CYCLE_RE = /Quality Gates Verification Repair Cycle/u;

const createVerificationDecision = (
  valid: boolean
): QualityGatesManagedValidationResult => ({
  contractJson: {},
  diagnostics: valid ? [] : ["missing_verification_evidence"],
  nextAction: valid ? "open_persistent_return" : "repair_integration",
  nextPrompt: valid ? "return" : "repair",
  phase: "verification",
  valid,
});

const createVerificationPlan = (): string =>
  [
    `1. [IN_PROGRESS] \`${VERIFY_TASK_ID}\` Run formal verification (expected commit: \`${VERIFY_COMMIT_MESSAGE}\`).`,
    `2. [TODO] Git Commit: \`${VERIFY_COMMIT_MESSAGE}\` (hash: TBD)`,
  ].join("\n");

test("Quality Gates verification repair advances to persistent return", () => {
  const rejectedNext = resolveNextAfterRejectedCommit({
    content: createVerificationPlan(),
    decision: createVerificationDecision(false),
  });
  assert.equal(rejectedNext.taskId, VERIFY_REPAIR_TASK_ID);
  assert.equal(
    rejectedNext.expectedCommitMessage,
    VERIFY_REPAIR_COMMIT_MESSAGE
  );

  const repairPlan = updateStagePlanAfterCommit({
    content: createVerificationPlan(),
    currentTaskId: VERIFY_TASK_ID,
    expectedCommitMessage: VERIFY_COMMIT_MESSAGE,
    hash: "bbb7665",
    next: rejectedNext,
  });
  assert.match(repairPlan, VERIFICATION_REPAIR_CYCLE_RE);
  assert.match(repairPlan, new RegExp(VERIFY_REPAIR_TASK_ID, "u"));
  assert.doesNotMatch(repairPlan, PHASE_2_REVIEW_RE);
  assert.doesNotMatch(repairPlan, PHASE_3_REPAIR_RE);

  const returnNext = resolveNextAfterCommit({
    currentTaskId: VERIFY_REPAIR_TASK_ID,
    decision: createVerificationDecision(true),
  });
  assert.equal(returnNext.taskId, PHASE5_TASK_ID);
  assert.equal(returnNext.expectedCommitMessage, null);

  const returnPlan = updateStagePlanAfterCommit({
    content: repairPlan,
    currentTaskId: VERIFY_REPAIR_TASK_ID,
    expectedCommitMessage: VERIFY_REPAIR_COMMIT_MESSAGE,
    hash: "c2d7f1d",
    next: returnNext,
  });
  assert.match(returnPlan, PERSISTENT_RETURN_RE);
  assert.match(returnPlan, new RegExp(PHASE5_TASK_ID, "u"));
  assert.match(returnPlan, PHASE_4_REPAIR_DONE_RE);
});
