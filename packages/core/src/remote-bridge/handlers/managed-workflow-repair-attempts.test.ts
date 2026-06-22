import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveApplicationSkeletonDraftRepairAttemptNumber,
  resolveDiagramModulesRepairAttemptNumber,
  resolveMaterializationRepairAttemptNumber,
} from "./managed-workflow-repair-attempts";

test("managed workflow repair attempt resolvers read stage task numbers", () => {
  assert.equal(
    resolveApplicationSkeletonDraftRepairAttemptNumber(
      "application-skeleton.phase1.repair.task4"
    ),
    4
  );
  assert.equal(
    resolveMaterializationRepairAttemptNumber(
      "application-skeleton.phase3.repair.task5"
    ),
    5
  );
  assert.equal(
    resolveDiagramModulesRepairAttemptNumber(
      "diagram-modules.phase1.repair.task6"
    ),
    6
  );
});

test("managed workflow repair attempt resolvers fall back to first attempt", () => {
  assert.equal(resolveApplicationSkeletonDraftRepairAttemptNumber(null), 1);
  assert.equal(resolveMaterializationRepairAttemptNumber("invalid-task"), 1);
  assert.equal(resolveDiagramModulesRepairAttemptNumber("invalid-task"), 1);
});
