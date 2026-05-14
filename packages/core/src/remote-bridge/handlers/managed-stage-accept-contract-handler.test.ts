import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import { evaluateApplicationSkeletonAcceptContractCommand } from "./managed-stage-accept-contract-handler";

const buildProgressSnapshot = (
  override: Partial<ApplicationSkeletonProgressSnapshot>
): ApplicationSkeletonProgressSnapshot => ({
  accepted: false,
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

const buildGitStatus = (
  override: Partial<ManagedGitStatus["dirtyByStage"]> = {}
): ManagedGitStatus =>
  ({
    clean: true,
    dirtyByStage: {
      application_skeleton: [],
      diagram_modules: [],
      quality_gates: [],
      ...override,
    },
    dirtyFiles: [],
  }) as unknown as ManagedGitStatus;

const buildAcceptedDraft = () =>
  buildProgressSnapshot({
    markdownExists: true,
    mapExists: true,
    mappingReady: true,
    substep: "awaiting_acceptance",
  });

test("handler accepts a clean Phase 1B draft with no dirty paths", () => {
  const decision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: buildAcceptedDraft(),
    managedGitStatus: buildGitStatus(),
    phase: "phase_2_review",
  });
  assert.equal(decision.kind, "accepted");
  assert.equal(decision.stage, "application_skeleton");
});

test("handler rejects when phase is not Phase 2 review", () => {
  for (const phase of [
    "phase_1_draft",
    "phase_3_materialization",
    "phase_handoff",
  ] as const) {
    const decision = evaluateApplicationSkeletonAcceptContractCommand({
      applicationSkeletonProgress: buildAcceptedDraft(),
      managedGitStatus: buildGitStatus(),
      phase,
    });
    assert.equal(decision.kind, "rejected");
    if (decision.kind === "rejected") {
      assert.ok(
        decision.reasons.some((r) => r.includes("not in Phase 2 review")),
        `expected phase rejection reason for ${phase}; got ${decision.reasons.join(" | ")}`
      );
    }
  }
});

test("handler rejects when draft markdown or map.json is missing", () => {
  const decision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: buildProgressSnapshot({
      markdownExists: true,
      mapExists: false,
    }),
    managedGitStatus: buildGitStatus(),
    phase: "phase_2_review",
  });
  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.ok(
      decision.reasons.some((r) => r.includes("draft artifacts are missing"))
    );
  }
});

test("handler rejects when map.json is unparseable", () => {
  const decision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: buildProgressSnapshot({
      markdownExists: true,
      mapExists: true,
      mappingReady: false,
    }),
    managedGitStatus: buildGitStatus(),
    phase: "phase_2_review",
  });
  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.ok(
      decision.reasons.some((r) => r.includes("map.json is not parseable"))
    );
  }
});

test("handler rejects when application_skeleton owned diff is uncommitted", () => {
  const decision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: buildAcceptedDraft(),
    managedGitStatus: buildGitStatus({
      application_skeleton: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ],
    }),
    phase: "phase_2_review",
  });
  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.ok(
      decision.reasons.some((r) => r.includes("uncommitted owned diff"))
    );
  }
});

test("handler rejects when out-of-owner dirty paths block the workspace", () => {
  const decision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: buildAcceptedDraft(),
    managedGitStatus: buildGitStatus({
      diagram_modules: [".codeai-hub/demo/diagram_modules/scratch.md"],
    }),
    phase: "phase_2_review",
  });
  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.ok(
      decision.reasons.some((r) =>
        r.includes("dirty paths blocking the workspace")
      )
    );
  }
});

test("handler rejects when stage is already materialized", () => {
  const decision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: buildProgressSnapshot({
      accepted: true,
      markdownExists: true,
      mapExists: true,
      mappingReady: true,
      materialized: true,
      observedMaterialization: true,
      substep: "materialized",
    }),
    managedGitStatus: buildGitStatus(),
    phase: "phase_3_materialization",
  });
  assert.equal(decision.kind, "rejected");
});
