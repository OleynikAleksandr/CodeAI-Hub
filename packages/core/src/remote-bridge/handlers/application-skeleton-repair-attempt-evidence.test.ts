import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeApplicationSkeletonRepairAttemptEvidence } from "./application-skeleton-repair-attempt-evidence";

const WORKSPACE_SLUG = "demo-workspace";
const REPAIR_TASK_ID = "application-skeleton.phase3.materialize.repair3.task1";
const ATTEMPT3_PATH_RE =
  /\.codeai-hub\/demo-workspace\/workflow\/revisions\/application-skeleton\/attempts\/attempt-0003-/u;

test("writes tracked Application Skeleton repair attempt evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-repair-evidence-")
  );

  try {
    const result = await writeApplicationSkeletonRepairAttemptEvidence({
      diagnostics: ["application-skeleton-map.json is not parseable."],
      now: new Date("2026-05-11T12:00:00.000Z"),
      outcome: "still_invalid",
      repairTaskId: REPAIR_TASK_ID,
      targetArtifactPath:
        ".codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json",
      targetPhase: "phase3.materialize",
      validator: "application_skeleton.materialization",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      result.evidence.schema,
      "codeai-application-skeleton-repair-attempt-v1"
    );
    assert.equal(result.evidence.stage, "application_skeleton");
    assert.equal(result.evidence.attemptNumber, 3);
    assert.equal(result.evidence.checkedAt, "2026-05-11T12:00:00.000Z");
    assert.equal(result.evidence.outcome, "still_invalid");
    assert.equal(result.evidence.repairTaskId, REPAIR_TASK_ID);
    assert.equal(result.evidence.targetPhase, "phase3.materialize");
    assert.deepEqual(result.evidence.diagnostics, [
      "application-skeleton-map.json is not parseable.",
    ]);
    assert.match(result.relativePath, ATTEMPT3_PATH_RE);

    const written = JSON.parse(
      await readFile(result.absolutePath, "utf8")
    ) as typeof result.evidence;
    assert.deepEqual(written, result.evidence);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("uses the next available attempt number when task id has no repair suffix", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-repair-evidence-next-")
  );

  try {
    const first = await writeApplicationSkeletonRepairAttemptEvidence({
      diagnostics: [],
      now: new Date("2026-05-11T12:00:00.000Z"),
      outcome: "no_accepted_diff",
      repairTaskId: "application-skeleton.phase2.review.task1",
      targetArtifactPath:
        ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md",
      targetPhase: "phase2.review",
      validator: "application_skeleton.contract",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const second = await writeApplicationSkeletonRepairAttemptEvidence({
      diagnostics: [],
      now: new Date("2026-05-11T12:01:00.000Z"),
      outcome: "accepted_after_repair",
      repairTaskId: "application-skeleton.phase2.review.task1",
      targetArtifactPath:
        ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md",
      targetPhase: "phase2.review",
      validator: "application_skeleton.contract",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(first.evidence.attemptNumber, 1);
    assert.equal(second.evidence.attemptNumber, 2);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
