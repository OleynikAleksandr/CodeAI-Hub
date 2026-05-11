import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeDiagramModulesRepairAttemptEvidence } from "./diagram-modules-repair-attempt-evidence";

const WORKSPACE_SLUG = "demo-workspace";
const REPAIR_TASK_ID =
  "diagram-modules.product-part.local-runtime.repair3.task1";
const ATTEMPT3_PATH_RE =
  /\.codeai-hub\/demo-workspace\/workflow\/revisions\/diagram-modules\/attempts\/attempt-0003-/u;

test("writes tracked Diagram Modules repair attempt evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-repair-evidence-")
  );

  try {
    const result = await writeDiagramModulesRepairAttemptEvidence({
      diagnostics: ["Missing Part ID `local-runtime`."],
      now: new Date("2026-05-11T12:00:00.000Z"),
      outcome: "still_invalid",
      repairTaskId: REPAIR_TASK_ID,
      targetArtifactPath:
        ".codeai-hub/demo-workspace/diagram_modules/product-parts/local-runtime.md",
      validator: "diagram_modules.product_part",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      result.evidence.schema,
      "codeai-diagram-modules-repair-attempt-v1"
    );
    assert.equal(result.evidence.stage, "diagram_modules");
    assert.equal(result.evidence.attemptNumber, 3);
    assert.equal(result.evidence.checkedAt, "2026-05-11T12:00:00.000Z");
    assert.equal(result.evidence.outcome, "still_invalid");
    assert.equal(result.evidence.repairTaskId, REPAIR_TASK_ID);
    assert.deepEqual(result.evidence.diagnostics, [
      "Missing Part ID `local-runtime`.",
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
    path.join(os.tmpdir(), "diagram-modules-repair-evidence-next-")
  );

  try {
    const first = await writeDiagramModulesRepairAttemptEvidence({
      diagnostics: [],
      now: new Date("2026-05-11T12:00:00.000Z"),
      outcome: "no_accepted_diff",
      repairTaskId: "diagram-modules.index.task1",
      targetArtifactPath:
        ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
      validator: "diagram_modules.index",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const second = await writeDiagramModulesRepairAttemptEvidence({
      diagnostics: [],
      now: new Date("2026-05-11T12:01:00.000Z"),
      outcome: "accepted_after_repair",
      repairTaskId: "diagram-modules.index.task1",
      targetArtifactPath:
        ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
      validator: "diagram_modules.index",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(first.evidence.attemptNumber, 1);
    assert.equal(second.evidence.attemptNumber, 2);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
