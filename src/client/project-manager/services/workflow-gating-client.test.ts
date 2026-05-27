import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkflowGating } from "./workflow-gating-client";
import type { WorkflowStageId } from "./workflow-state-client";

const STAGE_ORDER: readonly WorkflowStageId[] = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
];

test("parseWorkflowGating preserves dirty file diagnostics", () => {
  const gating = parseWorkflowGating({
    payload: {
      blocked: {
        application_skeleton: true,
        quality_gates: true,
      },
      dirtyFiles: [
        ".codeai-hub/demo/workflow/boundaries.json",
        "application-skeleton-map.json",
        42,
      ],
    },
    stageOrder: STAGE_ORDER,
  });

  assert.equal(gating.blocked.application_skeleton, true);
  assert.equal(gating.blocked.quality_gates, true);
  assert.deepEqual(gating.dirtyFiles, [
    ".codeai-hub/demo/workflow/boundaries.json",
    "application-skeleton-map.json",
  ]);
});
