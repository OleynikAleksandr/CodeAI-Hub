import assert from "node:assert/strict";
import test from "node:test";
import { classifyApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";

const buildProgressSnapshot = (
  override: Partial<ApplicationSkeletonProgressSnapshot>
): ApplicationSkeletonProgressSnapshot => ({
  accepted: false,
  foundationReady: false,
  mapExists: false,
  mappingReady: false,
  markdownExists: false,
  materializationState: "artifact",
  materialized: false,
  observedMaterialization: false,
  substep: "artifact",
  validationErrors: [],
  ...override,
});

test("classifyApplicationSkeletonPhase maps progress snapshots to orchestration phases", () => {
  assert.equal(classifyApplicationSkeletonPhase(null), "phase_1_draft");

  assert.equal(
    classifyApplicationSkeletonPhase(
      buildProgressSnapshot({
        markdownExists: false,
        mapExists: false,
        substep: "artifact",
      })
    ),
    "phase_1_draft"
  );

  assert.equal(
    classifyApplicationSkeletonPhase(
      buildProgressSnapshot({
        markdownExists: true,
        mapExists: false,
        substep: "artifact",
      })
    ),
    "phase_1_draft"
  );

  assert.equal(
    classifyApplicationSkeletonPhase(
      buildProgressSnapshot({
        markdownExists: true,
        mapExists: true,
        mappingReady: true,
        substep: "awaiting_acceptance",
      })
    ),
    "phase_2_review"
  );

  assert.equal(
    classifyApplicationSkeletonPhase(
      buildProgressSnapshot({
        accepted: true,
        markdownExists: true,
        mapExists: true,
        mappingReady: true,
        substep: "accepted",
      })
    ),
    "phase_3_materialization"
  );

  assert.equal(
    classifyApplicationSkeletonPhase(
      buildProgressSnapshot({
        accepted: true,
        markdownExists: true,
        mapExists: true,
        mappingReady: true,
        materializationState: "materializing",
        substep: "materializing",
      })
    ),
    "phase_3_materialization"
  );

  assert.equal(
    classifyApplicationSkeletonPhase(
      buildProgressSnapshot({
        accepted: true,
        markdownExists: true,
        mapExists: true,
        mappingReady: true,
        materializationState: "materialized",
        materialized: true,
        foundationReady: true,
        observedMaterialization: true,
        substep: "materialized",
      })
    ),
    "phase_handoff"
  );

  assert.equal(
    classifyApplicationSkeletonPhase(
      buildProgressSnapshot({
        markdownExists: true,
        mapExists: true,
        mappingReady: true,
        observedMaterialization: true,
        substep: "failed",
        validationErrors: ["application-skeleton.md status reviewState …"],
      })
    ),
    "phase_2_review"
  );
});
