import assert from "node:assert/strict";
import test from "node:test";
import { classifyApplicationSkeletonReviewTurn } from "./application-skeleton-review-turn-classifier";

test("classifier reports out_of_scope for non Phase 1B phases", () => {
  for (const phase of [
    "phase_1a_draft",
    "phase_2_materialization",
    "phase_handoff",
  ] as const) {
    assert.equal(
      classifyApplicationSkeletonReviewTurn({
        ownedDirtyFiles: [
          ".codeai-hub/demo/application_skeleton/application-skeleton.md",
        ],
        phase,
      }),
      "out_of_scope"
    );
  }
});

test("classifier reports revision when Phase 1B turn has any tracked owned diff", () => {
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ],
      phase: "phase_1b_review",
    }),
    "revision"
  );
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
        ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
      ],
      phase: "phase_1b_review",
    }),
    "revision"
  );
});

test("classifier reports discussion when Phase 1B turn ends without owned diff", () => {
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [],
      phase: "phase_1b_review",
    }),
    "discussion"
  );
});
