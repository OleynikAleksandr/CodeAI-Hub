import assert from "node:assert/strict";
import test from "node:test";
import { classifyApplicationSkeletonReviewTurn } from "./application-skeleton-review-turn-classifier";

test("classifier reports out_of_scope outside review and post-completion user return", () => {
  for (const phase of ["phase_1_draft", "phase_3_materialization"] as const) {
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

test("classifier reports revision when Phase 2 turn has any tracked owned diff", () => {
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ],
      phase: "phase_2_review",
    }),
    "revision"
  );
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
        ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
      ],
      phase: "phase_2_review",
    }),
    "revision"
  );
});

test("classifier reports discussion when Phase 2 turn ends without owned diff", () => {
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [],
      phase: "phase_2_review",
    }),
    "discussion"
  );
});

test("classifier reopens post-completion user return from the phase_handoff anchor", () => {
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ],
      phase: "phase_handoff",
    }),
    "revision"
  );
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [],
      phase: "phase_handoff",
    }),
    "discussion"
  );
});
